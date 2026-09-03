import { useState, useRef, useEffect } from 'react'
import { Smartphone, Monitor, ChevronDown } from 'lucide-react'

const RESOLUTIONS = [
  { label: 'All resolutions', value: null  },
  { label: 'HD (720p)',       value: 'hd'  },
  { label: 'Full HD (1080p)', value: 'fhd' },
  { label: '2K (1440p)',      value: '2k'  },
  { label: '4K (2160p)',      value: '4k'  },
]

export default function FilterBar({ mobileOnly, onMobileToggle, resolution, onResolutionChange }) {
  const [resOpen, setResOpen] = useState(false)
  const resRef = useRef(null)

  useEffect(() => {
    const handler = (e) => {
      if (resRef.current && !resRef.current.contains(e.target)) setResOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const currentRes = RESOLUTIONS.find(r => r.value === resolution)?.label ?? 'Resolution'

  const btnBase = 'flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200'
  const btnActive = 'bg-brand-400 text-black shadow-md shadow-brand-400/30'
  const btnIdle = 'text-gray-400 hover:text-white hover:bg-white/10 border border-surface-600 hover:border-surface-500'

  return (
    <div className="bg-surface-850 border-b border-surface-700">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center gap-3 py-2">

          {/* Label */}
          <span className="text-xs text-gray-600 font-medium hidden sm:block">Filters</span>
          <div className="hidden sm:block w-px h-4 bg-surface-600" />

          {/* Mobile toggle */}
          <button
            onClick={onMobileToggle}
            className={`${btnBase} ${mobileOnly ? btnActive : btnIdle}`}>
            <Smartphone size={14} />
            <span>Mobile</span>
          </button>

          {/* Resolution dropdown */}
          <div ref={resRef} className="relative">
            <button
              onClick={() => setResOpen(v => !v)}
              className={`${btnBase} ${resolution ? btnActive : btnIdle}`}>
              <Monitor size={14} />
              <span>{resolution ? currentRes : 'Resolution'}</span>
              <ChevronDown size={12}
                className={`transition-transform duration-200 ${resOpen ? 'rotate-180' : ''}`} />
            </button>

            {resOpen && (
              <div className="absolute top-full left-0 mt-2 z-50
                              bg-surface-700 border border-surface-600
                              rounded-xl shadow-2xl overflow-hidden min-w-[180px]">
                {RESOLUTIONS.map(r => (
                  <button
                    key={r.label}
                    onClick={() => { onResolutionChange(r.value); setResOpen(false) }}
                    className={`w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center justify-between
                      ${resolution === r.value
                        ? 'bg-brand-400/20 text-brand-400 font-medium'
                        : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
                    <span>{r.label}</span>
                    {resolution === r.value && <span className="text-xs">✓</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Indicador de filtros activos */}
          {(mobileOnly || resolution) && (
            <button
              onClick={() => { onMobileToggle(); onResolutionChange(null) }}
              className="ml-auto text-xs text-gray-500 hover:text-white transition-colors flex items-center gap-1">
              Clear filters ✕
            </button>
          )}

        </div>
      </div>
    </div>
  )
}
