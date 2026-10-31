import { motion } from 'framer-motion';
import { useTheme } from '../context/ThemeContext';
import './ThemeToggle.css';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      className={`theme-toggle ${isDark ? 'theme-toggle--dark' : ''}`}
      onClick={toggleTheme}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
    >
      <span className="theme-toggle__track">
        <motion.span
          className="theme-toggle__thumb"
          layout
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        >
          {isDark ? '🌙' : '☀️'}
        </motion.span>
      </span>
    </button>
  );
}