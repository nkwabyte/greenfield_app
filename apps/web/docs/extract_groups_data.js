import fs from 'fs';
import XLSX from 'xlsx';
import { randomUUID } from 'crypto';

const inputFile = 'FarmerGroups.xlsx';
const existingFarmersCsv = 'farmers_import.csv';

const suppliersCsv = 'suppliers_import.csv';
const productsCsv = 'products_import.csv';
const groupsCsv = 'farmer_groups_import.csv';
const newFarmersCsv = 'new_farmers_import.csv';
const requestsCsv = 'farmer_requests_import.csv';

const GHANA_REGIONS_AND_DISTRICTS = {
    'Ahafo': ['Asunafo North', 'Asunafo South', 'Asutifi North', 'Asutifi South', 'Tano North', 'Tano South'],
    'Ashanti': ['Adansi Asokwa', 'Adansi North', 'Adansi South', 'Afigya Kwabre North', 'Afigya Kwabre South', 'Ahafo Ano North', 'Ahafo Ano South East', 'Ahafo Ano South West', 'Akrofuom', 'Amansie Central', 'Amansie South', 'Amansie West', 'Asante Akim Central', 'Asante Akim North', 'Asante Akim South', 'Asokore Mampong', 'Asokwa', 'Atwima Kwanwoma', 'Atwima Mponua', 'Atwima Nwabiagya North', 'Atwima Nwabiagya', 'Bekwai', 'Bosome Freho', 'Bosomtwe', 'Ejisu', 'Ejura Sekyedumase', 'Juaben', 'Kumasi', 'Kwabre East', 'Kwadaso', 'Mampong', 'Obuasi East', 'Obuasi', 'Offinso North', 'Offinso', 'Oforikrom', 'Old Tafo', 'Sekyere Afram Plains', 'Sekyere Central', 'Sekyere East', 'Sekyere Kumawu', 'Sekyere South', 'Suame'],
    'Bono': ['Banda', 'Berekum East', 'Berekum West', 'Dormaa Central', 'Dormaa East', 'Dormaa West', 'Jaman North', 'Jaman South', 'Sunyani', 'Sunyani West', 'Tain', 'Wenchi'],
    'Bono East': ['Atebubu Amantin', 'Kintampo North', 'Kintampo South', 'Nkoranza North', 'Nkoranza South', 'Pru East', 'Pru West', 'Sene East', 'Sene West', 'Techiman', 'Techiman North'],
    'Central': ['Abura Asebu Kwamankese', 'Agona East', 'Agona West', 'Ajumako Enyan Essiam', 'Asikuma Odoben Brakwa', 'Assin Central', 'Assin North', 'Assin South', 'Awutu Senya East', 'Awutu Senya', 'Cape Coast', 'Effutu', 'Ekumfi', 'Gomoa Central', 'Gomoa East', 'Gomoa West', 'Komenda Edina Eguafo Abirem', 'Mfantsiman', 'Twifo Atti Morkwa', 'Twifo Hemang Lower Denkyira', 'Upper Denkyira East', 'Upper Denkyira West'],
    'Eastern': ['Abuakwa North', 'Abuakwa South', 'Achiase', 'Akuapim North', 'Akuapim South', 'Akyemansa', 'Asene Manso Akroso', 'Asuogyaman', 'Atiwa East', 'Atiwa West', 'Ayensuano', 'Birim Central', 'Birim North', 'Birim South', 'Denkyembour', 'Fanteakwa North', 'Fanteakwa South', 'Kwaebibirem', 'Kwahu Afram Plains North', 'Kwahu Afram Plains South', 'Kwahu East', 'Kwahu South', 'Kwahu West', 'Lower Manya Krobo', 'New Juaben North', 'New Juaben South', 'Nsawam Adoagyiri', 'Okere', 'Suhum', 'Upper Manya Krobo', 'Upper West Akim', 'West Akim', 'Yilo Krobo'],
    'Greater Accra': ['Ablekuma Central', 'Ablekuma North', 'Ablekuma West', 'Accra', 'Ada East', 'Ada West', 'Adentan', 'Ashaiman', 'Ayawaso Central', 'Ayawaso East', 'Ayawaso North', 'Ayawaso West', 'Ga Central', 'Ga East', 'Ga North', 'Ga South', 'Ga West', 'Kpone Katamanso', 'Korle Klottey', 'Krowor', 'La Dade Kotopon', 'La Nkwantanang Madina', 'Ledzokuku', 'Ningo Prampram', 'Okaikwei North', 'Shai Osudoku', 'Tema', 'Tema West'],
    'North East': ['Bunkpurugu Nyankpanduri', 'Chereponi', 'East Mamprusi', 'Mamprugu Moagduri', 'West Mamprusi', 'Yunyoo Nasuan'],
    'Northern': ['Gushegu', 'Karaga', 'Kpandai', 'Kumbungu', 'Mion', 'Nanton', 'Nanumba North', 'Nanumba South', 'Saboba', 'Sagnarigu', 'Savelugu', 'Tamale', 'Tatale Sanguli', 'Tolon', 'Yendi', 'Zabzugu'],
    'Oti': ['Biakoye', 'Jasikan', 'Kadjebi', 'Krachi East', 'Krachi Nchumuru', 'Krachi West', 'Nkwanta North', 'Nkwanta South', 'Guan'],
    'Savannah': ['Bole', 'Central Gonja', 'East Gonja', 'North East Gonja', 'North Gonja', 'Sawla Tuna Kalba', 'West Gonja'],
    'Upper East': ['Bawku', 'Bawku West', 'Binduri', 'Bolgatanga East', 'Bolgatanga', 'Bongo', 'Builsa North', 'Builsa South', 'Garu', 'Kassena Nankana East', 'Kassena Nankana West', 'Nabdam', 'Pusiga', 'Tempane'],
    'Upper West': ['Daffiama Bussie Issa', 'Jirapa', 'Lambussie Karni', 'Lawra', 'Nadowli Kaleo', 'Nandom', 'Sissala East', 'Sissala West', 'Wa East', 'Wa', 'Wa West'],
    'Volta': ['Adaklu', 'Afadzato South', 'Agotime Ziope', 'Akatsi North', 'Akatsi South', 'Anloga', 'Central Tongu', 'Ho', 'Ho West', 'Keta', 'Ketu North', 'Ketu South', 'Kpando', 'North Dayi', 'North Tongu', 'South Dayi', 'South Tongu', 'Mafi Kumasi'],
    'Western': ['Ahanta West', 'Amenfi Central', 'Amenfi East', 'Amenfi West', 'Effia Kwesimintsim', 'Ellembelle', 'Jomoro', 'Mpohor', 'Nzema East', 'Prestea Huni Valley', 'Sekondi Takoradi', 'Shama', 'Tarkwa Nsuaem', 'Wassa East'],
    'Western North': ['Aowin', 'Bia East', 'Bia West', 'Bodi', 'Juabeso', 'Sefwi Akontombra', 'Sefwi Wiawso', 'Suaman', 'Bibiani Anhwiaso Bekwai']
};

