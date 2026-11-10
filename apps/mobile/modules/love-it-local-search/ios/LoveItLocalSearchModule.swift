import ExpoModulesCore
import MapKit

public class LoveItLocalSearchModule: Module {
  /// MKLocalSearch is cancelled if nothing retains it. A release build drops the
  /// temporary object as soon as `start` returns, so the completion never runs
  /// and the suggestion list stays empty. Debug builds often keep it alive long
  /// enough to hide the bug.
  private static let lock = NSLock()
  private static var inFlight: [ObjectIdentifier: MKLocalSearch] = [:]
  private static var completers: [ObjectIdentifier: CompleterBox] = [:]

  public func definition() -> ModuleDefinition {
    Name("LoveItLocalSearch")

    AsyncFunction("search") { (query: String, latitude: Double, longitude: Double, promise: Promise) in
      let center = CLLocationCoordinate2D(latitude: latitude, longitude: longitude)
      // Full span, not a radius. 50 km covers Tel Aviv through Gush Dan
      // (Ramat Aviv, Givatayim, Holon) even when the bias is Florentin.
      let region = MKCoordinateRegion(center: center, latitudinalMeters: 50_000, longitudinalMeters: 50_000)
      let trimmed = query.trimmingCharacters(in: .whitespacesAndNewlines)

      if trimmed.isEmpty {
        Self.nearbyFood(center: center, region: region) { items in
          promise.resolve(items)
        }
        return
      }

      Self.searchNamed(query: trimmed, region: region) { items, error in
        if !items.isEmpty {
          promise.resolve(items)
          return
        }
        if let error, !error.isEmpty {
          promise.reject("E_MAP_SEARCH", error)
          return
        }
        promise.resolve(items)
      }
    }
  }

  /// Typed queries. Completer is what Apple Maps uses while you type, so
  /// "cafe 38" can match "קפה 38". No food-only filter here. That filter is
  /// only for the empty Near you browse.
  private static func searchNamed(
    query: String,
    region: MKCoordinateRegion,
    done: @escaping ([[String: Any]], String?) -> Void
  ) {
    let group = DispatchGroup()
    let mergeLock = NSLock()
    var collected: [[String: Any]] = []
    var lastError: String?

    func absorb(_ rows: [[String: Any]], error: String?) {
      mergeLock.lock()
      collected.append(contentsOf: rows)
      if rows.isEmpty, let error, !error.isEmpty {
        lastError = error
      }
      mergeLock.unlock()
    }

    group.enter()
    complete(query: query, region: region) { completions, error in
      resolveCompletions(Array(completions.prefix(8))) { rows, resolveError in
        absorb(rows, error: resolveError ?? error)
        group.leave()
      }
    }

    for variant in queryVariants(query) {
      group.enter()
      start(query: variant, region: region, kinds: .pointOfInterest, foodOnly: false) { rows, error in
        absorb(rows, error: error)
        group.leave()
      }
    }

    group.notify(queue: .main) {
      let found = dedupe(collected)
      if !found.isEmpty {
        done(found, nil)
        return
      }
      start(query: query, region: region, kinds: .address, foodOnly: false) { addresses, error in
        if !addresses.isEmpty {
          done(addresses, nil)
          return
        }
        done([], error ?? lastError)
      }
    }
  }

  private static func queryVariants(_ query: String) -> [String] {
    var variants: [String] = []
    func add(_ value: String) {
      let trimmed = value.trimmingCharacters(in: .whitespacesAndNewlines)
      guard !trimmed.isEmpty else { return }
      if variants.contains(where: { $0.caseInsensitiveCompare(trimmed) == .orderedSame }) { return }
      variants.append(trimmed)
    }
    add(query)
    let collapsed = query.replacingOccurrences(of: "\\s+", with: " ", options: .regularExpression)
    add(collapsed)
    add(collapsed.replacingOccurrences(of: " ", with: ""))
    guard looksEnglish(query) else { return variants }
    let numbers = query.filter(\.isNumber)
    if !numbers.isEmpty {
      add("קפה \(numbers)")
      add("קפה\(numbers)")
    }
    let hebrewCafe = collapsed.replacingOccurrences(
      of: "(?i)caf[eéèêë]",
      with: "קפה",
      options: .regularExpression
    )
    add(hebrewCafe)
    return variants
  }

