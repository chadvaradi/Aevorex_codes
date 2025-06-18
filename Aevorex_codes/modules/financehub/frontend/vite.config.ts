// @ts-ignore - vite types available only in dev environment
import { defineConfig } from 'vite';
// @ts-ignore - plugin present in devDependencies at root level
import react from '@vitejs/plugin-react-swc';
// @ts-ignore
import path from 'path';
import fs from 'fs';

// FinanceHub Vite configuration – dedicated to modules/financehub/frontend
// Output: static/dist so the legacy static server can keep serving assets
// Dev server: localhost:8083 with proxy to backend 8084
export default defineConfig(({ mode }) => {
  const isDev = mode === 'development';
  return {
    root: path.resolve(__dirname),
    server: {
      host: '0.0.0.0',
      port: 8083,
      open: false,
      proxy: {
        '/api': {
          target: 'http://localhost:8084',
          changeOrigin: true,
          secure: false,
        },
      },
    },
    build: {
      outDir: path.resolve(__dirname, 'static/dist'),
      emptyOutDir: true,
      manifest: true,
      rollupOptions: {
        input: path.resolve(__dirname, 'index.html'),
      },
      assetsDir: '', // put assets directly in dist root for simple linking
    },
    plugins: (() => {
      const pluginsArr: any[] = [react()];
      // Dev-only middleware to serve legacy static assets with correct MIME
      if (isDev) {
        pluginsArr.push({
          name: 'financehub-legacy-static',
          enforce: 'pre',
          configureServer(server) {
            server.middlewares.use('/static', (req, res, next) => {
              if (!req.url) return next();
              // Split off query/hash; URL may look like /static/css/file.css?t=123
              const cleanUrl = req.url.split(/[?#]/)[0];
              const relPath = cleanUrl.replace(/^\/static\//, "");
              if (cleanUrl.endsWith('main_combined_financehub.css')) {
                console.debug('[legacy-static] intercept', cleanUrl);
              }
              const filePath = path.join(__dirname, 'static', relPath);
              let resolvedPath = filePath;
              // Fallback: legacy code requests main_combined_financehub.css which was removed
              if (!fs.existsSync(resolvedPath) && relPath === 'css/main_combined_financehub.css') {
                resolvedPath = path.join(__dirname, 'static', 'css', 'main_financehub.css');
              }

              if (fs.existsSync(resolvedPath) && fs.statSync(resolvedPath).isFile()) {
                const ext = path.extname(filePath);
                const mime = (
                  ext === '.css' ? 'text/css' :
                  ext === '.js' ? 'application/javascript' :
                  ext === '.svg' ? 'image/svg+xml' :
                  ext === '.png' ? 'image/png' :
                  ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' :
                  'application/octet-stream');
                res.setHeader('Content-Type', mime);
                fs.createReadStream(resolvedPath).pipe(res);
                return;
              }
              next();
            });
          }
        });
      }
      return pluginsArr;
    })(),
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@legacy': path.resolve(__dirname, './static/js'),
      },
      dedupe: ['react', 'react-dom'],
    },
    // Expose legacy static assets (css/js/images) during dev at /static/*
    publicDir: path.resolve(__dirname, 'static'),
  };
}); 