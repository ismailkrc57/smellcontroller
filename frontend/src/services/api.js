import axios from 'axios'

const api = axios.create({ baseURL: 'http://localhost:8000' })

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
  downloadUrl: (filename) => `http://localhost:8000/recording/download/${filename}`,
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
