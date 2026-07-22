import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { DeviceContentItemModel, contentService } from '../../../services/content.service';
import { DeviceDetailModel, deviceService } from '../../../services/device.service';
import './device-detail.screen.scss';

export const DeviceDetailScreen = (): React.JSX.Element => {
  const navigate = useNavigate();
  const { deviceId = '' } = useParams();
  const [items, setItems] = useState<DeviceContentItemModel[]>([]);
  const [deviceDetail, setDeviceDetail] = useState<DeviceDetailModel | null>(null);
  const [webUrl, setWebUrl] = useState<string>('');
  const [duration, setDuration] = useState<string>('10');
  const [uploadType, setUploadType] = useState<'IMAGE' | 'VIDEO'>('IMAGE');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  const formatDateTime = (value: string | null): string => {
    if (!value) {
      return '-';
    }

    return new Date(value).toLocaleString();
  };

  const getRequestErrorMessage = (error: unknown, fallbackMessage: string): string => {
    if (
      typeof error === 'object' &&
      error !== null &&
      'response' in error &&
      typeof error.response === 'object' &&
      error.response !== null &&
      'data' in error.response &&
      typeof error.response.data === 'object' &&
      error.response.data !== null
    ) {
      const responseData = error.response.data as {
        message?: unknown;
        errors?: unknown;
      };

      if (Array.isArray(responseData.errors) && responseData.errors.length > 0) {
        const firstError = responseData.errors[0];
        if (typeof firstError === 'string') {
          return firstError;
        }
      }

      if (typeof responseData.message === 'string' && responseData.message.trim()) {
        return responseData.message;
      }
    }

    return fallbackMessage;
  };

  const normalizeWebUrl = (value: string): string | null => {
    const trimmedUrl = value.trim();

    if (!trimmedUrl) {
      return null;
    }

    const normalizedUrl = /^https?:\/\//i.test(trimmedUrl) ? trimmedUrl : `https://${trimmedUrl}`;

    try {
      const parsedUrl = new URL(normalizedUrl);
      if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
        return null;
      }

      return parsedUrl.toString();
    } catch (_error) {
      return null;
    }
  };

  const loadItems = async (): Promise<void> => {
    if (!deviceId) {
      return;
    }

    setIsLoading(true);
    setErrorMessage('');
    try {
      const response = await contentService.list(deviceId);
      setItems(response);
      const detail = await deviceService.getById(deviceId);
      setDeviceDetail(detail);
    } catch (_error) {
      setErrorMessage('Failed to load device details.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadItems().catch(() => undefined);
  }, [deviceId]);

  const handleAddWebpage = async (): Promise<void> => {
    if (!deviceId) {
      return;
    }

    const normalizedUrl = normalizeWebUrl(webUrl);
    if (!normalizedUrl) {
      setErrorMessage('Enter a valid website URL (for example: https://example.com).');
      return;
    }

    try {
      setErrorMessage('');
      await contentService.createWebpage(deviceId, {
        url: normalizedUrl,
        order: items.length + 1,
        duration: Number(duration) || 10
      });
      setWebUrl('');
      await loadItems();
    } catch (error: unknown) {
      setErrorMessage(getRequestErrorMessage(error, 'Failed to add webpage content.'));
    }
  };

  const handleUploadMedia = async (event: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    if (!deviceId || !event.target.files || event.target.files.length === 0) {
      return;
    }

    try {
      await contentService.uploadMedia(deviceId, {
        type: uploadType,
        file: event.target.files[0],
        order: items.length + 1,
        duration: uploadType === 'IMAGE' ? Number(duration) || 10 : undefined
      });
      event.target.value = '';
      await loadItems();
    } catch (_error) {
      setErrorMessage('Failed to upload media.');
    }
  };

  const handleDelete = async (contentId: string): Promise<void> => {
    if (!deviceId) {
      return;
    }

    try {
      await contentService.remove(deviceId, contentId);
      await loadItems();
    } catch (_error) {
      setErrorMessage('Failed to delete content.');
    }
  };

  const moveItem = async (index: number, direction: 'UP' | 'DOWN'): Promise<void> => {
    if (!deviceId) {
      return;
    }

    const swapIndex = direction === 'UP' ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= items.length) {
      return;
    }

    const nextList = [...items];
    const temp = nextList[index];
    nextList[index] = nextList[swapIndex];
    nextList[swapIndex] = temp;

    try {
      await contentService.reorder(
        deviceId,
        nextList.map(item => item.id)
      );
      await loadItems();
    } catch (_error) {
      setErrorMessage('Failed to update playlist order.');
    }
  };

  return (
    <section className="device-detail-screen">
      <header className="device-detail-screen__header">
        <div>
          <button
            className="device-detail-screen__back-button"
            type="button"
            onClick={() => {
              navigate('/devices');
            }}
          >
            Back to Device Fleet
          </button>
          <h1>Device Workspace</h1>
          <p>Configure media, playlist sequence, and viewing duration for this screen.</p>
        </div>
        <div className="device-detail-screen__identity">
          <p>Device ID: {deviceId}</p>
          <p>Unique ID: {deviceDetail?.deviceUniqueId || '-'}</p>
        </div>
      </header>
      {errorMessage ? <p className="device-detail-screen__error">{errorMessage}</p> : null}
      {isLoading ? <p className="device-detail-screen__loading">Loading device data...</p> : null}
      <section className="device-health-panel">
        <div className="device-health-panel__item">
          <span>Status</span>
          <strong>{deviceDetail?.status || '-'}</strong>
        </div>
        <div className="device-health-panel__item">
          <span>Paired</span>
          <strong>{deviceDetail?.isPaired ? 'Yes' : 'No'}</strong>
        </div>
        <div className="device-health-panel__item">
          <span>Content count</span>
          <strong>{deviceDetail?.contentCount || 0}</strong>
        </div>
        <div className="device-health-panel__item">
          <span>Last heartbeat</span>
          <strong>{formatDateTime(deviceDetail?.lastHeartbeatAt || null)}</strong>
        </div>
        <div className="device-health-panel__item">
          <span>Last seen</span>
          <strong>{formatDateTime(deviceDetail?.lastSeen || null)}</strong>
        </div>
        <div className="device-health-panel__item">
          <span>App version</span>
          <strong>{deviceDetail?.appVersion || '-'}</strong>
        </div>
        <div className="device-health-panel__item">
          <span>Last heartbeat IP</span>
          <strong>{deviceDetail?.lastHeartbeatIpAddress || '-'}</strong>
        </div>
      </section>

      <section className="content-tools">
        <div className="tool-card">
          <h3>Add Webpage</h3>
          <label>Web URL</label>
          <input value={webUrl} placeholder="https://example.com" onChange={event => setWebUrl(event.target.value)} />
          <label>Duration (seconds)</label>
          <input value={duration} placeholder="Duration (seconds)" onChange={event => setDuration(event.target.value.replace(/\D/g, ''))} />
          <button type="button" onClick={handleAddWebpage}>
            Add Webpage
          </button>
        </div>

        <div className="tool-card">
          <h3>Upload Media</h3>
          <label>Media Type</label>
          <select value={uploadType} onChange={event => setUploadType(event.target.value as 'IMAGE' | 'VIDEO')}>
            <option value="IMAGE">IMAGE</option>
            <option value="VIDEO">VIDEO</option>
          </select>
          <label>Media File</label>
          <input type="file" accept={uploadType === 'IMAGE' ? 'image/*' : 'video/*'} onChange={handleUploadMedia} />
        </div>
      </section>

      <section className="content-list">
        <h3 className="content-list__title">Playlist Items</h3>
        {items.length === 0 ? <p className="content-list__empty">No playlist items yet. Add webpage or media content to start playback.</p> : null}
        {items.map((item, index) => (
          <article key={item.id} className="content-row">
            <div>
              <h4>
                #{index + 1} {item.type}
              </h4>
              <p>{item.url}</p>
            </div>
            <div className="content-row__actions">
              <button type="button" onClick={() => moveItem(index, 'UP')}>
                Up
              </button>
              <button type="button" onClick={() => moveItem(index, 'DOWN')}>
                Down
              </button>
              <button type="button" onClick={() => handleDelete(item.id)}>
                Delete
              </button>
            </div>
          </article>
        ))}
      </section>
    </section>
  );
};
