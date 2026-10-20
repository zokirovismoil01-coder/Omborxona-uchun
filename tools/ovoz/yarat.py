"""O'zbekcha ovozli fayllarni yaratadi: dron/audio/<id>.mp3 va manifest.json.

Matnlar tools/ovoz/matnlar.json dan olinadi (avval: node tools/ovoz/matn.js).
Faqat o'zgargan matnlar qayta yoziladi. Ovoz Microsoft Edge'ning bepul o'qish xizmatidan
edge-tts kutubxonasi orqali olinadi; internet kerak.

Sozlamalar (muhit o'zgaruvchilari):
  OVOZ         — ovoz nomi: uz-UZ-MadinaNeural (ayol) yoki uz-UZ-SardorNeural (erkak)
  OVOZ_TEZLIK  — tezlik, masalan -5% yoki +0%
"""
import asyncio
import json
import os
import subprocess
import sys

import edge_tts

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
VOICE = os.environ.get('OVOZ', 'uz-UZ-MadinaNeural')
RATE = os.environ.get('OVOZ_TEZLIK', '-5%')
VOICE_NAMES = {'uz-UZ-MadinaNeural': 'Madina', 'uz-UZ-SardorNeural': 'Sardor'}
OUT = os.path.join(ROOT, 'dron', 'audio')
MANIFEST = os.path.join(OUT, 'manifest.json')


def duration(path):
    try:
        out = subprocess.run(
            ['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', path],
            capture_output=True, text=True, check=True,
        ).stdout.strip()
        return round(float(out), 1)
    except Exception:
        return None


def compress(src, dst):
    # Nutq uchun 32 kbit/s mono yetarli: fayllar 1,5 baravar kichrayadi
    try:
        subprocess.run(['ffmpeg', '-y', '-v', 'error', '-f', 'mp3', '-i', src, '-ac', '1', '-ar', '24000', '-b:a', '32k', '-f', 'mp3', dst],
                       check=True)
        os.remove(src)
    except Exception:
        os.replace(src, dst)


async def make(item):
    path = os.path.join(OUT, item['id'] + '.mp3')
    tmp = path + '.tmp'
    for attempt in range(4):
        try:
            await edge_tts.Communicate(item['text'], VOICE, rate=RATE).save(tmp)
            if os.path.getsize(tmp) < 1000:
                raise RuntimeError('fayl juda kichik')
            compress(tmp, path)
            return duration(path)
        except Exception as e:  # tarmoq uzilishi va hokazo
            print(f"  {item['id']}: urinish {attempt + 1} muvaffaqiyatsiz — {e}", file=sys.stderr)
            await asyncio.sleep(3 * (attempt + 1))
    raise RuntimeError(f"{item['id']} uchun ovoz yaratib bo'lmadi")


async def main():
    with open(os.path.join(ROOT, 'tools', 'ovoz', 'matnlar.json'), encoding='utf-8') as f:
        items = json.load(f)
    os.makedirs(OUT, exist_ok=True)
    manifest = {}
    if os.path.exists(MANIFEST):
        with open(MANIFEST, encoding='utf-8') as f:
            manifest = json.load(f)
    made = 0
    for item in items:
        old = manifest.get(item['id'])
        file_ok = os.path.exists(os.path.join(OUT, item['id'] + '.mp3'))
        if old and file_ok and old.get('hash') == item['hash'] and old.get('voice') == VOICE and old.get('rate') == RATE:
            continue
        print(f"yaratilmoqda: {item['id']} ({len(item['text'])} belgi)")
        dur = await make(item)
        manifest[item['id']] = {'hash': item['hash'], 'voice': VOICE, 'rate': RATE, 'dur': dur}
        made += 1
    # Endi ishlatilmaydigan fayllarni o'chiramiz
    ids = {it['id'] for it in items}
    for key in list(manifest):
        if key.startswith('_') or key in ids:
            continue
        manifest.pop(key)
        try:
            os.remove(os.path.join(OUT, key + '.mp3'))
        except FileNotFoundError:
            pass
    manifest['_voice'] = VOICE_NAMES.get(VOICE, VOICE)
    ordered = {k: manifest[k] for k in sorted(manifest)}
    with open(MANIFEST, 'w', encoding='utf-8') as f:
        json.dump(ordered, f, ensure_ascii=False, indent=1)
        f.write('\n')
    total = sum((v.get('dur') or 0) for k, v in manifest.items() if not k.startswith('_'))
    print(f"tayyor: {made} ta yangi fayl, jami {len(ids)} ta, {round(total / 60, 1)} daqiqa ovoz")


if __name__ == '__main__':
    asyncio.run(main())
