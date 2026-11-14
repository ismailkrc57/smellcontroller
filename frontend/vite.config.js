import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// "/" adresinde statik landing sayfasını (public/landing.html) sun,
// React dashboard uygulaması "/app/*" altında çalışır.
function landingAtRoot() {
  const rewrite = (req, _res, next) => {
    const path = req.url.split('?')[0]
    if (path === '/' || path === '/index.html') {
      req.url = '/landing.html' + req.url.slice(path.length)
    }
    next()
  }
  return {
    name: 'landing-at-root',
    configureServer(server) {
      server.middlewares.use(rewrite)
    },
    configurePreviewServer(server) {
      server.middlewares.use(rewrite)
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [landingAtRoot(), react()],
})
