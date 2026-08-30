"""
fetch_tags.py — Obtiene tags reales de Wallhaven para cada wallpaper
Puede interrumpirse con Ctrl+C y se reanuda solo (salta los que ya tienen tags)
"""
import asyncio
import json
import os
import sys
from pathlib import Path

import httpx
from dotenv import load_dotenv
from sqlmodel import Session, select

sys.path.insert(0, str(Path(__file__).parent))
load_dotenv()

from app.database import engine
from app.models.wallpaper import Wallpaper

WALLHAVEN_KEY = os.getenv("WALLHAVEN_API_KEY", "")
DELAY = 1.5
DELAY_429 = 70.0

stats = {"updated": 0, "skipped": 0, "errors": 0}

async def main():
    print("🏷  Iniciando fetch de tags...")

    with Session(engine) as session:
        # Solo los que tienen tags vacíos
        wallpapers = session.exec(
            select(Wallpaper.id, Wallpaper.external_id)
            .where(Wallpaper.tags == "[]")
        ).all()

        total = len(wallpapers)
        print(f"📊 Wallpapers sin tags: {total:,}")

        async with httpx.AsyncClient(timeout=30) as client:
            for i, (wid, ext_id) in enumerate(wallpapers, 1):
                try:
                    r = await client.get(
                        f"https://wallhaven.cc/api/v1/w/{ext_id}",
                        params={"apikey": WALLHAVEN_KEY}
                    )

                    if r.status_code == 429:
                        print(f"\n⚠ Rate-limit. Esperando {DELAY_429}s…")
                        await asyncio.sleep(DELAY_429)
                        continue

                    if r.status_code == 404:
                        stats["skipped"] += 1
                        await asyncio.sleep(DELAY)
                        continue

                    if r.status_code != 200:
                        stats["errors"] += 1
                        await asyncio.sleep(DELAY)
                        continue

                    data = r.json().get("data", {})
                    tags = [t["name"] for t in data.get("tags", [])]
                    width = data.get("dimension_x", 0) or 0

                    # Generar título con tags
                    def res(w):
                        if w >= 3840: return "4K"
                        if w >= 2560: return "2K"
                        if w >= 1920: return "Full HD"
                        if w >= 1280: return "HD"
                        return "Wallpaper"

                    clean = [t.replace("-", " ").title() for t in tags[:2] if t]
                    wp = session.get(Wallpaper, wid)
                    if wp:
                        wp.tags = json.dumps(tags)
                        if clean:
                            wp.title = " ".join(clean) + f" {res(width)} Wallpaper"
                        session.add(wp)
                        session.commit()
                        stats["updated"] += 1

                    if i % 100 == 0:
                        pct = i / total * 100
                        print(
                            f"  [{pct:5.1f}%] {i:,}/{total:,} | "
                            f"✅{stats['updated']:,} ⏭{stats['skipped']} ✗{stats['errors']}"
                        )

                    await asyncio.sleep(DELAY)

                except KeyboardInterrupt:
                    raise
                except Exception as e:
                    stats["errors"] += 1
                    await asyncio.sleep(DELAY)

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print(f"\n⚠ Interrumpido — ✅{stats['updated']:,} actualizados hasta ahora")