import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ContentLibraryItemModel, DashboardContentType, DeviceContentItemModel, contentService } from '../../../services/content.service';
import { DeviceDetailModel, DeviceOrientation, deviceService } from '../../../services/device.service';
import { DeviceAnalyticsModel } from '../../../interfaces/pi-analytics.interface';
import { Modal } from '../../../components/common/modal/modal.component';
import { MediaViewerModal } from '../../../components/common/media-viewer-modal/media-viewer-modal.component';
import { Pagination } from '../../../components/common/pagination/pagination.component';
import { Toast } from '../../../components/common/toast/toast.component';
import { ContentThumbnail } from '../../../components/common/content-thumbnail/content-thumbnail.component';
import { AddWebpageModal } from '../../../components/common/add-webpage-modal/add-webpage-modal.component';
import { ContentPickerModal } from '../../../components/common/content-picker-modal/content-picker-modal.component';
import { DonutChart } from '../../../components/common/donut-chart/donut-chart.component';
import { VisitorTable } from '../../../components/common/visitor-table/visitor-table.component';
import { BarChart } from '../../../components/common/bar-chart/bar-chart.component';
import { STRINGS } from '../../../constants/strings.constant';
import {
  DEFAULT_DURATION_SECONDS,
  clampDuration,
  formatWatchTime,
  getContentDisplayName,
  getOrientationLabel,
  isValidDeviceName,
  isValidPiId
} from '../../../utils/functions.utils';
import './device-detail.screen.scss';

type DeviceDetailTab = 'PLAYLIST' | 'ANALYTICS' | 'DEVICE_INFO';

interface TableViewState {
  start: number;
  end: number;
  atStart: boolean;
  atEnd: boolean;
}

const EMPTY_TABLE_VIEW: TableViewState = { start: 0, end: 0, atStart: true, atEnd: true };

const isSameTableView = (a: TableViewState, b: TableViewState): boolean =>
  a.start === b.start && a.end === b.end && a.atStart === b.atStart && a.atEnd === b.atEnd;

const measureTableView = (container: HTMLDivElement | null, total: number): TableViewState => {
  if (!container || total === 0) {
    return EMPTY_TABLE_VIEW;
  }

  const bounds = container.getBoundingClientRect();
  const rows = Array.from(container.querySelectorAll<HTMLTableRowElement>('tbody tr:not(.playlist-table__empty-row)'));
  let first = -1;
  let last = -1;
  rows.forEach((row, index) => {
    const rect = row.getBoundingClientRect();
    const center = rect.top + rect.height / 2;
    if (center >= bounds.top && center <= bounds.bottom) {
      first = first === -1 ? index : first;
      last = index;
    }
  });

  return {
    start: first === -1 ? 0 : first + 1,
    end: last === -1 ? 0 : last + 1,
    atStart: container.scrollTop <= 0,
    atEnd: container.scrollTop + container.clientHeight >= container.scrollHeight - 1
  };
};

const PLAYLIST_COLUMN_WIDTHS = ['48px', '90px', '90px', 'auto', '150px', '80px'];
const LIBRARY_COLUMN_WIDTHS = ['90px', '90px', 'auto', '150px', '56px'];

const TableColumns = ({ widths }: { widths: string[] }): React.JSX.Element => (
  <colgroup>
    {widths.map((width, index) => (
      <col key={index} style={{ width }} />
    ))}
  </colgroup>
);

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

