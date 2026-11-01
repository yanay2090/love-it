import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, Text, TextInput, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, fonts, shadow } from '../theme';

export function haptic(): void {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
}

export function Avatar({
  initials,
  color,
  size = 36,
  ring = false,
}: {
  initials: string;
  color: string;
  size?: number;
  ring?: boolean;
}) {
  return (
    <View
      style={[
        styles.avatar,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
        },
        ring && styles.ring,
      ]}
    >
      <Text style={[styles.avatarText, { fontSize: size * 0.34 }]}>{initials}</Text>
    </View>
  );
}

export function Wordmark({ size = 34 }: { size?: number }) {
  return (
    <Text style={[styles.wordmark, { fontSize: size }]}>
      Love it <Text style={{ color: colors.coral }}>♥</Text>
    </Text>
  );
}

export function SearchField({
  value,
  onChangeText,
  placeholder,
  autoFocus = false,
}: {
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  autoFocus?: boolean;
}) {
  return (
    <View style={styles.search}>
      <Ionicons name="search" size={18} color={colors.muted} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.faint}
        style={styles.searchInput}
        autoFocus={autoFocus}
        autoCorrect={false}
        autoCapitalize="none"
        returnKeyType="search"
        clearButtonMode="while-editing"
      />
    </View>
  );
}

export function HeartButton({
  filled,
  onPress,
  size = 44,
}: {
  filled: boolean;
  onPress: () => void;
  size?: number;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={filled ? 'Loved' : 'Love it'}
      onPress={() => {
        haptic();
        onPress();
      }}
      style={[
        styles.heart,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: filled ? colors.coral : colors.coralSoft,
        },
      ]}
    >
      <Ionicons name={filled ? 'heart' : 'heart-outline'} size={size * 0.46} color={filled ? colors.white : colors.coral} />
    </Pressable>
  );
}

export function PrimaryButton({
  label,
  onPress,
  icon,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={[styles.primary, disabled && { opacity: 0.45 }]}
    >
      {icon ? <Ionicons name={icon} size={18} color={colors.white} /> : null}
      <Text style={styles.primaryText}>{label}</Text>
    </Pressable>
  );
}

export function SecondaryButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.secondary}>
      <Text style={styles.secondaryText}>{label}</Text>
    </Pressable>
  );
}

export function Chip({
  label,
  active,
  badge,
  onPress,
}: {
  label: string;
  active: boolean;
  badge?: number;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, active ? styles.chipOn : styles.chipOff]}>
      <Text style={[styles.chipText, active && styles.chipTextOn]}>{label}</Text>
      {badge !== undefined ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

export function Thumb({ uri, size = 64 }: { uri?: string; size?: number }) {
  if (!uri) {
    return <View style={[styles.thumb, { width: size, height: size, borderRadius: 16 }]} />;
  }
  return <Image source={{ uri }} style={{ width: size, height: size, borderRadius: 16 }} contentFit="cover" />;
}

export function cardShadow(extra?: StyleProp<ViewStyle>): StyleProp<ViewStyle> {
  return [shadow.card, extra];
}

const styles = StyleSheet.create({
  avatar: { alignItems: 'center', justifyContent: 'center' },
  ring: { borderWidth: 3, borderColor: '#FFD5DB' },
  avatarText: { color: colors.white, fontWeight: '800' },
  wordmark: { fontFamily: fonts.serif, color: colors.ink, letterSpacing: -0.4 },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.white,
    borderRadius: 24,
    paddingHorizontal: 14,
    height: 48,
    ...shadow.soft,
  },
  searchInput: { flex: 1, fontFamily: fonts.sans, fontSize: 16, color: colors.ink, paddingVertical: 0 },
  heart: { alignItems: 'center', justifyContent: 'center' },
  primary: {
    flex: 1,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    ...shadow.soft,
  },
  primaryText: { color: colors.paper, fontFamily: fonts.sansSemibold, fontSize: 16 },
  secondary: {
    height: 52,
    paddingHorizontal: 18,
    borderRadius: 26,
    backgroundColor: colors.hairline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: { fontWeight: '700', color: colors.ink },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 18,
  },
  chipOn: { backgroundColor: colors.chip },
  chipOff: { backgroundColor: colors.white, ...shadow.soft },
  chipText: { fontWeight: '700', color: colors.ink },
  chipTextOn: { color: colors.white },
  badge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: colors.coral,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: colors.white, fontSize: 11, fontWeight: '800' },
  thumb: {
    backgroundColor: '#F4A03C',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
