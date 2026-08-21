import React, { useEffect, useState } from 'react';
import { Modal } from '../modal/modal.component';
import { ContentThumbnail } from '../content-thumbnail/content-thumbnail.component';
import { ContentLibraryItemModel, contentService } from '../../../services/content.service';
import './content-picker-modal.component.scss';

interface ContentPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (content: ContentLibraryItemModel) => void;
  attachedContentIds: string[];
}

export const ContentPickerModal = ({ isOpen, onClose, onSelect, attachedContentIds }: ContentPickerModalProps): React.JSX.Element | null => {
  const [state, setState] = useState<{ items: ContentLibraryItemModel[]; isLoading: boolean; error: string }>({
    items: [],
    isLoading: false,
    error: ''
  });

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setState(prev => ({ ...prev, isLoading: true, error: '' }));
    contentService
      .listLibrary()
      .then(items => setState({ items, isLoading: false, error: '' }))
      .catch(() => setState({ items: [], isLoading: false, error: 'Failed to load content library.' }));
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  const attachedIdSet = new Set(attachedContentIds);
  const availableItems = state.items.filter(item => !attachedIdSet.has(item.id));

  return (
    <Modal isOpen={isOpen} title="Add from Existing Content" onClose={onClose}>
      <div className="content-picker-modal">
        {state.isLoading ? <p className="content-picker-modal__status">Loading content library...</p> : null}
        {state.error ? <p className="content-picker-modal__status content-picker-modal__status--error">{state.error}</p> : null}
        {!state.isLoading && !state.error && state.items.length === 0 ? (
          <p className="content-picker-modal__status">No content in your library yet. Upload media first.</p>
        ) : null}
        {!state.isLoading && !state.error && state.items.length > 0 && availableItems.length === 0 ? (
          <p className="content-picker-modal__status">All of your content is already on this device.</p>
        ) : null}
        <div className="content-picker-modal__list">
          {availableItems.map(item => (
            <button type="button" key={item.id} className="content-picker-modal__item" onClick={() => onSelect(item)}>
              <ContentThumbnail type={item.type} url={item.url} fileName={item.fileName} />
            </button>
          ))}
        </div>
      </div>
    </Modal>
  );
};
