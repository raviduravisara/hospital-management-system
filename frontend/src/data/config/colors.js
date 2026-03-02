/**
 * Design system color tokens for Hospital Management System.
 * This file is the single source of truth consumed by tailwind.config.js.
 * @see tailwind.config.js
 */
export const colors = {
    primary: {
        500: '#2B82F6', // Primary medical blue – used exclusively on the Sign In button
        600: '#1D4ED8', // Hover state for primary button
        contrast: '#FFFFFF',
    },
    glass: {
        // Dark mode: white-tinted translucent panel (over dark backgrounds)
        dark: 'rgba(255,255,255,0.15)',
        darkBorder: 'rgba(255,255,255,0.25)',
        // Light mode: dark-tinted translucent panel (over bright backgrounds)
        light: 'rgba(0,0,0,0.15)',
        lightBorder: 'rgba(0,0,0,0.25)',
    },
    gray: {
        100: '#F3F4F6', // Input background fill
        400: '#9CA3AF', // Placeholder text
        900: '#111827', // Input value text, light-mode structural text
    },
    accent: {
        white: '#FFFFFF', // Primary typography, labels, links on dark backgrounds
        shadow: 'rgba(0,0,0,0.25)', // Soft wide shadow behind glass card
        divider: 'rgba(255,255,255,0.40)', // "or" horizontal rule separator
    },
};
