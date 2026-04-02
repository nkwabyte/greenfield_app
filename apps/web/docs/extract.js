const fs = require('fs');
const xlsx = require('xlsx');

// The official list from the app
const GHANA_REGIONS_AND_DISTRICTS = {
    'Ahafo': ['Asunafo North', 'Asunafo South', 'Asutifi North', 'Asutifi South', 'Tano North', 'Tano South'],
    'Ashanti': ['Adansi Asokwa', 'Adansi North', 'Adansi South', 'Afigya Kwabre North', 'Afigya Kwabre South', 'Ahafo Ano North', 'Ahafo Ano South East', 'Ahafo Ano South West', 'Akrofuom', 'Amansie Central', 'Amansie South', 'Amansie West', 'Asante Akim Central', 'Asante Akim North', 'Asante Akim South', 'Asokore Mampong', 'Asokwa', 'Atwima Kwanwoma', 'Atwima Mponua', 'Atwima Nwabiagya', 'Atwima Nwabiagya North', 'Bekwai', 'Bosome Freho', 'Bosomtwe', 'Ejisu', 'Ejura Sekyedumase', 'Juaben', 'Kumasi', 'KMA', 'Kumasi Metropolitan', 'Kwabre East', 'Kwadaso', 'Mampong', 'Obuasi', 'Obuasi East', 'Offinso', 'Offinso North', 'Oforikrom', 'Old Tafo', 'Sekyere Afram Plains', 'Sekyere Central', 'Sekyere East', 'Sekyere Kumawu', 'Sekyere South', 'Suame'],
    'Bono': ['Banda', 'Berekum East', 'Berekum West', 'Dormaa Central', 'Dormaa East', 'Dormaa West', 'Jaman North', 'Jaman South', 'Sunyani', 'Sunyani West', 'Tain', 'Wenchi'],
    'Bono East': ['Atebubu Amantin', 'Kintampo North', 'Kintampo South', 'Nkoranza North', 'Nkoranza South', 'Pru East', 'Pru West', 'Sene East', 'Sene West', 'Techiman', 'Techiman North'],
    'Central': ['Abura Asebu Kwamankese', 'Agona East', 'Agona West', 'Ajumako Enyan Essiam', 'Asikuma Odoben Brakwa', 'Assin Central', 'Assin North', 'Assin South', 'Awutu Senya East', 'Awutu Senya West', 'Cape Coast', 'Cape Coast Metropolitan', 'Effutu', 'Ekumfi', 'Gomoa Central', 'Gomoa East', 'Gomoa West', 'KEEA', 'Komenda Edina Eguafo Abirem', 'Mfantsiman', 'Twifo Ati Morkwa', 'Twifo Hemang Lower Denkyira', 'Upper Denkyira East', 'Upper Denkyira West'],
    'Eastern': ['Abuakwa North', 'Abuakwa South', 'Achiase', 'Akuapem North', 'Akuapem South', 'Akuapim North', 'Akuapim South', 'Akyemansa', 'Asene Manso Akroso', 'Asuogyaman', 'Atiwa East', 'Atiwa West', 'Ayensuano', 'Birim Central', 'Birim North', 'Birim South', 'Denkyembour', 'Fanteakwa North', 'Fanteakwa South', 'Kwaebibirem', 'Kwahu Afram Plains North', 'Kwahu Afram Plains South', 'Kwahu East', 'Kwahu South', 'Kwahu West', 'Lower Manya Krobo', 'New Juaben North', 'New Juaben South', 'Nsawam Adoagyiri', 'Nsawam Adoagyire', 'Okere', 'Suhum', 'Upper Manya Krobo', 'Upper West Akim', 'West Akim', 'Yilo Krobo'],
    'Greater Accra': ['Ablekuma Central', 'Ablekuma North', 'Ablekuma West', 'Accra', 'Accra Metropolitan', 'AMA', 'Ada East', 'Ada West', 'Adenta', 'Ashaiman', 'Ayawaso Central', 'Ayawaso East', 'Ayawaso North', 'Ayawaso West', 'Ga Central', 'Ga East', 'Ga North', 'Ga South', 'Ga West', 'Korle Klottey', 'Kpone Katamanso', 'Krowor', 'La Dade Kotopon', 'La Nkwantanang Madina', 'Ledzokuku', 'Ledzekuku', 'Ningo Prampram', 'Okaikwei North', 'Shai Osudoku', 'Tema', 'Tema Metropolitan', 'Tema West', 'Weija Gbawe'],
    'North East': ['Bunkpurugu Nyankpanduri', 'Chereponi', 'East Mamprusi', 'Mamprugu Moagduri', 'West Mamprusi', 'Yunyoo Nasuan', 'Yunyoo-Nasuan'],
    'Northern': ['Gushegu', 'Karaga', 'Kpandai', 'Kumbungu', 'Mion', 'Nanton', 'Nanumba North', 'Nanumba South', 'Saboba', 'Sagnarigu', 'Savelugu', 'Tamale', 'Tamale Metropolitan', 'Tatale Sangule', 'Tatale Sanguli', 'Tolon', 'Yendi', 'Zabzugu'],
    'Oti': ['Biakoye', 'Guan', 'Jasikan', 'Kadjebi', 'Krachi East', 'Krachi Nchumuru', 'Krachi West', 'Nkwanta North', 'Nkwanta South'],
    'Savannah': ['Bole', 'Central Gonja', 'East Gonja', 'North Gonja', 'North East Gonja', 'Sawla Tuna Kalba', 'Sawla-Tuna-Kalba', 'West Gonja'],
    'Upper East': ['Bawku', 'Bawku West', 'Binduri', 'Bolgatanga', 'Bolgatanga East', 'Bongo', 'Builsa North', 'Builsa South', 'Garu', 'Kassena Nankana', 'Kassena Nankana East', 'Kassena Nankana West', 'Nabdam', 'Pusiga', 'Talensi', 'Tempane'],
    'Upper West': ['Daffiama Bussie Issa', 'Jirapa', 'Lambussie Karni', 'Lawra', 'Nadowli Kaleo', 'Nadowli-Kaleo', 'Nandom', 'Sissala East', 'Sissala West', 'Wa', 'Wa East', 'Wa West'],
    'Volta': ['Adaklu', 'Afadzato South', 'Agotime Ziope', 'Akatsi North', 'Akatsi South', 'Anloga', 'Central Tongu', 'Ho', 'Ho West', 'Hohoe', 'Keta', 'Ketu North', 'Ketu South', 'Kpando', 'North Dayi', 'North Tongu', 'South Dayi', 'South Tongu'],
    'Western': ['Ahanta West', 'Amenfi Central', 'Wassa Amenfi Central', 'Amenfi East', 'Wassa Amenfi East', 'Amenfi West', 'Wassa Amenfi West', 'Effia Kwesimintsim', 'Ellembelle', 'Jomoro', 'Mpohor', 'Nzema East', 'Prestea Huni Valley', 'Prestea-Huni Valley', 'Sekondi Takoradi', 'Sekondi Takoradi Metropolitan', 'Shama', 'Tarkwa Nsuaem', 'Tarkwa-Nsuaem', 'Wassa East'],
    'Western North': ['Aowin', 'Aowin Suaman', 'Bia East', 'Bia West', 'Bibiani Anhwiaso Bekwai', 'Bodi', 'Juaboso', 'Sefwi Akontombra', 'Sefwi Wiawso', 'Sefwi-Wiawso', 'Suaman']
};

