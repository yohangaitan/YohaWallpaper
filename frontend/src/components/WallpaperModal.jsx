import { useEffect, useState } from 'react'
import axios from 'axios'

function generateDescription(title, tags, width, height, resolution_label) {
  const tagList = tags.slice(0, 5).join(', ')
  const orientation = width >= height ? 'landscape' : 'portrait'
  return `Download this ${resolution_label} wallpaper (${width}x${height}) — ${title}. ` +
    `A high-quality ${orientation} image featuring: ${tagList}. ` +
    `Perfect for desktop and mobile backgrounds.`
}

function getAspectRatio(width, height) {
  const gcd = (a, b) => b === 0 ? a : gcd(b, a % b)
  const d = gcd(width, height)
  return `${width / d}:${height / d}`
}

export default function WallpaperModal({ wallpaper, onClose, onTagSearch, onWallpaperSelect }) {
  const [history, setHistory] = useState([])
  const [current, setCurrent] = useState(null)
  const [related, setRelated] = useState([])

  // Cuando el padre abre un wallpaper nuevo, reseteamos todo
  useEffect(() => {
    if (!wallpaper) {
      setCurrent(null)
      setHistory([])
      return
    }
    setCurrent(wallpaper)
    setHistory([])
  }, [wallpaper])

  // Fetch relacionados según el wallpaper actual
  useEffect(() => {
    if (!current?.category_id) return
    axios.get(`${import.meta.env.VITE_API_URL}/api/v1/wallpapers`, {
      params: { category_id: current.category_id, per_page: 7, sort: 'popular', page: Math.floor(Math.random() * 10) + 1 }
    }).then(r => setRelated(r.data.items))
  }, [current?.id])

  // Escape key y scroll lock
  useEffect(() => {
    if (!current) return
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handler)
      document.body.style.overflow = ''
    }
  }, [current, onClose])

  if (!current) return null

  const { id, title, file_format, resolution_label, tags, source, width, height, url_full } = current
  const description = generateDescription(title, tags, width, height, resolution_label)
  const aspectRatio = width && height ? getAspectRatio(width, height) : null
  const format = file_format ? file_format.toUpperCase() : 'JPG'

  // Navegar a un relacionado: apila el actual en historial
  const handleRelatedClick = (w) => {
    setHistory(prev => [...prev, current])
    setCurrent(w)
  }

  // Volver al wallpaper anterior
  const handleBack = () => {
    if (history.length === 0) { onClose(); return }
    const prev = history[history.length - 1]
    setHistory(h => h.slice(0, -1))
    setCurrent(prev)
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/95 backdrop-blur-md"
         onClick={onClose}>
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-4xl rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/10"
             onClick={e => e.stopPropagation()}>

          {/* Imagen */}
          <div className="relative bg-black">
            <img
              src={url_full}
              alt={title}
              referrerPolicy="no-referrer"
              className="w-full object-contain max-h-[65vh] mx-auto block"
            />

            {/* Botón cerrar */}
            <button onClick={onClose}
              className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/70
                         text-gray-400 hover:text-white hover:bg-black
                         transition-all flex items-center justify-center text-sm font-bold">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
                   fill="none" stroke="currentColor" strokeWidth="2.5"
                   strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>

            {/* Botón volver — solo aparece si hay historial */}
            {history.length > 0 && (
              <button onClick={handleBack}
                className="absolute top-3 left-3 flex items-center gap-1 px-3 py-1.5 rounded-full
                           bg-black/70 text-gray-300 hover:text-white hover:bg-black
                           transition-all text-xs font-medium">
                ← Back
              </button>
            )}

            <span className="absolute bottom-3 left-3 px-2 py-0.5 rounded
                             bg-black/70 backdrop-blur-sm text-gray-300 text-xs font-mono">
              {width}x{height} · {resolution_label}
            </span>
            <a href={`${import.meta.env.VITE_API_URL}/api/v1/wallpapers/${id}/download`}
               onClick={e => e.stopPropagation()}
               className="absolute bottom-3 right-3 flex items-center gap-2 px-4 py-2 rounded-xl
                          bg-brand-400 text-black text-sm font-semibold
                          hover:bg-brand-500 transition-all">
              Download
            </a>
          </div>

          {/* Info */}
          <div className="bg-surface-900 border-t border-white/5 p-4">
            <nav className="text-xs text-gray-600 mb-2 truncate">
              <span>Home</span>
              <span className="mx-1">›</span>
              <span className="capitalize">{source}</span>
              <span className="mx-1">›</span>
              <span className="notranslate text-gray-400">{title}</span>
            </nav>

            <h2 className="notranslate text-white font-semibold text-base mb-1">{title}</h2>

            <p className="text-gray-500 text-xs leading-relaxed mb-3">
              {description}
            </p>

            <div className="flex flex-wrap gap-x-4 gap-y-1 mb-3 text-xs text-gray-500">
              <span>{width}x{height}</span>
              {aspectRatio && <span>{aspectRatio}</span>}
              <span>{format}</span>
              <span>{resolution_label}</span>
            </div>

            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {tags.map(tag => (
                  <button
                    key={tag}
                    onClick={() => { onTagSearch?.(tag); onClose() }}
                    className="notranslate px-2 py-0.5 bg-white/5 hover:bg-brand-400/20
                               text-gray-400 hover:text-brand-400 text-xs rounded
                               border border-white/10 hover:border-brand-400/30
                               transition-all cursor-pointer">
                    #{tag}
                  </button>
                ))}
              </div>
            )}

            {related.length > 0 && (
              <div className="mt-4 pt-4 border-t border-white/5">
                <p className="text-gray-500 text-xs mb-2">Related wallpapers</p>
                <div className="grid grid-cols-3 gap-2">
                  {related.filter(w => w.id !== current.id).slice(0, 6).map(w => (
                    <img
                      key={w.id}
                      src={w.url_preview}
                      alt={w.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-20 object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => handleRelatedClick(w)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}