  private static func looksEnglish(_ query: String) -> Bool {
    query.range(of: "[A-Za-z]", options: .regularExpression) != nil
      && query.range(of: "[\\u0590-\\u05FF]", options: .regularExpression) == nil
  }

  private static func complete(
    query: String,
    region: MKCoordinateRegion,
    done: @escaping ([MKLocalSearchCompletion], String?) -> Void
  ) {
    let box = CompleterBox()
    let key = ObjectIdentifier(box)
    lock.lock()
    completers[key] = box
    lock.unlock()
    box.start(query: query, region: region) { completions, error in
      lock.lock()
      completers.removeValue(forKey: key)
      lock.unlock()
      done(completions, error?.localizedDescription)
    }
  }

  private static func resolveCompletions(
    _ completions: [MKLocalSearchCompletion],
    done: @escaping ([[String: Any]], String?) -> Void
  ) {
    if completions.isEmpty {
      done([], nil)
      return
    }
    let group = DispatchGroup()
    let mergeLock = NSLock()
    var collected: [[String: Any]] = []
    var lastError: String?
    for completion in completions {
      group.enter()
      let request = MKLocalSearch.Request(completion: completion)
      let search = MKLocalSearch(request: request)
      retain(search)
      search.start { response, error in
        release(search)
        let rows = (response?.mapItems ?? []).compactMap { serialize($0) }
        mergeLock.lock()
        collected.append(contentsOf: rows)
        if rows.isEmpty, let message = error?.localizedDescription, !message.isEmpty {
          lastError = message
        }
        mergeLock.unlock()
        group.leave()
      }
    }
    group.notify(queue: .main) {
      done(dedupe(collected), collected.isEmpty ? lastError : nil)
    }
  }

  /// Nearby cafes and restaurants for an empty query. One POI request plus a
  /// few food searches, because each MKLocalSearch only returns a short page.
  private static func nearbyFood(
    center: CLLocationCoordinate2D,
    region: MKCoordinateRegion,
    done: @escaping ([[String: Any]]) -> Void
  ) {
    let group = DispatchGroup()
    let mergeLock = NSLock()
    var collected: [[String: Any]] = []

    func absorb(_ rows: [[String: Any]]) {
      mergeLock.lock()
      collected.append(contentsOf: rows)
      mergeLock.unlock()
    }

    group.enter()
    startPointsOfInterest(center: center, radius: 25_000) { rows in
      absorb(rows)
      group.leave()
    }
    for term in ["cafe", "restaurant", "bakery"] {
      group.enter()
      start(query: term, region: region, kinds: .pointOfInterest, foodOnly: true) { rows, _ in
        absorb(rows)
        group.leave()
      }
    }
    group.notify(queue: .main) {
      done(dedupe(collected))
    }
  }

  private static func startPointsOfInterest(
    center: CLLocationCoordinate2D,
    radius: CLLocationDistance,
    done: @escaping ([[String: Any]]) -> Void
  ) {
    let request = MKLocalPointsOfInterestRequest(center: center, radius: radius)
    request.pointOfInterestFilter = MKPointOfInterestFilter(including: foodCategories)
    let search = MKLocalSearch(request: request)
    retain(search)
    search.start { response, _ in
      release(search)
      let rows = (response?.mapItems ?? []).compactMap { serialize($0) }
      done(rows)
    }
  }

  private static func start(
    query: String,
    region: MKCoordinateRegion,
    kinds: MKLocalSearch.ResultType,
    foodOnly: Bool,
    done: @escaping ([[String: Any]], String?) -> Void
  ) {
    let request = MKLocalSearch.Request()
    request.naturalLanguageQuery = query
    request.region = region
    request.resultTypes = kinds
    if foodOnly {
      request.pointOfInterestFilter = MKPointOfInterestFilter(including: foodCategories)
    }
    let search = MKLocalSearch(request: request)
    retain(search)
    search.start { response, error in
      release(search)
      let rows = (response?.mapItems ?? []).compactMap { serialize($0) }
      done(rows, rows.isEmpty ? error?.localizedDescription : nil)
    }
  }

