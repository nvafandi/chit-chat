import { create } from 'zustand'

type Mode = 'dark' | 'light'

interface ThemeState {
  mode: Mode
  toggle: () => void
}

const stored = (localStorage.getItem('theme') as Mode) || 'dark'

export const useThemeStore = create<ThemeState>((set, get) => ({
  mode: stored,
  toggle: () => {
    const next: Mode = get().mode === 'dark' ? 'light' : 'dark'
    localStorage.setItem('theme', next)
    set({ mode: next })
  },
}))
