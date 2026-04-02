"""
rebuild_groups.py

Deletes all existing farmer_groups (and cascades their requests),
then recreates groups from societies found in the farmer CSV files,
links farmer_ids, and finally re-creates farmer_requests records
for the new_farmers_import.csv farmers (linked to their new group IDs).
"""
import os
import csv
import glob
import json
import uuid
from datetime import datetime, timezone
from supabase import create_client, Client

url: str = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
key: str = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

if not url or not key:
    print("Missing Supabase credentials. Export NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.")
    exit(1)

supabase: Client = create_client(url, key)
NOW = datetime.now(timezone.utc).isoformat()

BATCH = 200  # DB rows per upsert call

def chunk(lst, n):
    for i in range(0, len(lst), n):
        yield lst[i:i + n]


# ─────────────────────────────────────────────
# 1. Build society → [farmer_id] map from CSVs
# ─────────────────────────────────────────────
print("Scanning farmer CSVs …")
society_to_farmers: dict[str, list[dict]] = {}  # society → list of row dicts

csv_files = sorted(glob.glob('farmers/farmers_part_*.csv')) + ['data/new_farmers_import.csv']
for filepath in csv_files:
    if not os.path.exists(filepath):
        continue
    with open(filepath, 'r', encoding='utf-8') as f:
        for row in csv.DictReader(f):
            soc = row.get('society', '').strip()
            fid = row.get('id', '').strip()
            if soc and fid:
                society_to_farmers.setdefault(soc, []).append(row)

total_unique_societies = len(society_to_farmers)
total_farmers = sum(len(v) for v in society_to_farmers.values())
print(f"  Found {total_unique_societies} unique societies, {total_farmers} total farmer rows.")


# ─────────────────────────────────────────────
# 2. Delete all existing farmer_requests (FK to farmer_groups)
# ─────────────────────────────────────────────
print("\nDeleting all farmer_requests …")
del_res = supabase.table("farmer_requests").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()
print(f"  Deleted farmer_requests (rows: {len(del_res.data) if del_res.data else '?'})")

# ─────────────────────────────────────────────
# 3. Delete all existing farmer_groups
# ─────────────────────────────────────────────
print("Deleting all farmer_groups …")
del_res2 = supabase.table("farmer_groups").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()
print(f"  Deleted farmer_groups (rows: {len(del_res2.data) if del_res2.data else '?'})")


# ─────────────────────────────────────────────
# 4. Create new groups (one per society)
# ─────────────────────────────────────────────
print("\nCreating new farmer_groups …")
society_to_group_id: dict[str, str] = {}
new_groups = []

for soc, farmer_rows in society_to_farmers.items():
    group_id = str(uuid.uuid4())
    society_to_group_id[soc] = group_id
    farmer_ids = [r['id'] for r in farmer_rows]
    new_groups.append({
        "id": group_id,
        "name": soc,
        "society": soc,
        "season_year": "2026",
        "farmer_ids": farmer_ids,
        "deleted": False,
        "created_at": NOW,
        "updated_at": NOW,
    })

inserted_groups = 0
for batch in chunk(new_groups, BATCH):
    res = supabase.table("farmer_groups").insert(batch).execute()
    inserted_groups += len(res.data) if res.data else 0

print(f"  Inserted {inserted_groups} groups (expected {len(new_groups)}).")


# ─────────────────────────────────────────────
# 5. Re-create farmer_requests from the original CSV
# ─────────────────────────────────────────────
print("\nRe-importing farmer_requests from data/farmer_requests_import.csv …")
requests_file = "data/farmer_requests_import.csv"
if not os.path.exists(requests_file):
    print("  No farmer_requests_import.csv found — skipping.")
else:
    # Build farmer_id → group_id lookup (use the society field of the farmer rows)
    farmer_id_to_group_id: dict[str, str] = {}
    for soc, farmer_rows in society_to_farmers.items():
        gid = society_to_group_id[soc]
        for r in farmer_rows:
            farmer_id_to_group_id[r['id']] = gid

    new_requests = []
    with open(requests_file, 'r', encoding='utf-8') as f:
        for row in csv.DictReader(f):
            fid = row.get('farmer_id', '').strip()
            # Always remap group_id from farmer's society → new group_id
            group_id = farmer_id_to_group_id.get(fid)
            if not group_id:
                # Skip requests whose farmer_id we can't find in existing CSVs
                continue

            # Parse payments JSON (CSV stores it as escaped JSON)
            payments_raw = row.get('payments', '[]').replace('""', '"')
            try:
                payments = json.loads(payments_raw)
            except Exception:
                payments = []

            # Parse items JSON
            items_raw = row.get('items', '[]').replace('""', '"')
            try:
                items = json.loads(items_raw)
            except Exception:
                items = []

            new_requests.append({
                "id": row.get('id') or str(uuid.uuid4()),
                "farmer_id": fid,
                "group_id": group_id,
                "items": items,
                "grand_total": float(row.get('grand_total') or 0),
                "status": row.get('status', 'Pending'),
                "payments": payments,
                "request_date": row.get('request_date') or NOW,
                "season_year": "2026",
                "deleted": row.get('deleted', 'false').lower() == 'true',
                "created_at": row.get('created_at') or NOW,
                "updated_at": row.get('updated_at') or NOW,
            })

    inserted_requests = 0
    for batch in chunk(new_requests, BATCH):
        res = supabase.table("farmer_requests").insert(batch).execute()
        inserted_requests += len(res.data) if res.data else 0

    print(f"  Inserted {inserted_requests} requests (expected {len(new_requests)}).")

print("\nDone! farmer_groups and farmer_requests rebuilt from real data.")
