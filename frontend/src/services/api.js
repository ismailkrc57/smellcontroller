import axios from 'axios'

// Geliştirmede backend ayrı portta (start.sh .env.local yazar); production'da
// API aynı origin üzerinden nginx ile yönlendirilir.
const BASE_URL = import.meta.env.VITE_API_URL ?? (import.meta.env.DEV ? 'http://localhost:8000' : '')

const api = axios.create({ baseURL: BASE_URL })

export const sensor = {
  getPorts: () => api.get('/sensor/ports'),
  getStatus: () => api.get('/sensor/status'),
  connect: (port) => api.post('/sensor/connect', { port }),
  simulate: () => api.post('/sensor/simulate'),
  disconnect: () => api.post('/sensor/disconnect'),
}

export const recording = {
  list: () => api.get('/recording/list'),
  start: (label) => api.post('/recording/start', { label }),
  stop: () => api.post('/recording/stop'),
  status: () => api.get('/recording/status'),
  delete: (filename) => api.delete(`/recording/${filename}`),
  downloadUrl: (filename) => `${BASE_URL}/recording/download/${filename}`,
}

export const training = {
  getAlgorithms: () => api.get('/training/algorithms'),
  start: (csv_files, algorithm, model_name) =>
    api.post('/training/start', { csv_files, algorithm, model_name }),
  getStatus: () => api.get('/training/status'),
  listModels: () => api.get('/training/models'),
  loadModel: (model_name, label_map) =>
    api.post('/training/load-model', { model_name, label_map }),
  activeModel: () => api.get('/training/active-model'),
}

export const detection = {
  predict: (channels, temperature = 25.0, humidity = 50.0) =>
    api.post('/detection/predict', { channels, temperature, humidity }),
  history: () => api.get('/detection/history'),
  clearHistory: () => api.delete('/detection/history'),
  status: () => api.get('/detection/status'),
}

export default api

export const auth = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  register: (name, email, password) => api.post('/auth/register', { name, email, password }),
  me: (token) => api.get('/auth/me', { headers: { Authorization: `Bearer ${token}` } }),
}
