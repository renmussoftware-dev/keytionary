// Keytionary — Obsidian theme.
// True near-black background with subtle warm tint, layered translucent
// surfaces using rgba(255,255,255,0.0X) over a single warm-tinted base, and
// 1px hairlines (6% opacity) instead of solid borders.
export const APP_NAME = 'Keytionary';

import { Dimensions, Platform } from 'react-native';

export const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

// ── Typography ───────────────────────────────────────────────────────────────
// UI uses the platform default (SF Pro on iOS / Roboto on Android) — clean
// modern sans-serifs that already match the design's intent at this scale.
// Mono is JetBrains Mono, loaded via expo-font on app launch (see _layout.tsx)
// for note labels, fret numbers, theory formulas, and any tabular numerics.
export const FONT_FAMILY = {
  ui:   undefined as string | undefined, // platform default
  mono: 'JetBrainsMono',
};

// ── Obsidian palette (RN-safe — no oklch) ────────────────────────────────────
const ROOT  = { fill: '#E0CC58', stroke: '#B49E2E', text: '#3E3208' };
const THIRD = { fill: '#D45846', stroke: '#9B3A2D', text: '#fff' };
const FIFTH = { fill: '#3FA08A', stroke: '#26786A', text: '#fff' };
const EXT   = { fill: '#5C8FCC', stroke: '#3D6BA0', text: '#fff' };
const SCALE = { fill: 'rgba(255,255,255,0.10)', stroke: 'rgba(255,255,255,0.18)', text: 'rgba(242,241,236,0.65)' };
const GHOST = { fill: 'rgba(255,255,255,0.04)', stroke: 'rgba(255,255,255,0.10)', text: 'rgba(242,241,236,0.30)' };

// Position colours rebalanced — same identity, lower chroma so they harmonize
const POS_FILLS = [
  '#6E60D9', // 1  indigo
  '#D77144', // 2  warm orange
  '#3FA08A', // 3  teal
  '#5C8FCC', // 4  blue
  '#C19052', // 5  amber
] as const;

function mix(hex: string, alpha: number): string {
  // hex must be #RRGGBB
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

export const COLORS = {
  // Layered translucent surfaces over a single warm-tinted base.
  // bg is the painted backstop (also used for the iOS frame fill).
  bg:           '#0A0A0C',
  bgElevated:   '#14141A', // keyboard panel and similar feature surfaces
  surface:      'rgba(255,255,255,0.03)',
  surfaceHigh:  'rgba(255,255,255,0.06)',
  surfaceActive:'rgba(255,255,255,0.09)',
  // Hairlines — replace heavy borders. Use these as borderColor everywhere.
  border:       'rgba(255,255,255,0.06)',
  borderLight:  'rgba(255,255,255,0.10)',
  text:         '#F2F1EC',
  textMuted:    'rgba(242,241,236,0.55)',
  textFaint:    'rgba(242,241,236,0.30)',

  root:    ROOT,
  third:   THIRD,
  fifth:   FIFTH,
  ext:     EXT,
  scale:   SCALE,
  ghost:   GHOST,

  pos: POS_FILLS.map(fill => ({
    fill,
    light:  mix(fill, 0.16),
    stroke: fill,
  })),

  caged: {
    C: { fill: POS_FILLS[0], light: mix(POS_FILLS[0], 0.16), stroke: POS_FILLS[0] },
    A: { fill: POS_FILLS[1], light: mix(POS_FILLS[1], 0.16), stroke: POS_FILLS[1] },
    G: { fill: POS_FILLS[2], light: mix(POS_FILLS[2], 0.16), stroke: POS_FILLS[2] },
    E: { fill: POS_FILLS[3], light: mix(POS_FILLS[3], 0.16), stroke: POS_FILLS[3] },
    D: { fill: POS_FILLS[4], light: mix(POS_FILLS[4], 0.16), stroke: POS_FILLS[4] },
  } as Record<string, { fill: string; light: string; stroke: string }>,

  accent:      '#6E60D9',                 // brand indigo, slightly desaturated
  accentSoft:  'rgba(110,96,217,0.18)',
  accentGlow:  'rgba(110,96,217,0.35)',
  accentLight: 'rgba(110,96,217,0.18)',
};

// Convenience: gradient stops for the keyboard backdrop.
export const KEYBOARD_GRADIENT = ['#14141A', '#0E0E13'] as const;

export const FONT = {
  regular: { fontWeight: '400' as const },
  medium:  { fontWeight: '500' as const },
  bold:    { fontWeight: '700' as const },
};

// Section-label treatment — small all-caps mono with wide tracking.
export const SECTION_LABEL = {
  fontSize: 10,
  fontWeight: '600' as const,
  color: COLORS.textFaint,
  letterSpacing: 1.2,
  textTransform: 'uppercase' as const,
  fontFamily: FONT_FAMILY.mono,
};

export const RADIUS = {
  sm: 6, md: 10, lg: 14, xl: 20, full: 999,
};

export const SPACE = {
  xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32,
};

// Helper used by callers that want platform-specific tabular numerals.
export const TABULAR_NUMS = Platform.select({
  ios: { fontVariant: ['tabular-nums' as const] },
  default: {},
});
