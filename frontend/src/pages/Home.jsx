import { useState, useEffect, useCallback } from 'react'
import WallpaperCard  from '../components/WallpaperCard'
import WallpaperModal from '../components/WallpaperModal'
import { fetchWallpapers } from '../services/api'
import useSEO from '../hooks/useSEO'
import PaginationBar from '../components/PaginationBar'

export default function Home({ searchQuery, sort = 'default', categoryId, categoryName, resolution, mobileOnly, onSearch }) {
  const [wallpapers, setWallpapers] = useState([])
  const [pagination, setPagination] = useState(null)
  const [page, setPage]             = useState(1)
  const [perPage, setPerPage]       = useState(24)
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState(null)
  const [selected, setSelected]     = useState(null)

  const seoTitle = searchQuery
    ? `"${searchQuery}" Wallpapers`
    : categoryName
      ? `${categoryName} Wallpapers HD & 4K`
      : sort === 'popular'  ? 'Popular HD & 4K Wallpapers'
      : sort === 'trending' ? 'Trending HD & 4K Wallpapers'
      : 'Free HD & 4K Wallpapers'

  const seoDesc = searchQuery
    ? `Download "${searchQuery}" wallpapers in high resolution. Free HD and 4K downloads.`
    : categoryName
      ? `The best ${categoryName} wallpapers in HD and 4K. Free download.`
      : 'Download static wallpapers in HD and 4K. Anime, Gaming, Cyberpunk, Nature and more.'

  useSEO({ title: seoTitle, description: seoDesc })

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const params = { page, per_page: perPage }
      if (sort && sort !== 'default') params.sort = sort
      if (categoryId)  params.category_id = categoryId
      if (resolution)  params.resolution  = resolution
      if (mobileOnly)  params.orientation = 'portrait'
      if (searchQuery) {
        params.q = searchQuery
        if (document.cookie.includes('googtrans=/en/es')) params.lang = 'es'
      }
      const data = await fetchWallpapers(params)
      setWallpapers(data.items); setPagination(data)
    } catch {
      setError('Could not connect to the server.')
    }
    finally { setLoading(false) }
  }, [page, sort, searchQuery, categoryId, resolution, mobileOnly, perPage])

  useEffect(() => {
    setPage(1)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [sort, searchQuery, categoryId, resolution, mobileOnly])

  useEffect(() => { load() }, [load])

  const heading = searchQuery
    ? `Results: "${searchQuery}"`
    : categoryName || (sort === 'popular' ? 'Popular' : sort === 'trending' ? 'Trending' : 'All')

  return (
    <>
      <WallpaperModal
        wallpaper={selected}
        onClose={() => setSelected(null)}
        onTagSearch={(tag) => { onSearch?.(tag) }}
        onWallpaperSelect={setSelected}
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
            <p className="text-white text-lg font-medium mb-2">No results found</p>
            <p className="text-gray-500 mb-8">We couldn't find any wallpapers for that search.</p>
            {searchQuery && (
              <div className="flex flex-col items-center gap-3">
                <p className="text-gray-600 text-sm">Try searching for:</p>
                <div className="flex flex-wrap justify-center gap-2">
                  {['anime', 'cyberpunk', 'nature', 'space', 'fantasy',
                    'dark', 'retro', 'gaming', 'japan', 'abstract'].map(s => (
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
