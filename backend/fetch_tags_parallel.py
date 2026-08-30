"""
fetch_tags_parallel.py — Obtiene tags de Wallhaven con 3 workers en paralelo
Cada worker usa una API key distinta para triplicar la velocidad.
Ejecutar desde: backend/
  python fetch_tags_parallel.py
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

KEYS = [
    os.getenv("WALLHAVEN_API_KEY",   ""),
    os.getenv("WALLHAVEN_API_KEY_2", ""),
    os.getenv("WALLHAVEN_API_KEY_3", ""),
]
KEYS = [k for k in KEYS if k.strip()]

DELAY     = 1.5
DELAY_429 = 70.0

stats = {"updated": 0, "skipped": 0, "errors": 0}
lock  = asyncio.Lock()

def res_label(w: int) -> str:
    if w >= 3840: return "4K"
    if w >= 2560: return "2K"
    if w >= 1920: return "Full HD"
    if w >= 1280: return "HD"
    return "Wallpaper"

def load_pending() -> list[tuple[int, str]]:
    with Session(engine) as s:
        rows = s.exec(
            select(Wallpaper.id, Wallpaper.external_id)
            .where(Wallpaper.tags == "[]")
        ).all()
    return list(rows)

async def process(worker_id: int, key: str, queue: asyncio.Queue, total: int):
    async with httpx.AsyncClient(timeout=30) as client:
        while True:
            try:
                wid, ext_id = queue.get_nowait()
            except asyncio.QueueEmpty:
                break

            try:
                r = await client.get(
                    f"https://wallhaven.cc/api/v1/w/{ext_id}",
                    params={"apikey": key}
                )

                if r.status_code == 429:
                    print(f"  [W{worker_id}] Rate-limit. Esperando {DELAY_429}s…")
                    await asyncio.sleep(DELAY_429)
                    await queue.put((wid, ext_id))
                    continue

                if r.status_code == 404:
                    async with lock:
                        stats["skipped"] += 1
                    await asyncio.sleep(DELAY)
                    continue

                if r.status_code != 200:
                    async with lock:
                        stats["errors"] += 1
                    await asyncio.sleep(DELAY)
                    continue

                data = r.json().get("data", {})
                tags = [t["name"] for t in data.get("tags", [])]
                width = data.get("dimension_x", 0) or 0

                clean = [t.replace("-", " ").title() for t in tags[:2] if t]

                with Session(engine) as s:
                    wp = s.get(Wallpaper, wid)
                    if wp:
                        wp.tags = json.dumps(tags)
                        if clean:
                            wp.title = " ".join(clean) + f" {res_label(width)} Wallpaper"
                        s.add(wp)
                        s.commit()

                async with lock:
                    stats["updated"] += 1
                    done = stats["updated"] + stats["skipped"] + stats["errors"]
                    if done % 200 == 0:
                        pct = done / total * 100
                        print(
                            f"  [{pct:5.1f}%] {done:,}/{total:,} | "
                            f"✅{stats['updated']:,} ⏭{stats['skipped']} ✗{stats['errors']}"
                        )

            except Exception as e:
                async with lock:
                    stats["errors"] += 1
            finally:
                await asyncio.sleep(DELAY)
                queue.task_done()

async def main():
    print("=" * 60)
    print(f"🚀 fetch_tags_parallel — {len(KEYS)} workers")
    print("=" * 60)

    if not KEYS:
        print("❌ No hay API keys en .env")
        return

    pending = load_pending()
    total   = len(pending)
    print(f"📊 Wallpapers sin tags: {total:,}")
    print(f"⏱  Estimado: ~{total * DELAY / len(KEYS) / 3600:.1f} horas\n")

    queue = asyncio.Queue()
    for item in pending:
        await queue.put(item)

    workers = [
        asyncio.create_task(process(i + 1, key, queue, total))
        for i, key in enumerate(KEYS)
    ]

    try:
        await asyncio.gather(*workers)
    except KeyboardInterrupt:
        pass

    print("\n" + "=" * 60)
    print("✅ COMPLETADO")
    print(f"   Actualizados : {stats['updated']:,}")
    print(f"   Omitidos     : {stats['skipped']:,}")
    print(f"   Errores      : {stats['errors']}")
    print("=" * 60)

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print(f"\n⚠ Interrumpido — {stats['updated']:,} actualizados")
