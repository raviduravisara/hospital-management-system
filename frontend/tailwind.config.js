/** @type {import('tailwindcss').Config} */

// Import design tokens – this file IS the single source of truth for colors.
// We use createRequire because tailwind.config.js runs in CJS context.
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// Since the project is ESM (type:module in package.json) we can use dynamic import-like tricks,
// but the simplest approach for Tailwind v3 CJS config is to inline the token values here,
// keeping them in exact sync with src/data/config/colors.js.
// See: src/data/config/colors.js for the canonical definitions.

const primary = { 500: '#2B82F6', 600: '#1D4ED8', contrast: '#FFFFFF' };
const gray = { 100: '#F3F4F6', 400: '#9CA3AF', 900: '#111827' };
const accent = { white: '#FFFFFF', shadow: 'rgba(0,0,0,0.25)', divider: 'rgba(255,255,255,0.40)' };

export default {
    darkMode: 'class', // Toggle via ThemeContext by adding/removing 'dark' on <html>
    content: [
        './index.html',
        './src/**/*.{js,jsx,ts,tsx}',
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
            },
            colors: {
                primary,
                gray,
                accent,
                // Glassmorphism surfaces – used as arbitrary values in JSX since they contain rgba
                // e.g. className="bg-[rgba(255,255,255,0.15)]"
            },
            backdropBlur: {
                glass: '16px',
            },
            boxShadow: {
                glass: '0 25px 50px -12px rgba(0,0,0,0.25)',
            },
            borderRadius: {
                card: '1.5rem',   // 24px – glass card
                input: '0.375rem', // 6px – form inputs
            },
        },
    },
    plugins: [],
};
