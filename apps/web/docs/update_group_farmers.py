import os, requests, csv
import json
from collections import defaultdict

URL = os.environ["NEXT_PUBLIC_SUPABASE_URL"]
KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
HEADERS = {"apikey": KEY, "Authorization": f"Bearer {KEY}", "Content-Type": "application/json"}

print("Fetching requests to build group->farmers mapping...")
r = requests.get(f"{URL}/rest/v1/farmer_requests?select=farmer_id,group_id", headers=HEADERS)
reqs = r.json()

group_to_farmers = defaultdict(set)
for req in reqs:
    if req.get('group_id') and req.get('farmer_id'):
        group_to_farmers[req['group_id']].add(req['farmer_id'])

print(f"Found {len(group_to_farmers)} groups with associated farmers.")

for group_id, farmer_ids_set in group_to_farmers.items():
    farmer_ids_list = list(farmer_ids_set)
    # The JSONB array of strings needs to be sent
    payload = {"farmer_ids": farmer_ids_list}
    
    res = requests.patch(f"{URL}/rest/v1/farmer_groups?id=eq.{group_id}", headers=HEADERS, json=payload)
    if res.status_code not in (200, 204):
        print(f"Error updating group {group_id}: {res.text}")

print("Successfully updated farmer_ids for all groups!")
