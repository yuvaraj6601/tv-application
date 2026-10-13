import React from 'react';
import { Modal } from '../modal/modal.component';
import { resolveAssetUrl } from '../content-thumbnail/content-thumbnail.component';
import { DashboardContentType } from '../../../services/content.service';
import { getContentDisplayName } from '../../../utils/functions.utils';
import './media-viewer-modal.component.scss';

interface MediaViewerModalProps {
  isOpen: boolean;
  type: DashboardContentType;
  url: string;
  fileName: string | null;
  onClose: () => void;
}

export const MediaViewerModal = ({ isOpen, type, url, fileName, onClose }: MediaViewerModalProps): React.JSX.Element | null => {
  if (!isOpen) {
    return null;
  }

  const displayName = getContentDisplayName(fileName, url, type);
  const resolvedUrl = resolveAssetUrl(url);

  return (
    <Modal isOpen={isOpen} title={displayName} onClose={onClose} size="large">
      <div className="media-viewer">
        {type === 'IMAGE' ? <img src={resolvedUrl} alt={displayName} /> : null}
        {type === 'VIDEO' ? <video src={resolvedUrl} controls autoPlay playsInline /> : null}
        {type === 'WEBPAGE' ? (
          <a href={url} target="_blank" rel="noreferrer">
            {url}
          </a>
        ) : null}
      </div>
    </Modal>
  );
};
