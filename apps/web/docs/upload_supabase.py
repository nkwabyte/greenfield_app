import csv
import json
import os
import requests

SUPABASE_URL = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("Missing Supabase credentials in environment.")
    exit(1)

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "resolution=merge-duplicates"
}

def upload_csv(filepath, table_name):
    print(f"Uploading {filepath} to {table_name}...")
    if not os.path.exists(filepath):
        print(f"File {filepath} not found, skipping.")
        return

    records = []
    with open(filepath, 'r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        for row in reader:
            for key, value in row.items():
                if value == "":
                    if key in ['season_year', 'email']:
                        row[key] = ""
                    else:
                        row[key] = None
                elif isinstance(value, str) and (value.startswith('[') or value.startswith('{')):
                    try: row[key] = json.loads(value)
                    except: pass
            records.append(row)

    chunk_size = 200
    for i in range(0, len(records), chunk_size):
        chunk = records[i:i + chunk_size]
        url = f"{SUPABASE_URL}/rest/v1/{table_name}"
        res = requests.post(url, headers=HEADERS, json=chunk)
        if res.status_code >= 300:
            print(f"Error uploading to {table_name}: {res.status_code} {res.text}")
        else:
            print(f"Uploaded {i + len(chunk)}/{len(records)} to {table_name}")

if __name__ == "__main__":
    data_dir = os.path.join(os.getcwd(), 'data')
    
    upload_csv(os.path.join(data_dir, 'suppliers_import.csv'), 'suppliers')
    upload_csv(os.path.join(data_dir, 'products_import.csv'), 'products')
    upload_csv(os.path.join(data_dir, 'farmer_groups_import.csv'), 'farmer_groups')
    upload_csv(os.path.join(data_dir, 'new_farmers_import.csv'), 'farmers')
    upload_csv(os.path.join(data_dir, 'farmer_requests_import.csv'), 'farmer_requests')
    
    print("All uploads completed successfully!")
