import { AnimatePresence, motion } from 'framer-motion'
import { Moon, Sun } from 'lucide-react'
import { usePlaygroundStore } from '@/store/usePlaygroundStore'

export function ModeToggle() {
  const theme = usePlaygroundStore((state) => state.theme)
  const toggleTheme = usePlaygroundStore((state) => state.toggleTheme)
  const isDark = theme === 'dark'

  return (
    <motion.button
      type="button"
      onClick={toggleTheme}
      whileTap={{ scale: 0.94 }}
      transition={{ type: 'spring', bounce: 0, duration: 0.2 }}
      aria-label={isDark ? 'Switch to light studio mode' : 'Switch to dark obsidian mode'}
      title={isDark ? 'Light Studio Mode' : 'Dark Obsidian Mode'}
      data-testid="theme-toggle"
      className="spatial-pill relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors hover:border-[var(--glass-border-strong)]"
    >
      <AnimatePresence mode="wait" initial={false}>
        {isDark ? (
          <motion.span
            key="sun"
            initial={{ opacity: 0, rotate: -35, scale: 0.75 }}
            animate={{ opacity: 1, rotate: 0, scale: 1 }}
            exit={{ opacity: 0, rotate: 35, scale: 0.75 }}
            transition={{ type: 'spring', bounce: 0, duration: 0.25 }}
            className="flex items-center justify-center text-amber-300"
          >
            <Sun className="h-4 w-4" aria-hidden="true" />
          </motion.span>
        ) : (
          <motion.span
            key="moon"
            initial={{ opacity: 0, rotate: 35, scale: 0.75 }}
            animate={{ opacity: 1, rotate: 0, scale: 1 }}
            exit={{ opacity: 0, rotate: -35, scale: 0.75 }}
            transition={{ type: 'spring', bounce: 0, duration: 0.25 }}
            className="flex items-center justify-center text-slate-700"
          >
            <Moon className="h-4 w-4" aria-hidden="true" />
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  )
}
