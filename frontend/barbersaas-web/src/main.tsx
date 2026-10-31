import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { MotionConfig } from 'framer-motion'
import './styles/tokens.css'
import './styles/components.css'
import './styles/admin-layout.css'
import './styles/glass.css'
import './styles/glass-legacy.css'
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
      {/* reducedMotion="user": com prefers-reduced-motion, o framer pula
          transform/layout; os componentes glass trocam blur/deslocamento por fade. */}
      <MotionConfig reducedMotion="user">
        <RouterProvider router={router} />
      </MotionConfig>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: 'rgba(24, 20, 16, 0.86)',
            color: 'rgba(255, 255, 255, 0.92)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: 14,
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            boxShadow: '0 16px 40px -16px rgba(0, 0, 0, 0.7)',
            fontSize: 14,
          },
          success: { iconTheme: { primary: '#5BC48F', secondary: '#0A0807' } },
          error: { iconTheme: { primary: '#EE6B6B', secondary: '#0A0807' } },
        }}
      />
    </QueryClientProvider>
  </StrictMode>,
)