export const GHANA_REGION_NAMES = Object.keys(GHANA_REGIONS_AND_DISTRICTS);

// Convert standard regions and districts for matching
const ALL_DISTRICTS = Object.values(GHANA_REGIONS_AND_DISTRICTS).flat();
const FLAT_REGIONS = Object.keys(GHANA_REGIONS_AND_DISTRICTS);

const districtMappings = {
    'WASSA AMENFI EST': 'Amenfi East',
    'WASSA AMENFI EAST': 'Amenfi East',
    'WASSA AMENFI WEST': 'Amenfi West',
    'WASSA AMENFI CENTRAl': 'Amenfi Central',
    'AOWIN': 'Aowin',
    'TARKWA NSUAEM': 'Tarkwa Nsuaem',
    'BOSOMTWE': 'Bosomtwe',
    'BOSOME FREHO': 'Bosome Freho',
    'AMANSIE SOUTH': 'Amansie South',
    'AMANSIE CENTRAL': 'Amansie Central',
    'AFIGYA KWABRE SOUTH': 'Afigya Kwabre South',
    'OBUASI EAST': 'Obuasi East',
    'OFFINSO SOUTH': 'Offinso',
    'ADANSI ASOKWA': 'Adansi Asokwa'
};

function normalizeStr(s) {
    if (!s) return '';
    return String(s).toUpperCase().replace(/[^A-Z]/g, '');
}

