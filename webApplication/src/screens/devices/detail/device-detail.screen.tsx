import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ContentLibraryItemModel, DeviceContentItemModel, contentService } from '../../../services/content.service';
import { DeviceDetailModel, DeviceOrientation, deviceService } from '../../../services/device.service';
import { DeviceAnalyticsModel } from '../../../interfaces/pi-analytics.interface';
import { Modal } from '../../../components/common/modal/modal.component';
import { Toast } from '../../../components/common/toast/toast.component';
import { ContentThumbnail } from '../../../components/common/content-thumbnail/content-thumbnail.component';
import { ContentPickerModal } from '../../../components/common/content-picker-modal/content-picker-modal.component';
import { DonutChart } from '../../../components/common/donut-chart/donut-chart.component';
import { BarChart } from '../../../components/common/bar-chart/bar-chart.component';
import { STRINGS } from '../../../constants/strings.constant';
import { formatWatchTime, getOrientationLabel, isValidDeviceName, isValidPiId } from '../../../utils/functions.utils';
import './device-detail.screen.scss';

type DeviceDetailTab = 'CONTENT_SETTINGS' | 'PLAYLIST' | 'ANALYTICS' | 'DEVICE_INFO';

const ORIENTATION_OPTIONS: DeviceOrientation[] = ['LANDSCAPE', 'PORTRAIT', 'PORTRAIT_FLIP', 'LANDSCAPE_FLIP'];

