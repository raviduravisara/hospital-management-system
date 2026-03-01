import { useTheme } from '../context/ThemeContext';

/**
 * ThemeSwitch — a sun/moon icon toggle button.
 * Reads and sets the current theme via useTheme().
 * Designed to be placed absolutely in the corner of full-bleed pages.
 */
export default function ThemeSwitch({ className = '' }) {
    const { theme, toggleTheme } = useTheme();
    const isDark = theme === 'dark';

    return (
        <button
            onClick={toggleTheme}
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            className={[
                'flex items-center justify-center',
                'w-10 h-10 rounded-full',
                'bg-white/20 hover:bg-white/30',
                'dark:bg-white/20 dark:hover:bg-white/30',
                'backdrop-blur-sm',
                'text-white dark:text-white',
                'transition-all duration-200',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60',
                className,
            ].join(' ')}
        >
            {isDark ? (
                /* Sun icon — click to go light */
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                    aria-hidden="true"
                >
                    <circle cx="12" cy="12" r="5" />
                    <path
                        strokeLinecap="round"
                        d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"
                    />
                </svg>
            ) : (
                /* Moon icon — click to go dark */
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-5 h-5"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                >
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
            )}
        </button>
    );
}