const mapRegion = (r) => {
    if (!r) return '';
    const upper = r.toUpperCase().trim();
    if (upper === 'W/N' || upper.includes('WESTERN NORTH')) return 'Western North';
    if (upper === 'BRONG AHAFO') return 'Bono'; // Historically split into Bono, Bono East, Ahafo. We'll map to Bono and fix via district later
    if (upper.includes('ASHANTI')) return 'Ashanti';
    if (upper.includes('CENTRAL')) return 'Central';
    if (upper.includes('EASTERN')) return 'Eastern';
    if (upper === 'WESTERN') return 'Western';
    if (upper === 'AHAFO') return 'Ahafo';
    if (upper === 'SAVANNAH') return 'Savannah';

    // Fallback exact match
    for (const region of Object.keys(GHANA_REGIONS_AND_DISTRICTS)) {
        if (region.toUpperCase() === upper) return region;
    }
    return r;
};

// Hardcoded district mappings based on sheet names
const districtMappings = {
    'ASSIN FOSU-CR': { region: 'Central', district: 'Assin Central' },
    'TWIFO PRASO -CR': { region: 'Central', district: 'Twifo Ati Morkwa' },
    'BOGOSO DISTRICT': { region: 'Western', district: 'Prestea Huni Valley' },
    'SAMREBO DISTRICT-WS': { region: 'Western', district: 'Wassa Amenfi West' },
    'ASEMPANAYE DISTRICT': { region: 'Western North', district: 'Juaboso' },
    'TEPA DISTRICT -ASH': { region: 'Ashanti', district: 'Ahafo Ano North' },
    'SANKORE DISTRICT -AHAFO': { region: 'Ahafo', district: 'Asunafo South' },
    'DIASO DISTRICT-CR': { region: 'Central', district: 'Upper Denkyira West' },
    'KOMENDA-EDINA-ABIREM': { region: 'Central', district: 'Komenda Edina Eguafo Abirem' },
    'DUNKWA -CR': { region: 'Central', district: 'Upper Denkyira East' },
    'PRESTEA-WS': { region: 'Western', district: 'Prestea Huni Valley' },
    'KASAPIN -AHAF0': { region: 'Ahafo', district: 'Asunafo North' },
    'KONONGO -ASH': { region: 'Ashanti', district: 'Asante Akim Central' },
    'SUHUM': { region: 'Eastern', district: 'Suhum' },
    'TARKWA': { region: 'Western', district: 'Tarkwa Nsuaem' },
    'NKRAKWANTA': { region: 'Bono', district: 'Dormaa West' },
    'AGONA SWEDRO': { region: 'Central', district: 'Agona West' },
    'ANYINAM': { region: 'Eastern', district: 'Atiwa East' },
    'EFFIDUASE': { region: 'Ashanti', district: 'Sekyere East' },
    'NKAWIE': { region: 'Ashanti', district: 'Atwima Nwabiagya' },
    'OBUASI': { region: 'Ashanti', district: 'Obuasi' },
    'ADUBIASE': { region: 'Ashanti', district: 'Adansi South' },
    'ADUBIASE B': { region: 'Ashanti', district: 'Adansi South' },
    'ELLUOKROM': { region: 'Western North', district: 'Bia West' },
    'BEREKUM': { region: 'Bono', district: 'Berekum East' },
    'NKAAWIE B': { region: 'Ashanti', district: 'Atwima Nwabiagya' },
    'SUNYANI': { region: 'Bono', district: 'Sunyani' },
    'AGONA -MAMPONG': { region: 'Ashanti', district: 'Sekyere South' },
    'JUASO': { region: 'Ashanti', district: 'Asante Akim South' }
};

