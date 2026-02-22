import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials in environment.");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function uploadCSV(filePath, tableName) {
    console.log(`Uploading ${filePath} to ${tableName}...`);
    if (!fs.existsSync(filePath)) {
        console.warn(`File ${filePath} not found, skipping.`);
        return;
    }

    const content = fs.readFileSync(filePath, 'utf8');
    const records = parse(content, { columns: true, skip_empty_lines: true });

    // Convert 'items' and 'payments' back to parsed JSON for Supabase API insertion
    for (let record of records) {
        if (record.items) {
            try { record.items = JSON.parse(record.items); } catch (e) { }
        }
        if (record.payments) {
            try { record.payments = JSON.parse(record.payments); } catch (e) { }
        }
    }

    // Chunk array to avoid URL length / payload too large limits
    const chunkSize = 200;
    for (let i = 0; i < records.length; i += chunkSize) {
        const chunk = records.slice(i, i + chunkSize);
        const { error } = await supabase.from(tableName).upsert(chunk, { onConflict: 'id', ignoreDuplicates: false });
        if (error) {
            console.error(`Error uploading chunk to ${tableName}:`, error);
            throw error;
        }
        console.log(`Uploaded ${i + chunk.length}/${records.length} to ${tableName}`);
    }
}

async function main() {
    try {
        const dataDir = path.join(process.cwd(), 'data');

        // Order matters for foreign keys
        await uploadCSV(path.join(dataDir, 'suppliers_import.csv'), 'suppliers');
        await uploadCSV(path.join(dataDir, 'products_import.csv'), 'products');
        await uploadCSV(path.join(dataDir, 'farmer_groups_import.csv'), 'farmer_groups');

        // Farmers
        await uploadCSV(path.join(dataDir, 'new_farmers_import.csv'), 'farmers');

        // Requests
        await uploadCSV(path.join(dataDir, 'farmer_requests_import.csv'), 'farmer_requests');

        console.log("All uploads completed successfully!");
    } catch (e) {
        console.error("Upload failed:", e);
    }
}

main();
