import { useEffect } from 'react'

function generateDescription(title, tags, width, height, resolution_label) {
  const tagList = tags.slice(0, 5).join(', ')
  const ratio = width && height ? (width / height).toFixed(2) : null
  const orientation = ratio >= 1 ? 'landscape' : 'portrait'
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
         onClick={onClose}>
      <div className="absolute inset-0 bg-black/95 backdrop-blur-md" />

      {/* Contenedor principal con scroll */}
      <div className="relative z-10 w-full max-w-4xl max-h-[95vh] rounded-2xl overflow-y-auto
                      shadow-2xl ring-1 ring-white/10"
           onClick={e => e.stopPropagation()}>

        {/* Boton cerrar fijo arriba */}
        <button onClick={onClose}
          className="sticky top-3 left-full z-20 -translate-x-11 w-8 h-8 rounded-full
                     bg-black/70 text-gray-400 hover:text-white hover:bg-black
                     transition-all flex items-center justify-center text-sm">
          X
        </button>

        {/* Imagen */}
        <div className="relative bg-black -mt-8">
          <img
            src={url_full}
            alt={title}
            referrerPolicy="no-referrer"
            className="w-full max-h-[60vh] object-contain"
          />
          <span className="absolute bottom-3 left-3 px-2 py-0.5 rounded
                           bg-black/70 backdrop-blur-sm text-gray-300 text-xs font-mono">
            {width}x{height} · {resolution_label}
          </span>
        </div>

        {/* Info */}
        <div className="bg-surface-900 border-t border-white/5 p-4">

          {/* Breadcrumb */}
          <nav className="text-xs text-gray-600 mb-2">
            <span>Home</span>
            <span className="mx-1">›</span>
            <span className="capitalize">{source}</span>
            <span className="mx-1">›</span>
            <span className="text-gray-400 truncate">{title}</span>
          </nav>

          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h2 className="text-white font-semibold text-base truncate">{title}</h2>

              {/* Descripcion */}
              <p className="text-gray-500 text-xs mt-1 leading-relaxed">
                {description}
              </p>

              {/* Ficha tecnica */}
              <div className="flex flex-wrap gap-3 mt-3 text-xs text-gray-500">
                <span>{width}x{height}</span>
                {aspectRatio && <span>{aspectRatio}</span>}
                <span>{format}</span>
                <span>{resolution_label}</span>
              </div>

              {/* Tags */}
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-3">
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

            <a href={`${import.meta.env.VITE_API_URL}/api/v1/wallpapers/${id}/download`}
               className="flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl
                          bg-brand-400 text-black text-sm font-semibold
                          hover:bg-brand-500 transition-all hover:scale-105">
              Download
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}