export default function PaginationBar({ page, totalPages, onPageChange, perPage, onPerPageChange }) {
  if (totalPages <= 1) return null

  const goto = (p) => {
    if (p < 1 || p > totalPages || p === page) return
    onPageChange(p)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const buildPages = () => {
    const pages = []
    const delta = 2
    const rangeStart = Math.max(2, page - delta)
    const rangeEnd   = Math.min(totalPages - 1, page + delta)

    pages.push(1)
    if (rangeStart > 2) pages.push('...')
    for (let i = rangeStart; i <= rangeEnd; i++) pages.push(i)
    if (rangeEnd < totalPages - 1) pages.push('...')
    if (totalPages > 1) pages.push(totalPages)

    return pages
  }

  return (
    <div className="mt-12 flex items-center justify-center">

      {/* Navegación de páginas */}
      <nav className="flex items-center gap-1">
        <button
          onClick={() => goto(page - 1)}
          disabled={page === 1}
          className="px-3 h-9 rounded-lg text-sm text-gray-400 hover:text-white
                     hover:bg-white/10 disabled:opacity-20 disabled:cursor-not-allowed transition-all">
          ‹
        </button>

        {buildPages().map((p, i) =>
          p === '...' ? (
            <span key={`e-${i}`}
              className="w-9 h-9 flex items-center justify-center text-gray-600 text-sm">
              …
            </span>
          ) : (
            <button
              key={p}
              onClick={() => goto(p)}
              className={`w-9 h-9 rounded-lg text-sm font-medium transition-all
                ${p === page
                  ? 'bg-brand-400 text-black font-bold'
                  : 'text-gray-400 hover:text-white hover:bg-white/10'}`}>
              {p}
            </button>
          )
        )}

        <button
          onClick={() => goto(page + 1)}
          disabled={page === totalPages}
          className="px-3 h-9 rounded-lg text-sm text-gray-400 hover:text-white
                     hover:bg-white/10 disabled:opacity-20 disabled:cursor-not-allowed transition-all">
          ›
        </button>
      </nav>

    </div>
  )
}