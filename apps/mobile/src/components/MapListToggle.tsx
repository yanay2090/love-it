import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, shadow } from '../theme';

export function MapListToggle({
  mode,
  onChange,
}: {
  mode: 'map' | 'list';
  onChange: (mode: 'map' | 'list') => void;
}) {
  return (
    <View style={styles.wrap}>
      <Side label="Map" icon="map" active={mode === 'map'} onPress={() => onChange('map')} />
      <Side label="List" icon="list" active={mode === 'list'} onPress={() => onChange('list')} />
    </View>
  );
}

function Side({
  label,
  icon,
  active,
  onPress,
}: {
  label: string;
  icon: 'map' | 'list';
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.side, active && styles.on]}>
      <Ionicons name={icon} size={14} color={active ? colors.white : colors.ink} />
      <Text style={[styles.text, active && styles.textOn]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderRadius: 18,
    padding: 4,
    ...shadow.soft,
  },
  side: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
  },
  on: { backgroundColor: colors.chip },
  text: { fontWeight: '700', color: colors.ink, fontSize: 13 },
  textOn: { color: colors.white },
});
