import { useState, useEffect, useCallback } from 'react'
import axios from 'axios'

const API = import.meta.env.VITE_API_URL

export default function AdminPage() {
  const [token, setToken]         = useState(() => sessionStorage.getItem('admin_token') || '')
  const [authed, setAuthed]       = useState(false)
  const [input, setInput]         = useState('')
  const [error, setError]         = useState('')
  const [wallpapers, setWallpapers] = useState([])
  const [page, setPage]           = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal]         = useState(0)
  const [loading, setLoading]     = useState(false)
  const [deleting, setDeleting]   = useState(null)
  const [categoryId, setCategoryId] = useState('')
  const [categories, setCategories] = useState([])
  const [search, setSearch]       = useState('')
  const [confirm, setConfirm]     = useState(null)

  const PER_PAGE = 24

  const verify = async () => {
    try {
      await axios.get(`${API}/api/v1/admin/verify`, {
        headers: { Authorization: `Bearer ${input}` }
      })
      sessionStorage.setItem('admin_token', input)
      setToken(input)
      setAuthed(true)
      setError('')
    } catch {
      setError('Invalid token.')
    }
  }

  useEffect(() => {
    if (!token) return
    axios.get(`${API}/api/v1/admin/verify`, {
      headers: { Authorization: `Bearer ${token}` }
    }).then(() => setAuthed(true)).catch(() => {
      sessionStorage.removeItem('admin_token')
      setToken('')
    })
  }, [])

  useEffect(() => {
    axios.get(`${API}/api/v1/wallpapers/categories`)
      .then(r => setCategories(r.data))
  }, [])

  const load = useCallback(async () => {
    if (!authed) return
    setLoading(true)
    try {
      const params = { page, per_page: PER_PAGE }
      if (categoryId) params.category_id = categoryId
      if (search) params.q = search
      const r = await axios.get(`${API}/api/v1/wallpapers`, { params })
      setWallpapers(r.data.items)
      setTotalPages(r.data.total_pages)
      setTotal(r.data.total)
    } finally {
      setLoading(false)
    }
  }, [authed, page, categoryId, search])

  useEffect(() => { load() }, [load])

  useEffect(() => { setPage(1) }, [categoryId, search])

  const deleteWallpaper = async (id) => {
    setDeleting(id)
    try {
      await axios.delete(`${API}/api/v1/admin/wallpapers/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setWallpapers(prev => prev.filter(w => w.id !== id))
      setTotal(prev => prev - 1)
    } catch {
      alert('Error deleting wallpaper.')
    } finally {
      setDeleting(null)
      setConfirm(null)
    }
  }

  if (!authed) return (
    <div className="min-h-screen bg-surface-900 flex items-center justify-center px-4">
      <div className="bg-surface-800 rounded-2xl p-8 w-full max-w-sm border border-surface-700">
        <h1 className="text-white text-xl font-bold mb-2">Admin Panel</h1>
        <p className="text-gray-500 text-sm mb-6">Enter your admin token to continue.</p>
        <input
          type="password"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && verify()}
          placeholder="Admin token..."
          className="w-full px-4 py-2.5 rounded-lg bg-surface-700 border border-surface-600
                     text-white placeholder-gray-500 text-sm mb-3 outline-none
                     focus:ring-2 focus:ring-brand-400 focus:border-transparent"
        />
        {error && <p className="text-red-400 text-xs mb-3">{error}</p>}
        <button
          onClick={verify}
          className="w-full bg-brand-400 text-black font-semibold py-2.5 rounded-lg text-sm hover:bg-brand-500 transition-all">
          Login
        </button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-surface-900 text-white">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-surface-900/90 backdrop-blur border-b border-surface-700">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3 flex-wrap">
          <h1 className="font-bold text-lg">Admin Panel</h1>
          <span className="text-gray-500 text-sm">{total.toLocaleString()} wallpapers</span>
          <div className="flex-1" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search..."
            className="px-3 py-1.5 rounded-lg bg-surface-700 border border-surface-600
                       text-white placeholder-gray-500 text-sm outline-none
                       focus:ring-2 focus:ring-brand-400 w-48"
          />
          <select
            value={categoryId}
            onChange={e => setCategoryId(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-surface-700 border border-surface-600
                       text-white text-sm outline-none focus:ring-2 focus:ring-brand-400">
            <option value="">All categories</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <button
            onClick={() => { sessionStorage.removeItem('admin_token'); setAuthed(false); setToken('') }}
            className="px-3 py-1.5 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-surface-700 transition-all">
            Logout
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {Array.from({ length: PER_PAGE }).map((_, i) => (
              <div key={i} className="h-48 rounded-xl bg-surface-800 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {wallpapers.map(w => (
              <div key={w.id} className="group relative overflow-hidden rounded-xl bg-surface-800 ring-1 ring-surface-700">
                <img
                  src={w.url_preview}
                  alt={w.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-48 object-cover"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/60 transition-all duration-200 flex items-center justify-center">
                  <button
                    onClick={() => setConfirm(w)}
                    className="opacity-0 group-hover:opacity-100 transition-all
                               bg-red-500 hover:bg-red-600 text-white text-xs font-semibold
                               px-3 py-1.5 rounded-lg">
                    Delete
                  </button>
                </div>
                <div className="absolute top-2 right-2 px-2 py-0.5 rounded text-xs bg-black/60 text-gray-300 font-mono">
                  {w.resolution_label}
                </div>
                <div className="absolute bottom-0 left-0 right-0 bg-black/70 px-2 py-1">
                  <p className="text-white text-xs truncate">{w.title}</p>
                  <p className="text-gray-400 text-xs">ID: {w.id}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Paginación */}
        <div className="flex items-center justify-center gap-3 mt-8">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 rounded-lg bg-surface-700 text-gray-400 disabled:opacity-30 hover:text-white transition-all text-sm">
            ← Prev
          </button>
          <span className="text-gray-400 text-sm">Page {page} of {totalPages}</span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 rounded-lg bg-surface-700 text-gray-400 disabled:opacity-30 hover:text-white transition-all text-sm">
            Next →
          </button>
        </div>
      </div>

      {/* Modal confirmación */}
      {confirm && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center px-4">
          <div className="bg-surface-800 rounded-2xl p-6 max-w-sm w-full border border-surface-700">
            <h3 className="text-white font-bold mb-2">Delete wallpaper?</h3>
            <p className="text-gray-400 text-sm mb-1">{confirm.title}</p>
            <p className="text-gray-600 text-xs mb-6">ID: {confirm.id} · This cannot be undone.</p>
            <img src={confirm.url_preview} alt="" referrerPolicy="no-referrer"
                 className="w-full h-32 object-cover rounded-lg mb-6" />
            <div className="flex gap-3">
              <button
                onClick={() => setConfirm(null)}
                className="flex-1 px-4 py-2 rounded-lg bg-surface-700 text-gray-400 hover:text-white text-sm transition-all">
                Cancel
              </button>
              <button
                onClick={() => deleteWallpaper(confirm.id)}
                disabled={deleting === confirm.id}
                className="flex-1 px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white font-semibold text-sm transition-all disabled:opacity-50">
                {deleting === confirm.id ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