const extractVal = (obj, keys) => {
    for (const key of keys) {
        if (obj[key] !== undefined) {
            let val = obj[key];
            if (typeof val === 'string') return val.trim().replace(/\s+/g, ' ');
            return val;
        }
    }
    return '';
};

const workbook = xlsx.readFile('./data.xlsx');
let allFarmers = [];
let unknownRegions = new Set();
let unknownDistricts = new Set();
const { randomUUID } = require('crypto');

const toTitleCase = (str) => {
    if (!str) return '';
    return String(str).toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};

for (let i = 0; i < workbook.SheetNames.length; i++) {
    const sheetName = workbook.SheetNames[i];
    if (sheetName.toUpperCase() === 'SUMMARY') continue;

    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet);

    // Figure out Region / District mapped from sheetName
    let mappedR = '';
    let mappedD = '';
    const cleanSheetName = sheetName.toUpperCase().trim();
    if (districtMappings[cleanSheetName]) {
        mappedR = districtMappings[cleanSheetName].region;
        mappedD = districtMappings[cleanSheetName].district;
    }

    for (const row of data) {
        let name = extractVal(row, ['FARMERS NAME', 'FARMER NAME', 'NAME OF FARMERS', 'NAME', 'FARMER\'S NAME']);
        if (!name) continue;

        let genderRaw = extractVal(row, ['GENDER', ' SEX', 'SEX ', 'SEX']);
        let gender = 'Other';
        if (genderRaw) {
            let gStr = String(genderRaw).toUpperCase().trim();
            if (gStr.startsWith('M')) gender = 'Male';
            else if (gStr.startsWith('F')) gender = 'Female';
        }

        let society = extractVal(row, ['SOCIETY', 'SOCIETY ']);
        let regionRaw = extractVal(row, ['REGION', 'REGION ']);

        let finalRegion = mappedR || mapRegion(regionRaw);

        // Sometimes region might be 'BRONG AHAFO' and mappedR is 'Bono'. Let's trust mappedR if it exists.
        if (!mappedR && finalRegion) {
            let cleaned = mapRegion(finalRegion);
            finalRegion = cleaned;
        }

        let district = mappedD || cleanSheetName;

        let dob = null; // No DOB in sheet, only Age. Will generate dob? No, better leave dob null or don't set it if it doesn't exist? Schema might require gender, but maybe dob is optional. We can skip it here.
        let age = extractVal(row, ['AGE', ' AGE', 'AGE ']);
        let farmSize = extractVal(row, ['FARM SIZE (ACRES)', ' FARM SIZE', 'FARM SIZE', 'FARM SIZE ']);
        let community = ''; // Doesn't seem to be in the headers reliably, but we will leave it empty as requested or extract if possible

        allFarmers.push({
            id: randomUUID(),
            name: toTitleCase(name),
            gender: gender,
            society: toTitleCase(society),
            region: finalRegion,
            district: district,
            age: age ? String(age).trim() : '',
            farm_size: farmSize ? String(farmSize).trim() : '',
            community: community,
            contact: '',
            education_level: '',
            join_date: new Date().toISOString(),
            status: 'Active',
            crops_grown: '[]', // empty array in JSON representation for CSV
            deleted: 'false',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        });
    }
}

