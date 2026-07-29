import React, { useState } from 'react';
import './password-input.component.scss';

type PasswordInputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(({ className, ...inputProps }, ref) => {
  const [isVisible, setIsVisible] = useState<boolean>(false);

  return (
    <div className={`password-input${className ? ` ${className}` : ''}`}>
      <input {...inputProps} ref={ref} type={isVisible ? 'text' : 'password'} className="password-input__field" />
      <button
        type="button"
        className="password-input__toggle"
        onClick={() => setIsVisible(previous => !previous)}
        aria-label={isVisible ? 'Hide password' : 'Show password'}
      >
        {isVisible ? (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 3l18 18" />
            <path d="M10.58 10.58a2 2 0 0 0 2.83 2.83" />
            <path d="M9.36 5.3A9.53 9.53 0 0 1 12 5c5 0 9 4.5 9 7a9.9 9.9 0 0 1-2.16 3.19M6.53 6.53C4.28 8.02 2.6 10.1 2 12c0 2.5 4 7 10 7 1.36 0 2.62-.24 3.75-.65" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        )}
      </button>
    </div>
  );
});

PasswordInput.displayName = 'PasswordInput';
