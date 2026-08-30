import { useEffect } from 'react'

export default function NotFound() {
  useEffect(() => {
    document.title = 'Página no encontrada — YohaWallpaper'
  }, [])

  return (
    <main className="flex-1 flex flex-col items-center justify-center py-32 px-4 text-center">
      <img src="/favicon.svg" alt="logo" className="w-16 h-16 mb-8 opacity-40" />
      <h1 className="text-7xl font-bold text-brand-400 mb-3">404</h1>
      <p className="text-xl text-white mb-2">Página no encontrada</p>
      <p className="text-gray-500 mb-10 max-w-sm">
        El wallpaper que buscas no existe o fue eliminado.
      </p>
      <a href="/"
         className="px-6 py-3 bg-brand-400 text-black font-semibold rounded-xl
                    hover:bg-brand-500 transition-all hover:scale-105">
        Volver al inicio
      </a>
    </main>
  )
}