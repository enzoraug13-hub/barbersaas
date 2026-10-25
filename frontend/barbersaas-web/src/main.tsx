import { StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
// Archivo variável (peso + largura) servido pelo próprio app — sem depender do
// Google Fonts (privacidade/LGPD e carregamento mais rápido).
import '@fontsource-variable/archivo/wdth.css'
import './styles/tokens.css'
import './styles/components.css'
import './styles/admin-layout.css'
import './index.css'
import { router } from './app/router'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 60_000 },
    mutations: { retry: 0 },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <Suspense fallback={null}>
        <RouterProvider router={router} />
      </Suspense>
      <Toaster
        position="top-center"
        gutter={8}
        containerStyle={{ top: 'calc(12px + env(safe-area-inset-top))' }}
        toastOptions={{
          duration: 3500,
          style: {
            background: '#13212B',
            color: '#FFFFFF',
            fontFamily: 'var(--font)',
            fontSize: '14px',
            lineHeight: '20px',
            fontWeight: 500,
            padding: '10px 14px',
            borderRadius: '10px',
            boxShadow: '0 8px 24px rgba(19, 33, 43, 0.24)',
            maxWidth: 420,
          },
          success: { iconTheme: { primary: '#4CC38A', secondary: '#13212B' } },
          error: { iconTheme: { primary: '#F2776D', secondary: '#13212B' }, duration: 5000 },
        }}
      />
    </QueryClientProvider>
  </StrictMode>,
)
