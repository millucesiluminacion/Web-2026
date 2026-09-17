import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  Object.assign(process.env, env);

  return {
    plugins: [
      react(),
      {
        name: 'local-feed-middleware',
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            const url = new URL(req.url, 'http://localhost');
            if (url.pathname === '/feed/productos.xml' || url.pathname === '/api/sitemap') {
              try {
                if (url.pathname === '/feed/productos.xml') {
                  req.query = { type: 'google-merchant' };
                }
                const { default: handler } = await server.ssrLoadModule('/api/sitemap.js');
                res.status = (code) => { res.statusCode = code; return res; };
                res.send = (body) => { res.end(body); return res; };
                return await handler(req, res);
              } catch (err) {
                console.error('[vite-feed-middleware]', err);
                next(err);
              }
            }
            next();
          });
        }
      }
    ],
    server: {
      proxy: {
        '/storage-proxy': {
          target: 'https://fvfnpztjsqdiljudjmdl.supabase.co/storage/v1/object/public',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/storage-proxy/, '')
        }
      }
    },
    build: {
      // Raise the warning threshold to 700kB (chunks below this won't warn)
      chunkSizeWarningLimit: 700,
      rollupOptions: {
        output: {
          // Code-split vendor libraries into separate chunks for better caching
          manualChunks: {
            // Core React runtime - almost never changes
            'vendor-react': ['react', 'react-dom', 'react-router-dom'],
            // Supabase client - large but rarely changes
            'vendor-supabase': ['@supabase/supabase-js'],
            // Lucide icons - large SVG library
            'vendor-lucide': ['lucide-react'],
          },
        },
      },
    },
  };
});
