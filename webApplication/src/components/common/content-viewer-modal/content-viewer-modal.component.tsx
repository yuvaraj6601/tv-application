import React from 'react';
import { DashboardContentType } from '../../../services/content.service';
import { Modal } from '../modal/modal.component';
import { apiBaseUrl } from '../../../utils/axios.utils';
import './content-viewer-modal.component.scss';

interface ContentViewerModalProps {
  isOpen: boolean;
  type: DashboardContentType;
  url: string;
  title: string;
  onClose: () => void;
}

const resolveAssetUrl = (url: string): string => (url.startsWith('/') ? `${apiBaseUrl}${url}` : url);

export const ContentViewerModal = ({ isOpen, type, url, title, onClose }: ContentViewerModalProps): React.JSX.Element => {
  const resolvedUrl = resolveAssetUrl(url);

  return (
    <Modal isOpen={isOpen} title={title} onClose={onClose} className="content-viewer-modal">
      <div className="content-viewer-modal__stage">
        {type === 'IMAGE' ? <img src={resolvedUrl} alt={title} /> : null}
        {type === 'VIDEO' ? <video src={resolvedUrl} controls autoPlay /> : null}
      </div>
    </Modal>
  );
};
