import { create } from 'zustand'

export type Theme = 'dark' | 'light'
const KEY = 'barbersaas-theme'

function getInitial(): Theme {
  const saved = localStorage.getItem(KEY)
  if (saved === 'light' || saved === 'dark') return saved
  // respeita preferência do SO na primeira visita
  return window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}

function applyTheme(t: Theme) {
  const el = document.documentElement
  if (t === 'light') el.setAttribute('data-theme', 'light')
  else el.removeAttribute('data-theme') // dark é o padrão (sem atributo)
}

// Aplica imediatamente no import (antes do render) para evitar flash.
const initial = getInitial()
applyTheme(initial)

interface ThemeState {
  theme: Theme
  setTheme: (t: Theme) => void
  toggle: () => void
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: initial,
  setTheme: (t) => { localStorage.setItem(KEY, t); applyTheme(t); set({ theme: t }) },
  toggle: () => get().setTheme(get().theme === 'dark' ? 'light' : 'dark'),
}))
