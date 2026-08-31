# YohaWallpaper 🖼️

A modern wallpaper platform with 121,000+ high-quality wallpapers. Built with FastAPI and React, powered by the Wallhaven API.

🌐 **Live Demo:** [yoha-wallpaper.vercel.app](https://yoha-wallpaper.vercel.app)

---

## ✨ Features

- 121,000+ wallpapers in HD, 2K, and 4K
- Search by name, character, or `#tag`
- Filter by category: Anime, Gaming, Cyberpunk, Nature, Space, and more
- Sort by Latest, Popular, or Trending
- One-click download via proxy
- EN/ES language toggle (Google Translate)
- Fully responsive — mobile and desktop
- Custom 404 page

## 🛠️ Tech Stack

**Backend**
- Python 3.13 · FastAPI · SQLModel · SQLite
- Redis (cache) · slowapi (rate limiting)
- Deployed on [Fly.io](https://fly.io)

**Frontend**
- React 18 · Vite · Tailwind CSS v3
- Axios · Lucide React
- Deployed on [Vercel](https://vercel.com)

**Data**
- [Wallhaven API](https://wallhaven.cc/help/api)

## 📁 Project Structure

```
YohaWallpaper/
├── backend/
│   ├── app/
│   │   ├── api/v1/wallpapers.py   # Routes: sort, cache, rate limit, tag search
│   │   ├── models/wallpaper.py
│   │   ├── schemas/wallpaper.py
│   │   ├── services/fetcher.py
│   │   ├── config.py
│   │   ├── database.py
│   │   └── main.py
│   ├── fetch_tags_parallel.py     # Parallel tag fetcher (3 API keys)
│   └── requirements.txt
└── frontend/
    └── src/
        ├── components/
        │   ├── Navbar.jsx
        │   ├── CategoryBar.jsx
        │   ├── WallpaperCard.jsx
        │   ├── WallpaperModal.jsx
        │   ├── PaginationBar.jsx
        │   └── Footer.jsx
        └── pages/
            ├── Home.jsx
            └── NotFound.jsx
```

## 🚀 Local Setup

### Requirements
- Python 3.13+
- Node.js 18+
- Redis

### Backend

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # or venv/bin/activate.fish on Fish shell

# Install dependencies
cd backend
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env and add your Wallhaven API key

# Run
uvicorn app.main:app --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Backend runs at `http://localhost:8000` · Frontend at `http://localhost:5173`

## 🔌 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| GET | `/api/v1/wallpapers` | List wallpapers (sort, search, filter, paginate) |
| GET | `/api/v1/wallpapers/{id}` | Wallpaper detail |
| GET | `/api/v1/wallpapers/{id}/download` | Download proxy |
| GET | `/api/v1/wallpapers/categories` | List categories |

**Query params for `/api/v1/wallpapers`:**
- `sort` — `default` · `popular` · `trending`
- `q` — search by name, character, or tag (prefix `#` for tag search)
- `category_id` — filter by category
- `page` / `per_page` — pagination

## 🌍 Deployment

| Service | URL |
|---------|-----|
| Frontend (Vercel) | [yoha-wallpaper.vercel.app](https://yoha-wallpaper.vercel.app) |
| Backend (Fly.io) | [yohawallpaper-api.fly.dev](https://yohawallpaper-api.fly.dev) |

## 📄 License

MIT © 2026 [yohangaitan](https://github.com/yohangaitan)
