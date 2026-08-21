import React from 'react';
import { DashboardContentType } from '../../../services/content.service';
import { getContentDisplayName } from '../../../utils/functions.utils';
import { apiBaseUrl } from '../../../utils/axios.utils';
import './content-thumbnail.component.scss';

interface ContentThumbnailProps {
  type: DashboardContentType;
  url: string;
  fileName: string | null;
  hideInfo?: boolean;
}

// Uploaded asset URLs are stored server-relative (e.g. "/uploads/..."); resolve them against the
// API origin so they don't resolve against the dashboard's own origin instead.
const resolveAssetUrl = (url: string): string => (url.startsWith('/') ? `${apiBaseUrl}${url}` : url);

const handleVideoLoadedMetadata = (event: React.SyntheticEvent<HTMLVideoElement>): void => {
  const video = event.currentTarget;
  // Some browsers paint a blank frame at time 0 until the video is seeked at least once.
  if (video.currentTime === 0) {
    video.currentTime = 0.1;
  }
};

export const ContentThumbnail = ({ type, url, fileName, hideInfo = false }: ContentThumbnailProps): React.JSX.Element => {
  const displayName = getContentDisplayName(fileName, url, type);
  const resolvedUrl = resolveAssetUrl(url);

  return (
    <div className="content-thumbnail">
      <div className="content-thumbnail__preview">
        {type === 'IMAGE' ? <img src={resolvedUrl} alt={displayName} loading="lazy" /> : null}
        {type === 'VIDEO' ? (
          <video src={`${resolvedUrl}#t=0.1`} muted playsInline preload="metadata" onLoadedMetadata={handleVideoLoadedMetadata} />
        ) : null}
        {type === 'WEBPAGE' ? <span className="content-thumbnail__webpage-icon">🌐</span> : null}
      </div>
      {hideInfo ? null : (
        <div className="content-thumbnail__info">
          <span className="content-thumbnail__type">{type}</span>
          <span className="content-thumbnail__name" title={displayName}>
            {displayName}
          </span>
        </div>
      )}
    </div>
  );
};
