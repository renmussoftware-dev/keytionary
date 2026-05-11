export const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;
export type NoteName = typeof NOTES[number];

export const NOTE_DISPLAY: Record<string, string> = {
  'C#': 'C#/D♭', 'D#': 'D#/E♭', 'F#': 'F#/G♭', 'G#': 'G#/A♭', 'A#': 'A#/B♭',
};

export const NOTE_FLAT: Record<string, string> = {
  'C#': 'D♭', 'D#': 'E♭', 'F#': 'G♭', 'G#': 'A♭', 'A#': 'B♭',
};

export const INTERVAL_NAMES = ['R', '♭2', '2', '♭3', '3', '4', '♭5', '5', '♭6', '6', '♭7', '7'];

// Which note classes are "black keys" on the piano (indices into NOTES)
export const BLACK_KEY_CLASSES = new Set([1, 3, 6, 8, 10]);
export function isBlackKey(noteClass: number): boolean {
  return BLACK_KEY_CLASSES.has(noteClass);
}

export interface ScaleDef {
  steps: number[];
  degrees: string[];
  formula: string;
  category: 'major' | 'minor' | 'pentatonic' | 'mode' | 'other';
  description: string;
}

export const SCALES: Record<string, ScaleDef> = {
  'Major': {
    steps: [2,2,1,2,2,2,1], degrees: ['1','2','3','4','5','6','7'],
    formula: 'W W H W W W H', category: 'major',
    description: 'The foundation of Western music. Bright, happy sound.',
  },
  'Natural Minor': {
    steps: [2,1,2,2,1,2,2], degrees: ['1','2','♭3','4','5','♭6','♭7'],
    formula: 'W H W W H W W', category: 'minor',
    description: 'Dark, emotive. Used in countless rock and classical pieces.',
  },
  'Harmonic Minor': {
    steps: [2,1,2,2,1,3,1], degrees: ['1','2','♭3','4','5','♭6','7'],
    formula: 'W H W W H WH H', category: 'minor',
    description: 'Minor with raised 7th. Exotic, dramatic flavor.',
  },
  'Melodic Minor': {
    steps: [2,1,2,2,2,2,1], degrees: ['1','2','♭3','4','5','6','7'],
    formula: 'W H W W W W H', category: 'minor',
    description: 'Jazz staple. Smoother ascending minor scale.',
  },
  'Pentatonic Major': {
    steps: [2,2,3,2,3], degrees: ['1','2','3','5','6'],
    formula: 'W W WH W WH', category: 'pentatonic',
    description: '5-note scale. Works over almost anything. Country and blues.',
  },
  'Pentatonic Minor': {
    steps: [3,2,2,3,2], degrees: ['1','♭3','4','5','♭7'],
    formula: 'WH W W WH W', category: 'pentatonic',
    description: 'The most common rock/blues scale. Never sounds wrong.',
  },
  'Blues': {
    steps: [3,2,1,1,3,2], degrees: ['1','♭3','4','♯4','5','♭7'],
    formula: 'WH W H H WH W', category: 'pentatonic',
    description: 'Pentatonic minor + blue note. Essential for blues and rock.',
  },
  'Dorian': {
    steps: [2,1,2,2,2,1,2], degrees: ['1','2','♭3','4','5','6','♭7'],
    formula: 'W H W W W H W', category: 'mode',
    description: 'Minor mode with raised 6th. Jazz and funk favorite.',
  },
  'Phrygian': {
    steps: [1,2,2,2,1,2,2], degrees: ['1','♭2','♭3','4','5','♭6','♭7'],
    formula: 'H W W W H W W', category: 'mode',
    description: 'Dark Spanish/Flamenco sound. Starts with a half step.',
  },
  'Lydian': {
    steps: [2,2,2,1,2,2,1], degrees: ['1','2','3','♯4','5','6','7'],
    formula: 'W W W H W W H', category: 'mode',
    description: 'Dreamy, ethereal major mode. Raised 4th is the signature.',
  },
  'Mixolydian': {
    steps: [2,2,1,2,2,1,2], degrees: ['1','2','3','4','5','6','♭7'],
    formula: 'W W H W W H W', category: 'mode',
    description: 'Major with flat 7th. Dominant, bluesy. Classic rock staple.',
  },
  'Locrian': {
    steps: [1,2,2,1,2,2,2], degrees: ['1','♭2','♭3','4','♭5','♭6','♭7'],
    formula: 'H W W H W W W', category: 'mode',
    description: 'Darkest mode. Diminished fifth. Used in metal.',
  },
  'Whole Tone': {
    steps: [2,2,2,2,2,2], degrees: ['1','2','3','♯4','♯5','♭7'],
    formula: 'W W W W W W', category: 'other',
    description: 'All whole steps. Dreamy, ambiguous. Debussy.',
  },
  'Diminished (HW)': {
    steps: [1,2,1,2,1,2,1,2], degrees: ['1','♭2','♭3','3','♯4','5','6','♭7'],
    formula: 'H W H W H W H W', category: 'other',
    description: 'Symmetrical 8-note scale. Jazz and metal.',
  },
};

