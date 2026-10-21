"""Turn public-domain paintings into bead pictures for hard levels.

Usage: python3 tools/build_painting_art.py <folder with <slug>.jpg files and sources.json>
Images and metadata: https://github.com/Kyando/behind-the-words (art/thumbs, art/sources.json),
originally from Wikimedia Commons. Birth of Venus: https://github.com/mufaddalkt/artgallery.
"""
import json, os, re, sys
from collections import Counter
from PIL import Image, ImageEnhance

ROOT = os.path.join(os.path.dirname(__file__), '..')
OUT = os.path.join(ROOT, 'src', 'js', 'games', 'beadsort', 'paintings.json')
CREDITS = os.path.join(ROOT, 'CREDITS.md')
MAX_SIDE, COLORS, MIN_COUNT = 24, 9, 9
EXTRA = {
    'birth-of-venus-botticelli': {
        'title': 'The Birth of Venus', 'artist': 'Sandro Botticelli', 'year': 'c. 1485',
        'page': 'https://commons.wikimedia.org/wiki/File:Sandro_Botticelli_-_La_nascita_di_Venere_-_Google_Art_Project_-_edited.jpg',
    },
}
ARTISTS = {'gogh': 'Vincent van Gogh', 'vinci': 'Leonardo da Vinci', 'elder': 'Pieter Bruegel the Elder'}


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


def meta(slug, sources):
    if slug in EXTRA:
        return EXTRA[slug]
    m = sources[slug]
    artist = ARTISTS.get(slug.rsplit('-', 1)[-1], m['artist'])
    return {'title': m['title'], 'artist': artist, 'year': m['year'], 'page': m.get('sourcePage') or m.get('page')}


def main(folder):
    sources = json.load(open(os.path.join(folder, 'sources.json')))
    out, lines = {}, []
    for f in sorted(os.listdir(folder)):
        if not f.endswith('.jpg'):
            continue
        slug = f[:-4]
        info = meta(slug, sources)
        art = convert(os.path.join(folder, f))
        art.update(title=info['title'], artist=info['artist'], year=info['year'])
        out[f'painting/{slug}'] = art
        lines.append(f"- {info['title']}, {info['artist']}, {info['year']}. [Source]({info['page']})")
    with open(OUT, 'w') as fh:
        json.dump(out, fh, separators=(',', ':'), ensure_ascii=False)
    text = open(CREDITS).read()
    block = '<!-- paintings -->\n' + '\n'.join(lines) + '\n<!-- /paintings -->'
    text = re.sub(r'<!-- paintings -->.*?<!-- /paintings -->', lambda _: block, text, flags=re.S)
    open(CREDITS, 'w').write(text)
    print(len(out), 'paintings written to', os.path.normpath(OUT))


if __name__ == '__main__':
    main(sys.argv[1])
