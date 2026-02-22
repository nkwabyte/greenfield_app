import os
import json
import csv
import glob
from supabase import create_client, Client

url: str = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
key: str = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

if not url or not key:
    print("Missing Supabase credentials")
    exit(1)

supabase: Client = create_client(url, key)

def main():
    print("Fetching existing farmer groups from Supabase...")
    res = supabase.table("farmer_groups").select("id, name, society").execute()
    db_groups = res.data

    print(f"Found {len(db_groups)} farmer groups in DB.")
    
    # We want a map of society name to a list of farmer IDs.
    # Group names in DB might be slightly different in case, so let's use lower case for matching.
    db_society_map = {g['society'].strip().lower(): g for g in db_groups if g.get('society')}

    society_to_farmer_ids = {k: set() for k in db_society_map.keys()}

    print("Scanning farmer CSV files to collect IDs by society...")
    csv_files = glob.glob('farmers/farmers_part_*.csv') + ['data/new_farmers_import.csv']
    
    matched_farmers_count = 0

    for filename in csv_files:
        if not os.path.exists(filename):
            continue
        with open(filename, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                soc = row.get('society', '').strip().lower()
                farmer_id = row.get('id')
                if soc and farmer_id and soc in db_society_map:
                    society_to_farmer_ids[soc].add(farmer_id)
                    matched_farmers_count += 1

    print(f"Collected {matched_farmers_count} farmer IDs matching existing DB societies.")

    print("Updating farmer_groups in DB...")
    updated_count = 0
    for soc, farmer_ids_set in society_to_farmer_ids.items():
        if len(farmer_ids_set) > 0:
            group_id = db_society_map[soc]['id']
            farmer_ids_list = list(farmer_ids_set)
            
            # Update the group in DB
            response = supabase.table("farmer_groups").update({"farmer_ids": farmer_ids_list}).eq("id", group_id).execute()
            if response.data:
                print(f"Updated group '{db_society_map[soc]['name']}' with {len(farmer_ids_list)} farmers.")
                updated_count += 1
            else:
                print(f"Failed to update group '{db_society_map[soc]['name']}'.")

    print(f"Update complete! {updated_count} groups updated.")

if __name__ == "__main__":
    main()
