/**
 * FormError — displays a root-level form error banner inside the glass card.
 * Uses a red-tinted translucent surface to stay readable over the glass bg.
 */
export default function FormError({ message }) {
    if (!message) return null;

    return (
        <div
            role="alert"
            className={[
                'flex items-center gap-2',
                'px-4 py-3 rounded-input',
                'bg-red-500/20 border border-red-400/40',
                'text-sm text-white font-medium',
            ].join(' ')}
        >
            {/* Warning icon */}
            <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-4 h-4 shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden="true"
            >
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
                />
            </svg>
            {message}
        </div>
    );
}
