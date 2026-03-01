/**
 * FormInput — reusable labeled text/email/password input.
 *
 * Inputs are intentionally solid opaque-white per the design spec, ensuring
 * clear user affordance and maximum accessibility contrast over the glass card.
 */
export default function FormInput({
    id,
    label,
    type = 'text',
    placeholder,
    error,
    registration, // spread of react-hook-form register(...)
}) {
    return (
        <div className="flex flex-col gap-1.5">
            <label
                htmlFor={id}
                className="text-sm font-medium text-white dark:text-white light:text-gray-900"
            >
                {label}
            </label>
            <input
                id={id}
                type={type}
                placeholder={placeholder}
                autoComplete={type === 'password' ? 'current-password' : 'email'}
                className={[
                    'w-full px-4 py-2.5',
                    'bg-gray-100 text-gray-900',
                    'placeholder-gray-400',
                    'rounded-input',
                    'border',
                    error
                        ? 'border-red-400 focus:ring-red-400'
                        : 'border-transparent focus:ring-primary-500',
                    'focus:outline-none focus:ring-2 focus:border-transparent',
                    'text-sm',
                    'transition-shadow duration-150',
                ].join(' ')}
                {...registration}
            />
            {error && (
                <span role="alert" className="text-xs text-red-300 font-medium mt-0.5">
                    {error.message}
                </span>
            )}
        </div>
    );
}
