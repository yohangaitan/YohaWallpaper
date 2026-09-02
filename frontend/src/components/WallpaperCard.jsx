
export default function WallpaperCard({ wallpaper, onClick, index = 0 }) {
  const { title, media_type, url_preview, resolution_label, tags } = wallpaper

  return (
    <div
      onClick={() => onClick?.(wallpaper)}
      className="group relative overflow-hidden rounded-xl bg-surface-800 cursor-pointer
                 ring-1 ring-surface-700 hover:ring-surface-600 transition-all duration-300
                 hover:scale-[1.03] hover:shadow-2xl hover:shadow-brand-400/10
                 animate-slide-up"
      style={{ animationDelay: `${Math.min(index * 40, 400)}ms`, animationFillMode: 'both' }}
    >
      <img
        src={url_preview}
        alt={title}
        className="w-full h-48 object-cover transition-transform duration-500 group-hover:scale-105"
        loading="lazy"
      />

      {/* Resolución */}
      <span className="absolute top-2 right-2 px-2 py-0.5 rounded text-xs
                       bg-black/60 backdrop-blur-sm text-gray-300 font-mono">
        {resolution_label}
      </span>

      {/* Overlay hover */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent
                      opacity-0 group-hover:opacity-100 transition-opacity duration-300
                      flex flex-col justify-end p-3">
        <p className="notranslate text-white text-sm font-medium truncate">{title}</p>
        
      </div>
    </div>
  )
}
