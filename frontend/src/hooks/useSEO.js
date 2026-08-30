
/**
 * useSEO
 * -------
 * Actualiza <title> y meta description dinámicamente según el contexto.
 */
import { useEffect } from 'react'

export default function useSEO({ title, description }) {
  useEffect(() => {
    const siteName = 'YohaWallpaper'

    // Título
    document.title = title ? `${title} — ${siteName}` : siteName

    // Meta description
    let meta = document.querySelector('meta[name="description"]')
    if (!meta) {
      meta = document.createElement('meta')
      meta.name = 'description'
      document.head.appendChild(meta)
    }
    meta.content = description || 'Descarga wallpapers estáticos y animados en alta resolución. Anime, Gaming, Cyberpunk, Naturaleza y más.'

    // Open Graph
    const setOG = (prop, val) => {
      let el = document.querySelector(`meta[property="${prop}"]`)
      if (!el) {
        el = document.createElement('meta')
        el.setAttribute('property', prop)
        document.head.appendChild(el)
      }
      el.content = val
    }

    setOG('og:title',       document.title)
    setOG('og:description', meta.content)
    setOG('og:type',        'website')
    setOG('og:site_name',   siteName)
  }, [title, description])
}
