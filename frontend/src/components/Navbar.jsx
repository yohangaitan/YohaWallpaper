import { useEffect, useState } from 'react'

export default function Navbar({ onSearch, onSort, activeSort, searchQuery: externalQuery }) {
  const [query, setQuery] = useState('')
  const [lang, setLang] = useState(() => {
    // Cambiado: cookie ahora es /en/es (site en inglés → traducir a español)
    return document.cookie.includes('googtrans=/en/es') ? 'es' : 'en'
  })

  useEffect(() => {
    setQuery(externalQuery || '')
  }, [externalQuery])

  const handleSubmit = (e) => {
    e.preventDefault()
    onSearch?.(query.trim())
  }

  const clearSearch = () => {
    setQuery('')
    onSearch?.('')
  }

  const toggleLang = () => {
    const next = lang === 'en' ? 'es' : 'en'
    if (next === 'es') {
      // Cambiado: de inglés a español
      document.cookie = 'googtrans=/en/es; path=/'
    } else {
      document.cookie = 'googtrans=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
      document.cookie = 'googtrans=; path=/; domain=' + window.location.hostname + '; expires=Thu, 01 Jan 1970 00:00:00 GMT'
    }
    setLang(next)
    window.location.reload()
  }

  return (
    <header className="sticky top-0 z-50 bg-surface-900/90 backdrop-blur-md border-b border-surface-700">
      <div className="max-w-7xl mx-auto px-4">

        {/* Row 1: Logo + Search + Language */}
        <div className="flex items-center gap-3 py-3">
          <a href="/" className="flex items-center gap-2 flex-shrink-0 group">
            <img src="/favicon.svg" alt="logo" className="w-8 h-8 group-hover:rotate-12 transition-transform duration-300" />
            <span className="font-bold text-white text-lg tracking-tight hidden sm:block">
              Yoha<span className="text-brand-400">Wallpaper</span>
            </span>
          </a>

          <form onSubmit={handleSubmit} className="flex-1 relative">
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search by name, character or #tag..."  {/* Cambiado */}
              className="w-full pl-4 pr-8 py-2 rounded-lg bg-surface-700 border border-surface-600
                         text-white placeholder-gray-500 text-sm
                         focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent
                         transition-all"
            />
            {query && (
              <button type="button" onClick={clearSearch}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors">
                ✕
              </button>
            )}
          </form>

          {/* Sort buttons — desktop only */}
          <nav className="hidden sm:flex gap-1 flex-shrink-0">
            {[
              { label: 'All',      value: 'default'  },  {/* Cambiado */}
              { label: 'Popular',  value: 'popular'  },  {/* Cambiado */}
              { label: 'Trending', value: 'trending' },  {/* Cambiado */}
            ].map(({ label, value }) => (
              <button
                key={value}
                onClick={() => onSort?.(value)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all
                  ${activeSort === value
                    ? 'bg-brand-400 text-black'
                    : 'text-gray-400 hover:text-white hover:bg-surface-700'}`}>
                {label}
              </button>
            ))}
          </nav>

          <button
            onClick={toggleLang}
            className="flex-shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium
                       text-gray-400 hover:text-white hover:bg-surface-700 transition-all">
            {/* Cambiado: en inglés muestra ES (para cambiar a español) y viceversa */}
            {lang === 'en' ? '🌐 ES' : '🌐 EN'}
          </button>
        </div>

        {/* Row 2: All / Popular / Trending — mobile only */}
        <div className="flex sm:hidden gap-1 pb-2">
          {[
            { label: 'All',      value: 'default'  },  {/* Cambiado */}
            { label: 'Popular',  value: 'popular'  },  {/* Cambiado */}
            { label: 'Trending', value: 'trending' },  {/* Cambiado */}
          ].map(({ label, value }) => (
            <button
              key={value}
              onClick={() => onSort?.(value)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all
                ${activeSort === value
                  ? 'bg-brand-400 text-black'
                  : 'text-gray-400 hover:text-white hover:bg-surface-700'}`}>
              {label}
            </button>
          ))}
        </div>

      </div>
    </header>
  )
}