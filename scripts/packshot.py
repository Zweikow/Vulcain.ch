"""
Packshots fond blanc des cuvées, à partir des photos brutes du téléphone.

Pour chaque photo de public/photo-bouteilles-raw/ :
  1. détourage BiRefNet (modèle ONNX, exécuté en local), en deux passes :
     image entière pour situer les bouteilles, puis recadrage serré pour
     un contour net ;
  2. affinage du contour sur l'image elle-même (filtre guidé), trous bouchés,
     caisse en bois et poutre écartées ;
  3. balance des blancs prise sur le mur du fond, pour des étiquettes
     blanches et non jaunies ;
  4. pose sur un carré blanc pur, sans ombre, échelle identique d'une
     photo à l'autre (la bouteille entière occupe toujours la même hauteur).

Les gros plans (bouteille coupée par le haut du cadre) deviennent des
« détails étiquette » : coupés net en haut et en bas, plein cadre.

Installation (une fois) — environnement isolé hors du repo :
  python -m venv %USERPROFILE%\\.cache\\drinkcider-packshot\\venv
  ...\\venv\\Scripts\\python -m pip install onnxruntime pillow numpy opencv-python-headless
Le modèle (≈ 900 Mo) est téléchargé au premier lancement dans le même dossier.

Usage :
  ...\\venv\\Scripts\\python scripts/packshot.py                 # toutes les photos
  ...\\venv\\Scripts\\python scripts/packshot.py turgowy-2019-duo.jpg
  ...\\venv\\Scripts\\python scripts/packshot.py --debug         # + masques dans _debug/
  ...\\venv\\Scripts\\python scripts/packshot.py --zoom premiers-emois-2021-dos.jpg
                                   # bouteille entière seule → gros plan étiquette
"""

import argparse
import os
import sys
import time
import urllib.request

import cv2
import numpy as np
import onnxruntime as ort
from PIL import Image, ImageOps

sys.stdout.reconfigure(encoding='utf-8')

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
RAW_DIR = os.path.join(BASE_DIR, 'public', 'photo-bouteilles-raw')
OUT_DIR = os.path.join(BASE_DIR, 'public', 'packshots')

CACHE_DIR = os.path.join(os.path.expanduser('~'), '.cache', 'drinkcider-packshot')
MODEL_PATH = os.path.join(CACHE_DIR, 'birefnet-general.onnx')
MODEL_URL = (
    'https://github.com/danielgatis/rembg/releases/download/v0.0.0/'
    'BiRefNet-general-epoch_244.onnx'
)

MODEL_SIZE = 1024
WORK_LONG_SIDE = 3072  # résolution de travail : assez pour un contour net, 4× plus léger que l'original
MEAN = np.array([0.485, 0.456, 0.406], dtype=np.float32)
STD = np.array([0.229, 0.224, 0.225], dtype=np.float32)

# Mise en page du carré final, en fraction du côté
CANVAS = 1600
FULL_HEIGHT = 0.86  # hauteur d'une bouteille entière
FULL_BOTTOM = 0.07  # marge sous le culot
DETAIL_HEIGHT = 1.0  # gros plan : plein cadre vertical


def load_session():
    if not os.path.exists(MODEL_PATH):
        os.makedirs(CACHE_DIR, exist_ok=True)
        print(f'Téléchargement du modèle BiRefNet vers {MODEL_PATH} …')
        urllib.request.urlretrieve(MODEL_URL, MODEL_PATH + '.part')
        os.replace(MODEL_PATH + '.part', MODEL_PATH)
    providers = [p for p in ('CUDAExecutionProvider', 'CPUExecutionProvider')
                 if p in ort.get_available_providers()]
    return ort.InferenceSession(MODEL_PATH, providers=providers)


def predict(session, rgb):
    """Probabilité d'avant-plan (0..1) à la taille de `rgb`."""
    h, w = rgb.shape[:2]
    x = cv2.resize(rgb, (MODEL_SIZE, MODEL_SIZE), interpolation=cv2.INTER_AREA)
    x = (x.astype(np.float32) / 255.0 - MEAN) / STD
    x = x.transpose(2, 0, 1)[None]
    out = session.run(None, {session.get_inputs()[0].name: x})[0][0, 0]
    prob = 1.0 / (1.0 + np.exp(-out))
    return cv2.resize(prob, (w, h), interpolation=cv2.INTER_CUBIC).clip(0, 1)


