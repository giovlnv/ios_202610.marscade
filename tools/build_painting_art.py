"""Turn public-domain paintings into bead pictures for hard levels.

Usage: python3 tools/build_painting_art.py <folder with the image files>
All works below are by artists who died more than 100 years before 2026 (or over 70 years, for Munch),
and the files are photographs of 2D public-domain artworks.
"""
import json, os, sys
from collections import Counter
from PIL import Image, ImageEnhance

WORKS = {
    'starry_night.jpg': ('The Starry Night', 'Vincent van Gogh', 1889),
    'great_wave.jpg': ('The Great Wave off Kanagawa', 'Katsushika Hokusai', 1831),
    'the_scream.jpg': ('The Scream', 'Edvard Munch', 1893),
    'the_shipwreck_of_the_minotaur.jpg': ('The Wreck of a Transport Ship', 'J. M. W. Turner', 1810),
    'Da_Vinci_Mona_Lisa.jpg': ('Mona Lisa', 'Leonardo da Vinci', 1503),
    'Claude_Monet_Cathedral_Rouen.jpg': ('Rouen Cathedral', 'Claude Monet', 1894),
    'background_Claude_Monet_Poppy_Field_near_Giverny.jpg': ('Poppy Field near Giverny', 'Claude Monet', 1885),
    'background_Claude_Monet_Spring_in_Giverny_1890.jpg': ('Spring in Giverny', 'Claude Monet', 1890),
    'painting_Monet_Garden_at_Giverny_1.jpg': ('The Artist’s Garden at Giverny', 'Claude Monet', 1900),
}
OUT = os.path.join(os.path.dirname(__file__), '..', 'src', 'js', 'games', 'beadsort', 'paintings.json')
MAX_SIDE, COLORS, MIN_COUNT = 24, 9, 9


def convert(path):
    img = Image.open(path).convert('RGB')
    img = ImageEnhance.Contrast(ImageEnhance.Color(img).enhance(1.35)).enhance(1.15)
    w, h = img.size
    s = MAX_SIDE / max(w, h)
    small = img.resize((max(8, round(w * s)), max(8, round(h * s))), Image.Resampling.BOX)
    q = small.quantize(colors=COLORS, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)
    pal = q.getpalette()[:COLORS * 3]
    colors = [tuple(pal[i * 3:i * 3 + 3]) for i in range(COLORS)]
    W, H = q.size
    grid = [[q.getpixel((x, y)) for x in range(W)] for y in range(H)]
    while True:
        counts = Counter(v for row in grid for v in row)
        rare = [c for c in counts if counts[c] < MIN_COUNT]
        if not rare or len(counts) <= 3:
            break
        c = min(rare, key=lambda k: counts[k])
        near = min((u for u in counts if u != c), key=lambda u: sum((a - b) ** 2 for a, b in zip(colors[u], colors[c])))
        grid = [[near if v == c else v for v in row] for row in grid]
    used = sorted(set(v for row in grid for v in row), key=lambda v: sum(colors[v]))
    letters = 'abcdefghij'
    return {
        'rows': [''.join(letters[used.index(v)] for v in row) for row in grid],
        'palette': ['#%02x%02x%02x' % colors[v] for v in used],
    }


def main(folder):
    out = {}
    for f, (title, artist, year) in WORKS.items():
        art = convert(os.path.join(folder, f))
        art.update(title=title, artist=artist, year=year)
        out[f'painting/{os.path.splitext(f)[0]}'] = art
    with open(OUT, 'w') as fh:
        json.dump(out, fh, separators=(',', ':'), ensure_ascii=False)
    print(len(out), 'paintings written to', os.path.normpath(OUT))


if __name__ == '__main__':
    main(sys.argv[1])
