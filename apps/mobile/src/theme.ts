import { tokens } from '@love-it/shared';

const palette = tokens.color;

/**
 * Screen colors. Names from the first coral draft stay so existing styles
 * compile; they now point at Field Notes. Tomato is the heart, not the buttons.
 */
export const colors = {
  ink: palette.ink,
  paper: palette.paper,
  linen: palette.linen,
  tomato: palette.tomato,
  clay: palette.clay,
  stone: palette.stone,
  hairline: palette.hairline,
  sea: palette.sea,
  cream: palette.paper,
  creamDeep: palette.paper,
  muted: palette.stone,
  faint: '#C4BBB4',
  line: palette.hairline,
  white: palette.linen,
  coral: palette.tomato,
  coralDark: palette.tomato,
  coralSoft: '#F6E4DF',
  chip: palette.ink,
  shadow: palette.ink,
  mapLand: palette.map.land,
  mapWater: palette.map.water,
  mapPark: palette.map.park,
  mapRoad: palette.map.road,
  scrim: palette.scrim,
};

export const space = tokens.space;

export const radius = tokens.radius;

export const fonts = tokens.font;

export const typeScale = tokens.type;

export const shadow = {
  card: {
    ...tokens.elevation.card,
    elevation: 6,
  },
  soft: {
    ...tokens.elevation.float,
    elevation: 3,
  },
} as const;
