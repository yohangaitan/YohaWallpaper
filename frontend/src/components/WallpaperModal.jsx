import { useEffect } from 'react'

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

  const { id, title, media_type, url_full, resolution_label, tags, source, width, height } = wallpaper

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
         onClick={onClose}>
      <div className="absolute inset-0 bg-black/95 backdrop-blur-md" />

      <div className="relative z-10 w-full max-w-4xl rounded-2xl overflow-hidden
                      shadow-2xl ring-1 ring-white/10"
           onClick={e => e.stopPropagation()}>

        {/* Imagen */}
        <div className="relative bg-black">
          <img
            src={url_full}
            alt={title}
            referrerPolicy="no-referrer"
            className="w-full max-h-[75vh] object-contain"
          />

          {/* Botón cerrar */}
          <button onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/70
                       text-gray-400 hover:text-white hover:bg-black
                       transition-all flex items-center justify-center text-sm">
            ✕
          </button>

          {/* Badge resolución sobre la imagen */}
          <span className="absolute bottom-3 left-3 px-2 py-0.5 rounded
                           bg-black/70 backdrop-blur-sm text-gray-300 text-xs font-mono">
            {width}×{height} · {resolution_label}
          </span>
        </div>

        {/* Info */}
        <div className="bg-surface-900 border-t border-white/5 p-4">
          <div className="flex items-start justify-between gap-4">

            <div className="flex-1 min-w-0">
              <h2 className="text-white font-semibold text-base truncate">{title}</h2>
              <p className="text-gray-500 text-xs mt-0.5 capitalize">{source}</p>

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

            <a href={`/api/v1/wallpapers/${id}/download`}
               className="flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl
                          bg-brand-400 text-black text-sm font-semibold
                          hover:bg-brand-500 transition-all hover:scale-105">
              ↓ Descargar
            </a>

          </div>
        </div>
      </div>
    </div>
  )
}