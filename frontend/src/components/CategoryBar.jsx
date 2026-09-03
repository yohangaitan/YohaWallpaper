import { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import {
  Sparkles, Gamepad2, Cpu, Leaf, Mountain, Car, Minimize2,
  Wand2, Shapes, Moon, Grid2x2, Microchip, Tv2, Palette,
  PenTool, MapPin, Clock, PawPrint, Building2, Image,
  Smartphone, Monitor, ChevronDown
} from 'lucide-react'

const CATEGORY_ICONS = {
  'anime':        Sparkles,
  'gaming':       Gamepad2,
  'cyberpunk':    Cpu,
  'naturaleza':   Leaf,
  'paisaje':      Mountain,
  'autos':        Car,
  'minimalista':  Minimize2,
  'fantasia':     Wand2,
  'abstracto':    Shapes,
  'dark':         Moon,
  'pixel-art':    Grid2x2,
  'tecnologia':   Microchip,
  'anime-series': Tv2,
  'ilustracion':  Palette,
  'arte-digital': PenTool,
  'japon':        MapPin,
  'retro':        Clock,
  'animales':     PawPrint,
  'arquitectura': Building2,
}

const RESOLUTIONS = [
  { label: 'All',     value: null   },
  { label: 'HD',      value: 'hd'   },
  { label: 'Full HD', value: 'fhd'  },
  { label: '2K',      value: '2k'   },
  { label: '4K',      value: '4k'   },
]

export default function CategoryBar({
  activeCategory, onSelect,
  resolution, onResolutionChange,
  mobileOnly, onMobileToggle,
}) {
  const [categories,    setCategories]    = useState([])
  const [canLeft,       setCanLeft]       = useState(false)
  const [canRight,      setCanRight]      = useState(false)
  const [resOpen,       setResOpen]       = useState(false)
  const scrollRef  = useRef(null)
  const resRef     = useRef(null)

  useEffect(() => {
    axios.get(`${import.meta.env.VITE_API_URL}/api/v1/wallpapers/categories`)
      .then(r => setCategories(r.data))
      .catch(console.error)
  }, [])

  // Cierra el dropdown de resolución al hacer click fuera
  useEffect(() => {
    const handler = (e) => {
      if (resRef.current && !resRef.current.contains(e.target)) setResOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const checkScroll = () => {
    const el = scrollRef.current
    if (!el) return
    setCanLeft(el.scrollLeft > 8)
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 8)
  }

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    checkScroll()
    el.addEventListener('scroll', checkScroll, { passive: true })
    window.addEventListener('resize', checkScroll)
    return () => {
      el.removeEventListener('scroll', checkScroll)
      window.removeEventListener('resize', checkScroll)
    }
  }, [categories])

  const scroll = (dir) => {
    const el = scrollRef.current
    if (!el) return
    el.scrollBy({ left: dir * 240, behavior: 'smooth' })
  }

  if (!categories.length) return null

  const btnBase =
    'flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 whitespace-nowrap'
  const btnActive =
    'bg-brand-400 text-black shadow-md shadow-brand-400/30'
  const btnIdle =
    'text-gray-400 hover:text-white hover:bg-white/10'

  const currentRes = RESOLUTIONS.find(r => r.value === resolution)?.label ?? 'All'

  return (
    <div className="bg-surface-800 border-b border-surface-700">
      <div className="max-w-7xl mx-auto px-2 sm:px-4">
        <div className="relative flex items-center">

          {canLeft && (
            <button
              onClick={() => scroll(-1)}
              className="flex-shrink-0 z-10 w-7 h-7 flex items-center justify-center
                         rounded-full bg-surface-700 hover:bg-surface-600
                         text-gray-400 hover:text-white transition-all mr-1"
              aria-label="Scroll left"
            >‹</button>
          )}

          {canLeft && (
            <div className="absolute left-8 top-0 bottom-0 w-8 z-10
                            bg-gradient-to-r from-surface-800 to-transparent pointer-events-none" />
          )}

          {/* Scroll container */}
          <div
            ref={scrollRef}
            className="flex gap-1.5 py-2 overflow-x-auto flex-1"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {/* All */}
            <button
              onClick={() => onSelect(null)}
              className={`${btnBase} ${activeCategory === null ? btnActive : btnIdle}`}
            >
              <Image size={14} />
              <span>All</span>
            </button>

            {/* Categorías */}
            {categories.map(cat => {
              const Icon = CATEGORY_ICONS[cat.slug]
              return (
                <button
                  key={cat.id}
                  onClick={() => onSelect(cat)}
                  className={`${btnBase} ${activeCategory?.id === cat.id ? btnActive : btnIdle}`}
                >
                  {Icon && <Icon size={14} />}
                  <span>{cat.name}</span>
                </button>
              )
            })}

            {/* Separador */}
            <div className="flex-shrink-0 w-px bg-surface-600 mx-1 self-stretch my-1" />

            {/* Botón Mobile */}
            <button
              onClick={onMobileToggle}
              className={`${btnBase} ${mobileOnly ? btnActive : btnIdle}`}
            >
              <Smartphone size={14} />
              <span>Mobile</span>
            </button>

            {/* Dropdown Resolution */}
            <div ref={resRef} className="flex-shrink-0 relative">
              <button
                onClick={() => setResOpen(v => !v)}
                className={`${btnBase} ${resolution ? btnActive : btnIdle}`}
              >
                <Monitor size={14} />
                <span>{resolution ? currentRes : 'Resolution'}</span>
                <ChevronDown size={12} className={`transition-transform duration-200 ${resOpen ? 'rotate-180' : ''}`} />
              </button>

              {resOpen && (
                <div className="absolute top-full left-0 mt-1 z-50
                                bg-surface-700 border border-surface-600
                                rounded-xl shadow-xl overflow-hidden min-w-[120px]">
                  {RESOLUTIONS.map(r => (
                    <button
                      key={r.label}
                      onClick={() => { onResolutionChange(r.value); setResOpen(false) }}
                      className={`w-full text-left px-4 py-2 text-sm transition-colors
                        ${resolution === r.value
                          ? 'bg-brand-400/20 text-brand-400 font-medium'
                          : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {canRight && (
            <div className="absolute right-8 top-0 bottom-0 w-8 z-10
                            bg-gradient-to-l from-surface-800 to-transparent pointer-events-none" />
          )}

          {canRight && (
            <button
              onClick={() => scroll(1)}
              className="flex-shrink-0 z-10 w-7 h-7 flex items-center justify-center
                         rounded-full bg-surface-700 hover:bg-surface-600
                         text-gray-400 hover:text-white transition-all ml-1"
              aria-label="Scroll right"
            >›</button>
          )}
        </div>
      </div>
    </div>
  )
}