function findRegion(val) {
    if (!val) return null;
    let v = String(val).toUpperCase().trim();
    if (v.includes('WESTERN NORTH')) return 'Western North';
    if (v.includes('WESTERN')) return 'Western';
    if (v.includes('ASHANTI')) return 'Ashanti';
    if (v.includes('CENTRAL')) return 'Central';
    if (v.includes('EASTERN')) return 'Eastern';
    if (v.includes('BONO EAST')) return 'Bono East';
    if (v.includes('BONO')) return 'Bono';
    if (v.includes('AHAFO')) return 'Ahafo';

    // Fuzzy match length check
    let nv = normalizeStr(v);
    for (let r of FLAT_REGIONS) {
        if (normalizeStr(r) === nv) return r;
    }
    return null;
}

function findDistrict(val, finalRegion) {
    if (!val) return null;
    let v = String(val).toUpperCase().trim();
    if (districtMappings[v]) return districtMappings[v];

    let nv = normalizeStr(v);
    const pool = finalRegion ? GHANA_REGIONS_AND_DISTRICTS[finalRegion] : ALL_DISTRICTS;
    for (let d of pool) {
        if (normalizeStr(d) === nv) {
            return d;
        }
    }

    for (let d of ALL_DISTRICTS) {
        if (normalizeStr(d) === nv) return d;
    }
    return String(val).trim(); // Keep original if no match
}

function toTitleCase(str) {
    if (!str) return '';
    return String(str).toLowerCase().replace(/(?:^|\s|-)\S/g, function (a) { return a.toUpperCase(); });
}

