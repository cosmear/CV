"""Generate delivery variants from the untouched PNG masters (Pillow with AVIF).

Run only when a master changes. No crop or upscaling; CSS owns art direction.
"""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
IMAGES = {
    "direction/hero-photo": [960, 1280, 1672],
    "direction/profile-photo": [960, 1280, 1672],
    "direction/experience-photo": [960, 1280, 1915],
    "direction/contact-photo": [960, 1280, 1672],
    "projects/loop-smiths-automation": [960, 1280, 1672],
    "projects/eclipsed-fates-cover": [540, 810, 1080],
    "projects/loop-smiths": [128, 256, 512],
}

for name, widths in IMAGES.items():
    master = ROOT / "assets" / f"{name}.png"
    with Image.open(master) as image:
        image = image.convert("RGB" if image.mode != "RGBA" else "RGBA")
        for width in widths:
            size = (width, round(image.height * width / image.width))
            variant = image.resize(size, Image.Resampling.LANCZOS)
            for extension, options in [("avif", {"quality": 70, "speed": 6}), ("webp", {"quality": 85, "method": 6})]:
                target = master.with_name(f"{master.stem}-{width}.{extension}")
                variant.save(target, **options)
                print(f"{target.relative_to(ROOT)}: {target.stat().st_size} bytes")
