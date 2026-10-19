import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { defineConfig, type Plugin } from 'vite'

/**
 * Dev-only stand-in for the nginx Basic auth in production: /auth/check and /data/*
 * require a login from ../deploy/htpasswd ({SHA} lines). Without that file, dev is open.
 */
function devLabAuth(): Plugin {
  const file = fileURLToPath(new URL('../deploy/htpasswd', import.meta.url))
  const users = () =>
    existsSync(file)
      ? Object.fromEntries(readFileSync(file, 'utf8').split(/\r?\n/).filter((l) => l && !l.startsWith('#')).map((l) => l.split(':') as [string, string]))
      : null
  return {
    name: 'qclj-dev-lab-auth',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url ?? ''
        if (!(url === '/auth/check' || url.startsWith('/auth/check?') || url.startsWith('/data/'))) return next()
        const table = users()
        if (!table) return url.startsWith('/auth/check') ? void res.writeHead(204).end() : next()
        const m = /^Basic (.+)$/.exec(req.headers.authorization ?? '')
        const [id, ...rest] = m ? Buffer.from(m[1], 'base64').toString('utf8').split(':') : ['']
        const want = table[id]
        const got = '{SHA}' + createHash('sha1').update(rest.join(':')).digest('base64')
        if (!want || want !== got) return void res.writeHead(401).end()
        if (url.startsWith('/auth/check')) return void res.writeHead(204).end()
        next()
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), devLabAuth()],
})
