import React, { useEffect, useState } from 'react';
import { Modal } from '../modal/modal.component';
import { DEFAULT_WEBPAGE_DURATION_SECONDS, clampDuration } from '../../../utils/functions.utils';
import './add-webpage-modal.component.scss';

interface AddWebpageModalProps {
  isOpen: boolean;
  isSaving: boolean;
  error: string;
  onClose: () => void;
  onSubmit: (payload: { url: string; duration: number }) => void;
}

export const AddWebpageModal = ({ isOpen, isSaving, error, onClose, onSubmit }: AddWebpageModalProps): React.JSX.Element | null => {
  const [state, setState] = useState({ url: '', duration: String(DEFAULT_WEBPAGE_DURATION_SECONDS) });

  useEffect(() => {
    if (isOpen) {
      setState({ url: '', duration: String(DEFAULT_WEBPAGE_DURATION_SECONDS) });
    }
  }, [isOpen]);

  const canSubmit = state.url.trim().length > 0 && !isSaving;

  const handleSubmit = (): void => {
    if (!canSubmit) {
      return;
    }
    onSubmit({ url: state.url.trim(), duration: clampDuration(state.duration, DEFAULT_WEBPAGE_DURATION_SECONDS) });
  };

  return (
    <Modal isOpen={isOpen} title="Add Webpage" onClose={isSaving ? () => undefined : onClose}>
      <label htmlFor="add-webpage-url">Website URL</label>
      <input
        id="add-webpage-url"
        type="url"
        autoFocus
        placeholder="https://example.com"
        value={state.url}
        disabled={isSaving}
        onChange={event => setState(prev => ({ ...prev, url: event.target.value }))}
        onKeyDown={event => {
          if (event.key === 'Enter') {
            handleSubmit();
          }
        }}
      />
      <label htmlFor="add-webpage-duration">Display time (seconds)</label>
      <input
        id="add-webpage-duration"
        type="number"
        min={1}
        max={9999}
        value={state.duration}
        disabled={isSaving}
        onChange={event => setState(prev => ({ ...prev, duration: event.target.value }))}
      />
      <small className="add-webpage-modal__hint">The TV shows the live website for this long before moving to the next item.</small>
      {error ? (
        <p className="add-webpage-modal__error" role="alert">
          {error}
        </p>
      ) : null}
      <div className="modal-actions">
        <button type="button" disabled={isSaving} onClick={onClose}>
          Cancel
        </button>
        <button type="button" className="primary" disabled={!canSubmit} onClick={handleSubmit}>
          {isSaving ? 'Adding...' : 'Add Webpage'}
        </button>
      </div>
    </Modal>
  );
};