const SettingsIcon = (): React.JSX.Element => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
    <path
      d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.04 1.56V21a2 2 0 1 1-4 0v-.09A1.7 1.7 0 0 0 9 19.35a1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.65 15a1.7 1.7 0 0 0-1.56-1.04H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.65 9a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.65a1.7 1.7 0 0 0 1.04-1.56V3a2 2 0 1 1 4 0v.09A1.7 1.7 0 0 0 15 4.65a1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.35 9a1.7 1.7 0 0 0 1.56 1.04H21a2 2 0 1 1 0 4h-.09A1.7 1.7 0 0 0 19.4 15Z"
      stroke="currentColor"
      strokeWidth="1.6"
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
  const [activeTab, setActiveTab] = useState<DeviceDetailTab>('PLAYLIST');
  const [items, setItems] = useState<DeviceContentItemModel[]>([]);
  const [deviceDetail, setDeviceDetail] = useState<DeviceDetailModel | null>(null);
  const [uploadState, setUploadState] = useState<{
    status: 'IDLE' | 'UPLOADING' | 'ERROR';
    progress: number;
    fileName: string;
    error: string;
  }>({
    status: 'IDLE',
    progress: 0,
    fileName: '',
    error: ''
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [durationDrafts, setDurationDrafts] = useState<Record<string, string>>({});
  const [piIdState, setPiIdState] = useState({
    value: '',
    isSaving: false,
    error: ''
  });
  const [settingsState, setSettingsState] = useState<{
    isOpen: boolean;
    name: string;
    orientation: DeviceOrientation;
    isSaving: boolean;
    error: string;
  }>({
    isOpen: false,
    name: '',
    orientation: 'LANDSCAPE',
    isSaving: false,
    error: ''
  });
  const [deleteDeviceState, setDeleteDeviceState] = useState({
    isModalOpen: false,
    isDeleting: false,
    error: ''
  });
  const isDeletingDeviceRef = useRef(false);
  const [toastState, setToastState] = useState<{
    message: string;
    type: 'success' | 'error';
  } | null>(null);
  const [dragState, setDragState] = useState<{ dragId: string | null }>({
    dragId: null
  });
  const dragSnapshotRef = useRef<DeviceContentItemModel[]>([]);
  const isDroppedRef = useRef<boolean>(false);
  const [isDragOverUpload, setIsDragOverUpload] = useState<boolean>(false);
  const [libraryItems, setLibraryItems] = useState<ContentLibraryItemModel[]>([]);
  const [libraryDrag, setLibraryDrag] = useState<{ dragId: string | null; isOverPlaylist: boolean }>({
    dragId: null,
    isOverPlaylist: false
  });
  const [viewerItem, setViewerItem] = useState<{ type: DashboardContentType; url: string; fileName: string | null } | null>(null);
  const [moreMenuItem, setMoreMenuItem] = useState<ContentLibraryItemModel | null>(null);
  const [isLibraryDropActive, setIsLibraryDropActive] = useState<boolean>(false);
  const libraryHoverIndexRef = useRef<number | null>(null);
  const [playlistView, setPlaylistView] = useState<TableViewState>(EMPTY_TABLE_VIEW);
  const [libraryView, setLibraryView] = useState<TableViewState>(EMPTY_TABLE_VIEW);
  const playlistScrollRef = useRef<HTMLDivElement | null>(null);
  const libraryScrollRef = useRef<HTMLDivElement | null>(null);
  const [isAddMediaOpen, setIsAddMediaOpen] = useState<boolean>(false);
  const [webpageState, setWebpageState] = useState({ isOpen: false, isSaving: false, error: '' });
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
      const [response, library] = await Promise.all([contentService.list(deviceId), contentService.listLibrary()]);
      setItems(response);
      setLibraryItems(library);
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
      setAnalyticsState({
        data: null,
        isLoading: false,
        error: STRINGS.devices.detail.analyticsErrorLoad
      });
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
      setPiIdState(prev => ({
        ...prev,
        error: STRINGS.devices.detail.piIdInvalid
      }));
      return;
    }

    setPiIdState(prev => ({ ...prev, isSaving: true, error: '' }));
    try {
      await deviceService.updatePiId(deviceId, trimmedPiId);
      await loadAnalytics();
      setPiIdState(prev => ({ ...prev, isSaving: false }));
      setToastState({
        message: STRINGS.devices.detail.piIdSaveSuccess,
        type: 'success'
      });
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

  const handleOpenSettings = (): void => {
    setSettingsState({
      isOpen: true,
      name: deviceDetail?.deviceName || '',
      orientation: deviceDetail?.orientation || 'LANDSCAPE',
      isSaving: false,
      error: ''
    });
  };

  const handleCloseSettings = (): void => {
    if (settingsState.isSaving) {
      return;
    }

    setSettingsState(prev => ({ ...prev, isOpen: false, error: '' }));
  };

  const handleSaveSettings = async (): Promise<void> => {
    if (!deviceId) {
      return;
    }

    const trimmedName = settingsState.name.trim();
    if (!isValidDeviceName(trimmedName)) {
      setSettingsState(prev => ({
        ...prev,
        error: STRINGS.devices.detail.deviceNameInvalid
      }));
      return;
    }

    const isNameChanged = trimmedName !== (deviceDetail?.deviceName || '');
    const isOrientationChanged = settingsState.orientation !== deviceDetail?.orientation;

    setSettingsState(prev => ({ ...prev, isSaving: true, error: '' }));
    try {
      const updatedName = isNameChanged ? await deviceService.updateDeviceName(deviceId, trimmedName) : trimmedName;
      if (isOrientationChanged) {
        await deviceService.updateOrientation(deviceId, settingsState.orientation);
      }
      setDeviceDetail(prev =>
        prev
          ? {
              ...prev,
              deviceName: updatedName,
              orientation: settingsState.orientation
            }
          : prev
      );
      setSettingsState(prev => ({
        ...prev,
        isOpen: false,
        isSaving: false,
        error: ''
      }));
      setToastState({
        message: STRINGS.devices.detail.settingsSaveSuccess,
        type: 'success'
      });
    } catch (error: unknown) {
      const message = getRequestErrorMessage(error, STRINGS.devices.detail.settingsSaveFailed);
      setSettingsState(prev => ({
        ...prev,
        isSaving: false,
        error: message
      }));
      setToastState({ message, type: 'error' });
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
      setDeleteDeviceState(prev => ({
        ...prev,
        isDeleting: false,
        error: message
      }));
      setToastState({ message, type: 'error' });
    }
  };

  const handleCloseAddMedia = (): void => {
    if (uploadState.status === 'UPLOADING') {
      return;
    }

    setIsAddMediaOpen(false);
    setUploadState({ status: 'IDLE', progress: 0, fileName: '', error: '' });
  };

  const handlePreviewItem = (item: { type: DashboardContentType; url: string; fileName: string | null }): void => {
    if (item.type === 'WEBPAGE') {
      window.open(item.url, '_blank', 'noopener,noreferrer');
      return;
    }
    setViewerItem({ type: item.type, url: item.url, fileName: item.fileName });
  };

  const handleAddWebpage = async (payload: { url: string; duration: number }): Promise<void> => {
    if (!deviceId) {
      return;
    }

    setWebpageState(prev => ({ ...prev, isSaving: true, error: '' }));
    try {
      await contentService.createWebpage(deviceId, payload);
      setWebpageState({ isOpen: false, isSaving: false, error: '' });
      setToastState({ message: 'Webpage added successfully.', type: 'success' });
      await loadItems();
    } catch (error: unknown) {
      setWebpageState(prev => ({ ...prev, isSaving: false, error: getRequestErrorMessage(error, 'Failed to add webpage.') }));
    }
  };

  const handleUploadFiles = async (fileList: FileList | null | undefined): Promise<void> => {
    const files = Array.from(fileList ?? []);
    if (!deviceId || files.length === 0) {
      return;
    }

    if (files.some(file => !file.type.startsWith('image/') && !file.type.startsWith('video/'))) {
      setUploadState({
        status: 'ERROR',
        progress: 0,
        fileName: '',
        error: STRINGS.devices.detail.uploadInvalidType
      });
      return;
    }

    let uploadedCount = 0;
    try {
      for (const file of files) {
        const isImage = file.type.startsWith('image/');
        const label = files.length > 1 ? `${file.name} (${uploadedCount + 1} of ${files.length})` : file.name;
        setUploadState({
          status: 'UPLOADING',
          progress: Math.round((uploadedCount / files.length) * 100),
          fileName: label,
          error: ''
        });
        await contentService.uploadMedia(
          deviceId,
          {
            type: isImage ? 'IMAGE' : 'VIDEO',
            file,
            duration: isImage ? DEFAULT_DURATION_SECONDS : undefined
          },
          percent =>
            setUploadState(prev => ({
              ...prev,
              progress: Math.round(((uploadedCount + percent / 100) / files.length) * 100)
            }))
        );
        uploadedCount += 1;
      }
      setIsAddMediaOpen(false);
      setUploadState({ status: 'IDLE', progress: 0, fileName: '', error: '' });
      setToastState({
        message: uploadedCount > 1 ? `${uploadedCount} files uploaded successfully.` : 'File uploaded successfully.',
        type: 'success'
      });
    } catch (error: unknown) {
      const message = getRequestErrorMessage(error, STRINGS.devices.detail.uploadFailed);
      setUploadState({
        status: 'ERROR',
        progress: 0,
        fileName: '',
        error: message
      });
    }

    await loadItems();
  };

  const handleUploadMedia = async (event: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const files = event.target.files;
    await handleUploadFiles(files);
    event.target.value = '';
  };

  const handleDropMedia = async (event: React.DragEvent<HTMLLabelElement>): Promise<void> => {
    event.preventDefault();
    setIsDragOverUpload(false);
    await handleUploadFiles(event.dataTransfer.files);
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

  const handleDropPlaylistItemOnLibrary = async (): Promise<void> => {
    const contentId = dragState.dragId;
    isDroppedRef.current = true;
    setDragState({ dragId: null });
    setIsLibraryDropActive(false);
    if (contentId) {
      await handleDelete(contentId);
    }
  };

  const playlistContentIds = new Set(items.map(item => item.id));
  const availableLibraryItems = libraryItems.filter(item => !playlistContentIds.has(item.id));

  const handleAddLibraryItemToPlaylist = async (contentId: string, insertIndex: number | null): Promise<void> => {
    if (!deviceId) {
      return;
    }

    try {
      await contentService.attachExisting(deviceId, contentId);
      if (insertIndex !== null) {
        const updated = await contentService.list(deviceId);
        const ids = updated.map(item => item.id).filter(id => id !== contentId);
        ids.splice(insertIndex, 0, contentId);
        await contentService.reorder(deviceId, ids);
      }
      await loadItems();
      setToastState({ message: 'Content added to playlist.', type: 'success' });
    } catch (error: unknown) {
      const message = getRequestErrorMessage(error, 'Failed to add content to playlist.');
      setToastState({ message, type: 'error' });
      await loadItems();
    }
  };

  const handleDropLibraryItem = async (): Promise<void> => {
    const contentId = libraryDrag.dragId;
    const insertIndex = libraryHoverIndexRef.current;
    libraryHoverIndexRef.current = null;
    setLibraryDrag({ dragId: null, isOverPlaylist: false });
    if (contentId) {
      await handleAddLibraryItemToPlaylist(contentId, insertIndex);
    }
  };

  const handleMoveToPlaylist = async (): Promise<void> => {
    const target = moreMenuItem;
    setMoreMenuItem(null);
    if (target) {
      await handleAddLibraryItemToPlaylist(target.id, null);
    }
  };

  const refreshTableViews = (): void => {
    const nextPlaylistView = measureTableView(playlistScrollRef.current, items.length);
    const nextLibraryView = measureTableView(libraryScrollRef.current, availableLibraryItems.length);
    setPlaylistView(prev => (isSameTableView(prev, nextPlaylistView) ? prev : nextPlaylistView));
    setLibraryView(prev => (isSameTableView(prev, nextLibraryView) ? prev : nextLibraryView));
  };

  useLayoutEffect(() => {
    refreshTableViews();
    window.addEventListener('resize', refreshTableViews);
    return () => window.removeEventListener('resize', refreshTableViews);
  });

  const handleScrollTable = (container: HTMLDivElement | null, direction: 'UP' | 'DOWN'): void => {
    if (!container) {
      return;
    }

    container.scrollBy({ top: (direction === 'DOWN' ? 1 : -1) * container.clientHeight * 0.9, behavior: 'smooth' });
  };

  const handleCommitDuration = async (item: DeviceContentItemModel): Promise<void> => {
    const draft = durationDrafts[item.id];
    if (draft === undefined) {
      return;
    }

    setDurationDrafts(prev => {
      const { [item.id]: _removed, ...rest } = prev;
      return rest;
    });

    const nextDuration = clampDuration(draft);
    if (!deviceId || nextDuration === (item.duration ?? 10)) {
      return;
    }

    const previousItems = items;
    setItems(prev => prev.map(row => (row.id === item.id ? { ...row, duration: nextDuration } : row)));
    try {
      await contentService.updateDuration(deviceId, item.id, nextDuration);
    } catch (_error) {
      setItems(previousItems);
      setErrorMessage('Failed to update content.');
    }
  };

  const handleDragStartItem = (itemId: string): void => {
    isDroppedRef.current = false;
    dragSnapshotRef.current = items;
    setDragState({ dragId: itemId });
  };

  const handleDragOverItem = (targetId: string): void => {
    const sourceId = dragState.dragId;
    if (!sourceId || sourceId === targetId) {
      return;
    }

    const fromIndex = items.findIndex(item => item.id === sourceId);
    const toIndex = items.findIndex(item => item.id === targetId);
    if (fromIndex < 0 || toIndex < 0) {
      return;
    }

    const nextList = [...items];
    const [moved] = nextList.splice(fromIndex, 1);
    nextList.splice(toIndex, 0, moved);
    setItems(nextList);
  };

  const handleDragEndItem = (): void => {
    setIsLibraryDropActive(false);
    setDragState({ dragId: null });
    if (!isDroppedRef.current) {
      setItems(dragSnapshotRef.current);
    }
  };

  const handleDropItem = async (): Promise<void> => {
    isDroppedRef.current = true;
    setDragState({ dragId: null });
    const previousItems = dragSnapshotRef.current;
    const unchanged = previousItems.length === items.length && previousItems.every((item, index) => item.id === items[index].id);
    if (!deviceId || unchanged) {
      return;
    }

    try {
      await contentService.reorder(
        deviceId,
        items.map(item => item.id)
      );
      await loadItems();
    } catch (_error) {
      setItems(previousItems);
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
          ) : null}
        </div>
        <div className="device-detail-screen__identity-row">
          <span className="device-detail-screen__thumbnail" aria-hidden="true">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="3" y="4" width="18" height="12" rx="2" stroke="currentColor" strokeWidth="2" />
              <path d="M8 20h8M12 16v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </span>
          <div>
            <h1 className="device-detail-screen__title">
              <span className="device-detail-screen__title-text">{deviceDetail?.deviceName || 'Device Workspace'}</span>
            </h1>
            <span
              className={`device-detail-screen__status device-detail-screen__status--${(deviceDetail?.status || 'offline').toLowerCase()}`}
            >
              {deviceDetail?.status || 'OFFLINE'}
            </span>
          </div>
          <button
            type="button"
            className="device-detail-screen__settings-button"
            title={STRINGS.devices.detail.settingsButton}
            aria-label={STRINGS.devices.detail.settingsButton}
            onClick={handleOpenSettings}
          >
            <SettingsIcon /> <span className="device-detail-screen__settings-label">{STRINGS.devices.detail.settingsButton}</span>
          </button>
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

      {activeTab === 'PLAYLIST' ? (
        <section className="device-detail-panel">
          <div className="playlist-layout">
            <div
              className={`playlist-layout__column playlist-layout__column--playlist${
                libraryDrag.dragId && libraryDrag.isOverPlaylist ? ' playlist-layout__column--drop-active' : ''
              }`}
              onDragOver={event => {
                if (!libraryDrag.dragId) {
                  return;
                }
                event.preventDefault();
                if (!libraryDrag.isOverPlaylist) {
                  setLibraryDrag(prev => ({ ...prev, isOverPlaylist: true }));
                }
              }}
              onDragLeave={event => {
                if (libraryDrag.dragId && !(event.relatedTarget instanceof Node && event.currentTarget.contains(event.relatedTarget))) {
                  libraryHoverIndexRef.current = null;
                  setLibraryDrag(prev => ({ ...prev, isOverPlaylist: false }));
                }
              }}
              onDrop={event => {
                if (!libraryDrag.dragId) {
                  return;
                }
                event.preventDefault();
                handleDropLibraryItem().catch(() => undefined);
              }}
            >
              <div className="playlist-panel__header">
                <h3>Playlist Items ({items.length})</h3>
              </div>

              {
                <div className="playlist-table-wrapper">
                  <table className="playlist-table playlist-table--head playlist-table--playlist">
                    <TableColumns widths={PLAYLIST_COLUMN_WIDTHS} />
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Thumbnail</th>
                        <th>Type</th>
                        <th>File Name</th>
                        <th>Duration (seconds)</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                  </table>
                  <div className="playlist-table-scroll" ref={playlistScrollRef} onScroll={refreshTableViews}>
                    <table className="playlist-table playlist-table--playlist">
                      <TableColumns widths={PLAYLIST_COLUMN_WIDTHS} />
                      <tbody>
                        {items.length === 0 ? (
                          <tr className="playlist-table__empty-row">
                            <td colSpan={6}>No playlist items yet. Add media content to start playback.</td>
                          </tr>
                        ) : null}
                        {items.map((item, index) => {
                          return (
                            <tr
                              key={item.id}
                              draggable
                              className={`playlist-table__row${dragState.dragId === item.id ? ' playlist-table__row--dragging' : ''}`}
                              onDragStart={() => handleDragStartItem(item.id)}
                              onDragOver={event => {
                                event.preventDefault();
                                if (libraryDrag.dragId) {
                                  libraryHoverIndexRef.current = index;
                                  return;
                                }
                                handleDragOverItem(item.id);
                              }}
                              onDrop={event => {
                                event.preventDefault();
                                if (libraryDrag.dragId) {
                                  return;
                                }
                                handleDropItem().catch(() => undefined);
                              }}
                              onDragEnd={handleDragEndItem}
                            >
                              <td>{index + 1}</td>
                              <td>
                                <button
                                  type="button"
                                  className="playlist-table__thumb-button"
                                  aria-label={`View ${item.fileName || 'media'}`}
                                  onClick={() => handlePreviewItem(item)}
                                >
                                  <ContentThumbnail type={item.type} url={item.url} fileName={item.fileName} hideInfo />
                                </button>
                              </td>
                              <td>
                                <span className="playlist-table__type">{item.type}</span>
                              </td>
                              <td>{getContentDisplayName(item.fileName, item.url, item.type)}</td>
                              <td>
                                {item.type === 'VIDEO' ? (
                                  '-'
                                ) : (
                                  <input
                                    className="playlist-table__duration-input"
                                    inputMode="numeric"
                                    maxLength={4}
                                    aria-label="Duration in seconds"
                                    value={durationDrafts[item.id] ?? String(item.duration ?? 10)}
                                    onChange={event => {
                                      const value = event.target.value.replace(/\D/g, '');
                                      setDurationDrafts(prev => ({
                                        ...prev,
                                        [item.id]: value
                                      }));
                                    }}
                                    onBlur={() => {
                                      handleCommitDuration(item).catch(() => undefined);
                                    }}
                                    onKeyDown={event => {
                                      if (event.key === 'Enter') {
                                        event.currentTarget.blur();
                                      }
                                    }}
                                  />
                                )}
                              </td>
                              <td>
                                <div className="playlist-table__actions">
                                  <button
                                    type="button"
                                    className="playlist-table__delete"
                                    aria-label="Delete"
                                    onClick={() => handleDelete(item.id)}
                                  >
                                    <TrashIcon />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              }
              <Pagination
                start={playlistView.start}
                end={playlistView.end}
                total={items.length}
                canPrevious={!playlistView.atStart}
                canNext={!playlistView.atEnd}
                onPrevious={() => handleScrollTable(playlistScrollRef.current, 'UP')}
                onNext={() => handleScrollTable(playlistScrollRef.current, 'DOWN')}
              />
            </div>

            <div
              className={`playlist-layout__column${dragState.dragId && isLibraryDropActive ? ' playlist-layout__column--drop-active' : ''}`}
              onDragOver={event => {
                if (!dragState.dragId) {
                  return;
                }
                event.preventDefault();
                if (!isLibraryDropActive) {
                  setIsLibraryDropActive(true);
                }
              }}
              onDragLeave={event => {
                if (dragState.dragId && !(event.relatedTarget instanceof Node && event.currentTarget.contains(event.relatedTarget))) {
                  setIsLibraryDropActive(false);
                }
              }}
              onDrop={event => {
                if (!dragState.dragId) {
                  return;
                }
                event.preventDefault();
                handleDropPlaylistItemOnLibrary().catch(() => undefined);
              }}
            >
              <div className="playlist-panel__header">
                <h3>Content Library ({availableLibraryItems.length})</h3>
                <div className="playlist-panel__actions">
                <button
                  type="button"
                  className="playlist-panel__add-button playlist-panel__add-button--secondary"
                  onClick={() => setWebpageState({ isOpen: true, isSaving: false, error: '' })}
                >
                  + Add Webpage
                </button>
                <button
                  type="button"
                  className="playlist-panel__add-button"
                  onClick={() => {
                    setUploadState({
                      status: 'IDLE',
                      progress: 0,
                      fileName: '',
                      error: ''
                    });
                    setIsAddMediaOpen(true);
                  }}
                >
                  + Add Media
                </button>
                </div>
              </div>

              {
                <div className="playlist-table-wrapper">
                  <table className="playlist-table playlist-table--head playlist-table--library">
                    <TableColumns widths={LIBRARY_COLUMN_WIDTHS} />
                    <thead>
                      <tr>
                        <th>Thumbnail</th>
                        <th>Type</th>
                        <th>File Name</th>
                        <th>Duration (seconds)</th>
                        <th aria-label="More" />
                      </tr>
                    </thead>
                  </table>
                  <div className="playlist-table-scroll" ref={libraryScrollRef} onScroll={refreshTableViews}>
                    <table className="playlist-table playlist-table--library">
                      <TableColumns widths={LIBRARY_COLUMN_WIDTHS} />
                      <tbody>
                        {availableLibraryItems.length === 0 ? (
                          <tr className="playlist-table__empty-row">
                            <td colSpan={5}>
                              {libraryItems.length === 0
                                ? 'No media in the content library yet.'
                                : 'All library media is already in the playlist.'}
                            </td>
                          </tr>
                        ) : null}
                        {availableLibraryItems.map(item => (
                          <tr
                            key={item.id}
                            draggable
                            className={`playlist-table__row${libraryDrag.dragId === item.id ? ' playlist-table__row--dragging' : ''}`}
                            onDragStart={() => {
                              libraryHoverIndexRef.current = null;
                              setLibraryDrag({ dragId: item.id, isOverPlaylist: false });
                            }}
                            onDragEnd={() => {
                              libraryHoverIndexRef.current = null;
                              setLibraryDrag({ dragId: null, isOverPlaylist: false });
                            }}
                          >
                            <td>
                              <button
                                  type="button"
                                  className="playlist-table__thumb-button"
                                  aria-label={`View ${item.fileName || 'media'}`}
                                  onClick={() => handlePreviewItem(item)}
                                >
                                  <ContentThumbnail type={item.type} url={item.url} fileName={item.fileName} hideInfo />
                                </button>
                            </td>
                            <td>
                              <span className="playlist-table__type">{item.type}</span>
                            </td>
                            <td>{getContentDisplayName(item.fileName, item.url, item.type)}</td>
                            <td>{item.type === 'VIDEO' ? '-' : (item.duration ?? 10)}</td>
                            <td>
                              <button
                                type="button"
                                className="playlist-table__more-button"
                                aria-label={`More options for ${item.fileName || 'content'}`}
                                onClick={() => setMoreMenuItem(item)}
                              >
                                &#8943;
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              }
              <Pagination
                start={libraryView.start}
                end={libraryView.end}
                total={availableLibraryItems.length}
                canPrevious={!libraryView.atStart}
                canNext={!libraryView.atEnd}
                onPrevious={() => handleScrollTable(libraryScrollRef.current, 'UP')}
                onNext={() => handleScrollTable(libraryScrollRef.current, 'DOWN')}
              />
            </div>
          </div>
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
                      <path
                        d="M6 10v9a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-9"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
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
                      {
                        label: STRINGS.devices.detail.analyticsMale,
                        value: analyticsState.data.genderBreakdown.male,
                        color: '#2563eb'
                      },
                      {
                        label: STRINGS.devices.detail.analyticsFemale,
                        value: analyticsState.data.genderBreakdown.female,
                        color: '#e879a6'
                      },
                      {
                        label: STRINGS.devices.detail.analyticsUnknown,
                        value: analyticsState.data.genderBreakdown.unknown,
                        color: '#cbd5e1'
                      }
                    ]}
                  />
                </div>

                <div className="analytics-chart-card">
                  <h4 className="analytics-panel__subtitle">{STRINGS.devices.detail.analyticsVisitTypeTitle}</h4>
                  <DonutChart
                    centerLabel={STRINGS.devices.detail.analyticsTotalUniqueVisitors}
                    centerValue={String(analyticsState.data.uniqueVisitors)}
                    segments={[
                      {
                        label: STRINGS.devices.detail.analyticsOneTimeVisitors,
                        value: analyticsState.data.oneTimeVisitors,
                        color: '#2563eb'
                      },
                      {
                        label: STRINGS.devices.detail.analyticsReturningVisitors,
                        value: analyticsState.data.returningVisitors,
                        color: '#16a34a'
                      }
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
                    <BarChart
                      items={analyticsState.data.ageBuckets.map(bucket => ({
                        label: bucket.label,
                        value: bucket.count
                      }))}
                    />
                  )}
                </div>

                <div className="tool-card">
                  <h3>{STRINGS.devices.detail.piIdTitle}</h3>
                  <label>{STRINGS.devices.detail.piIdLabel}</label>
                  <input
                    value={piIdState.value}
                    placeholder={STRINGS.devices.detail.piIdPlaceholder}
                    onChange={event =>
                      setPiIdState(prev => ({
                        ...prev,
                        value: event.target.value,
                        error: ''
                      }))
                    }
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
                <VisitorTable deviceId={deviceId} />
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
            <button type="button" className="info-card__action-button" onClick={handleOpenSettings}>
              <EditIcon /> Edit Device Name
            </button>
            <button
              type="button"
              className="info-card__action-button info-card__action-button--danger"
              onClick={handleOpenDeleteDeviceModal}
            >
              <TrashIcon /> {STRINGS.devices.detail.deleteDeviceButton}
            </button>
          </div>
        </section>
      ) : null}

      <AddWebpageModal
        isOpen={webpageState.isOpen}
        isSaving={webpageState.isSaving}
        error={webpageState.error}
        onClose={() => setWebpageState(prev => ({ ...prev, isOpen: false }))}
        onSubmit={payload => {
          handleAddWebpage(payload).catch(() => undefined);
        }}
      />

      <Modal isOpen={isAddMediaOpen} title="Add Media" onClose={handleCloseAddMedia}>
        <div className="upload-modal">
          {uploadState.status === 'UPLOADING' ? (
            <div className="upload-modal__progress">
              <p>Uploading {uploadState.fileName}</p>
              <div
                className="upload-modal__bar"
                role="progressbar"
                aria-valuenow={uploadState.progress}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div className="upload-modal__bar-fill" style={{ width: `${uploadState.progress}%` }} />
              </div>
              <span>{uploadState.progress}%</span>
            </div>
          ) : null}

          {uploadState.status === 'ERROR' ? (
            <p className="device-detail-screen__error" role="alert">
              {uploadState.error}
            </p>
          ) : null}

          {uploadState.status !== 'UPLOADING' ? (
            <label
              className={`upload-card__dropzone upload-modal__dropzone${isDragOverUpload ? ' upload-modal__dropzone--active' : ''}`}
              onDragOver={event => {
                event.preventDefault();
                setIsDragOverUpload(true);
              }}
              onDragLeave={() => setIsDragOverUpload(false)}
              onDrop={event => {
                handleDropMedia(event).catch(() => undefined);
              }}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <path d="M12 16V4m0 0-4 4m4-4 4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <span>Choose files or drag and drop</span>
              <small>Supports multiple images and videos only.</small>
              <input type="file" multiple accept="image/*,video/*" onChange={handleUploadMedia} />
            </label>
          ) : null}
        </div>
      </Modal>

      {viewerItem ? (
        <MediaViewerModal isOpen type={viewerItem.type} url={viewerItem.url} fileName={viewerItem.fileName} onClose={() => setViewerItem(null)} />
      ) : null}

      <Modal isOpen={moreMenuItem !== null} title={moreMenuItem ? getContentDisplayName(moreMenuItem.fileName, moreMenuItem.url, moreMenuItem.type) : 'Content'} onClose={() => setMoreMenuItem(null)}>
        <button
          type="button"
          className="playlist-table__menu-action"
          onClick={() => {
            handleMoveToPlaylist().catch(() => undefined);
          }}
        >
          Move to playlist
        </button>
      </Modal>

      <Modal isOpen={settingsState.isOpen} title={STRINGS.devices.detail.settingsModalTitle} onClose={handleCloseSettings}>
        <label>{STRINGS.devices.detail.deviceNameLabel}</label>
        <input
          autoFocus
          value={settingsState.name}
          placeholder={STRINGS.devices.detail.deviceNamePlaceholder}
          disabled={settingsState.isSaving}
          onChange={event =>
            setSettingsState(prev => ({
              ...prev,
              name: event.target.value,
              error: ''
            }))
          }
        />
        <label>Screen Orientation</label>
        <div className="orientation-card__options">
          {ORIENTATION_OPTIONS.map(option => {
            const isPortraitIcon = option === 'PORTRAIT' || option === 'PORTRAIT_FLIP';
            return (
              <button
                type="button"
                key={option}
                disabled={settingsState.isSaving}
                className={`orientation-option${settingsState.orientation === option ? ' orientation-option--selected' : ''}`}
                onClick={() => setSettingsState(prev => ({ ...prev, orientation: option }))}
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
        {settingsState.error ? (
          <p className="device-detail-screen__error" role="alert">
            {settingsState.error}
          </p>
        ) : null}
        <div className="modal-actions">
          <button type="button" disabled={settingsState.isSaving} onClick={handleCloseSettings}>
            {STRINGS.devices.detail.deviceNameCancelButton}
          </button>
          <button
            type="button"
            className="primary"
            disabled={settingsState.isSaving || !isValidDeviceName(settingsState.name)}
            onClick={handleSaveSettings}
          >
            {settingsState.isSaving ? <span className="button-spinner" aria-hidden="true" /> : null}
            {settingsState.isSaving ? STRINGS.devices.detail.deviceNameSaving : STRINGS.devices.detail.deviceNameSaveButton}
          </button>
        </div>
      </Modal>

      <Modal
        isOpen={deleteDeviceState.isModalOpen}
        title={STRINGS.devices.detail.deleteDeviceModalTitle}
        onClose={handleCloseDeleteDeviceModal}
      >
        <p>{STRINGS.devices.detail.deleteDeviceModalBody}</p>
        {deleteDeviceState.error ? (
          <p className="device-detail-screen__error" role="alert">
            {deleteDeviceState.error}
          </p>
        ) : null}
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

      {toastState ? <Toast message={toastState.message} type={toastState.type} onClose={() => setToastState(null)} /> : null}
    </section>
  );
};
