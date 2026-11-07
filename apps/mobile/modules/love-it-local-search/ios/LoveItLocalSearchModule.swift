import ExpoModulesCore
import MapKit

public class LoveItLocalSearchModule: Module {
  /// MKLocalSearch is cancelled if nothing retains it. A release build drops the
  /// temporary object as soon as `start` returns, so the completion never runs
  /// and the suggestion list stays empty. Debug builds often keep it alive long
  /// enough to hide the bug.
  private static let lock = NSLock()
  private static var inFlight: [ObjectIdentifier: MKLocalSearch] = [:]

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

      Self.start(query: trimmed, region: region, kinds: .pointOfInterest, foodOnly: true) { items in
        if !items.isEmpty {
          promise.resolve(items)
          return
        }
        Self.start(query: trimmed, region: region, kinds: .pointOfInterest, foodOnly: false) { openItems in
          if !openItems.isEmpty {
            promise.resolve(openItems)
            return
          }
          Self.start(query: trimmed, region: region, kinds: .address, foodOnly: false) { addresses in
            promise.resolve(addresses)
          }
        }
      }
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
      start(query: term, region: region, kinds: .pointOfInterest, foodOnly: true) { rows in
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
    done: @escaping ([[String: Any]]) -> Void
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
    search.start { response, _ in
      release(search)
      let rows = (response?.mapItems ?? []).compactMap { serialize($0) }
      done(rows)
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
