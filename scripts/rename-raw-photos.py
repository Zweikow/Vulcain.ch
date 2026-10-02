import os
import sys
import json
import re
import shutil

sys.stdout.reconfigure(encoding='utf-8')

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
RAW_DIR = os.path.join(BASE_DIR, 'public', 'photo-bouteilles-raw')
HTML_FILE = os.path.join(BASE_DIR, 'public', 'validation-photos.html')

with open(HTML_FILE, 'r', encoding='utf-8') as f:
    html = f.read()

m = re.search(r'const CUVEES = (\[[\s\S]*?\]);', html)
if not m:
    print("Erreur: Impossible d'extraire CUVEES")
    sys.exit(1)

cuvees = json.loads(m.group(1))

# Renaming map: original_filename -> new_clean_filename
rename_map = {}

for c in cuvees:
    slug = c['slug']
    duo = c.get('duoRaw')
    front = c.get('frontRaw')
    back = c.get('backRaw')

    if duo:
        rename_map[duo] = f"{slug}-duo.jpg"
    if front:
        rename_map[front] = f"{slug}-face.jpg"
    if back:
        rename_map[back] = f"{slug}-dos.jpg"

# Add extra unmapped photos
extras = {
    'PXL_20261001_083811472.RAW-01.jpg': 'a-propos-dailes-2021-extra-1.jpg',
    'PXL_20261001_083825732.RAW-01.jpg': 'a-propos-dailes-2021-extra-2.jpg',
    'PXL_20261001_083933185.RAW-01.jpg': 'botsi-de-glace-2017-extra.jpg',
    'PXL_20261001_084014172.RAW-01.jpg': 'cidre-glace-2012-extra.jpg',
    'PXL_20261001_093350551.RAW-01.jpg': 'premiers-emois-2021-extra-1.jpg',
    'PXL_20261001_093747444.RAW-01.jpg': 'premiers-emois-2021-extra-2.jpg',
}
rename_map.update(extras)

print(f"Total photos à renommer: {len(rename_map)}")

# Save mapping trace first
mapping_file = os.path.join(RAW_DIR, 'mapping-original-pxl.json')
with open(mapping_file, 'w', encoding='utf-8') as f:
    json.dump({v: k for k, v in rename_map.items()}, f, indent=2, ensure_ascii=False)
print(f"Mapping sauvegardé dans {mapping_file}")

# Perform rename without touching file contents
renamed_count = 0
for orig, new_name in sorted(rename_map.items()):
    src = os.path.join(RAW_DIR, orig)
    dst = os.path.join(RAW_DIR, new_name)

    if os.path.exists(src):
        os.rename(src, dst)
        print(f"✓ {orig} -> {new_name}")
        renamed_count += 1
    elif os.path.exists(dst):
        print(f"= Déjà renommé: {new_name}")
        renamed_count += 1
    else:
        print(f"✗ Fichier non trouvé: {orig}")

print(f"\nTerminé: {renamed_count}/{len(rename_map)} photos renommées proprement avec le nom de la cuvée !")
