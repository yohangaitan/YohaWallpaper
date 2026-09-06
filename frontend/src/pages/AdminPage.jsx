import { useState, useEffect, useCallback } from 'react'
import axios from 'axios'

const API = import.meta.env.VITE_API_URL

function LoginScreen({ onLogin }) {
  const [input, setInput] = useState('')
  const [error, setError] = useState('')
  const verify = async () => {
    try {
      await axios.get(`${API}/api/v1/admin/verify`, { headers: { Authorization: `Bearer ${input}` } })
      sessionStorage.setItem('admin_token', input)
      onLogin(input)
    } catch { setError('Invalid token.') }
  }
  return (
    <div className="min-h-screen bg-surface-900 flex items-center justify-center px-4">
      <div className="bg-surface-800 rounded-2xl p-8 w-full max-w-sm border border-surface-700">
        <h1 className="text-white text-xl font-bold mb-2">Admin Panel</h1>
        <p className="text-gray-500 text-sm mb-6">Enter your admin token to continue.</p>
        <input type="password" value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && verify()} placeholder="Admin token..."
          className="w-full px-4 py-2.5 rounded-lg bg-surface-700 border border-surface-600
                     text-white placeholder-gray-500 text-sm mb-3 outline-none focus:ring-2 focus:ring-brand-400" />
        {error && <p className="text-red-400 text-xs mb-3">{error}</p>}
        <button onClick={verify}
          className="w-full bg-brand-400 text-black font-semibold py-2.5 rounded-lg text-sm hover:bg-brand-500 transition-all">
          Login
        </button>
      </div>
    </div>
  )
}

function PreviewModal({ url, onClose }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])
  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4"
         onClick={onClose}>
      <button onClick={onClose}
        className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20
                   text-white flex items-center justify-center transition-all">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
             fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
      <img src={url} referrerPolicy="no-referrer" alt="preview"
           className="max-w-full max-h-full object-contain rounded-xl"
           onClick={e => e.stopPropagation()} />
    </div>
  )
}

