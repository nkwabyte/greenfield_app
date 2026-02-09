/**
 * Official 16 Regions of Ghana
 */
export const GHANA_REGIONS = [
    "Western North Region",
    "Western Region",
    "Volta Region",
    "Greater Accra Region",
    "Eastern Region",
    "Ashanti Region",
    "Central Region",
    "Northern Region",
    "Upper East Region",
    "Upper West Region",
    "Oti Region",
    "Bono East Region",
    "Ahafo Region",
    "Bono Region",
    "North East Region",
    "Savannah Region"
] as const;

export type GhanaRegion = typeof GHANA_REGIONS[number];

/**
 * Normalizes input region strings to the official 16 regions of Ghana.
 * Maps common abbreviations and variations to the standard names.
 */
export function normalizeRegion(input: string | undefined | null): string {
    if (!input) return 'N/A';

    const normalized = input.trim().toUpperCase();

    // 1. Check exact match with official regions (case-insensitive)
    const exactMatch = GHANA_REGIONS.find(r => r.toUpperCase() === normalized);
    if (exactMatch) return exactMatch;

    // Direct mappings for known variations
    const mappings: Record<string, GhanaRegion> = {
        'W/S': 'Western Region',
        'WESTERN SOUTH': 'Western Region',
        'WESTERN': 'Western Region',
        'W/N': 'Western North Region',
        'WESTERN NORTH': 'Western North Region',
        'B/A': 'Bono Region', // Old Brong Ahafo usually maps to Bono, or requires user clarification. Defaulting to Bono.
        'BRONG AHAFO': 'Bono Region',
        'AHAFO': 'Ahafo Region',
        'ASHANTI': 'Ashanti Region',
        'EASTERN': 'Eastern Region',
        'CENTRAL': 'Central Region',
        'NORTHERN': 'Northern Region',
        'VOLTA': 'Volta Region',
        'UPPER EAST': 'Upper East Region',
        'U/E': 'Upper East Region',
        'UPPER WEST': 'Upper West Region',
        'U/W': 'Upper West Region',
        'OTI': 'Oti Region',
        'BONO EAST': 'Bono East Region',
        'BONO': 'Bono Region',
        'SAVANNAH': 'Savannah Region',
        'NORTH EAST': 'North East Region',
        'GREATER ACCRA': 'Greater Accra Region',
        'ACCRA': 'Greater Accra Region',
        'GT. ACCRA': 'Greater Accra Region',
    };

    // 2. Check exact match in mappings
    if (mappings[normalized]) {
        return mappings[normalized];
    }

    // 3. Check partial matches/heuristics
    // If it contains "WESTERN NORTH", return "Western North Region"
    if (normalized.includes('WESTERN NORTH') || normalized.includes('W/N')) return 'Western North Region';
    if (normalized.includes('WESTERN') || normalized.includes('W/S')) return 'Western Region';
    if (normalized.includes('ASHANTI')) return 'Ashanti Region';
    if (normalized.includes('BRONG') || normalized.includes('B/A')) return 'Bono Region';
    if (normalized.includes('AHAFO')) return 'Ahafo Region';
    if (normalized.includes('CENTRAL')) return 'Central Region';
    if (normalized.includes('EASTERN')) return 'Eastern Region';
    if (normalized.includes('VOLTA')) return 'Volta Region';
    if (normalized.includes('OTI')) return 'Oti Region';
    if (normalized.includes('SAVANNAH')) return 'Savannah Region';

    // Upper East/West
    if (normalized.includes('UPPER EAST') || normalized.includes('U/E')) return 'Upper East Region';
    if (normalized.includes('UPPER WEST') || normalized.includes('U/W')) return 'Upper West Region';

    // Northern (careful not to match Northern in Western North)
    if (normalized.includes('NORTHERN') && !normalized.includes('WEST')) return 'Northern Region';

    if (normalized.includes('ACCRA')) return 'Greater Accra Region';

    // Bono variations
    if (normalized.includes('BONO EAST')) return 'Bono East Region';
    if (normalized.includes('BONO')) return 'Bono Region';
    if (normalized.includes('NORTH EAST')) return 'North East Region';

    // Fallback
    return 'N/A';
}
