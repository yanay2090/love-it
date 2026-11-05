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
      let region = MKCoordinateRegion(center: center, latitudinalMeters: 12_000, longitudinalMeters: 12_000)

      Self.start(query: query, region: region, kinds: .pointOfInterest, foodOnly: true) { items in
        if !items.isEmpty {
          promise.resolve(items)
          return
        }
        Self.start(query: query, region: region, kinds: .pointOfInterest, foodOnly: false) { openItems in
          if !openItems.isEmpty {
            promise.resolve(openItems)
            return
          }
          Self.start(query: query, region: region, kinds: .address, foodOnly: false) { addresses in
            promise.resolve(addresses)
          }
        }
      }
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
      request.pointOfInterestFilter = MKPointOfInterestFilter(including: [
        .cafe, .restaurant, .bakery, .brewery, .nightlife, .winery, .foodMarket,
      ])
    }
    let search = MKLocalSearch(request: request)
    let key = ObjectIdentifier(search)
    lock.lock()
    inFlight[key] = search
    lock.unlock()
    search.start { response, _ in
      lock.lock()
      inFlight.removeValue(forKey: key)
      lock.unlock()
      let rows = (response?.mapItems ?? []).compactMap { serialize($0) }
      done(rows)
    }
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
