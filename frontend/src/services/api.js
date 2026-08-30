import axios from 'axios'

const api = axios.create({ baseURL: '/api/v1', timeout: 10000 })

export const fetchWallpapers = (params = {}) =>
  api.get('/wallpapers', { params }).then(r => r.data)

export const fetchWallpaper = (id) =>
  api.get(`/wallpapers/${id}`).then(r => r.data)

export default api
