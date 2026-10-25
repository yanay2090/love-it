export const colors = {
  cream: '#FBF6F1',
  creamDeep: '#F3EBE3',
  ink: '#1B1918',
  muted: '#8D847C',
  faint: '#C4BBB2',
  line: '#EFE4DA',
  white: '#FFFFFF',
  coral: '#FF5A6C',
  coralDark: '#F04458',
  coralSoft: '#FFE6EA',
  chip: '#1E1E1E',
  shadow: '#6B4B3E',
  mapLand: '#EFE4D4',
  mapWater: '#D5E7F0',
  mapPark: '#E3ECD4',
  mapRoad: '#F7F3EC',
};

export const space = {
  screen: 16,
  radius: 22,
};

export const shadow = {
  card: {
    shadowColor: colors.shadow,
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  soft: {
    shadowColor: colors.shadow,
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
} as const;
