import { useState, useEffect, useCallback } from 'react'
import WallpaperCard  from '../components/WallpaperCard'
import WallpaperModal from '../components/WallpaperModal'
import { fetchWallpapers } from '../services/api'
import useSEO from '../hooks/useSEO'
import PaginationBar from '../components/PaginationBar'

export default function Home({ searchQuery, sort = 'default', categoryId, categoryName, onSearch }) {
  const [wallpapers, setWallpapers] = useState([])
  const [pagination, setPagination] = useState(null)
  const [page, setPage]             = useState(1)
  const [perPage, setPerPage]       = useState(24)
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState(null)
  const [selected, setSelected]     = useState(null)

  const seoTitle = searchQuery
    ? `"${searchQuery}" wallpapers`
    : categoryName
      ? `Wallpapers de ${categoryName}`
      : sort === 'popular'  ? 'Wallpapers Populares HD y 4K'
      : sort === 'trending' ? 'Wallpapers en Tendencia HD y 4K'
      : 'Wallpapers HD y 4K gratis'

  const seoDesc = searchQuery
    ? `Wallpapers de "${searchQuery}" en alta resolución. Descarga gratis en HD y 4K.`
    : categoryName
      ? `Los mejores wallpapers de ${categoryName} en HD y 4K. Descarga gratis.`
      : 'Descarga wallpapers estáticos y animados en HD y 4K. Anime, Gaming, Cyberpunk, Naturaleza y más.'

  useSEO({ title: seoTitle, description: seoDesc })

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const params = { page, per_page: perPage }
      if (sort && sort !== 'default') params.sort = sort
      if (searchQuery) params.q           = searchQuery
      if (categoryId)  params.category_id = categoryId
      const data = await fetchWallpapers(params)
      setWallpapers(data.items); setPagination(data)
    } catch { setError('No se pudo conectar con el backend.') }
    finally { setLoading(false) }
  }, [page, sort, searchQuery, categoryId, perPage])

  useEffect(() => {
    setPage(1)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [sort, searchQuery, categoryId])

  useEffect(() => { load() }, [load])

  const heading = searchQuery
    ? `Resultados: "${searchQuery}"`
    : categoryName || (sort === 'popular' ? 'Populares' : sort === 'trending' ? 'Tendencia' : 'Todos')

  return (
    <>
      <WallpaperModal
        wallpaper={selected}
        onClose={() => setSelected(null)}
        onTagSearch={(tag) => { onSearch?.(tag) }}
      />

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6 animate-fade-in">
          <h1 className="text-2xl font-bold text-white">{heading}</h1>
          {pagination && (
            <p className="text-gray-500 text-sm mt-1">
              {pagination.total.toLocaleString()} wallpapers
            </p>
          )}
        </div>

        {error && (
          <div className="bg-red-900/30 border border-red-700 text-red-400 rounded-xl p-6 text-center mb-6">
            {error}
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {Array.from({ length: perPage }).map((_, i) => (
              <div key={i} className="h-48 rounded-xl bg-surface-800 animate-pulse"
                   style={{ animationDelay: `${i * 30}ms` }} />
            ))}
          </div>
        
        ) : wallpapers.length === 0 && !error ? (
          <div className="text-center py-24 animate-fade-in">
            <img src="/favicon.svg" alt="logo" className="w-12 h-12 mx-auto mb-6 opacity-30" />
            <p className="text-white text-lg font-medium mb-2">Sin resultados</p>
            <p className="text-gray-500 mb-8">No encontramos wallpapers para esa búsqueda.</p>
            {searchQuery && (
              <div className="flex flex-col items-center gap-3">
                <p className="text-gray-600 text-sm">Prueba con:</p>
                <div className="flex flex-wrap justify-center gap-2">
                  {['anime', 'cyberpunk', 'naturaleza', 'espacio', 'fantasía',
                    'dark', 'retro', 'gaming', 'japón', 'abstracto'].map(s => (
                    <button
                      key={s}
                      onClick={() => onSearch?.(s)}
                      className="px-3 py-1.5 rounded-lg text-sm bg-white/5
                                 text-gray-400 hover:text-white hover:bg-white/10
                                 border border-white/10 hover:border-white/20 transition-all">
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {wallpapers.map((w, i) => (
              <WallpaperCard key={w.id} wallpaper={w} onClick={setSelected} index={i} />
            ))}
          </div>
        )}

        <PaginationBar
          page={page}
          totalPages={pagination?.total_pages ?? 1}
          onPageChange={setPage}
          perPage={perPage}
          onPerPageChange={(n) => { setPerPage(n); setPage(1) }}
        />
      </main>
    </>
  )
}