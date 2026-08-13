import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { DeviceContentItemModel, contentService } from '../../../services/content.service';
import { DeviceDetailModel, DeviceOrientation, deviceService } from '../../../services/device.service';
import { DeviceAnalyticsModel } from '../../../interfaces/pi-analytics.interface';
import { Modal } from '../../../components/common/modal/modal.component';
import { Toast } from '../../../components/common/toast/toast.component';
import { DonutChart } from '../../../components/common/donut-chart/donut-chart.component';
import { BarChart } from '../../../components/common/bar-chart/bar-chart.component';
import { STRINGS } from '../../../constants/strings.constant';
import { formatWatchTime, isValidPiId } from '../../../utils/functions.utils';
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
  const [editingContentId, setEditingContentId] = useState<string | null>(null);
  const [editDurationValue, setEditDurationValue] = useState<string>('10');
  const [piIdState, setPiIdState] = useState({ value: '', isSaving: false, error: '' });
  const [toastState, setToastState] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [analyticsState, setAnalyticsState] = useState<{
    data: DeviceAnalyticsModel | null;
    isLoading: boolean;
    error: string;
  }>({ data: null, isLoading: false, error: '' });

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

  const loadAnalytics = async (): Promise<void> => {
    if (!deviceId) {
      return;
    }

    setAnalyticsState(prev => ({ ...prev, isLoading: true, error: '' }));
    try {
      const data = await deviceService.getAnalytics(deviceId);
      setAnalyticsState({ data, isLoading: false, error: '' });
      if (data) {
        setPiIdState(prev => ({ ...prev, value: data.piId }));
      }
    } catch (_error) {
      setAnalyticsState({ data: null, isLoading: false, error: STRINGS.devices.detail.analyticsErrorLoad });
    }
  };

  useEffect(() => {
    loadItems().catch(() => undefined);
    loadAnalytics().catch(() => undefined);
  }, [deviceId]);

  const handleSavePiId = async (): Promise<void> => {
    if (!deviceId) {
      return;
    }

    const trimmedPiId = piIdState.value.trim();
    if (!isValidPiId(trimmedPiId)) {
      setPiIdState(prev => ({ ...prev, error: STRINGS.devices.detail.piIdInvalid }));
      return;
    }

    setPiIdState(prev => ({ ...prev, isSaving: true, error: '' }));
    try {
      await deviceService.updatePiId(deviceId, trimmedPiId);
      await loadAnalytics();
      setPiIdState(prev => ({ ...prev, isSaving: false }));
      setToastState({ message: STRINGS.devices.detail.piIdSaveSuccess, type: 'success' });
    } catch (error: unknown) {
      const message = getRequestErrorMessage(error, STRINGS.devices.detail.piIdSaveFailed);
      setPiIdState(prev => ({
        ...prev,
        isSaving: false,
        error: message
      }));
      setToastState({ message, type: 'error' });
    }
  };

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
      setDuration('10');
      await loadItems();
    } catch (_error) {
      setErrorMessage('Failed to upload media.');
    }
  };

  const handleOrientationChange = async (event: React.ChangeEvent<HTMLSelectElement>): Promise<void> => {
    if (!deviceId) {
      return;
    }

    const nextOrientation = event.target.value as DeviceOrientation;
    const previousDetail = deviceDetail;
    setDeviceDetail(prev => (prev ? { ...prev, orientation: nextOrientation } : prev));

    try {
      await deviceService.updateOrientation(deviceId, nextOrientation);
    } catch (_error) {
      setErrorMessage('Failed to update screen orientation.');
      setDeviceDetail(previousDetail);
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

  const handleStartEdit = (item: DeviceContentItemModel): void => {
    setEditingContentId(item.id);
    setEditDurationValue(String(item.duration ?? 10));
  };

  const handleCancelEdit = (): void => {
    setEditingContentId(null);
  };

  const handleSaveEdit = async (): Promise<void> => {
    if (!deviceId || !editingContentId) {
      return;
    }

    try {
      await contentService.updateDuration(deviceId, editingContentId, Number(editDurationValue) || 10);
      setEditingContentId(null);
      await loadItems();
    } catch (_error) {
      setErrorMessage('Failed to update content.');
    }
  };

  const editingItem = items.find(item => item.id === editingContentId) || null;

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
        {/* <div className="tool-card">
          <h3>Add Webpage</h3>
          <label>Web URL</label>
          <input value={webUrl} placeholder="https://example.com" onChange={event => setWebUrl(event.target.value)} />
          <label>Duration (seconds)</label>
          <input value={duration} placeholder="Duration (seconds)" onChange={event => setDuration(event.target.value.replace(/\D/g, ''))} />
          <button type="button" onClick={handleAddWebpage}>
            Add Webpage
          </button>
        </div> */}

        <div className="tool-card">
          <h3>Screen Orientation</h3>
          <label>Orientation</label>
          <select value={deviceDetail?.orientation || 'PORTRAIT'} onChange={handleOrientationChange}>
            <option value="PORTRAIT">Portrait</option>
            <option value="LANDSCAPE">Landscape</option>
            <option value="PORTRAIT_FLIP">Portrait Flip</option>
            <option value="LANDSCAPE_FLIP">Landscape Flip</option>
          </select>
        </div>

        <div className="tool-card">
          <h3>Upload Media</h3>
          <label>Media Type</label>
          <select value={uploadType} onChange={event => setUploadType(event.target.value as 'IMAGE' | 'VIDEO')}>
            <option value="IMAGE">IMAGE</option>
            <option value="VIDEO">VIDEO</option>
          </select>
          {uploadType === 'IMAGE' ? (
            <>
              <label>Duration (seconds)</label>
              <input
                value={duration}
                placeholder="10"
                onChange={event => setDuration(event.target.value.replace(/\D/g, ''))}
              />
            </>
          ) : null}
          <label>Media File</label>
          <input type="file" accept={uploadType === 'IMAGE' ? 'image/*' : 'video/*'} onChange={handleUploadMedia} />
        </div>
      </section>

      <section className="content-list">
        <h3 className="content-list__title">Playlist Items</h3>
        {items.length === 0 ? <p className="content-list__empty">No playlist items yet. Add webpage or media content to start playback.</p> : null}
        {items.map((item, index) => (
          <article key={item.id} className="content-row">
            <div className="content-row__info">
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
              <button type="button" onClick={() => handleStartEdit(item)}>
                Edit
              </button>
              <button type="button" onClick={() => handleDelete(item.id)}>
                Delete
              </button>
            </div>
          </article>
        ))}
      </section>

      <section className="analytics-panel">
        <h3 className="analytics-panel__title">{STRINGS.devices.detail.analyticsTitle}</h3>
        <div className="tool-card">
          <h3>{STRINGS.devices.detail.piIdTitle}</h3>
          <label>{STRINGS.devices.detail.piIdLabel}</label>
          <input
            value={piIdState.value}
            placeholder={STRINGS.devices.detail.piIdPlaceholder}
            onChange={event => setPiIdState(prev => ({ ...prev, value: event.target.value, error: '' }))}
          />
          <button type="button" disabled={piIdState.isSaving} onClick={handleSavePiId}>
            {piIdState.isSaving ? (
              <span className="button-spinner" aria-hidden="true" />
            ) : null}
            {piIdState.isSaving ? STRINGS.devices.detail.piIdSaving : STRINGS.devices.detail.piIdSaveButton}
          </button>
          {piIdState.error ? <p className="analytics-panel__error">{piIdState.error}</p> : null}
        </div>

        {analyticsState.error ? <p className="analytics-panel__error">{analyticsState.error}</p> : null}
        {analyticsState.isLoading ? <p className="analytics-panel__loading">Loading analytics...</p> : null}

        {!analyticsState.isLoading && !analyticsState.data ? (
          <p className="analytics-panel__empty">{STRINGS.devices.detail.analyticsEmptyPrompt}</p>
        ) : null}

        {analyticsState.data ? (
          <>
            <div className="analytics-stat-grid">
              <div className="analytics-stat-grid__item analytics-stat-grid__item--accent">
                <span>{STRINGS.devices.detail.analyticsTotalUniqueVisitors}</span>
                <strong>{analyticsState.data.uniqueVisitors}</strong>
              </div>
              <div className="analytics-stat-grid__item analytics-stat-grid__item--accent">
                <span>{STRINGS.devices.detail.analyticsTotalWatchTime}</span>
                <strong>{formatWatchTime(analyticsState.data.totalWatchTimeSeconds)}</strong>
              </div>
              <div className="analytics-stat-grid__item">
                <span>{STRINGS.devices.detail.analyticsAverageWatchTime}</span>
                <strong>{formatWatchTime(analyticsState.data.averageWatchTimeSeconds)}</strong>
              </div>
              <div className="analytics-stat-grid__item">
                <span>{STRINGS.devices.detail.analyticsReturningVisitors}</span>
                <strong>{analyticsState.data.returningVisitors}</strong>
              </div>
            </div>

            <div className="analytics-chart-grid">
              <div className="analytics-chart-card">
                <h4 className="analytics-panel__subtitle">{STRINGS.devices.detail.analyticsGenderTitle}</h4>
                <DonutChart
                  centerLabel={STRINGS.devices.detail.analyticsTotalUniqueVisitors}
                  centerValue={String(analyticsState.data.uniqueVisitors)}
                  segments={[
                    { label: STRINGS.devices.detail.analyticsMale, value: analyticsState.data.genderBreakdown.male, color: '#0f766e' },
                    { label: STRINGS.devices.detail.analyticsFemale, value: analyticsState.data.genderBreakdown.female, color: '#e879a6' },
                    { label: STRINGS.devices.detail.analyticsUnknown, value: analyticsState.data.genderBreakdown.unknown, color: '#cbd5e1' }
                  ]}
                />
              </div>

              <div className="analytics-chart-card">
                <h4 className="analytics-panel__subtitle">{STRINGS.devices.detail.analyticsVisitTypeTitle}</h4>
                <DonutChart
                  centerLabel={STRINGS.devices.detail.analyticsTotalUniqueVisitors}
                  centerValue={String(analyticsState.data.uniqueVisitors)}
                  segments={[
                    { label: STRINGS.devices.detail.analyticsOneTimeVisitors, value: analyticsState.data.oneTimeVisitors, color: '#f59e0b' },
                    { label: STRINGS.devices.detail.analyticsReturningVisitors, value: analyticsState.data.returningVisitors, color: '#0f766e' }
                  ]}
                />
              </div>

              <div className="analytics-chart-card analytics-chart-card--wide">
                <h4 className="analytics-panel__subtitle">{STRINGS.devices.detail.analyticsAgeTitle}</h4>
                {analyticsState.data.ageBuckets.length === 0 ? (
                  <p className="analytics-panel__empty">{STRINGS.devices.detail.analyticsNoAgeData}</p>
                ) : (
                  <BarChart items={analyticsState.data.ageBuckets.map(bucket => ({ label: bucket.label, value: bucket.count }))} />
                )}
              </div>
            </div>

            <h4 className="analytics-panel__subtitle">{STRINGS.devices.detail.analyticsPerVisitorTitle}</h4>
            {analyticsState.data.visitors.length === 0 ? (
              <p className="analytics-panel__empty">No visitors recorded yet.</p>
            ) : (
              <div className="analytics-table-wrapper">
                <table className="analytics-table">
                  <thead>
                    <tr>
                      <th>{STRINGS.devices.detail.analyticsVisitorIdColumn}</th>
                      <th>{STRINGS.devices.detail.analyticsWatchTimeColumn}</th>
                      <th>{STRINGS.devices.detail.analyticsVisitsColumn}</th>
                      <th>{STRINGS.devices.detail.analyticsFirstSeenColumn}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analyticsState.data.visitors.map(visitor => (
                      <tr key={visitor.visitorId}>
                        <td>{visitor.visitorId}</td>
                        <td>{formatWatchTime(visitor.watchTimeSeconds)}</td>
                        <td>
                          {visitor.visitCount > 1 ? (
                            <span className="analytics-badge analytics-badge--returning">{visitor.visitCount}x</span>
                          ) : (
                            <span className="analytics-badge">{visitor.visitCount}x</span>
                          )}
                        </td>
                        <td>{formatDateTime(visitor.firstSeenAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        ) : null}
      </section>

      <Modal isOpen={editingItem !== null} title="Edit Content" onClose={handleCancelEdit}>
        {editingItem?.type === 'IMAGE' ? (
          <>
            <label>Duration (seconds)</label>
            <input
              value={editDurationValue}
              placeholder="10"
              onChange={event => setEditDurationValue(event.target.value.replace(/\D/g, ''))}
            />
            <div className="modal-actions">
              <button type="button" onClick={handleCancelEdit}>
                Cancel
              </button>
              <button type="button" className="primary" onClick={handleSaveEdit}>
                Save
              </button>
            </div>
          </>
        ) : (
          <>
            <p>Videos play until they end and have no duration setting.</p>
            <div className="modal-actions">
              <button type="button" onClick={handleCancelEdit}>
                Close
              </button>
            </div>
          </>
        )}
      </Modal>

      {toastState ? (
        <Toast message={toastState.message} type={toastState.type} onClose={() => setToastState(null)} />
      ) : null}
    </section>
  );
};
