import { TEL_AVIV_MAP_REGION, type MapPin } from '@love-it/shared';
import { forwardRef, useImperativeHandle, useRef } from 'react';
import { Platform, StyleSheet } from 'react-native';
import MapView, { Marker, type Region } from 'react-native-maps';
import { IllustratedMap } from './IllustratedMap';
import { PinMarker } from './Pins';

export interface PlaceMapHandle {
  recenter: (point?: { lat: number; lng: number }) => void;
}

interface Props {
  pins: MapPin[];
  selectedId?: string;
  onSelect: (placeId: string) => void;
  /** Tap or pan on the map. Used to dismiss the keyboard without taking the gesture. */
  onInteract?: () => void;
  /** Keeps Apple’s legal line in the bottom-left, above the home indicator. */
  legalBottomInset?: number;
}

const initialRegion: Region = {
  latitude: TEL_AVIV_MAP_REGION.lat,
  longitude: TEL_AVIV_MAP_REGION.lng,
  latitudeDelta: TEL_AVIV_MAP_REGION.latDelta,
  longitudeDelta: TEL_AVIV_MAP_REGION.lngDelta,
};

/**
 * iOS uses Apple MapKit through react-native-maps. The provider prop is
 * intentionally omitted — PROVIDER_GOOGLE would require a Maps API key.
 * Android uses the illustrated Tel Aviv map so the diary still opens with no key.
 */
export const PlaceMap = forwardRef<PlaceMapHandle, Props>(function PlaceMap(
  { pins, selectedId, onSelect, onInteract, legalBottomInset },
  ref,
) {
  const mapRef = useRef<MapView>(null);

  useImperativeHandle(ref, () => ({
    recenter(point) {
      mapRef.current?.animateToRegion(
        {
          latitude: point?.lat ?? initialRegion.latitude,
          longitude: point?.lng ?? initialRegion.longitude,
          latitudeDelta: point ? 0.03 : initialRegion.latitudeDelta,
          longitudeDelta: point ? 0.03 : initialRegion.longitudeDelta,
        },
        350,
      );
    },
  }));

  if (Platform.OS !== 'ios') {
    return <IllustratedMap pins={pins} selectedId={selectedId} onSelect={onSelect} onInteract={onInteract} />;
  }

  return (
    <MapView
      ref={mapRef}
      style={StyleSheet.absoluteFill}
      initialRegion={initialRegion}
      showsUserLocation
      showsCompass={false}
      legalLabelInsets={
        legalBottomInset === undefined
          ? undefined
          : { top: 0, left: 12, bottom: legalBottomInset + 2, right: 0 }
      }
      toolbarEnabled={false}
      rotateEnabled={false}
      pitchEnabled={false}
      onPress={() => onInteract?.()}
      onPanDrag={() => onInteract?.()}
    >
      {pins.map((pin) => (
        <Marker
          key={pin.placeId}
          coordinate={{ latitude: pin.lat, longitude: pin.lng }}
          onPress={() => onSelect(pin.placeId)}
          anchor={{ x: 0.5, y: 1 }}
          tracksViewChanges
        >
          <PinMarker pin={pin} selected={pin.placeId === selectedId} />
        </Marker>
      ))}
    </MapView>
  );
});
