import { useEffect } from 'react'

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

export default function WallpaperModal({ wallpaper, onClose, onTagSearch }) {
  useEffect(() => {
    if (!wallpaper) return
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handler)
      document.body.style.overflow = ''
    }
  }, [wallpaper, onClose])

  if (!wallpaper) return null

  const { id, title, file_format, resolution_label, tags, source, width, height, url_full } = wallpaper
  const description = generateDescription(title, tags, width, height, resolution_label)
  const aspectRatio = width && height ? getAspectRatio(width, height) : null
  const format = file_format ? file_format.toUpperCase() : 'JPG'

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/95 backdrop-blur-md"
         onClick={onClose}>
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-4xl rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/10"
             onClick={e => e.stopPropagation()}>

          {/* Imagen — click abre pantalla completa */}
          <div className="relative bg-black">
            <a href={url_full} target="_blank" rel="noopener noreferrer">
              <img
                src={url_full}
                alt={title}
                referrerPolicy="no-referrer"
                className="w-full object-contain max-h-[65vh] mx-auto block cursor-zoom-in"
              />
            </a>

            {/* Boton cerrar */}
            <button onClick={onClose}
              className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/70
                         text-gray-400 hover:text-white hover:bg-black
                         transition-all flex items-center justify-center text-sm font-bold">
              X
            </button>

            {/* Badge resolucion */}
            <span className="absolute bottom-3 left-3 px-2 py-0.5 rounded
                             bg-black/70 backdrop-blur-sm text-gray-300 text-xs font-mono">
              {width}x{height} · {resolution_label}
            </span>

            {/* Boton download sobre la imagen abajo derecha */}
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

            {/* Breadcrumb */}
            <nav className="text-xs text-gray-600 mb-2 truncate">
              <span>Home</span>
              <span className="mx-1">›</span>
              <span className="capitalize">{source}</span>
              <span className="mx-1">›</span>
              <span className="text-gray-400">{title}</span>
            </nav>

            <h2 className="text-white font-semibold text-base mb-1">{title}</h2>

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
                    className="px-2 py-0.5 bg-white/5 hover:bg-brand-400/20
                               text-gray-400 hover:text-brand-400 text-xs rounded
                               border border-white/10 hover:border-brand-400/30
                               transition-all cursor-pointer">
                    #{tag}
                  </button>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}