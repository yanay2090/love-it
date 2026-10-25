import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import type { MapPin, MapPinIcon } from '@love-it/shared';
import { StyleSheet, Text, View } from 'react-native';
import { colors, shadow } from '../theme';

export function PinMarker({ pin, selected }: { pin: MapPin; selected: boolean }) {
  if (pin.kind === 'cluster') {
    return (
      <View style={styles.clusterWrap}>
        <View style={styles.friendLabel}>
          <Ionicons name="heart" size={10} color={colors.white} />
          <Text style={styles.friendLabelText}>{pin.label}</Text>
        </View>
        <View style={[styles.cluster, selected && styles.selectedRing]}>
          {pin.people.map((person, index) => (
            <View
              key={person.id}
              style={[
                styles.mini,
                { backgroundColor: person.avatarColor, marginLeft: index === 0 ? 0 : -8, zIndex: 3 - index },
              ]}
            >
              <Text style={styles.miniText}>{person.initials}</Text>
            </View>
          ))}
        </View>
        <View style={styles.dot} />
      </View>
    );
  }

  if (pin.kind === 'avatar' && pin.people[0]) {
    const person = pin.people[0];
    return (
      <View style={styles.avatarPin}>
        <View style={[styles.face, { backgroundColor: person.avatarColor }, selected && styles.selectedRing]}>
          <Text style={styles.faceText}>{person.initials}</Text>
        </View>
        <View style={[styles.tail, { borderTopColor: person.avatarColor }]} />
      </View>
    );
  }

  return (
    <View style={[styles.category, { backgroundColor: iconColor(pin.icon) }, selected && styles.selectedRing]}>
      <CategoryIcon icon={pin.icon} />
    </View>
  );
}

function CategoryIcon({ icon }: { icon: MapPinIcon }) {
  const color = colors.white;
  if (icon === 'cafe') return <MaterialCommunityIcons name="coffee" size={16} color={color} />;
  if (icon === 'laptop') return <Ionicons name="laptop-outline" size={16} color={color} />;
  if (icon === 'bar') return <MaterialCommunityIcons name="glass-wine" size={16} color={color} />;
  if (icon === 'bakery') return <MaterialCommunityIcons name="bread-slice-outline" size={16} color={color} />;
  if (icon === 'hotel') return <Ionicons name="bed-outline" size={16} color={color} />;
  if (icon === 'attraction') return <Ionicons name="sparkles-outline" size={16} color={color} />;
  return <Ionicons name="heart" size={16} color={color} />;
}

function iconColor(icon: MapPinIcon): string {
  switch (icon) {
    case 'cafe':
      return '#8A5A3A';
    case 'laptop':
      return '#3D8BFF';
    case 'bar':
      return '#7C6BC4';
    case 'bakery':
      return '#F08A3A';
    case 'hotel':
      return '#2BB5AE';
    case 'attraction':
      return '#E86B9A';
    default:
      return colors.coral;
  }
}

const styles = StyleSheet.create({
  clusterWrap: { alignItems: 'center' },
  friendLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.coral,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 4,
  },
  friendLabelText: { color: colors.white, fontSize: 11, fontWeight: '800' },
  cluster: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderRadius: 22,
    padding: 4,
    borderWidth: 2,
    borderColor: colors.coral,
    ...shadow.soft,
  },
  mini: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.white,
  },
  miniText: { color: colors.white, fontSize: 10, fontWeight: '800' },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.coral,
    marginTop: 4,
    borderWidth: 2,
    borderColor: colors.white,
  },
  avatarPin: { alignItems: 'center' },
  face: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.white,
    ...shadow.soft,
  },
  faceText: { color: colors.white, fontWeight: '800', fontSize: 13 },
  tail: {
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    marginTop: -1,
  },
  category: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.white,
    ...shadow.soft,
  },
  selectedRing: { borderColor: colors.ink, borderWidth: 2 },
});