console.log(`Parsed ${allFarmers.length} farmers`);

// Let's create a CSV
const header = [
    'id', 'name', 'gender', 'region', 'district', 'society', 'community', 'contact', 'age', 'education_level',
    'farm_size', 'crops_grown', 'status', 'join_date', 'deleted'
]; // Excluded created_at and updated_at since Supabase usually sets those automatically? The schema has them, we can include them if needed. Let's include them.
header.push('created_at', 'updated_at');

let csvContent = header.join(',') + '\n';

allFarmers.forEach(f => {
    let row = [
        f.id || '',
        f.name ? `"${String(f.name).replace(/"/g, '""')}"` : '',
        f.gender || '',
        f.region ? `"${String(f.region).replace(/"/g, '""')}"` : '',
        f.district ? `"${String(f.district).replace(/"/g, '""')}"` : '',
        f.society ? `"${String(f.society).replace(/"/g, '""')}"` : '',
        f.community ? `"${String(f.community).replace(/"/g, '""')}"` : '',
        f.contact || '',
        f.age || '',
        f.education_level || '',
        f.farm_size || '',
        f.crops_grown || '',
        f.status || '',
        f.join_date || '',
        f.deleted || 'false',
        f.created_at || '',
        f.updated_at || ''
    ];
    csvContent += row.join(',') + '\n';
});

fs.writeFileSync('farmers_import.csv', csvContent);
console.log('Saved to farmers_import.csv');
