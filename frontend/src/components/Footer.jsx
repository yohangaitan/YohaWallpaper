export default function Footer() {
  const year = new Date().getFullYear()
  return (
    <footer className="border-t border-surface-700 mt-16 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src="/favicon.svg" alt="logo" className="w-6 h-6" />
            <span className="text-white font-semibold">
              Yoha<span className="text-brand-400">Wallpaper</span>
            </span>
          </div>
          <p className="text-gray-600 text-sm">
            © {year} YohaWallpaper · Images courtesy of{' '}  {/* Cambiado */}
            <a href="https://wallhaven.cc" target="_blank" rel="noopener"
               className="text-brand-400 hover:underline">Wallhaven</a>
          </p>
          <div className="flex gap-4 text-sm text-gray-600">
            <span>121,000+ wallpapers</span>
            <span>·</span>
            <span>HD · 2K · 4K</span>
          </div>
        </div>
      </div>
    </footer>
  )
}