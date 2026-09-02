import axios from 'axios'

const api = axios.create({ baseURL: `${import.meta.env.VITE_API_URL}/api/v1`, timeout: 10000 })

export const fetchWallpapers = (params = {}) =>
  api.get('/wallpapers', { params }).then(r => r.data)

export const fetchWallpaper = (id) =>
  api.get(`/wallpapers/${id}`).then(r => r.data)

export default api

export async function translateToEnglish(text) {
  try {
    const res = await fetch(
      `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=es|en`
    )
    const data = await res.json()
    return data.responseData.translatedText || text
  } catch {
    return text
  }
}