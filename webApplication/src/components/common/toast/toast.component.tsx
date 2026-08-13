import React, { useEffect } from 'react';
import './toast.component.scss';

interface ToastProps {
  message: string;
  type: 'success' | 'error';
  onClose: () => void;
  durationMs?: number;
}

export const Toast = ({ message, type, onClose, durationMs = 4000 }: ToastProps): React.JSX.Element => {
  useEffect(() => {
    const timer = window.setTimeout(onClose, durationMs);
    return () => window.clearTimeout(timer);
  }, [message, type, durationMs, onClose]);

  return (
    <div className={`toast toast--${type}`} role="status">
      <span>{message}</span>
      <button type="button" className="toast__close" onClick={onClose}>
        &times;
      </button>
    </div>
  );
};
