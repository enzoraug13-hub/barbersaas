import { create } from 'zustand'

export type Theme = 'dark' | 'light'

// Tema claro temporariamente desativado: várias superfícies do app (cards,
// sidebar, inputs) ainda têm cor fixa em vez de token, então o claro fica
// ilegível (texto escuro sobre fundo que não clareia). Os tokens de
// :root[data-theme="light"] em tokens.css continuam no código pra retomar
// isso depois — até lá, o app fica fixo no escuro: data-theme nunca é
// setado, mesmo que algo chame setTheme/toggle.
function applyTheme(_t: Theme) {
  document.documentElement.removeAttribute('data-theme')
}

const initial: Theme = 'dark'
applyTheme(initial)

interface ThemeState {
  theme: Theme
  setTheme: (t: Theme) => void
  toggle: () => void
}

export const useThemeStore = create<ThemeState>((set) => ({
  theme: initial,
  setTheme: () => { applyTheme('dark'); set({ theme: 'dark' }) },
  toggle: () => { applyTheme('dark'); set({ theme: 'dark' }) },
}))
