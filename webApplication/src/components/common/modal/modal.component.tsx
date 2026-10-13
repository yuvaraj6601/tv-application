import React from 'react';
import './modal.component.scss';

interface ModalProps {
  isOpen: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  size?: 'default' | 'large';
}

export const Modal = ({ isOpen, title, onClose, children, size = 'default' }: ModalProps): React.JSX.Element | null => {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className={`modal${size === 'large' ? ' modal--large' : ''}`} onClick={event => event.stopPropagation()}>
        <div className="modal__header">
          <h3>{title}</h3>
          <button type="button" className="modal__close" onClick={onClose}>
            &times;
          </button>
        </div>
        <div className="modal__body">{children}</div>
      </div>
    </div>
  );
};
