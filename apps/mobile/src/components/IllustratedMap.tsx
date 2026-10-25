import { projectToPercent, type MapPin } from '@love-it/shared';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme';
import { PinMarker } from './Pins';

export function IllustratedMap({
  pins,
  selectedId,
  onSelect,
}: {
  pins: MapPin[];
  selectedId?: string;
  onSelect: (placeId: string) => void;
}) {
  return (
    <View style={styles.map}>
      <View style={styles.water} />
      <View style={styles.park} />
      <View style={[styles.road, { top: '28%', left: '16%', width: '70%', transform: [{ rotate: '-8deg' }] }]} />
      <View style={[styles.road, { top: '48%', left: '10%', width: '80%' }]} />
      <View style={[styles.road, { top: '68%', left: '18%', width: '60%', transform: [{ rotate: '6deg' }] }]} />
      <View style={[styles.roadV, { left: '22%' }]} />
      <View style={[styles.roadV, { left: '58%' }]} />
      <Text style={[styles.area, { left: '40%', top: '16%' }]}>LEV HA'IR</Text>
      <Text style={[styles.area, { left: '44%', top: '40%' }]}>ROTHSCHILD</Text>
      <Text style={[styles.area, { left: '18%', top: '58%' }]}>KEREM</Text>
      <Text style={[styles.area, { left: '16%', top: '74%' }]}>NEVE TZEDEK</Text>
      <Text style={[styles.area, { left: '42%', top: '84%' }]}>FLORENTIN</Text>
      {pins.map((pin) => {
        const point = projectToPercent(pin.lat, pin.lng);
        return (
          <Pressable
            key={pin.placeId}
            onPress={() => onSelect(pin.placeId)}
            style={[styles.pin, { left: `${point.x}%`, top: `${point.y}%` }]}
          >
            <PinMarker pin={pin} selected={pin.placeId === selectedId} />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  map: { flex: 1, backgroundColor: colors.mapLand, overflow: 'hidden' },
  water: { position: 'absolute', left: 0, top: 0, bottom: 0, width: '12%', backgroundColor: colors.mapWater },
  park: {
    position: 'absolute',
    left: '36%',
    top: '46%',
    width: '16%',
    height: '12%',
    backgroundColor: colors.mapPark,
    borderRadius: 8,
  },
  road: { position: 'absolute', height: 3, backgroundColor: colors.mapRoad, borderRadius: 2 },
  roadV: { position: 'absolute', top: '8%', bottom: '8%', width: 3, backgroundColor: colors.mapRoad },
  area: { position: 'absolute', color: '#B7A99A', fontSize: 10, fontWeight: '700', letterSpacing: 0.6 },
  pin: { position: 'absolute', transform: [{ translateX: -28 }, { translateY: -48 }] },
});
