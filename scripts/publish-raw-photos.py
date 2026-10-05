import os
import sys
import json
import re
from PIL import Image

sys.stdout.reconfigure(encoding='utf-8')

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
RAW_DIR = os.path.join(BASE_DIR, 'public', 'photo-bouteilles-raw')
OUT_DIR = os.path.join(BASE_DIR, 'public', 'images', 'cuvees')
HTML_FILE = os.path.join(BASE_DIR, 'public', 'validation-photos.html')

os.makedirs(OUT_DIR, exist_ok=True)

with open(HTML_FILE, 'r', encoding='utf-8') as f:
    html = f.read()

m = re.search(r'const CUVEES = (\[[\s\S]*?\]);', html)
if not m:
    print("Erreur: Impossible d'extraire CUVEES")
    sys.exit(1)

cuvees = json.loads(m.group(1))
print(f"=== Optimisation et publication des photos brutes réelles pour {len(cuvees)} cuvées ===")

TARGET_H = 1200

def optimize_image(src_path, dst_path):
    if not os.path.exists(src_path):
        print(f"  [MANQUANT] {src_path}")
        return False
    img = Image.open(src_path)
    # Exif orientation fix if needed
    try:
        from PIL import ImageOps
        img = ImageOps.exif_transpose(img)
    except Exception:
        pass
    
    w, h = img.size
    target_w = int(w * (TARGET_H / h))
    resized = img.resize((target_w, TARGET_H), Image.Resampling.LANCZOS)
    resized.save(dst_path, 'JPEG', quality=90, optimize=True)
    size_kb = os.path.getsize(dst_path) // 1024
    print(f"  -> {os.path.basename(dst_path)} ({target_w}x{TARGET_H}, {size_kb} KB)")
    return True

processed_count = 0

for c in cuvees:
    slug = c['slug']
    art = c['art']
    name = c['name']
    duo_raw = c.get('duoRaw')
    front_raw = c.get('frontRaw')
    
    print(f"\n[#{art}] {name} ({slug})")
    
    # Priority for main catalogue image:
    # If duo photo exists, use duo photo (shows both bottles face & dos on crate).
    # Otherwise, use front photo.
    if duo_raw:
        raw_path = os.path.join(RAW_DIR, duo_raw)
        # Main catalogue image
        main_out = os.path.join(OUT_DIR, f"{slug}.jpg")
        # Duo image
        duo_out = os.path.join(OUT_DIR, f"{slug}-duo.jpg")
        
        # Keep studio packshots for already validated articles if they exist (#13, #25, #32, #33)
        # but publish the authentic real raw for all 14 remaining!
        if art in [13, 25]:
            # Save raw as -raw.jpg so user can compare, keep validated studio
            raw_duo_out = os.path.join(OUT_DIR, f"{slug}-raw-duo.jpg")
            optimize_image(raw_path, raw_duo_out)
            print(f"  [NOTE] Cuvée #{art} conserve ses packshots studio validés + photo brute en bonus")
        else:
            optimize_image(raw_path, main_out)
            optimize_image(raw_path, duo_out)
            processed_count += 1
            
    elif front_raw:
        raw_path = os.path.join(RAW_DIR, front_raw)
        if art in [32, 33]:
            # Save raw as -raw.jpg, keep validated studio
            raw_solo_out = os.path.join(OUT_DIR, f"{slug}-raw.jpg")
            optimize_image(raw_path, raw_solo_out)
            print(f"  [NOTE] Cuvée #{art} conserve son packshot studio validé + photo brute en bonus")
        else:
            main_out = os.path.join(OUT_DIR, f"{slug}.jpg")
            optimize_image(raw_path, main_out)
            processed_count += 1

print(f"\n=== Terminé : {processed_count} cuvées publiées avec leurs photos réelles optimisées ! ===")