export interface ChordDef {
  intervals: number[];
  intervalNames: string[];
  category: 'triad' | 'seventh' | 'extended' | 'altered' | 'sus';
  description: string;
}

const INTERVAL_LONG_NAMES: Record<string, string> = {
  'R':    'Root',
  '♭2':   'Minor 2nd',
  '2':    'Major 2nd',
  '♭3':   'Minor 3rd',
  '3':    'Major 3rd',
  '4':    'Perfect 4th',
  '♭5':   'Diminished 5th',
  '5':    'Perfect 5th',
  '♯5':   'Augmented 5th',
  '♭6':   'Minor 6th',
  '6':    'Major 6th',
  '♭7':   'Minor 7th',
  '7':    'Major 7th',
  '♭♭7':  'Diminished 7th',
  '♭9':   'Minor 9th',
  '9':    '9th',
  '♯9':   'Augmented 9th',
  '11':   '11th',
  '♯11':  'Augmented 11th',
  '13':   '13th',
};

export function intervalLongName(symbol: string): string {
  return INTERVAL_LONG_NAMES[symbol] ?? symbol;
}

const SCALE_CATEGORY_LABELS: Record<ScaleDef['category'], string> = {
  major:      'Major scale',
  minor:      'Minor scale',
  pentatonic: 'Pentatonic scale',
  mode:       'Diatonic mode',
  other:      'Symmetric scale',
};

export function scaleCategoryLabel(cat: ScaleDef['category']): string {
  return SCALE_CATEGORY_LABELS[cat];
}

const CATEGORY_LABELS: Record<ChordDef['category'], string> = {
  triad:    'Triad',
  seventh:  'Seventh chord',
  extended: 'Extended chord',
  altered:  'Altered chord',
  sus:      'Suspended chord',
};

export function categoryLabel(cat: ChordDef['category']): string {
  return CATEGORY_LABELS[cat];
}

export function intervalColorBucket(symbol: string): 'root' | 'third' | 'fifth' | 'ext' {
  if (symbol === 'R') return 'root';
  if (symbol === '3' || symbol === '♭3') return 'third';
  if (symbol === '5' || symbol === '♭5' || symbol === '♯5') return 'fifth';
  return 'ext';
}

