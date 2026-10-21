"""Turn CC0 Dungeon Crawl tiles into bead pictures.

Usage: python3 tools/build_bead_art.py <path to CC0-Dungeon-Pack>
Source: https://github.com/Snowdrama/CC0-Dungeon-Pack (CC0, from Dungeon Crawl Stone Soup / RLTiles)
"""
import json, os, sys
from collections import Counter
from PIL import Image

FOLDERS = ['monster/animals', 'monster/aquatic', 'item/food', 'item/potion', 'item/amulet', 'item/misc', 'item/ring', 'dungeon/trees']
SKIP = ('skull', 'corpse', 'bone', 'blood', 'demon', 'zombie', 'skeleton', 'ghoul', 'ugly', 'old', 'mimic', 'unknown', 'eye', 'spider', 'scorpion', 'wasp', 'fly', 'centipede', 'leech', 'worm', 'beetle', 'tick', 'bug', 'roach', 'larva', 'maggot', 'rot', 'poison')
OUT = os.path.join(os.path.dirname(__file__), '..', 'src', 'js', 'games', 'beadsort', 'art.json')
MAX_COLORS, MIN_COUNT, NEAR = 7, 5, 46


def dist(a, b):
    return sum((x - y) ** 2 for x, y in zip(a, b)) ** 0.5


def convert(path):
    img = Image.open(path).convert('RGBA')
    box = img.getchannel('A').point(lambda a: 255 if a > 127 else 0).getbbox()
    if not box:
        return None
    img = img.crop(box)
    w, h = img.size
    q = img.convert('RGB').quantize(colors=10, method=Image.Quantize.MEDIANCUT)
    pal = q.getpalette()[:30]
    colors = [tuple(pal[i * 3:i * 3 + 3]) for i in range(10)]
    idx, alpha = q.load(), img.load()
    f = max(1, -(-max(w, h) // 20))
    gw, gh = -(-w // f), -(-h // f)
    grid = []
    for y in range(gh):
        row = []
        for x in range(gw):
            votes = Counter(idx[xx, yy] for yy in range(f * y, f * y + f) for xx in range(f * x, f * x + f)
                            if xx < w and yy < h and alpha[xx, yy][3] > 127)
            row.append(colors[votes.most_common(1)[0][0]] if sum(votes.values()) * 2 >= f * f else None)
        grid.append(row)
    while True:
        counts = Counter(c for row in grid for c in row if c)
        used = list(counts)
        if len(used) <= 2:
            break
        rare = [c for c in used if counts[c] < MIN_COUNT]
        pairs = sorted((dist(a, b), a, b) for i, a in enumerate(used) for b in used[i + 1:])
        if rare:
            c = min(rare, key=lambda k: counts[k])
            target = min((u for u in used if u != c), key=lambda u: dist(u, c))
        elif len(used) > MAX_COLORS or pairs[0][0] < NEAR:
            _, a, b = pairs[0]
            c, target = (a, b) if counts[a] < counts[b] else (b, a)
        else:
            break
        grid = [[target if v == c else v for v in row] for row in grid]
    used = sorted(set(c for row in grid for c in row if c), key=lambda c: sum(c))
    beads = sum(1 for row in grid for c in row if c)
    if not (60 <= beads <= 260) or len(used) < 3:
        return None
    letters = 'abcdefgh'
    rows = [''.join(letters[used.index(c)] if c else '.' for c in row) for row in grid]
    return {'rows': rows, 'palette': ['#%02x%02x%02x' % c for c in used]}


def main(root):
    out = {}
    for folder in FOLDERS:
        base = os.path.join(root, folder)
        for dirpath, _, files in os.walk(base):
            for f in sorted(files):
                name = f[:-4]
                if not f.endswith('.png') or any(s in name for s in SKIP):
                    continue
                art = convert(os.path.join(dirpath, f))
                if art:
                    out[f"{folder.split('/')[-1]}/{name}"] = art
    with open(OUT, 'w') as fh:
        json.dump(out, fh, separators=(',', ':'))
    print(len(out), 'pictures written to', os.path.normpath(OUT))


if __name__ == '__main__':
    main(sys.argv[1])