export default function AdminPage() {
  const [token, setToken]   = useState(() => sessionStorage.getItem('admin_token') || '')
  const [authed, setAuthed] = useState(false)
  const [tab, setTab]       = useState('manage')

  useEffect(() => {
    if (!token) return
    axios.get(`${API}/api/v1/admin/verify`, { headers: { Authorization: `Bearer ${token}` } })
      .then(() => setAuthed(true))
      .catch(() => { sessionStorage.removeItem('admin_token'); setToken('') })
  }, [token])

  const logout = () => { sessionStorage.removeItem('admin_token'); setToken(''); setAuthed(false) }

  if (!authed) return <LoginScreen onLogin={t => { setToken(t); setAuthed(true) }} />

  return (
    <div className="min-h-screen bg-surface-900 text-white">
      <div className="sticky top-0 z-40 bg-surface-900/95 backdrop-blur border-b border-surface-700">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-4">
          <h1 className="font-bold text-lg">Admin Panel</h1>
          <div className="flex gap-1">
            {['manage', 'import'].map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all
                  ${tab === t ? 'bg-brand-400 text-black' : 'text-gray-400 hover:text-white hover:bg-surface-700'}`}>
                {t === 'manage' ? 'Manage' : 'Import from Wallhaven'}
              </button>
            ))}
          </div>
          <div className="flex-1" />
          <button onClick={logout}
            className="px-3 py-1.5 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-surface-700 transition-all">
            Logout
          </button>
        </div>
      </div>
      {tab === 'manage' ? <ManageTab token={token} /> : <ImportTab token={token} />}
    </div>
  )
}

function ManageTab({ token }) {
  const [wallpapers, setWallpapers]       = useState([])
  const [page, setPage]                   = useState(1)
  const [totalPages, setTotalPages]       = useState(1)
  const [total, setTotal]                 = useState(0)
  const [loading, setLoading]             = useState(false)
  const [categoryId, setCategoryId]       = useState('')
  const [categories, setCategories]       = useState([])
  const [search, setSearch]               = useState('')
  const [selected, setSelected]           = useState(new Set())
  const [confirm, setConfirm]             = useState(null)
  const [confirmTarget, setConfirmTarget] = useState(null)
  const [deleting, setDeleting]           = useState(false)
  const [result, setResult]               = useState(null)
  const [preview, setPreview]             = useState(null)
  const PER_PAGE = 24
  const headers = { Authorization: `Bearer ${token}` }

  useEffect(() => {
    axios.get(`${API}/api/v1/wallpapers/categories`).then(r => setCategories(r.data))
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = { page, per_page: PER_PAGE }
      if (categoryId) params.category_id = categoryId
      if (search) params.q = search
      const r = await axios.get(`${API}/api/v1/wallpapers`, { params })
      setWallpapers(r.data.items); setTotalPages(r.data.total_pages); setTotal(r.data.total)
    } finally { setLoading(false) }
  }, [page, categoryId, search])

  useEffect(() => { load() }, [load])
  useEffect(() => { setPage(1); setSelected(new Set()) }, [categoryId, search])

  const toggleSelect = id => setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  const selectAll = () => setSelected(new Set(wallpapers.map(w => w.id)))
  const clearSel = () => setSelected(new Set())

  const doDelete = async () => {
    setDeleting(true)
    try {
      if (confirm === 'one') {
        await axios.delete(`${API}/api/v1/admin/wallpapers/${confirmTarget.id}`, { headers })
        setResult(`Deleted: ${confirmTarget.title}`)
      } else if (confirm === 'selected') {
        await axios.delete(`${API}/api/v1/admin/wallpapers/bulk?ids=${[...selected].join(',')}`, { headers })
        setResult(`Deleted ${selected.size} wallpapers.`)
      } else if (confirm === 'all') {
        await axios.delete(`${API}/api/v1/admin/wallpapers`, { headers })
        setResult('All wallpapers deleted.')
      } else if (confirm === 'except') {
        await axios.delete(`${API}/api/v1/admin/wallpapers?except_ids=${[...selected].join(',')}`, { headers })
        setResult(`Deleted all except ${selected.size} selected.`)
      }
      setConfirm(null); setConfirmTarget(null); setSelected(new Set()); load()
    } catch { setResult('Error during deletion.') }
    finally { setDeleting(false) }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <span className="text-gray-500 text-sm">{total.toLocaleString()} wallpapers</span>
        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search..." className="px-3 py-1.5 rounded-lg bg-surface-700 border border-surface-600
          text-white placeholder-gray-500 text-sm outline-none focus:ring-2 focus:ring-brand-400 w-40" />
        <select value={categoryId} onChange={e => setCategoryId(e.target.value)}
          className="px-3 py-1.5 rounded-lg bg-surface-700 border border-surface-600 text-white text-sm outline-none">
          <option value="">All categories</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <div className="flex-1" />
        <button onClick={selectAll} className="px-3 py-1.5 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-surface-700 transition-all">Select all</button>
        {selected.size > 0 && <>
          <span className="text-brand-400 text-sm font-medium">{selected.size} selected</span>
          <button onClick={clearSel} className="px-3 py-1.5 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-surface-700 transition-all">Clear</button>
          <button onClick={() => setConfirm('selected')} className="px-3 py-1.5 rounded-lg text-sm bg-red-500 hover:bg-red-600 text-white font-medium transition-all">Delete selected</button>
          <button onClick={() => setConfirm('except')} className="px-3 py-1.5 rounded-lg text-sm bg-orange-500 hover:bg-orange-600 text-white font-medium transition-all">Delete all except selected</button>
        </>}
        <button onClick={() => setConfirm('all')} className="px-3 py-1.5 rounded-lg text-sm bg-red-700 hover:bg-red-800 text-white font-medium transition-all">Delete all</button>
      </div>

      {result && (
        <div className="mb-4 p-3 bg-surface-800 border border-surface-600 rounded-lg text-sm text-gray-300 flex justify-between">
          {result}<button onClick={() => setResult(null)} className="text-gray-500 hover:text-white">✕</button>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {Array.from({ length: PER_PAGE }).map((_, i) => <div key={i} className="h-48 rounded-xl bg-surface-800 animate-pulse" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {wallpapers.map(w => (
            <div key={w.id} onClick={() => toggleSelect(w.id)}
              className={`group relative overflow-hidden rounded-xl bg-surface-800 cursor-pointer ring-2 transition-all
                ${selected.has(w.id) ? 'ring-brand-400' : 'ring-surface-700 hover:ring-surface-500'}`}>
              <img src={w.url_preview} alt={w.title} referrerPolicy="no-referrer"
                className="w-full h-48 object-cover"
                loading="lazy"
                onDoubleClick={e => { e.stopPropagation(); setPreview(w.url_full) }} />
              <div className={`absolute top-2 left-2 w-5 h-5 rounded border-2 flex items-center justify-center transition-all
                ${selected.has(w.id) ? 'bg-brand-400 border-brand-400' : 'bg-black/50 border-white/50 group-hover:border-white'}`}>
                {selected.has(w.id) && <span className="text-black text-xs font-bold">✓</span>}
              </div>
              <div className="absolute top-2 right-2 px-2 py-0.5 rounded text-xs bg-black/60 text-gray-300 font-mono">{w.resolution_label}</div>
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center gap-2">
                <button onClick={e => { e.stopPropagation(); setPreview(w.url_full) }}
                  className="opacity-0 group-hover:opacity-100 transition-all bg-white/20 hover:bg-white/30
                             text-white text-xs font-semibold px-2 py-1 rounded-lg">
                  View
                </button>
                <button onClick={e => { e.stopPropagation(); setConfirmTarget(w); setConfirm('one') }}
                  className="opacity-0 group-hover:opacity-100 transition-all bg-red-500 hover:bg-red-600
                             text-white text-xs font-semibold px-2 py-1 rounded-lg">
                  Delete
                </button>
              </div>
              <div className="absolute bottom-0 left-0 right-0 bg-black/70 px-2 py-1">
                <p className="text-white text-xs truncate">{w.title}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-center gap-3 mt-8">
        <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page===1}
          className="px-4 py-2 rounded-lg bg-surface-700 text-gray-400 disabled:opacity-30 hover:text-white transition-all text-sm">← Prev</button>
        <span className="text-gray-400 text-sm">Page {page} of {totalPages}</span>
        <button onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page===totalPages}
          className="px-4 py-2 rounded-lg bg-surface-700 text-gray-400 disabled:opacity-30 hover:text-white transition-all text-sm">Next →</button>
      </div>

      {preview && <PreviewModal url={preview} onClose={() => setPreview(null)} />}

      {confirm && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center px-4">
          <div className="bg-surface-800 rounded-2xl p-6 max-w-sm w-full border border-surface-700">
            <h3 className="text-white font-bold mb-2">
              {confirm==='one' ? 'Delete wallpaper?' : confirm==='selected' ? `Delete ${selected.size} wallpapers?` : confirm==='except' ? `Delete all except ${selected.size}?` : 'Delete ALL wallpapers?'}
            </h3>
            <p className="text-gray-400 text-sm mb-4">
              {confirm==='one' ? confirmTarget?.title : 'This action cannot be undone.'}
            </p>
            {confirm==='one' && confirmTarget && (
              <img src={confirmTarget.url_preview} alt="" referrerPolicy="no-referrer" className="w-full h-32 object-cover rounded-lg mb-4" />
            )}
            <div className="flex gap-3">
              <button onClick={() => { setConfirm(null); setConfirmTarget(null) }}
                className="flex-1 px-4 py-2 rounded-lg bg-surface-700 text-gray-400 hover:text-white text-sm transition-all">Cancel</button>
              <button onClick={doDelete} disabled={deleting}
                className="flex-1 px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white font-semibold text-sm transition-all disabled:opacity-50">
                {deleting ? 'Deleting...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ImportTab({ token }) {
  const [query, setQuery]           = useState('')
  const [results, setResults]       = useState([])
  const [page, setPage]             = useState(1)
  const [lastPage, setLastPage]     = useState(1)
  const [loading, setLoading]       = useState(false)
  const [selected, setSelected]     = useState(new Set())
  const [categoryId, setCategoryId] = useState('')
  const [categories, setCategories] = useState([])
  const [importing, setImporting]   = useState(false)
  const [importResult, setImportResult] = useState(null)
  const [hideImported, setHideImported] = useState(true)
  const [sorting, setSorting]       = useState('random')
  const [preview, setPreview]       = useState(null)
  const headers = { Authorization: `Bearer ${token}` }

  useEffect(() => {
    axios.get(`${API}/api/v1/wallpapers/categories`).then(r => setCategories(r.data))
  }, [])

  const search = async (p = 1, q = query, s = sorting) => {
    setLoading(true); setResults([])
    window.scrollTo({ top: 0, behavior: "smooth" })
    try {
      const r = await axios.get(`${API}/api/v1/admin/wallhaven/search`,
        { params: { q, page: p, sorting: s }, headers })
      setResults(r.data.results); setLastPage(r.data.last_page); setPage(p)
    } catch { alert('Search failed.') }
    finally { setLoading(false) }
  }

  useEffect(() => { search(1, '', 'random') }, [])

  const toggleSelect = id => setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  const selectAllAvailable = () => setSelected(new Set(results.filter(r => r.meets_quality && !r.already_in_db).map(r => r.id)))
  const visibleResults = hideImported ? results.filter(r => !r.already_in_db) : results

  const doImport = async () => {
    if (selected.size === 0) return
    setImporting(true); setImportResult(null)
    try {
      const ids = [...selected].join(',')
      const r = await axios.post(
        `${API}/api/v1/admin/wallhaven/import?wallpaper_ids=${ids}${categoryId ? `&category_id=${categoryId}` : ''}`,
        {}, { headers }
      )
      setImportResult(r.data)
      setSelected(new Set())
      setResults(prev => prev.map(w => selected.has(w.id) ? { ...w, already_in_db: true } : w))
    } catch { setImportResult({ message: 'Import failed.' }) }
    finally { setImporting(false) }
  }

  const newCount     = results.filter(r => !r.already_in_db && r.meets_quality).length
  const alreadyCount = results.filter(r => r.already_in_db).length
  const lowQuality   = results.filter(r => !r.meets_quality).length

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="flex gap-3 mb-4 flex-wrap">
        <input type="text" value={query} onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && search(1)}
          placeholder="Search Wallhaven (leave empty for random)..."
          className="flex-1 px-4 py-2.5 rounded-lg bg-surface-700 border border-surface-600
                     text-white placeholder-gray-500 text-sm outline-none focus:ring-2 focus:ring-brand-400" />
        <button onClick={() => search(1)} disabled={loading}
          className="px-6 py-2.5 rounded-lg bg-brand-400 text-black font-semibold text-sm hover:bg-brand-500 transition-all disabled:opacity-50">
          {loading ? 'Loading...' : 'Search'}
        </button>
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        {[
          { label: '🔀 Random',          value: 'random'    },
          { label: '👁 Most Viewed',     value: 'views'     },
          { label: '⬇ Most Downloaded', value: 'downloads' },
          { label: '⭐ Top',             value: 'toplist'   },
        ].map(s => (
          <button key={s.value}
            onClick={() => { setSorting(s.value); search(1, query, s.value) }}
            disabled={loading}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-50
              ${sorting === s.value ? 'bg-brand-400 text-black' : 'text-gray-400 hover:text-white hover:bg-surface-700 border border-surface-600'}`}>
            {s.label}
          </button>
        ))}
      </div>

      {results.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 mb-4 p-4 bg-surface-800 rounded-xl border border-surface-700">
          <div className="flex gap-4 text-xs">
            <span className="text-green-400">✓ New: {newCount}</span>
            <span className="text-yellow-400">⚠ Already imported: {alreadyCount}</span>
            <span className="text-red-400">✗ Below quality: {lowQuality}</span>
          </div>
          <div className="flex-1" />
          <button onClick={() => setHideImported(v => !v)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all
              ${hideImported ? 'bg-brand-400/20 text-brand-400 border border-brand-400/30' : 'text-gray-400 hover:text-white hover:bg-surface-700'}`}>
            {hideImported ? '👁 Show all' : '🙈 Hide imported'}
          </button>
          <button onClick={selectAllAvailable} className="px-3 py-1.5 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-surface-700 transition-all">Select all new</button>
          <button onClick={() => setSelected(new Set())} className="px-3 py-1.5 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-surface-700 transition-all">Clear</button>
          <select value={categoryId} onChange={e => setCategoryId(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-surface-700 border border-surface-600 text-white text-sm outline-none">
            <option value="">No category</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <button onClick={doImport} disabled={importing || selected.size === 0}
            className="px-6 py-1.5 rounded-lg bg-brand-400 text-black font-semibold text-sm hover:bg-brand-500 transition-all disabled:opacity-50">
            {importing ? 'Importing...' : `Import ${selected.size} selected`}
          </button>
        </div>
      )}

      {importResult && (
        <div className="mb-4 p-4 bg-surface-800 border border-surface-600 rounded-xl text-sm">
          <p className="text-white font-medium mb-2">{importResult.message}</p>
          {importResult.imported !== undefined && (
            <div className="flex gap-4 text-xs">
              <span className="text-green-400">✓ Imported: {importResult.imported}</span>
              <span className="text-red-400">✗ Quality rejected: {importResult.skipped_quality}</span>
              <span className="text-yellow-400">⚠ Already existed: {importResult.skipped_duplicate}</span>
            </div>
          )}
          <button onClick={() => setImportResult(null)} className="mt-2 text-gray-500 hover:text-white text-xs">Dismiss</button>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {Array.from({ length: 24 }).map((_, i) => <div key={i} className="h-48 rounded-xl bg-surface-800 animate-pulse" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {visibleResults.map(w => {
            const isSelectable = w.meets_quality && !w.already_in_db
            return (
              <div key={w.id} onClick={() => isSelectable && toggleSelect(w.id)}
                className={`group relative overflow-hidden rounded-xl bg-surface-800 transition-all
                  ${isSelectable
                    ? 'cursor-pointer ring-2 ' + (selected.has(w.id) ? 'ring-brand-400' : 'ring-surface-700 hover:ring-surface-500')
                    : 'opacity-50 ring-2 ' + (w.already_in_db ? 'ring-yellow-500/40' : 'ring-red-500/30')}`}>
                <img src={w.url_preview} alt={w.id} referrerPolicy="no-referrer"
                  className="w-full h-48 object-cover" loading="lazy"
                  onDoubleClick={e => { e.stopPropagation(); setPreview(`https://w.wallhaven.cc/full/${w.id.slice(0,2)}/wallhaven-${w.id}.jpg`) }} />
                {isSelectable && (
                  <div className={`absolute top-2 left-2 w-5 h-5 rounded border-2 flex items-center justify-center transition-all
                    ${selected.has(w.id) ? 'bg-brand-400 border-brand-400' : 'bg-black/50 border-white/50'}`}>
                    {selected.has(w.id) && <span className="text-black text-xs font-bold">✓</span>}
                  </div>
                )}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center pointer-events-none">
                  <button onClick={e => { e.stopPropagation(); setPreview(`https://w.wallhaven.cc/full/${w.id.slice(0,2)}/wallhaven-${w.id}.jpg`) }}
                    className="opacity-0 group-hover:opacity-100 transition-all bg-white/20 hover:bg-white/30
                               text-white text-xs font-semibold px-3 py-1.5 rounded-lg pointer-events-auto">
                    View
                  </button>
                </div>
                <div className="absolute top-2 right-2 px-2 py-0.5 rounded text-xs font-mono bg-black/60 text-gray-300">{w.resolution}</div>
                {w.already_in_db && (
                  <div className="absolute bottom-0 left-0 right-0 bg-yellow-500/80 text-black text-xs font-semibold text-center py-1">Already in DB</div>
                )}
                {!w.meets_quality && !w.already_in_db && (
                  <div className="absolute bottom-0 left-0 right-0 bg-red-500/80 text-white text-xs font-semibold text-center py-1">Below quality</div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {results.length > 0 && (
        <div className="flex items-center justify-center gap-3 mt-8">
          <button onClick={() => search(page-1)} disabled={page===1}
            className="px-4 py-2 rounded-lg bg-surface-700 text-gray-400 disabled:opacity-30 hover:text-white transition-all text-sm">← Prev</button>
          <span className="text-gray-400 text-sm">Page {page} of {lastPage}</span>
          <button onClick={() => search(page+1)} disabled={page===lastPage}
            className="px-4 py-2 rounded-lg bg-surface-700 text-gray-400 disabled:opacity-30 hover:text-white transition-all text-sm">Next →</button>
        </div>
      )}

      {preview && <PreviewModal url={preview} onClose={() => setPreview(null)} />}
    </div>
  )
}