export const CHORDS: Record<string, ChordDef> = {
  'Major':       { intervals:[0,4,7],          intervalNames:['R','3','5'],             category:'triad',    description:'Bright and stable.' },
  'Minor':       { intervals:[0,3,7],          intervalNames:['R','♭3','5'],            category:'triad',    description:'Dark and emotive.' },
  'Diminished':  { intervals:[0,3,6],          intervalNames:['R','♭3','♭5'],          category:'triad',    description:'Tense, unstable.' },
  'Augmented':   { intervals:[0,4,8],          intervalNames:['R','3','♯5'],           category:'triad',    description:'Mysterious, floating.' },
  'Sus2':        { intervals:[0,2,7],          intervalNames:['R','2','5'],             category:'sus',      description:'Open, ambiguous.' },
  'Sus4':        { intervals:[0,5,7],          intervalNames:['R','4','5'],             category:'sus',      description:'Anticipatory tension.' },
  'Dom 7sus4':   { intervals:[0,5,7,10],       intervalNames:['R','4','5','♭7'],         category:'sus',      description:'Dominant 7 with the 3rd suspended to a 4th. Funk and modal jazz staple.' },
  'Power (5)':   { intervals:[0,7],            intervalNames:['R','5'],                 category:'triad',    description:'Root + 5th. Rock staple.' },
  'Major 6':     { intervals:[0,4,7,9],        intervalNames:['R','3','5','6'],         category:'seventh',  description:'Sweet jazz color.' },
  'Minor 6':     { intervals:[0,3,7,9],        intervalNames:['R','♭3','5','6'],       category:'seventh',  description:'Bittersweet quality.' },
  'Dominant 7':  { intervals:[0,4,7,10],       intervalNames:['R','3','5','♭7'],       category:'seventh',  description:'Wants to resolve. Blues essential.' },
  'Major 7':     { intervals:[0,4,7,11],       intervalNames:['R','3','5','7'],         category:'seventh',  description:'Lush, romantic jazz.' },
  'Minor 7':     { intervals:[0,3,7,10],       intervalNames:['R','♭3','5','♭7'],     category:'seventh',  description:'Smooth, melancholic.' },
  'Minor Maj7':  { intervals:[0,3,7,11],       intervalNames:['R','♭3','5','7'],       category:'seventh',  description:'Dark, cinematic.' },
  'Dim 7':       { intervals:[0,3,6,9],        intervalNames:['R','♭3','♭5','♭♭7'],  category:'seventh',  description:'Maximum tension. Symmetrical.' },
  'Half-Dim 7':  { intervals:[0,3,6,10],       intervalNames:['R','♭3','♭5','♭7'],   category:'seventh',  description:'Minor 7 flat 5. ii chord in minor.' },
  'Aug 7':       { intervals:[0,4,8,10],       intervalNames:['R','3','♯5','♭7'],     category:'seventh',  description:'Dominant with raised 5th.' },
  'Dominant 9':  { intervals:[0,4,7,10,14],    intervalNames:['R','3','5','♭7','9'],   category:'extended', description:'Rich dominant extension. R&B.' },
  'Major 9':     { intervals:[0,4,7,11,14],    intervalNames:['R','3','5','7','9'],     category:'extended', description:'Bright and expansive.' },
  'Minor 9':     { intervals:[0,3,7,10,14],    intervalNames:['R','♭3','5','♭7','9'], category:'extended', description:'Lush minor color.' },
  'Add9':        { intervals:[0,4,7,14],       intervalNames:['R','3','5','9'],         category:'extended', description:'Major with 9th, no 7th.' },
  'Dominant 11': { intervals:[0,4,7,10,14,17], intervalNames:['R','3','5','♭7','9','11'], category:'extended', description:'Full dominant stack.' },
  'Major 11':    { intervals:[0,4,7,11,14,17], intervalNames:['R','3','5','7','9','11'],  category:'extended', description:'Sophisticated jazz voicing.' },
  'Minor 11':    { intervals:[0,3,7,10,14,17], intervalNames:['R','♭3','5','♭7','9','11'], category:'extended', description:'Modal jazz staple.' },
  'Dominant 13': { intervals:[0,4,7,10,14,17,21], intervalNames:['R','3','5','♭7','9','11','13'], category:'extended', description:'Full jazz dominant.' },
  'Major 13':    { intervals:[0,4,7,11,14,17,21], intervalNames:['R','3','5','7','9','11','13'],   category:'extended', description:'Maximum major extension.' },
  'Minor 13':    { intervals:[0,3,7,10,14,17,21], intervalNames:['R','♭3','5','♭7','9','11','13'], category:'extended', description:'Full minor extension. Rich, complex jazz color.' },
  'Minor Add9':  { intervals:[0,3,7,14],           intervalNames:['R','♭3','5','9'],               category:'triad',    description:'Minor triad with added 9th. Emotional and open.' },
  'Add11':       { intervals:[0,4,7,17],           intervalNames:['R','3','5','11'],               category:'triad',    description:'Major triad with added 11th. Bright and expansive.' },
  '6/9':         { intervals:[0,4,7,9,14],         intervalNames:['R','3','5','6','9'],            category:'extended', description:'No 7th. Lush jazz voicing, works as a tonic.' },
  'Minor 6/9':   { intervals:[0,3,7,9,14],         intervalNames:['R','♭3','5','6','9'],           category:'extended', description:'Minor with 6th and 9th. Sophisticated jazz color.' },
  'Dom 7♭5':     { intervals:[0,4,6,10],           intervalNames:['R','3','♭5','♭7'],             category:'seventh',  description:'Dominant with flat 5. Tense tritone sound.' },
  'Dom 7♭9':     { intervals:[0,4,7,10,13],        intervalNames:['R','3','5','♭7','♭9'],         category:'extended', description:'Dark and tense. Classic jazz altered sound.' },
  'Dom 7♯9':     { intervals:[0,4,7,10,15],        intervalNames:['R','3','5','♭7','♯9'],         category:'extended', description:'The Hendrix chord. Blues, funk and rock.' },
  'Dom 7♯11':    { intervals:[0,4,7,10,18],        intervalNames:['R','3','5','♭7','♯11'],        category:'extended', description:'Lydian dominant. Jazz and fusion staple.' },
  'Maj7♯11':     { intervals:[0,4,7,11,18],        intervalNames:['R','3','5','7','♯11'],         category:'seventh',  description:'Lydian major 7th. Dreamy and floating.' },
};

// Note colors — Obsidian theme (rebalanced for harmony on dark surfaces).
export const COLORS = {
  root:       { fill:'#E0CC58', stroke:'#B49E2E', text:'#3E3208' },
  third:      { fill:'#D45846', stroke:'#9B3A2D', text:'#fff' },
  fifth:      { fill:'#3FA08A', stroke:'#26786A', text:'#fff' },
  extension:  { fill:'#5C8FCC', stroke:'#3D6BA0', text:'#fff' },
  scaleTone:  { fill:'#3F3F47', stroke:'#666670', text:'#E5E3DC' },
  ghost:      { fill:'#1A1A20', stroke:'#2E2E36', text:'rgba(242,241,236,0.30)' },
};
