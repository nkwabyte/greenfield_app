/**
 * Ghana Regions and Districts
 * Source: Wikipedia — "Districts of Ghana" (261 MMDAs, updated 2024)
 * https://en.wikipedia.org/wiki/Districts_of_Ghana
 *
 * Names use clean short forms (without "District" / "Municipal" / "Metropolitan"
 * suffixes) so fuzzy-matching against Excel sheet names works reliably.
 * 16 Regions · 261 Districts total
 */

export const GHANA_REGIONS_AND_DISTRICTS: Record<string, string[]> = {

    // ── Ahafo (6) ────────────────────────────────────────────────────────
    'Ahafo': [
        'Asunafo North', 'Asunafo South',
        'Asutifi North', 'Asutifi South',
        'Tano North', 'Tano South',
    ],

    // ── Ashanti (43) ─────────────────────────────────────────────────────
    'Ashanti': [
        'Adansi Asokwa', 'Adansi North', 'Adansi South',
        'Afigya Kwabre North', 'Afigya Kwabre South',
        'Ahafo Ano North', 'Ahafo Ano South East', 'Ahafo Ano South West',
        'Akrofuom',
        'Amansie Central', 'Amansie South', 'Amansie West',
        'Asante Akim Central', 'Asante Akim North', 'Asante Akim South',
        'Asokore Mampong', 'Asokwa',
        'Atwima Kwanwoma', 'Atwima Mponua',
        'Atwima Nwabiagya', 'Atwima Nwabiagya North',
        'Bekwai',
        'Bosome Freho', 'Bosomtwe',
        'Ejisu', 'Ejura Sekyedumase',
        'Juaben',
        'Kumasi', 'KMA', 'Kumasi Metropolitan',
        'Kwabre East', 'Kwadaso',
        'Mampong',
        'Obuasi', 'Obuasi East',
        'Offinso', 'Offinso North',
        'Oforikrom', 'Old Tafo',
        'Sekyere Afram Plains', 'Sekyere Central',
        'Sekyere East', 'Sekyere Kumawu', 'Sekyere South',
        'Suame',
    ],

    // ── Bono (12) ────────────────────────────────────────────────────────
    'Bono': [
        'Banda',
        'Berekum East', 'Berekum West',
        'Dormaa Central', 'Dormaa East', 'Dormaa West',
        'Jaman North', 'Jaman South',
        'Sunyani', 'Sunyani West',
        'Tain',
        'Wenchi',
    ],

    // ── Bono East (11) ───────────────────────────────────────────────────
    'Bono East': [
        'Atebubu Amantin',
        'Kintampo North', 'Kintampo South',
        'Nkoranza North', 'Nkoranza South',
        'Pru East', 'Pru West',
        'Sene East', 'Sene West',
        'Techiman', 'Techiman North',
    ],

    // ── Central (22) ─────────────────────────────────────────────────────
    'Central': [
        'Abura Asebu Kwamankese',
        'Agona East', 'Agona West',
        'Ajumako Enyan Essiam',
        'Asikuma Odoben Brakwa',
        'Assin Central', 'Assin North', 'Assin South',
        'Awutu Senya East', 'Awutu Senya West',
        'Cape Coast', 'Cape Coast Metropolitan',
        'Effutu', 'Ekumfi',
        'Gomoa Central', 'Gomoa East', 'Gomoa West',
        'KEEA', 'Komenda Edina Eguafo Abirem',
        'Mfantsiman',
        'Twifo Ati Morkwa', 'Twifo Hemang Lower Denkyira',
        'Upper Denkyira East', 'Upper Denkyira West',
    ],

    // ── Eastern (33) ─────────────────────────────────────────────────────
    'Eastern': [
        'Abuakwa North', 'Abuakwa South',
        'Achiase',
        'Akuapem North', 'Akuapem South', 'Akuapim North', 'Akuapim South',
        'Akyemansa',
        'Asene Manso Akroso',
        'Asuogyaman',
        'Atiwa East', 'Atiwa West',
        'Ayensuano',
        'Birim Central', 'Birim North', 'Birim South',
        'Denkyembour',
        'Fanteakwa North', 'Fanteakwa South',
        'Kwaebibirem',
        'Kwahu Afram Plains North', 'Kwahu Afram Plains South',
        'Kwahu East', 'Kwahu South', 'Kwahu West',
        'Lower Manya Krobo',
        'New Juaben North', 'New Juaben South',
        'Nsawam Adoagyiri', 'Nsawam Adoagyire',
        'Okere', 'Suhum',
        'Upper Manya Krobo', 'Upper West Akim',
        'West Akim', 'Yilo Krobo',
    ],

    // ── Greater Accra (29) ───────────────────────────────────────────────
    'Greater Accra': [
        'Ablekuma Central', 'Ablekuma North', 'Ablekuma West',
        'Accra', 'Accra Metropolitan', 'AMA',
        'Ada East', 'Ada West',
        'Adenta', 'Ashaiman',
        'Ayawaso Central', 'Ayawaso East', 'Ayawaso North', 'Ayawaso West',
        'Ga Central', 'Ga East', 'Ga North', 'Ga South', 'Ga West',
        'Korle Klottey',
        'Kpone Katamanso',
        'Krowor',
        'La Dade Kotopon',
        'La Nkwantanang Madina',
        'Ledzokuku', 'Ledzekuku',
        'Ningo Prampram',
        'Okaikwei North',
        'Shai Osudoku',
        'Tema', 'Tema Metropolitan', 'Tema West',
        'Weija Gbawe',
    ],

    // ── North East (6) ───────────────────────────────────────────────────
    'North East': [
        'Bunkpurugu Nyankpanduri',
        'Chereponi',
        'East Mamprusi',
        'Mamprugu Moagduri',
        'West Mamprusi',
        'Yunyoo Nasuan', 'Yunyoo-Nasuan',
    ],

    // ── Northern (16) ────────────────────────────────────────────────────
    'Northern': [
        'Gushegu', 'Karaga', 'Kpandai', 'Kumbungu',
        'Mion', 'Nanton',
        'Nanumba North', 'Nanumba South',
        'Saboba', 'Sagnarigu', 'Savelugu',
        'Tamale', 'Tamale Metropolitan',
        'Tatale Sangule', 'Tatale Sanguli',
        'Tolon', 'Yendi', 'Zabzugu',
    ],

    // ── Oti (9) ──────────────────────────────────────────────────────────
    'Oti': [
        'Biakoye', 'Guan',
        'Jasikan', 'Kadjebi',
        'Krachi East', 'Krachi Nchumuru', 'Krachi West',
        'Nkwanta North', 'Nkwanta South',
    ],

    // ── Savannah (7) ─────────────────────────────────────────────────────
    'Savannah': [
        'Bole',
        'Central Gonja', 'East Gonja',
        'North Gonja', 'North East Gonja',
        'Sawla Tuna Kalba', 'Sawla-Tuna-Kalba',
        'West Gonja',
    ],

    // ── Upper East (15) ──────────────────────────────────────────────────
    'Upper East': [
        'Bawku', 'Bawku West',
        'Binduri',
        'Bolgatanga', 'Bolgatanga East',
        'Bongo',
        'Builsa North', 'Builsa South',
        'Garu',
        'Kassena Nankana', 'Kassena Nankana East', 'Kassena Nankana West',
        'Nabdam', 'Pusiga',
        'Talensi', 'Tempane',
    ],

    // ── Upper West (11) ──────────────────────────────────────────────────
    'Upper West': [
        'Daffiama Bussie Issa',
        'Jirapa',
        'Lambussie Karni',
        'Lawra',
        'Nadowli Kaleo', 'Nadowli-Kaleo',
        'Nandom',
        'Sissala East', 'Sissala West',
        'Wa', 'Wa East', 'Wa West',
    ],

    // ── Volta (18) ───────────────────────────────────────────────────────
    'Volta': [
        'Adaklu',
        'Afadzato South',
        'Agotime Ziope',
        'Akatsi North', 'Akatsi South',
        'Anloga',
        'Central Tongu',
        'Ho', 'Ho West',
        'Hohoe', 'Keta',
        'Ketu North', 'Ketu South',
        'Kpando',
        'North Dayi', 'North Tongu',
        'South Dayi', 'South Tongu',
    ],

    // ── Western (14) ─────────────────────────────────────────────────────
    'Western': [
        'Ahanta West',
        'Amenfi Central', 'Wassa Amenfi Central',
        'Amenfi East', 'Wassa Amenfi East',
        'Amenfi West', 'Wassa Amenfi West',
        'Effia Kwesimintsim',
        'Ellembelle', 'Jomoro',
        'Mpohor',
        'Nzema East',
        'Prestea Huni Valley', 'Prestea-Huni Valley',
        'Sekondi Takoradi', 'Sekondi Takoradi Metropolitan',
        'Shama',
        'Tarkwa Nsuaem', 'Tarkwa-Nsuaem',
        'Wassa East',
    ],

    // ── Western North (9) ────────────────────────────────────────────────
    'Western North': [
        'Aowin', 'Aowin Suaman',
        'Bia East', 'Bia West',
        'Bibiani Anhwiaso Bekwai',
        'Bodi', 'Juaboso',
        'Sefwi Akontombra',
        'Sefwi Wiawso', 'Sefwi-Wiawso',
        'Suaman',
    ],
};

export const GHANA_REGION_NAMES = Object.keys(GHANA_REGIONS_AND_DISTRICTS).sort();

export function getDistrictsForRegion(region: string): string[] {
    return (GHANA_REGIONS_AND_DISTRICTS[region] ?? []).sort();
}