// 1. Read existing farmers into a lookup table
const existingFarmersByRef = {};
if (fs.existsSync(existingFarmersCsv)) {
    const csvData = fs.readFileSync(existingFarmersCsv, 'utf-8');
    const lines = csvData.split('\n');
    const headers = lines[0].split(',');
    const nameIdx = headers.indexOf('name');
    const societyIdx = headers.indexOf('society'); // maybe not used strictly

    for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        let pLine = lines[i].split(',');
        let id = pLine[0];
        let name = pLine[nameIdx] ? pLine[nameIdx].replace(/"/g, '').trim() : '';
        let society = pLine[societyIdx] ? pLine[societyIdx].replace(/"/g, '').trim() : '';
        if (name) {
            let key = normalizeStr(name);
            existingFarmersByRef[key] = id;
        }
    }
    console.log(`Loaded ${Object.keys(existingFarmersByRef).length} existing farmers for lookup.`);
}

console.log("Loading Excel...");
const workbook = XLSX.readFile(inputFile);

// Datastores
const suppliers = [];
const products = [];
const farmerGroups = [];
const newFarmers = [];
const requests = [];

// 2. Generate Supplier
const currentIso = new Date().toISOString();
const defaultSupplierId = randomUUID();
suppliers.push({
    id: defaultSupplierId,
    name: "Greenfield",
    contact_person: "Samuel Amissah",
    email: "",
    phone: "+233243631511",
    created_at: currentIso,
    updated_at: currentIso,
    deleted: "false"
});

// 3. Extract Products
console.log("Extracting products...");
// Inspect Sheet 1 for products
const sheetName1 = workbook.SheetNames[1];
const sheet1 = workbook.Sheets[sheetName1];
const data1 = XLSX.utils.sheet_to_json(sheet1, { header: 1 });

const productNamesRow = data1[8] || [];
const productUnitsRow = data1[9] || [];

const productMapping = {}; // colIdx => product object

for (let c = 4; c < productNamesRow.length; c++) {
    let rawProduct = productNamesRow[c];
    let rawUnit = productUnitsRow[c];

    // Ignore totals/deposits 
    if (typeof rawProduct === 'string' && (rawProduct.toUpperCase().includes('TOTAL') || rawProduct.toUpperCase().includes('DEPOSIT') || rawProduct.toUpperCase().includes('BALANCE') || rawProduct.toUpperCase().includes('REPAYMENT'))) {
        continue;
    }

    if (rawProduct && String(rawProduct).trim() !== '') {
        let pName = String(rawProduct).trim();
        let pUnit = rawUnit ? String(rawUnit).trim() : 'Unit';
        let fullName = `${pName} - ${pUnit}`;

        // Find if already generated to ensure uniqueness maybe?
        let existing = products.find(p => p.name === fullName);
        let pid;
        if (!existing) {
            pid = randomUUID();
            products.push({
                id: pid,
                name: fullName,
                category: "Other",
                supplier_id: defaultSupplierId,
                quantity: 0,
                price: 0,
                deleted: "false",
                created_at: currentIso,
                updated_at: currentIso
            });
        } else {
            pid = existing.id;
        }
        productMapping[c] = { id: pid, name: fullName };
    } else {
        // sometimes column is spanned, check left column product
        if (productMapping[c - 1] && rawUnit) {
            let pUnit = String(rawUnit).trim();
            // Just use the name from before but unit is new
            let baseName = productMapping[c - 1].name.split(' - ')[0]; // hacky way to get base product name
            let fullName = `${baseName} - ${pUnit}`;
            let existing = products.find(p => p.name === fullName);
            let pid;
            if (!existing) {
                pid = randomUUID();
                products.push({
                    id: pid,
                    name: fullName,
                    category: "Other",
                    supplier_id: defaultSupplierId,
                    quantity: 0,
                    price: 0,
                    deleted: "false",
                    created_at: currentIso,
                    updated_at: currentIso
                });
            } else {
                pid = existing.id;
            }
            productMapping[c] = { id: pid, name: fullName };
        }
    }
}
console.log(`Generated ${products.length} products.`);


// 4. Extract Groups and Requests
console.log("Extracting groups, new farmers, and requests...");

workbook.SheetNames.forEach(sheetName => {
    if (sheetName.toUpperCase() === 'SUMMARY') return;

    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    if (!data || data.length < 10) return;

    // Header extraction
    let sheetRegion = '';
    let sheetDistrict = '';
    let sheetSociety = '';

    // Region is usually in Row 4 (index 3), District in Row 5 (index 4), Society in Row 6 (index 5)
    const r4 = data[3] || [];
    const r5 = data[4] || [];
    const r6 = data[5] || [];

    // Search for values near keywords
    for (let c = 0; c < r4.length; c++) {
        let v = String(r4[c]).toUpperCase();
        if (v.includes('REGION')) {
            sheetRegion = r4[c + 1] || v.split(':')[1] || '';
            break;
        }
    }
    for (let c = 0; c < r5.length; c++) {
        let v = String(r5[c]).toUpperCase();
        if (v.includes('DISTRICT')) {
            sheetDistrict = r5[c + 1] || v.split(':')[1] || '';
            break;
        }
    }
    for (let c = 0; c < r6.length; c++) {
        let v = String(r6[c]).toUpperCase();
        if (v.includes('SOCIETY')) {
            sheetSociety = r6[c + 1] || v.split(':')[1] || sheetName;
            break;
        }
    }

    if (!sheetSociety || sheetSociety.trim() === '') sheetSociety = sheetName;

    // Normalize Location
    let finalRegion = findRegion(sheetRegion);
    let finalDistrict = findDistrict(sheetDistrict, finalRegion);
    let finalSociety = toTitleCase(sheetSociety);

    const groupId = randomUUID();
    farmerGroups.push({
        id: groupId,
        name: finalSociety, // Use society name as group name
        society: finalSociety,
        season_year: '',
        deleted: "false",
        created_at: currentIso,
        updated_at: currentIso
    });

    // Rows start at index 10 (Row 11) usually in all sheets? Our inspection showed row 9 as "NOV REMN" and row 10 starting farmers
    let startIdx = 9; // Let's guess 9, inspection returned row 9 as data start
    for (let i = 0; i < data.length; i++) {
        if (data[i] && String(data[i][1]).trim() === '1') {
            startIdx = i;
            break;
        }
    }

    // Identify columns for this sheet since they might drift
    const headerRow = data[startIdx - 2] || [];
    let nameCol = 2; // Default
    let totalAmtCol = -1;
    let depCol = -1;
    for (let c = 0; c < headerRow.length; c++) {
        let v = String(headerRow[c]).toUpperCase();
        if (v.includes('FARMER NAME')) nameCol = c;
        if (v.includes('TOTAL AMOUNT')) totalAmtCol = c;
        if (v.includes('DEPOSIT')) depCol = c;
    }

    for (let i = startIdx; i < data.length; i++) {
        const row = data[i];
        if (!row || !row[nameCol]) continue;

        let rawName = String(row[nameCol] || '').trim();
        let rowNum = parseInt(row[1]);

        // Skip totals or non-numbered rows (we still need the row to be a valid item row)
        // If it's a "Totals" row or blank completely we might skip, but let's check if there are quantities first.
        let hasOrder = false;
        for (let colStr in productMapping) {
            let col = parseInt(colStr);
            let qty = parseFloat(row[col]);
            if (qty && qty > 0) {
                hasOrder = true;
                break;
            }
        }

        if (isNaN(rowNum) && !rawName && !hasOrder) {
            continue;
        }

        // Specifically skip summary rows that aren't real farmers
        const skipKeywords = ['TOTAL', 'REPAYMENT', 'BALANCE', 'PRICE', 'AMOUNT', 'REMN'];
        const isSummaryRow = rawName && skipKeywords.some(kw => rawName.toUpperCase().includes(kw));

        if (isSummaryRow) {
            continue;
        }

        // Generate default name if empty
        const isNameEmpty = !rawName || rawName === '' || rawName.toUpperCase() === 'UNDEFINED';
        const finalName = isNameEmpty ? `Farmer ${randomUUID().split('-')[0]}` : toTitleCase(rawName);

        // Find or Create Farmer
        let farmerId = isNameEmpty ? null : existingFarmersByRef[normalizeStr(rawName)];
        if (!farmerId) {
            farmerId = randomUUID();
            newFarmers.push({
                id: farmerId,
                name: finalName,
                gender: '',
                region: finalRegion || 'Ashanti', // Default to Ashanti or the parsed region
                district: finalDistrict || 'Kumasi', // Default to a valid district or the parsed district
                society: finalSociety,
                community: '',
                contact: row[nameCol + 1] ? String(row[nameCol + 1]).trim() : '', // usually mobile is next column
                age: '',
                education_level: '',
                farm_size: '',
                crops_grown: '[]',
                status: 'Active',
                join_date: currentIso,
                deleted: 'false',
                created_at: currentIso,
                updated_at: currentIso
            });
            // Also store in lookup mapped to self in case they appear again in another sheet? Or ignore, fine.
            if (!isNameEmpty) {
                existingFarmersByRef[normalizeStr(rawName)] = farmerId;
            }
        }

        // Map Requests
        let reqItems = [];
        for (let colStr in productMapping) {
            let col = parseInt(colStr);
            let qty = parseFloat(row[col]);
            if (qty && qty > 0) {
                reqItems.push({
                    productId: productMapping[col].id,
                    productName: productMapping[col].name,
                    quantity: qty,
                    dynamicPrice: 0,
                    total: 0
                });
            }
        }

        if (reqItems.length > 0) {
            let gTotal = 0;
            if (totalAmtCol !== -1) gTotal = parseFloat(row[totalAmtCol]) || 0;
            let dep = 0;
            if (depCol !== -1) dep = parseFloat(row[depCol]) || 0;

            requests.push({
                id: randomUUID(),
                farmer_id: farmerId,
                group_id: groupId,
                items: JSON.stringify(reqItems).replace(/"/g, '""'), // escape for CSV string!
                grand_total: gTotal,
                deposit_paid: dep,
                status: 'Pending',
                request_date: currentIso,
                season_year: '',
                deleted: 'false',
                created_at: currentIso,
                updated_at: currentIso
            });
        }
    }
});
console.log(`Generated ${farmerGroups.length} groups, ${newFarmers.length} new farmers, ${requests.length} requests.`);

// ---------------- CSV EXPORTS ---------------- //

function toCsvString(val) {
    if (val === null || val === undefined) return '';
    return `"${String(val).replace(/"/g, '""')}"`;
}

// Write Suppliers
let suppliersHeader = ['id', 'name', 'contact_person', 'email', 'phone', 'deleted', 'created_at', 'updated_at'];
let suppliersCsvContent = suppliersHeader.join(',') + '\n' + suppliers.map(s => suppliersHeader.map(h => toCsvString(s[h])).join(',')).join('\n');
fs.writeFileSync(suppliersCsv, suppliersCsvContent, 'utf8');

// Write Products
let productsHeader = ['id', 'name', 'category', 'supplier_id', 'quantity', 'price', 'deleted', 'created_at', 'updated_at'];
let productsCsvContent = productsHeader.join(',') + '\n' + products.map(p => productsHeader.map(h => toCsvString(p[h])).join(',')).join('\n');
fs.writeFileSync(productsCsv, productsCsvContent, 'utf8');

// Write Farmer Groups
let groupsHeader = ['id', 'name', 'society', 'season_year', 'deleted', 'created_at', 'updated_at'];
let groupsCsvContent = groupsHeader.join(',') + '\n' + farmerGroups.map(g => groupsHeader.map(h => toCsvString(g[h])).join(',')).join('\n');
fs.writeFileSync(groupsCsv, groupsCsvContent, 'utf8');

// Write New Farmers (using strictly the farmers schema)
let newFarmersHeader = ['id', 'name', 'gender', 'region', 'district', 'society', 'community', 'contact', 'age', 'education_level', 'farm_size', 'crops_grown', 'status', 'join_date', 'deleted', 'created_at', 'updated_at'];
let newFarmersCsvContent = newFarmersHeader.join(',') + '\n' + newFarmers.map(f => newFarmersHeader.map(h => {
    if (h === 'crops_grown' && f[h] === '[]') return '"[]"'; // Handle JSON string exactly
    return toCsvString(f[h]);
}).join(',')).join('\n');
fs.writeFileSync(newFarmersCsv, newFarmersCsvContent, 'utf8');

// Write Requests
let requestsHeader = ['id', 'farmer_id', 'group_id', 'items', 'grand_total', 'deposit_paid', 'status', 'request_date', 'season_year', 'deleted', 'created_at', 'updated_at'];
let requestsCsvContent = requestsHeader.join(',') + '\n' + requests.map(r => requestsHeader.map(h => {
    if (h === 'items') return `"${r[h]}"`; // Already double escaped
    return toCsvString(r[h]);
}).join(',')).join('\n');
fs.writeFileSync(requestsCsv, requestsCsvContent, 'utf8');

console.log("Extraction completed successfully.");
