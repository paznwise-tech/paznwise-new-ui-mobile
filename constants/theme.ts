// ─────────────────────────────────────────────────────────
// Paznwise Mobile — Dark Gallery Luxury Theme
// Inspired by Sotheby's × Indian Heritage craft markets
// ─────────────────────────────────────────────────────────

export const Colors = {
  // ── Backgrounds ──────────────────────────────────────────
  bg:          '#0D1B2A',   // deep gallery navy — primary bg
  bgCard:      '#152236',   // card surfaces
  bgElevated:  '#1C2F45',   // modals, sheets, elevated panels
  bgInput:     '#1A2D40',   // form inputs

  // ── Gold accent ───────────────────────────────────────────
  gold:        '#C9A84C',   // primary accent — heritage gold
  goldLight:   '#E8C97A',   // lighter gold for highlights
  goldDim:     '#C9A84C33', // gold at 20% — subtle borders

  // ── Text ─────────────────────────────────────────────────
  cream:       '#F5F0E8',   // primary text — warm cream
  creamDim:    '#B8AD9E',   // secondary text — muted cream
  creamFaint:  '#6B6259',   // placeholder / disabled

  // ── Semantic ─────────────────────────────────────────────
  success:     '#4CAF7D',
  error:       '#E05252',
  warning:     '#F6A723',

  // ── Borders ───────────────────────────────────────────────
  border:      '#1F3548',   // subtle card border
  borderGold:  '#C9A84C40', // gold border at 25%

  // ── Tabs ─────────────────────────────────────────────────
  tabActive:   '#C9A84C',
  tabInactive: '#4A6278',

  // ── Overlay ───────────────────────────────────────────────
  overlay:     'rgba(13,27,42,0.85)',
  overlayLight:'rgba(13,27,42,0.5)',
} as const;

export const Typography = {
  // Cormorant Garamond — serif, heritage, editorial
  heading: {
    fontFamily: 'CormorantGaramond_600SemiBold',
    color: Colors.cream,
    letterSpacing: 0.5,
  },
  headingItalic: {
    fontFamily: 'CormorantGaramond_500Medium_Italic',
    color: Colors.cream,
  },
  display: {
    fontFamily: 'CormorantGaramond_700Bold',
    color: Colors.cream,
    letterSpacing: -0.5,
  },

  // Inter — clean, modern body
  body: {
    fontFamily: 'Inter_400Regular',
    color: Colors.cream,
  },
  bodySemibold: {
    fontFamily: 'Inter_600SemiBold',
    color: Colors.cream,
  },
  bodyBold: {
    fontFamily: 'Inter_700Bold',
    color: Colors.cream,
  },
  caption: {
    fontFamily: 'Inter_400Regular',
    color: Colors.creamDim,
    fontSize: 12,
  },
  label: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: 'uppercase' as const,
    color: Colors.gold,
  },
} as const;

export const Spacing = {
  xs:  4,
  sm:  8,
  md:  16,
  lg:  24,
  xl:  32,
  xxl: 48,
} as const;

export const Radius = {
  sm:  8,
  md:  12,
  lg:  18,
  xl:  24,
  full: 999,
} as const;

export const Shadow = {
  gold: {
    shadowColor: Colors.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 5,
  },
} as const;
