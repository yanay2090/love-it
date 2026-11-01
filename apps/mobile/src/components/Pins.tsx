import type { MapPin } from '@love-it/shared';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Ellipse, G, Line, Path, Text as SvgText } from 'react-native-svg';
import { colors, fonts } from '../theme';

const HEART =
  'M50 86 C 20 64, 4 46, 4 28 C 4 14, 15 4, 28 4 C 38 4, 45 9, 50 18 C 55 9, 62 4, 72 4 C 85 4, 96 14, 96 28 C 96 46, 80 64, 50 86 Z';

/** Field Notes pins: mine, friend, selected, cluster. */
export function PinMarker({ pin, selected }: { pin: MapPin; selected: boolean }) {
  const count = Number.parseInt(pin.label ?? '', 10) || pin.people.length || 1;
  return (
    <View style={styles.wrap} accessibilityLabel={pin.name}>
      {selected ? <SelectedPin /> : pin.kind === 'cluster' ? <ClusterPin count={count} /> : pin.kind === 'avatar' ? <FriendPin /> : <MinePin />}
      {selected ? (
        <Text style={styles.label} numberOfLines={1}>
          {pin.name}
        </Text>
      ) : null}
    </View>
  );
}

function MinePin() {
  return (
    <Svg width={36} height={40} viewBox="-32 -56 64 64">
      <G>
        <Line x1={0} y1={0} x2={0} y2={-7} stroke={colors.ink} strokeWidth={1.6} strokeLinecap="round" />
        <Circle cx={0} cy={-16.5} r={9.5} fill={colors.linen} stroke={colors.ink} strokeWidth={1.6} />
        <Path d={HEART} transform="translate(-4.94 -20.775) scale(0.0988)" fill={colors.tomato} />
      </G>
    </Svg>
  );
}

function FriendPin() {
  return (
    <Svg width={36} height={40} viewBox="-32 -56 64 64">
      <G>
        <Line x1={0} y1={0} x2={0} y2={-7} stroke={colors.clay} strokeWidth={1.6} strokeLinecap="round" />
        <Circle cx={0} cy={-16.5} r={9.5} fill={colors.linen} stroke={colors.clay} strokeWidth={1.6} />
        <Circle cx={0} cy={-16.5} r={3} fill={colors.clay} />
      </G>
    </Svg>
  );
}

function SelectedPin() {
  return (
    <Svg width={48} height={56} viewBox="-32 -56 64 64">
      <G>
        <Ellipse cx={0} cy={1} rx={7} ry={2.2} fill={colors.ink} opacity={0.22} />
        <Line x1={0} y1={0} x2={0} y2={-10} stroke={colors.ink} strokeWidth={2} strokeLinecap="round" />
        <Circle cx={0} cy={-24} r={14} fill={colors.ink} />
        <Path d={HEART} transform="translate(-7.28 -30.3) scale(0.1456)" fill={colors.tomato} />
      </G>
    </Svg>
  );
}

function ClusterPin({ count }: { count: number }) {
  return (
    <Svg width={44} height={44} viewBox="-24 -24 48 48">
      <Circle r={18} fill="none" stroke={colors.ink} strokeOpacity={0.18} strokeWidth={3} />
      <Circle r={15} fill={colors.ink} />
      <SvgText
        y={4.5}
        textAnchor="middle"
        fontFamily={fonts.sansSemibold}
        fontSize={12.5}
        fill={colors.paper}
      >
        {String(count)}
      </SvgText>
    </Svg>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', maxWidth: 120 },
  label: {
    marginTop: 2,
    fontFamily: fonts.serifItalic,
    fontSize: 15,
    lineHeight: 16,
    color: colors.ink,
    textShadowColor: colors.paper,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 3,
  },
});