const CopyIcon = (): React.JSX.Element => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <rect x="9" y="9" width="11" height="11" rx="2" stroke="currentColor" strokeWidth="2" />
    <path d="M5 15V5a2 2 0 0 1 2-2h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const EditIcon = (): React.JSX.Element => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path
      d="M16.5 3.5a1.914 1.914 0 1 1 2.708 2.708L7.7 17.717l-3.75.75.75-3.75L16.5 3.5Z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const TrashIcon = (): React.JSX.Element => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path
      d="M4 7h16M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2m2 0-1 13a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 7h14Z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const DeviceDetailScreen = (): React.JSX.Element => {
  const navigate = useNavigate();
  const { deviceId = '' } = useParams();
  const [activeTab, setActiveTab] = useState<DeviceDetailTab>('CONTENT_SETTINGS');
  const [items, setItems] = useState<DeviceContentItemModel[]>([]);
  const [deviceDetail, setDeviceDetail] = useState<DeviceDetailModel | null>(null);
  const [duration, setDuration] = useState<string>('10');
  const [uploadType, setUploadType] = useState<'IMAGE' | 'VIDEO'>('IMAGE');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [editingContentId, setEditingContentId] = useState<string | null>(null);
  const [editDurationValue, setEditDurationValue] = useState<string>('10');
  const [piIdState, setPiIdState] = useState({ value: '', isSaving: false, error: '' });
  const [deviceNameState, setDeviceNameState] = useState({ value: '', isEditing: false, isSaving: false, error: '' });
  const [deleteDeviceState, setDeleteDeviceState] = useState({ isModalOpen: false, isDeleting: false, error: '' });
  const isDeletingDeviceRef = useRef(false);
  const [toastState, setToastState] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [isContentPickerOpen, setIsContentPickerOpen] = useState<boolean>(false);
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

  const getResponseStatus = (error: unknown): number | null => {
    if (
      typeof error === 'object' &&
      error !== null &&
      'response' in error &&
      typeof error.response === 'object' &&
      error.response !== null &&
      'status' in error.response &&
      typeof error.response.status === 'number'
    ) {
      return error.response.status;
    }

    return null;
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
      setDeviceNameState(prev => ({ ...prev, value: detail.deviceName }));
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

  const handleStartEditDeviceName = (): void => {
    setDeviceNameState({ value: deviceDetail?.deviceName || '', isEditing: true, isSaving: false, error: '' });
  };

  const handleCancelEditDeviceName = (): void => {
    setDeviceNameState({ value: deviceDetail?.deviceName || '', isEditing: false, isSaving: false, error: '' });
  };

  const handleSaveDeviceName = async (): Promise<void> => {
    if (!deviceId) {
      return;
    }

    const trimmedName = deviceNameState.value.trim();
    if (!isValidDeviceName(trimmedName)) {
      setDeviceNameState(prev => ({ ...prev, error: STRINGS.devices.detail.deviceNameInvalid }));
      return;
    }

    if (trimmedName === (deviceDetail?.deviceName || '')) {
      setDeviceNameState(prev => ({ ...prev, isEditing: false, error: '' }));
      return;
    }

    setDeviceNameState(prev => ({ ...prev, isSaving: true, error: '' }));
    try {
      const updatedDeviceName = await deviceService.updateDeviceName(deviceId, trimmedName);
      setDeviceDetail(prev => (prev ? { ...prev, deviceName: updatedDeviceName } : prev));
      setDeviceNameState({ value: updatedDeviceName, isEditing: false, isSaving: false, error: '' });
      setToastState({ message: STRINGS.devices.detail.deviceNameSaveSuccess, type: 'success' });
    } catch (error: unknown) {
      const message = getRequestErrorMessage(error, STRINGS.devices.detail.deviceNameSaveFailed);
      setDeviceNameState(prev => ({ ...prev, isSaving: false, error: message }));
      setToastState({ message, type: 'error' });
    }
  };

  const handleDeviceNameKeyDown = (event: React.KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleSaveDeviceName().catch(() => undefined);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      handleCancelEditDeviceName();
    }
  };

  const handleOpenDeleteDeviceModal = (): void => {
    setDeleteDeviceState({ isModalOpen: true, isDeleting: false, error: '' });
  };

  const handleCloseDeleteDeviceModal = (): void => {
    if (deleteDeviceState.isDeleting) {
      return;
    }

    setDeleteDeviceState({ isModalOpen: false, isDeleting: false, error: '' });
  };

  const handleConfirmDeleteDevice = async (): Promise<void> => {
    if (!deviceId || isDeletingDeviceRef.current) {
      return;
    }

    isDeletingDeviceRef.current = true;
    setDeleteDeviceState(prev => ({ ...prev, isDeleting: true, error: '' }));
    try {
      await deviceService.deleteDevice(deviceId);
      navigate('/devices');
    } catch (error: unknown) {
      if (getResponseStatus(error) === 404) {
        // Device is already gone (e.g. a prior request already deleted it) — treat as success.
        navigate('/devices');
        return;
      }

      isDeletingDeviceRef.current = false;
      const message = getRequestErrorMessage(error, STRINGS.devices.detail.deleteDeviceFailed);
      setDeleteDeviceState(prev => ({ ...prev, isDeleting: false, error: message }));
      setToastState({ message, type: 'error' });
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
        duration: uploadType === 'IMAGE' ? Number(duration) || 10 : undefined
      });
      event.target.value = '';
      setDuration('10');
      await loadItems();
    } catch (_error) {
      setErrorMessage('Failed to upload media.');
    }
  };

  const handleAttachExisting = async (content: ContentLibraryItemModel): Promise<void> => {
    if (!deviceId) {
      return;
    }

    setIsContentPickerOpen(false);
    try {
      await contentService.attachExisting(deviceId, content.id);
      await loadItems();
      setToastState({ message: 'Content added to device.', type: 'success' });
    } catch (error: unknown) {
      const message = getRequestErrorMessage(error, 'Failed to add content to device.');
      setToastState({ message, type: 'error' });
    }
  };

  const handleOrientationChange = async (nextOrientation: DeviceOrientation): Promise<void> => {
    if (!deviceId) {
      return;
    }

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

  const handleCopyToClipboard = async (value: string): Promise<void> => {
    try {
      await navigator.clipboard.writeText(value);
      setToastState({ message: 'Copied to clipboard.', type: 'success' });
    } catch (_error) {
      setToastState({ message: STRINGS.devices.errorClipboard, type: 'error' });
    }
  };

  const TABS: { key: DeviceDetailTab; label: string }[] = [
    { key: 'CONTENT_SETTINGS', label: 'Content & Settings' },
    { key: 'PLAYLIST', label: 'Playlist' },
    { key: 'ANALYTICS', label: 'Analytics' },
    { key: 'DEVICE_INFO', label: 'Device Info' }
  ];

  return (
    <section className="device-detail-screen">
      <header className="device-detail-screen__header">
        <div className="device-detail-screen__header-top">
          <button
            className="device-detail-screen__back-button"
            type="button"
            onClick={() => {
              navigate('/devices');
            }}
          >
            &larr; Back to Device Fleet
          </button>
          {activeTab === 'DEVICE_INFO' ? (
            <button type="button" className="device-detail-screen__delete-button" onClick={handleOpenDeleteDeviceModal}>
              <TrashIcon /> {STRINGS.devices.detail.deleteDeviceButton}
            </button>
          ) : activeTab === 'ANALYTICS' ? (
            <button type="button" className="device-detail-screen__range-button" disabled>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <rect x="3" y="5" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="2" />
                <path d="M3 9h18M8 3v4M16 3v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              Last 7 Days
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          ) : (
            <span className={`device-detail-screen__status device-detail-screen__status--${(deviceDetail?.status || 'offline').toLowerCase()}`}>
              {deviceDetail?.status || 'OFFLINE'}
            </span>
          )}
        </div>
        <div className="device-detail-screen__identity-row">
          <span className="device-detail-screen__thumbnail" aria-hidden="true">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="3" y="4" width="18" height="12" rx="2" stroke="currentColor" strokeWidth="2" />
              <path d="M8 20h8M12 16v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </span>
          <div>
            {deviceNameState.isEditing ? (
              <div className="device-detail-screen__title-edit">
                <input
                  autoFocus
                  value={deviceNameState.value}
                  placeholder={STRINGS.devices.detail.deviceNamePlaceholder}
                  disabled={deviceNameState.isSaving}
                  onFocus={event => event.target.select()}
                  onChange={event => setDeviceNameState(prev => ({ ...prev, value: event.target.value, error: '' }))}
                  onKeyDown={handleDeviceNameKeyDown}
                />
                <button
                  type="button"
                  className="device-detail-screen__title-edit-save"
                  disabled={deviceNameState.isSaving || !isValidDeviceName(deviceNameState.value)}
                  onClick={handleSaveDeviceName}
                >
                  {deviceNameState.isSaving ? <span className="button-spinner" aria-hidden="true" /> : null}
                  {deviceNameState.isSaving ? STRINGS.devices.detail.deviceNameSaving : STRINGS.devices.detail.deviceNameSaveButton}
                </button>
                <button type="button" disabled={deviceNameState.isSaving} onClick={handleCancelEditDeviceName}>
                  {STRINGS.devices.detail.deviceNameCancelButton}
                </button>
                {deviceNameState.error ? <p className="device-detail-screen__error" role="alert">{deviceNameState.error}</p> : null}
              </div>
            ) : (
              <h1 className="device-detail-screen__title">
                <span className="device-detail-screen__title-text">{deviceDetail?.deviceName || 'Device Workspace'}</span>
                <button
                  type="button"
                  className="device-detail-screen__rename-button"
                  title={STRINGS.devices.detail.deviceNameEditButton}
                  onClick={handleStartEditDeviceName}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                    <path d="M12 20h9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    <path
                      d="M16.5 3.5a1.914 1.914 0 1 1 2.708 2.708L7.7 17.717l-3.75.75.75-3.75L16.5 3.5Z"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </h1>
            )}
            <p>Configure media, playlist sequence, and viewing duration for this screen.</p>
          </div>
        </div>
      </header>

      {errorMessage ? <p className="device-detail-screen__error">{errorMessage}</p> : null}
      {isLoading ? <p className="device-detail-screen__loading">Loading device data...</p> : null}

      <nav className="device-detail-tabs">
        {TABS.map(tab => (
          <button
            type="button"
            key={tab.key}
            className={`device-detail-tabs__tab${activeTab === tab.key ? ' device-detail-tabs__tab--active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {activeTab === 'CONTENT_SETTINGS' ? (
        <section className="device-detail-panel">
          <div className="orientation-card">
            <h3>Screen Orientation</h3>
            <p>Set the display orientation for this device.</p>
            <div className="orientation-card__options">
              {ORIENTATION_OPTIONS.map(option => {
                const isPortraitIcon = option === 'PORTRAIT' || option === 'PORTRAIT_FLIP';
                return (
                  <button
                    type="button"
                    key={option}
                    className={`orientation-option${deviceDetail?.orientation === option ? ' orientation-option--selected' : ''}`}
                    onClick={() => handleOrientationChange(option)}
                  >
                    <span className="orientation-option__radio" aria-hidden="true" />
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                      {isPortraitIcon ? (
                        <rect x="7" y="2" width="10" height="20" rx="2" stroke="currentColor" strokeWidth="2" />
                      ) : (
                        <rect x="2" y="6" width="20" height="12" rx="2" stroke="currentColor" strokeWidth="2" />
                      )}
                    </svg>
                    {getOrientationLabel(option)}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="upload-card">
            <h3>Upload Media</h3>
            <p>Add media to this device or reuse from existing content.</p>
            <div className="upload-card__row">
              <div>
                <label>Media Type</label>
                <select value={uploadType} onChange={event => setUploadType(event.target.value as 'IMAGE' | 'VIDEO')}>
                  <option value="IMAGE">Image</option>
                  <option value="VIDEO">Video</option>
                </select>
              </div>
              {uploadType === 'IMAGE' ? (
                <div>
                  <label>Duration (seconds)</label>
                  <input value={duration} placeholder="10" onChange={event => setDuration(event.target.value.replace(/\D/g, ''))} />
                </div>
              ) : null}
            </div>
            <label>Media File</label>
            <label className="upload-card__dropzone">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <path d="M12 16V4m0 0-4 4m4-4 4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <span>Choose file or drag and drop</span>
              <small>Supports images, videos (MP4, MOV), and more.</small>
              <input type="file" accept={uploadType === 'IMAGE' ? 'image/*' : 'video/*'} onChange={handleUploadMedia} />
            </label>
            <button type="button" className="upload-card__existing-button" onClick={() => setIsContentPickerOpen(true)}>
              Add from Existing Content
            </button>
          </div>

          <p className="device-detail-panel__hint">
            Supported formats: Images: JPG, PNG | Videos: MP4, MOV | Recommended resolution: 1920 x 1080
          </p>
        </section>
      ) : null}

      {activeTab === 'PLAYLIST' ? (
        <section className="device-detail-panel">
          <div className="playlist-panel__header">
            <h3>Playlist Items ({items.length})</h3>
            <button type="button" className="playlist-panel__add-button" onClick={() => setActiveTab('CONTENT_SETTINGS')}>
              + Add Media
            </button>
          </div>

          {items.length === 0 ? (
            <p className="device-detail-panel__empty">No playlist items yet. Add webpage or media content to start playback.</p>
          ) : (
            <div className="playlist-table-wrapper">
              <table className="playlist-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Thumbnail</th>
                    <th>Type</th>
                    <th>File Name</th>
                    <th>Duration</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => (
                    <tr key={item.id}>
                      <td>{index + 1}</td>
                      <td>
                        <ContentThumbnail type={item.type} url={item.url} fileName={item.fileName} hideInfo />
                      </td>
                      <td>
                        <span className="playlist-table__type">{item.type}</span>
                      </td>
                      <td>{item.fileName || '-'}</td>
                      <td>{item.type === 'VIDEO' ? '-' : `${item.duration ?? 10}s`}</td>
                      <td>
                        <div className="playlist-table__actions">
                          <button type="button" aria-label="Move up" disabled={index === 0} onClick={() => moveItem(index, 'UP')}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                              <path d="M12 19V5M5 12l7-7 7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </button>
                          <button type="button" aria-label="Move down" disabled={index === items.length - 1} onClick={() => moveItem(index, 'DOWN')}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                              <path d="M12 5v14M5 12l7 7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </button>
                          <button type="button" aria-label="Edit" onClick={() => handleStartEdit(item)}>
                            <EditIcon />
                          </button>
                          <button type="button" className="playlist-table__delete" aria-label="Delete" onClick={() => handleDelete(item.id)}>
                            <TrashIcon />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ) : null}

      {activeTab === 'ANALYTICS' ? (
        <section className="device-detail-panel">
          {analyticsState.error ? <p className="analytics-panel__error">{analyticsState.error}</p> : null}
          {analyticsState.isLoading ? <p className="analytics-panel__loading">Loading analytics...</p> : null}

          {!analyticsState.isLoading && !analyticsState.data ? (
            <p className="analytics-panel__empty">{STRINGS.devices.detail.analyticsEmptyPrompt}</p>
          ) : null}

          {analyticsState.data ? (
            <>
              <div className="analytics-stat-grid">
                <div className="analytics-stat-grid__item">
                  <span className="analytics-stat-grid__icon analytics-stat-grid__icon--visitors">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                      <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2" />
                      <path d="M4 20c0-4.4 3.6-7 8-7s8 2.6 8 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  </span>
                  <div>
                    <span className="analytics-stat-grid__label">{STRINGS.devices.detail.analyticsTotalUniqueVisitors}</span>
                    <strong>{analyticsState.data.uniqueVisitors}</strong>
                  </div>
                </div>
                <div className="analytics-stat-grid__item">
                  <span className="analytics-stat-grid__icon analytics-stat-grid__icon--watch-time">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
                      <path d="M12 7v5l3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  <div>
                    <span className="analytics-stat-grid__label">{STRINGS.devices.detail.analyticsTotalWatchTime}</span>
                    <strong>{formatWatchTime(analyticsState.data.totalWatchTimeSeconds)}</strong>
                  </div>
                </div>
                <div className="analytics-stat-grid__item">
                  <span className="analytics-stat-grid__icon analytics-stat-grid__icon--average">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                      <path d="M4 11 12 4l8 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M6 10v9a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  <div>
                    <span className="analytics-stat-grid__label">{STRINGS.devices.detail.analyticsAverageWatchTime}</span>
                    <strong>{formatWatchTime(analyticsState.data.averageWatchTimeSeconds)}</strong>
                  </div>
                </div>
                <div className="analytics-stat-grid__item">
                  <span className="analytics-stat-grid__icon analytics-stat-grid__icon--returning">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                      <path
                        d="M4 4v5h5M20 20v-5h-5M5 9a7 7 0 0 1 12.5-3.5M19 15a7 7 0 0 1-12.5 3.5"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                  <div>
                    <span className="analytics-stat-grid__label">{STRINGS.devices.detail.analyticsReturningVisitors}</span>
                    <strong>{analyticsState.data.returningVisitors}</strong>
                  </div>
                </div>
              </div>

              <div className="analytics-chart-grid">
                <div className="analytics-chart-card">
                  <h4 className="analytics-panel__subtitle">{STRINGS.devices.detail.analyticsGenderTitle}</h4>
                  <DonutChart
                    centerLabel={STRINGS.devices.detail.analyticsTotalUniqueVisitors}
                    centerValue={String(analyticsState.data.uniqueVisitors)}
                    segments={[
                      { label: STRINGS.devices.detail.analyticsMale, value: analyticsState.data.genderBreakdown.male, color: '#2563eb' },
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
                      { label: STRINGS.devices.detail.analyticsOneTimeVisitors, value: analyticsState.data.oneTimeVisitors, color: '#2563eb' },
                      { label: STRINGS.devices.detail.analyticsReturningVisitors, value: analyticsState.data.returningVisitors, color: '#16a34a' }
                    ]}
                  />
                </div>

                <div className="analytics-chart-card">
                  <h4 className="analytics-panel__subtitle analytics-panel__subtitle--with-icon">
                    <span className="analytics-panel__subtitle-icon analytics-panel__subtitle-icon--age" aria-hidden="true">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M4 20V10M10 20V4M16 20v-7M22 20v-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                    </span>
                    {STRINGS.devices.detail.analyticsAgeTitle}
                  </h4>
                  {analyticsState.data.ageBuckets.length === 0 ? (
                    <p className="analytics-panel__empty">{STRINGS.devices.detail.analyticsNoAgeData}</p>
                  ) : (
                    <BarChart items={analyticsState.data.ageBuckets.map(bucket => ({ label: bucket.label, value: bucket.count }))} />
                  )}
                </div>

                <div className="tool-card">
                  <h3>{STRINGS.devices.detail.piIdTitle}</h3>
                  <label>{STRINGS.devices.detail.piIdLabel}</label>
                  <input
                    value={piIdState.value}
                    placeholder={STRINGS.devices.detail.piIdPlaceholder}
                    onChange={event => setPiIdState(prev => ({ ...prev, value: event.target.value, error: '' }))}
                  />
                  <button type="button" disabled={piIdState.isSaving} onClick={handleSavePiId}>
                    {piIdState.isSaving ? <span className="button-spinner" aria-hidden="true" /> : null}
                    {piIdState.isSaving ? STRINGS.devices.detail.piIdSaving : STRINGS.devices.detail.piIdSaveButton}
                  </button>
                  {piIdState.error ? <p className="analytics-panel__error">{piIdState.error}</p> : null}
                </div>
              </div>

              <div className="analytics-chart-card analytics-chart-card--full">
                <h4 className="analytics-panel__subtitle analytics-panel__subtitle--with-icon">
                  <span className="analytics-panel__subtitle-icon analytics-panel__subtitle-icon--visitor" aria-hidden="true">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
                      <path d="M12 7v5l3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  {STRINGS.devices.detail.analyticsPerVisitorTitle}
                </h4>
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
              </div>
            </>
          ) : null}
        </section>
      ) : null}

      {activeTab === 'DEVICE_INFO' ? (
        <section className="device-detail-panel device-info-grid">
          <div className="info-card">
            <h3>
              <span className="info-card__icon info-card__icon--status" aria-hidden="true">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="5" y="11" width="14" height="9" rx="2" stroke="currentColor" strokeWidth="2" />
                  <path d="M8 11V7a4 4 0 0 1 8 0v4" stroke="currentColor" strokeWidth="2" />
                </svg>
              </span>
              Device Status
            </h3>
            <dl>
              <div>
                <dt>Status</dt>
                <dd>
                  <span
                    className={`device-detail-screen__status device-detail-screen__status--${(deviceDetail?.status || 'offline').toLowerCase()}`}
                  >
                    {deviceDetail?.status || 'OFFLINE'}
                  </span>
                </dd>
              </div>
              <div>
                <dt>Paired</dt>
                <dd>{deviceDetail?.isPaired ? 'Yes' : 'No'}</dd>
              </div>
              <div>
                <dt>Content Count</dt>
                <dd>{deviceDetail?.contentCount || 0}</dd>
              </div>
              <div>
                <dt>App Version</dt>
                <dd>{deviceDetail?.appVersion || '-'}</dd>
              </div>
            </dl>
          </div>

          <div className="info-card">
            <h3>
              <span className="info-card__icon info-card__icon--identity" aria-hidden="true">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="9" cy="9" r="4" stroke="currentColor" strokeWidth="2" />
                  <path d="M12.5 11.5 20 19M16 15l3-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              Device Identity
            </h3>
            <dl>
              <div>
                <dt>Device ID</dt>
                <dd>
                  {deviceId}
                  <button type="button" aria-label="Copy device ID" onClick={() => handleCopyToClipboard(deviceId)}>
                    <CopyIcon />
                  </button>
                </dd>
              </div>
              <div>
                <dt>Unique ID</dt>
                <dd>
                  {deviceDetail?.deviceUniqueId || '-'}
                  {deviceDetail?.deviceUniqueId ? (
                    <button type="button" aria-label="Copy unique ID" onClick={() => handleCopyToClipboard(deviceDetail.deviceUniqueId)}>
                      <CopyIcon />
                    </button>
                  ) : null}
                </dd>
              </div>
              <div>
                <dt>MAC Address</dt>
                <dd>{deviceDetail?.macAddress || '-'}</dd>
              </div>
            </dl>
          </div>

          <div className="info-card">
            <h3>
              <span className="info-card__icon info-card__icon--activity" aria-hidden="true">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
                  <path d="M12 7v5l3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              Activity
            </h3>
            <dl>
              <div>
                <dt>Last Heartbeat</dt>
                <dd>{formatDateTime(deviceDetail?.lastHeartbeatAt || null)}</dd>
              </div>
              <div>
                <dt>Last Seen</dt>
                <dd>{formatDateTime(deviceDetail?.lastSeen || null)}</dd>
              </div>
              <div>
                <dt>Last Heartbeat IP</dt>
                <dd>{deviceDetail?.lastHeartbeatIpAddress || '-'}</dd>
              </div>
            </dl>
          </div>

          <div className="info-card">
            <h3>
              <span className="info-card__icon info-card__icon--actions" aria-hidden="true">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
                  <path
                    d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.04 1.56V21a2 2 0 1 1-4 0v-.09A1.7 1.7 0 0 0 9 19.35a1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.65 15a1.7 1.7 0 0 0-1.56-1.04H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.65 9a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.65a1.7 1.7 0 0 0 1.04-1.56V3a2 2 0 1 1 4 0v.09A1.7 1.7 0 0 0 15 4.65a1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.35 9a1.7 1.7 0 0 0 1.56 1.04H21a2 2 0 1 1 0 4h-.09A1.7 1.7 0 0 0 19.4 15Z"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              Device Actions
            </h3>
            <button type="button" className="info-card__action-button" onClick={handleStartEditDeviceName}>
              <EditIcon /> Edit Device Name
            </button>
            <button type="button" className="info-card__action-button info-card__action-button--danger" onClick={handleOpenDeleteDeviceModal}>
              <TrashIcon /> {STRINGS.devices.detail.deleteDeviceButton}
            </button>
          </div>
        </section>
      ) : null}

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

      <Modal isOpen={deleteDeviceState.isModalOpen} title={STRINGS.devices.detail.deleteDeviceModalTitle} onClose={handleCloseDeleteDeviceModal}>
        <p>{STRINGS.devices.detail.deleteDeviceModalBody}</p>
        {deleteDeviceState.error ? <p className="device-detail-screen__error" role="alert">{deleteDeviceState.error}</p> : null}
        <div className="modal-actions">
          <button type="button" disabled={deleteDeviceState.isDeleting} onClick={handleCloseDeleteDeviceModal}>
            {STRINGS.devices.detail.deleteDeviceCancelButton}
          </button>
          <button
            type="button"
            className="device-detail-screen__delete-confirm-button"
            disabled={deleteDeviceState.isDeleting}
            onClick={handleConfirmDeleteDevice}
          >
            {deleteDeviceState.isDeleting ? <span className="button-spinner" aria-hidden="true" /> : null}
            {deleteDeviceState.isDeleting ? STRINGS.devices.detail.deleteDeviceDeleting : STRINGS.devices.detail.deleteDeviceConfirmButton}
          </button>
        </div>
      </Modal>

      <ContentPickerModal
        isOpen={isContentPickerOpen}
        onClose={() => setIsContentPickerOpen(false)}
        onSelect={handleAttachExisting}
        attachedContentIds={items.map(item => item.id)}
      />

      {toastState ? (
        <Toast message={toastState.message} type={toastState.type} onClose={() => setToastState(null)} />
      ) : null}
    </section>
  );
};
