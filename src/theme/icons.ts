/**
 * Vector icons for content items, keyed by the existing data ids.
 * Kept separate so the content data (and its emoji fields) stays untouched.
 * Names use AppIcon's convention: plain = Ionicons, "mci:" = MaterialCommunityIcons.
 */
export const TOPIC_ICONS: Record<string, string> = {
  'ph-levels': 'mci:ph',
  'drinkable-minerals': 'mci:diamond-stone',
  'water-hardness': 'mci:water-opacity',
  turbidity: 'mci:waves',
  'monitoring-tips': 'mci:chart-timeline-variant',
};

export const TOPIC_GRADIENTS: Record<string, string[]> = {
  'ph-levels': ['#3ee0cf', '#0aa2b8'],
  'drinkable-minerals': ['#7dd3fc', '#2b8fd6'],
  'water-hardness': ['#a5b4fc', '#6366f1'],
  turbidity: ['#5eead4', '#0d9488'],
  'monitoring-tips': ['#fdba74', '#f97362'],
};

export const GUIDE_ICONS: Record<string, string> = {
  boiling: 'mci:fire',
  filtration: 'mci:water-pump',
  chlorination: 'mci:spray-bottle',
  uv_light: 'mci:lightbulb-on-outline',
  color_analysis: 'mci:palette-outline',
  ph_measurement: 'mci:test-tube',
  odor_detection: 'mci:scent',
  turbidity_check: 'mci:blur',
  poisoning_symptoms: 'mci:alert-octagon-outline',
  first_aid: 'mci:ambulance',
  medical_attention: 'mci:hospital-building',
  prevention: 'mci:shield-check-outline',
};

export const GUIDE_TAB_ICONS = {
  cleaning: 'mci:hand-wash-outline',
  classification: 'mci:magnify-scan',
  emergency: 'mci:water-alert',
} as const;