def guided_filter(guide, src, radius, eps):
    """Filtre guidé (He et al.) : colle les bords du masque aux bords réels de l'image."""
    mean = lambda a: cv2.boxFilter(a, -1, (2 * radius + 1, 2 * radius + 1))
    mean_i, mean_p = mean(guide), mean(src)
    cov_ip = mean(guide * src) - mean_i * mean_p
    var_i = mean(guide * guide) - mean_i * mean_i
    a = cov_ip / (var_i + eps)
    b = mean_p - a * mean_i
    return mean(a) * guide + mean(b)


def clean_mask(prob):
    """Garde les bouteilles : écarte poutre, caisse et miettes ; bouche les trous."""
    h, w = prob.shape
    binary = (prob > 0.5).astype(np.uint8)
    n, labels, stats, _ = cv2.connectedComponentsWithStats(binary, 8)
    if n <= 1:
        return prob
    areas = stats[1:, cv2.CC_STAT_AREA]
    keep = np.zeros(n, bool)
    biggest = areas.max()
    for i in range(1, n):
        x, y, cw, ch, area = stats[i]
        if area < 0.03 * biggest:
            continue
        # Poutre ou montant vertical collé au bord gauche/droit sur toute la hauteur
        touches_side = x == 0 or x + cw >= w
        if touches_side and ch > 0.9 * h and cw < 0.25 * w:
            continue
        keep[i] = True
    selected = keep[labels]

    # Caisse : rangées du bas nettement plus larges que le corps des bouteilles
    rows = selected.sum(axis=1)
    filled = np.nonzero(rows)[0]
    if len(filled):
        top, bottom = filled[0], filled[-1]
        body = rows[top + (bottom - top) // 2: top + 3 * (bottom - top) // 4]
        ref = np.median(body) if len(body) else rows.max()
        wide = np.nonzero(rows[top + (bottom - top) // 2:] > 1.6 * ref)[0]
        if len(wide):
            selected[top + (bottom - top) // 2 + wide[0]:] = False

    # Trous intérieurs (reflets sur le verre pris pour du fond) : toute zone de
    # fond qui ne touche aucun bord. Un gros plan coupe le fond en deux zones,
    # chacune touche un bord, aucune n'est un trou.
    n, labels = cv2.connectedComponents((~selected).astype(np.uint8), connectivity=4)
    on_border = np.unique(np.concatenate([labels[0], labels[-1], labels[:, 0], labels[:, -1]]))
    holes = ~selected & ~np.isin(labels, on_border)
    selected = selected | holes

    out = prob * selected
    out[holes] = 1.0
    return out


def white_balance(rgb, alpha):
    """Neutralise la dominante du mur (supposé blanc/gris neutre)."""
    bg = alpha < 0.02
    bg[int(bg.shape[0] * 0.75):] = False  # le bas, c'est la caisse en bois
    pixels = rgb[bg].astype(np.float32)
    if len(pixels) < 1000:
        return rgb
    lum = pixels.mean(axis=1)
    bright = pixels[lum > np.percentile(lum, 40)]  # le mur éclairé, pas les ombres
    mean = bright.mean(axis=0)
    gains = mean.mean() / mean
    gains = 1 + 0.8 * (gains - 1)  # correction à 80 % : on garde un peu de chaleur
    return np.clip(rgb.astype(np.float32) * gains, 0, 255).astype(np.uint8)


def robust_line(y, x):
    """x = a·y + b, en écartant les rangées aberrantes (fil du muselet, bouteilles qui se touchent)."""
    keep = np.ones(len(y), bool)
    for _ in range(3):
        a, b = np.polyfit(y[keep], x[keep], 1)
        residual = np.abs(x - (a * y + b))
        keep = residual < 3 * (np.median(residual[keep]) + 0.5)
    return a, b


def bottle_spans(solid):
    """Colonnes [gauche, droite) de chaque bouteille, de gauche à droite."""
    ys = np.nonzero(solid.any(axis=1))[0]
    top, bottom = ys[0], ys[-1]
    # Les cols sont toujours séparés, même quand les corps se touchent
    necks_zone = solid[top:top + int(0.45 * (bottom - top))].astype(np.uint8)
    n, _, stats, _ = cv2.connectedComponentsWithStats(necks_zone, 8)
    if n <= 1:
        return [(0, solid.shape[1])]
    biggest = stats[1:, cv2.CC_STAT_AREA].max()
    necks = sorted((s for s in stats[1:] if s[cv2.CC_STAT_AREA] > 0.1 * biggest), key=lambda s: s[0])
    columns = solid.sum(axis=0)
    bounds = [0]
    for left_neck, right_neck in zip(necks, necks[1:]):
        lo, hi = left_neck[0] + left_neck[2], right_neck[0]
        bounds.append(lo + int(np.argmin(columns[lo:hi])) if hi > lo else (lo + hi) // 2)
    bounds.append(solid.shape[1])
    return list(zip(bounds, bounds[1:]))


def bottle_axes(solid):
    """Axe de chaque bouteille entière, de gauche à droite : (a, b, y_haut, y_culot) avec x = a·y + b."""
    axes = []
    for left, right in bottle_spans(solid):
        part = solid[:, left:right]
        ys = np.nonzero(part.any(axis=1))[0]
        b_top, b_bottom = ys[0], ys[-1]
        # Ni le bouchon et son muselet (haut), ni l'arrondi du culot (bas)
        rows = np.arange(b_top + int(0.15 * (b_bottom - b_top)), b_top + int(0.93 * (b_bottom - b_top)))
        lefts = part[rows].argmax(axis=1)
        rights = part.shape[1] - 1 - part[rows, ::-1].argmax(axis=1)
        clean = (lefts > 0) & (rights < part.shape[1] - 1)  # bord coupé par la voisine
        if clean.sum() < 20:
            continue
        a, b = robust_line(rows[clean].astype(np.float64), (lefts[clean] + rights[clean]) / 2.0 + left)
        axes.append((a, b, b_top, b_bottom))
    return axes


def straighten(rgb, alpha):
    """Remet chaque bouteille d'aplomb, culot en place (téléphone pas tout à fait droit)."""
    axes = bottle_axes(alpha > 0.5)
    h, w = alpha.shape
    if len(axes) == 1:
        # Cisaillement autour du culot : les verticales redeviennent verticales,
        # les horizontales de l'étiquette ne bougent pas
        a, b, _, y_base = axes[0]
        m = np.float32([[1, -a, a * y_base], [0, 1, 0]])
        warp = lambda img, **kw: cv2.warpAffine(img, m, (w, h), flags=cv2.INTER_LINEAR, **kw)
    elif len(axes) == 2:
        # Duo : chaque sommet d'axe revient à l'aplomb de son culot (correction de perspective)
        src, dst = [], []
        for a, b, y_top, y_base in axes:
            x_base = a * y_base + b
            src += [(a * y_top + b, y_top), (x_base, y_base)]
            dst += [(x_base, y_top), (x_base, y_base)]
        m = cv2.getPerspectiveTransform(np.float32(src), np.float32(dst))
        warp = lambda img, **kw: cv2.warpPerspective(img, m, (w, h), flags=cv2.INTER_LINEAR, **kw)
    else:
        return rgb, alpha, []
    rgb = warp(rgb, borderMode=cv2.BORDER_REPLICATE)
    alpha = warp(alpha.astype(np.float32), borderMode=cv2.BORDER_CONSTANT, borderValue=0)
    return rgb, alpha, [np.degrees(np.arctan(ax[0])) for ax in axes]


def process(session, path, debug_dir=None, zoom=False, side=None):
    name = os.path.splitext(os.path.basename(path))[0]
    img = ImageOps.exif_transpose(Image.open(path)).convert('RGB')
    if side:
        # Une seule bouteille d'un duo : on la découpe en pleine résolution
        preview = img.copy()
        preview.thumbnail((2048, 2048))
        spans = bottle_spans(clean_mask(predict(session, np.asarray(preview))) > 0.5)
        left, right = spans[0] if side == 'gauche' else spans[-1]
        f = img.width / preview.width
        img = img.crop((int(left * f), 0, int(right * f), img.height))
        name = f'{name}-{side}'
    # Budget de pixels de travail ; en zoom, l'étiquette n'occupe qu'une partie de
    # la photo, on en garde davantage
    budget = WORK_LONG_SIDE ** 2 * 0.75 * (2.25 if zoom else 1)
    scale = (budget / (img.width * img.height)) ** 0.5
    if scale < 1:
        img = img.resize((round(img.width * scale), round(img.height * scale)), Image.Resampling.LANCZOS)
    rgb = np.asarray(img)
    h, w = rgb.shape[:2]

    # Passe 1 : situer les bouteilles
    prob = clean_mask(predict(session, rgb))
    ys, xs = np.nonzero(prob > 0.5)
    if not len(ys):
        print(f'  [ÉCHEC] aucune bouteille détectée dans {name}')
        return
    y0, y1, x0, x1 = ys.min(), ys.max(), xs.min(), xs.max()

    # Passe 2 : recadrage serré, détourage plus fin
    my, mx = int((y1 - y0) * 0.06), int((x1 - x0) * 0.12)
    cy0, cy1 = max(0, y0 - my), min(h, y1 + my)
    cx0, cx1 = max(0, x0 - mx), min(w, x1 + mx)
    crop = rgb[cy0:cy1, cx0:cx1]
    prob2 = predict(session, crop)
    full = np.zeros((h, w), np.float32)
    full[cy0:cy1, cx0:cx1] = prob2
    alpha = clean_mask(full)

    # Contour : filtre guidé sur la luminance, puis bord légèrement resserré
    gray = cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY).astype(np.float32) / 255.0
    alpha = guided_filter(gray, alpha.astype(np.float32), radius=6, eps=1e-4).clip(0, 1)
    alpha = np.clip((alpha - 0.15) / 0.7, 0, 1)  # durcit le dégradé de bord, supprime le liseré

    rgb = white_balance(rgb, alpha)

    solid = alpha > 0.5
    ys, xs = np.nonzero(solid)
    y0, y1, x0, x1 = ys.min(), ys.max(), xs.min(), xs.max()
    rows = solid.sum(axis=1)
    # Gros plan étiquette : c'est le corps qui sort par le haut du cadre, pas
    # seulement un bouchon un peu rogné (rangée du haut large comme le corps)
    detail = y0 <= 2 and rows[y0] > 0.5 * rows.max()
    if zoom and not detail:
        # Gros plan tiré d'une bouteille entière : coupe nette sous l'épaule, ou
        # plus bas si l'étiquette est basse, pour un cadrage comparable aux gros plans
        y0 = int(np.nonzero(rows >= 0.95 * rows.max())[0][0] + 0.02 * (y1 - y0))
        lum = cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY)
        paper = ((lum > 140) & solid).sum(axis=1) / np.maximum(rows, 1)
        label = np.nonzero(paper[y0:y1] > 0.5)[0]
        if len(label):
            label_top = y0 + label[0]
            y0 = max(y0, label_top - int(0.25 * (y1 - label_top)))
        detail = True

    if detail:
        # Coupe nette là où le corps cylindrique s'arrête, avant l'arrondi du culot.
        # La perspective affine régulièrement la bouteille vers le bas : on suit
        # cette pente et on ne coupe qu'au décrochage du culot.
        span = y1 - y0
        ref = np.arange(y0 + span // 10, y0 + 7 * span // 10)
        slope, intercept = np.polyfit(ref, rows[ref], 1)
        lower = np.arange(y0 + 7 * span // 10, y1 + 1)
        drop = np.nonzero(rows[lower] < 0.97 * (slope * lower + intercept))[0]
        if len(drop):
            y1 = lower[drop[0]] - 1

        # Redressement des verticales : la perspective transforme le cylindre en
        # cône (≈ 10 % plus étroit en bas). On ramène chaque rangée à la largeur
        # du milieu, autour de l'axe de la bouteille (qui corrige aussi l'inclinaison).
        left = solid[ref].argmax(axis=1)
        right = w - 1 - solid[ref, ::-1].argmax(axis=1)
        c_slope, c_intercept = np.polyfit(ref, (left + right) / 2, 1)
        y_mid = (y0 + y1) / 2
        width_mid = slope * y_mid + intercept
        center_mid = c_slope * y_mid + c_intercept
        yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
        map_x = ((c_slope * yy + c_intercept)
                 + (xx - center_mid) * (slope * yy + intercept) / width_mid).astype(np.float32)
        rgb = cv2.remap(rgb, map_x, yy, cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)
        alpha = cv2.remap(alpha.astype(np.float32), map_x, yy, cv2.INTER_LINEAR,
                          borderMode=cv2.BORDER_CONSTANT, borderValue=0)
        xs = np.nonzero((alpha[y0:y1 + 1] > 0.5).any(axis=0))[0]
        x0, x1 = xs.min(), xs.max()
        target_h = CANVAS * DETAIL_HEIGHT
    else:
        rgb, alpha, tilts = straighten(rgb, alpha)
        if tilts:
            print('     redressée de ' + ', '.join(f'{t:+.1f}°' for t in tilts))
        ys, xs = np.nonzero(alpha > 0.5)
        y0, y1, x0, x1 = ys.min(), ys.max(), xs.min(), xs.max()
        target_h = CANVAS * FULL_HEIGHT

    sub_rgb = rgb[y0:y1 + 1, x0:x1 + 1].astype(np.float32)
    sub_a = alpha[y0:y1 + 1, x0:x1 + 1]
    k = target_h / sub_rgb.shape[0]
    new_w, new_h = round(sub_rgb.shape[1] * k), round(sub_rgb.shape[0] * k)
    canvas_w = CANVAS
    if new_w > CANVAS * 0.94:
        if detail:
            # Un gros plan doit toucher le haut et le bas : on élargit le cadre
            # plutôt que de laisser une bande blanche sous une coupe nette
            canvas_w = int(np.ceil(new_w / 0.94))
        else:
            k *= CANVAS * 0.94 / new_w
            new_w, new_h = round(sub_rgb.shape[1] * k), round(sub_rgb.shape[0] * k)
    sub_rgb = cv2.resize(sub_rgb, (new_w, new_h), interpolation=cv2.INTER_AREA)
    sub_a = cv2.resize(sub_a, (new_w, new_h), interpolation=cv2.INTER_AREA)[..., None]

    canvas = np.full((CANVAS, canvas_w, 3), 255.0, np.float32)
    ox = (canvas_w - new_w) // 2
    oy = 0 if detail else round(CANVAS * (1 - FULL_BOTTOM) - new_h)
    region = canvas[oy:oy + new_h, ox:ox + new_w]
    canvas[oy:oy + new_h, ox:ox + new_w] = sub_rgb * sub_a + region * (1 - sub_a)

    os.makedirs(OUT_DIR, exist_ok=True)
    out_path = os.path.join(OUT_DIR, f'{name}-etiquette.jpg' if zoom else f'{name}.jpg')
    Image.fromarray(canvas.round().astype(np.uint8)).save(
        out_path, 'JPEG', quality=88, optimize=True, progressive=True)

    if debug_dir:
        os.makedirs(debug_dir, exist_ok=True)
        Image.fromarray((alpha * 255).astype(np.uint8)).save(os.path.join(debug_dir, f'{name}-mask.png'))

    kind = 'détail' if detail else 'entière'
    print(f'  -> {os.path.relpath(out_path, BASE_DIR)} ({kind}, {os.path.getsize(out_path) // 1024} Ko)')


def main():
    parser = argparse.ArgumentParser(description='Packshots fond blanc des cuvées')
    parser.add_argument('files', nargs='*', help='noms de fichiers dans photo-bouteilles-raw (défaut : tous les .jpg)')
    parser.add_argument('--debug', action='store_true', help='enregistre aussi les masques dans public/packshots/_debug')
    parser.add_argument('--zoom', action='store_true',
                        help="bouteille entière seule → gros plan de l'étiquette (<nom>-etiquette.jpg)")
    parser.add_argument('--bouteille', choices=('gauche', 'droite'),
                        help="duo → gros plan de l'étiquette d'une des deux bouteilles (<nom>-<côté>-etiquette.jpg)")
    args = parser.parse_args()

    files = args.files or sorted(f for f in os.listdir(RAW_DIR) if f.lower().endswith('.jpg'))
    session = load_session()
    print(f'Moteur : {session.get_providers()[0]} — {len(files)} photo(s)')
    debug_dir = os.path.join(OUT_DIR, '_debug') if args.debug else None
    for f in files:
        t = time.time()
        print(f'[{f}]')
        process(session, os.path.join(RAW_DIR, os.path.basename(f)), debug_dir,
                args.zoom or bool(args.bouteille), args.bouteille)
        print(f'     {time.time() - t:.1f} s')


if __name__ == '__main__':
    main()
