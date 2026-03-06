import styles from './ThemeToggle.module.css';

export function ThemeToggle({ theme, onToggle }) {
  const label = theme === 'theme-dark' ? 'Switch to light theme' : 'Switch to dark theme';

  return (
    <button className={styles.button} type="button" onClick={onToggle} aria-label={label}>
      {theme === 'theme-dark' ? 'Light' : 'Dark'}
    </button>
  );
}
