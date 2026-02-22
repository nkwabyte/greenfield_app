import os, requests, csv
import urllib.parse

URL = os.environ["NEXT_PUBLIC_SUPABASE_URL"]
KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
HEADERS = {"apikey": KEY, "Authorization": f"Bearer {KEY}", "Content-Type": "application/json"}

print("Starting deduplication of new farmers...")

local_new_farmers = []
with open("data/new_farmers_import.csv") as f:
    for r in csv.DictReader(f):
        local_new_farmers.append(r["name"].strip())

# Keep unique names
names = list(set(local_new_farmers))
print(f"Checking {len(names)} unique names from new_farmers_import.csv")

for name in names:
    encoded_name = urllib.parse.quote(name)
    r = requests.get(f"{URL}/rest/v1/farmers?name=eq.{encoded_name}&select=id,name,created_at&order=created_at.asc", headers=HEADERS)
    matches = r.json()
    
    if len(matches) <= 1:
        continue # No duplicates for this name

    # The first one is the original one inserted by the user
    original_id = matches[0]["id"]
    duplicate_ids = [m["id"] for m in matches[1:]]
    
    print(f"Name '{name}': keeping {original_id}, merging {len(duplicate_ids)} duplicates.")
    
    # 1. Update farmer_requests to point to original_id
    for dup_id in duplicate_ids:
        # Patch farmer_requests
        payload = {"farmer_id": original_id}
        res_patch = requests.patch(f"{URL}/rest/v1/farmer_requests?farmer_id=eq.{dup_id}", headers=HEADERS, json=payload)
        
        # 2. Delete the duplicate farmer
        res_del = requests.delete(f"{URL}/rest/v1/farmers?id=eq.{dup_id}", headers=HEADERS)
        if res_del.status_code not in (200, 204):
            print(f"Error deleting {dup_id}: {res_del.text}")

print("Deduplication complete.")