  private static let foodCategories: [MKPointOfInterestCategory] = [
    .cafe, .restaurant, .bakery, .brewery, .nightlife, .winery, .foodMarket,
  ]

  private static func retain(_ search: MKLocalSearch) {
    let key = ObjectIdentifier(search)
    lock.lock()
    inFlight[key] = search
    lock.unlock()
  }

  private static func release(_ search: MKLocalSearch) {
    let key = ObjectIdentifier(search)
    lock.lock()
    inFlight.removeValue(forKey: key)
    lock.unlock()
  }

  private static func dedupe(_ rows: [[String: Any]]) -> [[String: Any]] {
    var seen = Set<String>()
    var unique: [[String: Any]] = []
    for row in rows {
      let name = (row["name"] as? String ?? "").lowercased()
      let appleId = row["id"] as? String ?? ""
      let lat = row["latitude"] as? Double ?? 0
      let lng = row["longitude"] as? Double ?? 0
      let key = appleId.isEmpty
        ? "\(name)|\(String(format: "%.4f", lat))|\(String(format: "%.4f", lng))"
        : appleId
      if seen.contains(key) { continue }
      seen.insert(key)
      unique.append(row)
    }
    return unique
  }
}

/// Retained until the completer settles. Releasing it early cancels the
/// suggestion list, the same way an unretained MKLocalSearch does.
private final class CompleterBox: NSObject, MKLocalSearchCompleterDelegate {
  let completer = MKLocalSearchCompleter()
  private var onFinish: (([MKLocalSearchCompletion], Error?) -> Void)?
  private var pending: DispatchWorkItem?
  private var latest: [MKLocalSearchCompletion] = []

  func start(
    query: String,
    region: MKCoordinateRegion,
    done: @escaping ([MKLocalSearchCompletion], Error?) -> Void
  ) {
    onFinish = done
    completer.delegate = self
    completer.region = region
    completer.resultTypes = [.pointOfInterest, .address]
    completer.queryFragment = query
    scheduleFinish(after: 3.5, error: nil)
  }

  func completerDidUpdateResults(_ completer: MKLocalSearchCompleter) {
    latest = completer.results
    scheduleFinish(after: 0.3, error: nil)
  }

  func completer(_ completer: MKLocalSearchCompleter, didFailWithError error: Error) {
    finish(error: error)
  }

  private func scheduleFinish(after delay: TimeInterval, error: Error?) {
    pending?.cancel()
    let item = DispatchWorkItem { [weak self] in
      self?.finish(error: error)
    }
    pending = item
    DispatchQueue.main.asyncAfter(deadline: .now() + delay, execute: item)
  }

  private func finish(error: Error?) {
    pending?.cancel()
    pending = nil
    guard let done = onFinish else { return }
    onFinish = nil
    completer.delegate = nil
    done(latest, error)
  }
}

private func serialize(_ item: MKMapItem) -> [String: Any]? {
  let placemark = item.placemark
  let name = item.name ?? placemark.name ?? ""
  guard !name.isEmpty else { return nil }

  var row: [String: Any] = [
    "name": name,
    "latitude": placemark.coordinate.latitude,
    "longitude": placemark.coordinate.longitude,
    "neighborhood": placemark.subLocality ?? placemark.locality ?? "Tel Aviv",
    "address": addressLine(placemark),
  ]
  if let category = item.pointOfInterestCategory?.rawValue {
    row["category"] = category
    row["subtitle"] = category
  } else {
    row["subtitle"] = placemark.thoroughfare ?? "Place"
  }
  if #available(iOS 18.0, *) {
    if let identifier = item.identifier?.rawValue, !identifier.isEmpty {
      row["id"] = identifier
    }
  }
  return row
}

private func addressLine(_ placemark: MKPlacemark) -> String {
  let parts = [placemark.subThoroughfare, placemark.thoroughfare, placemark.locality].compactMap { $0 }
  if !parts.isEmpty {
    return parts.joined(separator: " ")
  }
  return placemark.title ?? ""
}
