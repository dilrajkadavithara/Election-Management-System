import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            // Force single React instance — prevents "Invalid Hook Call" errors
            // when html2canvas or other deps bundle their own React copy
            'react': path.resolve('./node_modules/react'),
            'react-dom': path.resolve('./node_modules/react-dom'),
        },
    },
    server: {
        port: 5173,
        strictPort: true,  // Fail instead of silently picking another port
        proxy: {
            '/api': {
                target: process.env.VITE_API_TARGET || 'http://127.0.0.1:8000',
                changeOrigin: true,
            },
        },
        watch: {
            // OneDrive blocks filesystem events — use polling instead
            usePolling: true,
            interval: 500,
        },
        hmr: {
            // Force full page reload if HMR websocket fails
            overlay: true,
        },
    },
    test: {
        dir: 'src',
    },
    build: {
        sourcemap: false,
        rollupOptions: {
            output: {
                manualChunks: {
                    vendor: ['react', 'react-dom'],
                    charts: ['recharts'],
                },
            },
        },
    },
})
