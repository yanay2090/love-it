/**
 * Field Notes, refined — v1.0.
 * The motion spec's drop-in token set. Mobile and web both read this object.
 */
export const tokens = {
  color: {
    ink: '#1C1917',
    paper: '#F7F3EC',
    linen: '#FFFDF9',
    tomato: '#E2412B',
    clay: '#B0714B',
    stone: '#857C72',
    hairline: '#E5DED3',
    sea: '#CBD8D6',
    map: { land: '#EFE9DF', road: '#FBF8F3', block: '#E9E2D6', park: '#DDE0CF', water: '#CBD8D6' },
    scrim: 'rgba(28,25,23,0.32)',
    role: {
      background: 'paper',
      surface: 'linen',
      text: 'ink',
      textSecondary: 'stone',
      border: 'hairline',
      accent: 'tomato',
      friends: 'clay',
      buttonPrimaryBg: 'ink',
      buttonPrimaryText: 'paper',
      pinSaved: 'ink',
      pinFriends: 'clay',
      pinSelected: 'ink',
      pinHeart: 'tomato',
    },
  },
  space: { xxs: 4, xs: 8, sm: 12, md: 16, lg: 24, xl: 32, xxl: 48, screenGutter: 24, cardPadding: 16 },
  radius: { xs: 4, sm: 8, md: 12, lg: 20, pill: 999 },
  border: { hairline: 0.5, focus: 1 },
  font: {
    serif: 'InstrumentSerif_400Regular',
    serifItalic: 'InstrumentSerif_400Regular_Italic',
    sans: 'InterTight_400Regular',
    sansMedium: 'InterTight_500Medium',
    sansSemibold: 'InterTight_600SemiBold',
  },
  type: {
    largeTitle: { font: 'serif', size: 34, lineHeight: 40, letterSpacing: -0.3 },
    title: { font: 'serif', size: 28, lineHeight: 32, letterSpacing: -0.2 },
    headline: { font: 'sansSemibold', size: 17, lineHeight: 24, letterSpacing: 0 },
    body: { font: 'sans', size: 16, lineHeight: 24, letterSpacing: 0 },
    caption: { font: 'sansMedium', size: 12, lineHeight: 16, letterSpacing: 0.1 },
    overline: { font: 'sansSemibold', size: 11, lineHeight: 16, letterSpacing: 1.3, textTransform: 'uppercase' },
    pinLabel: { font: 'serifItalic', size: 15, lineHeight: 16, haloColor: 'paper', haloWidth: 3 },
  },
  elevation: {
    card: { shadowColor: '#1C1917', shadowOpacity: 0.14, shadowRadius: 20, shadowOffset: { width: 0, height: 16 } },
    float: { shadowColor: '#1C1917', shadowOpacity: 0.08, shadowRadius: 10, shadowOffset: { width: 0, height: 6 } },
  },
  motion: {
    spring: {
      snappy: { damping: 22, stiffness: 380, mass: 0.8 },
      smooth: { damping: 28, stiffness: 260, mass: 1 },
      hero: { damping: 30, stiffness: 210, mass: 1 },
    },
    easing: {
      out: [0.22, 1, 0.36, 1],
      in: [0.4, 0, 1, 1],
      standard: [0.2, 0, 0, 1],
    },
    duration: { fadeIn: 180, fadeOut: 120, crossfade: 200, reducedMotion: 200 },
    pinSelectedScale: 1.45,
    cardDelayAfterPin: 60,
    listStagger: 24,
    thresholds: {
      cardCommitRatio: 0.3,
      cardCommitVelocity: -800,
      sheetDismissRatio: 0.25,
      sheetDismissVelocity: 700,
      galleryDismissPull: 80,
    },
  },
  haptics: {
    pinSelect: 'selectionAsync',
    toggle: 'selectionAsync',
    tab: 'selectionAsync',
    detailOpen: 'impactAsync:Light',
    addOpen: 'impactAsync:Light',
    save: 'impactAsync:Medium',
    unsave: 'impactAsync:Light',
    addComplete: 'notificationAsync:Success',
  },
} as const;

export type Tokens = typeof tokens;

const palette = tokens.color;

export type ColorRole = keyof typeof palette.role;

/** Resolve a role name (`text`, `accent`, …) to a hex/rgba color. */
export function colorRole(role: ColorRole): string {
  const name = palette.role[role];
  if (name === 'paper') return palette.paper;
  if (name === 'linen') return palette.linen;
  if (name === 'ink') return palette.ink;
  if (name === 'stone') return palette.stone;
  if (name === 'hairline') return palette.hairline;
  if (name === 'tomato') return palette.tomato;
  return palette.clay;
}
