export default function WallpaperCard({ wallpaper, onClick, index = 0 }) {
  const { title, url_preview, resolution_label, width, height } = wallpaper
  const isMobile = height > width

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

      {/* Badge resolución — esquina superior derecha */}
      <span className="absolute top-2 right-2 px-2 py-0.5 rounded text-xs
                       bg-black/60 backdrop-blur-sm text-gray-300 font-mono">
        {resolution_label}
      </span>

      {/* Badge mobile — esquina inferior izquierda, solo icono */}
      {isMobile && (
        <span className="absolute bottom-2 left-2 p-1 rounded
                         bg-black/60 backdrop-blur-sm text-gray-300">
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24"
               fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="5" y="2" width="14" height="20" rx="2" ry="2"/>
            <line x1="12" y1="18" x2="12.01" y2="18"/>
          </svg>
        </span>
      )}

      {/* Overlay hover */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent
                      opacity-0 group-hover:opacity-100 transition-opacity duration-300
                      flex flex-col justify-end p-3">
        <p className="text-white text-sm font-medium truncate">{title}</p>
      </div>
    </div>
  )
}
