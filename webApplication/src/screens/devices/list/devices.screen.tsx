import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../../store/store';
import { setDevices } from '../../../store/slices/devices.slice';
import { deviceService } from '../../../services/device.service';
import { dashboardSocketService } from '../../../services/socket.service';
import { Modal } from '../../../components/common/modal/modal.component';
import { DeviceSortBy, DeviceStatusFilter, filterAndSortDevices } from '../../../utils/functions.utils';
import './devices.screen.scss';

const formatDateTime = (value: string | null): string => {
  if (!value) {
    return '-';
  }

  return new Date(value).toLocaleString();
};

export const DevicesScreen = (): React.JSX.Element => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const devices = useSelector((state: RootState) => state.devices.list);
  const token = useSelector((state: RootState) => state.auth.token);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<DeviceStatusFilter>('ALL');
  const [sortBy, setSortBy] = useState<DeviceSortBy>('LAST_SEEN');
  const [pairingState, setPairingState] = useState({ isModalOpen: false, code: '', isSaving: false, error: '' });

  const dashboardSummary = useMemo(() => {
    const onlineCount = devices.filter(device => device.status === 'ONLINE').length;
    const pairedCount = devices.filter(device => device.isPaired).length;

    return {
      totalDevices: devices.length,
      onlineDevices: onlineCount,
      offlineDevices: devices.length - onlineCount,
      pairedDevices: pairedCount
    };
  }, [devices]);

  const visibleDevices = useMemo(
    () => filterAndSortDevices(devices, { statusFilter, searchTerm, sortBy }),
    [devices, statusFilter, searchTerm, sortBy]
  );

  const reloadDevices = async (): Promise<void> => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      const list = await deviceService.list();
      dispatch(setDevices(list));
    } catch (_error) {
      setErrorMessage('Failed to load devices.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    reloadDevices().catch(() => undefined);
  }, [dispatch]);

  useEffect(() => {
    if (!token) {
      return;
    }

    const socket = dashboardSocketService.connect(token);
    const reload = (): void => {
      reloadDevices().catch(() => undefined);
    };

    socket.on('deviceStatusChanged', reload);
    socket.on('devicePaired', reload);
    socket.on('contentUpdated', reload);

    return () => {
      socket.off('deviceStatusChanged', reload);
      socket.off('devicePaired', reload);
      socket.off('contentUpdated', reload);
    };
  }, [dispatch, token]);

  const handleOpenPairingModal = (): void => {
    setPairingState({ isModalOpen: true, code: '', isSaving: false, error: '' });
  };

  const handleClosePairingModal = (): void => {
    if (pairingState.isSaving) {
      return;
    }

    setPairingState({ isModalOpen: false, code: '', isSaving: false, error: '' });
  };

  const handlePairDevice = async (): Promise<void> => {
    if (pairingState.code.length !== 4) {
      setPairingState(prev => ({ ...prev, error: 'Enter the 4-digit pairing code.' }));
      return;
    }

    setPairingState(prev => ({ ...prev, isSaving: true, error: '' }));
    try {
      await deviceService.pairByCode(pairingState.code);
      await reloadDevices();
      setPairingState({ isModalOpen: false, code: '', isSaving: false, error: '' });
    } catch (_error) {
      setPairingState(prev => ({ ...prev, isSaving: false, error: 'Pairing failed. Please verify the code.' }));
    }
  };

  return (
    <section className="devices-screen">
      <header className="devices-screen__header">
        <div className="devices-screen__heading">
          <p className="devices-screen__eyebrow">Digital Signage Control</p>
          <h1>Device Fleet</h1>
          <p>Monitor live status, pair new screens, and manage devices across your network.</p>
        </div>
      </header>

      <section className="devices-summary">
        <article className="devices-summary__card">
          <span className="devices-summary__icon devices-summary__icon--total">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <rect x="3" y="4" width="18" height="12" rx="2" stroke="currentColor" strokeWidth="2" />
              <path d="M8 20h8M12 16v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </span>
          <div>
            <span className="devices-summary__label">Total Devices</span>
            <strong>{dashboardSummary.totalDevices}</strong>
          </div>
        </article>
        <article className="devices-summary__card">
          <span className="devices-summary__icon devices-summary__icon--online">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path d="M12 3l7 3v5c0 4.5-3 8-7 9-4-1-7-4.5-7-9V6l7-3Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
              <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <div>
            <span className="devices-summary__label">Online</span>
            <strong>{dashboardSummary.onlineDevices}</strong>
          </div>
        </article>
        <article className="devices-summary__card">
          <span className="devices-summary__icon devices-summary__icon--offline">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path d="M12 3l7 3v5c0 4.5-3 8-7 9-4-1-7-4.5-7-9V6l7-3Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
              <path d="M12 8v5M12 16h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </span>
          <div>
            <span className="devices-summary__label">Offline</span>
            <strong>{dashboardSummary.offlineDevices}</strong>
          </div>
        </article>
        <article className="devices-summary__card">
          <span className="devices-summary__icon devices-summary__icon--paired">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path
                d="M9 15l6-6M9 9h.01M15 15h.01M7 5l-2 2a4 4 0 0 0 0 6l1 1M17 19l2-2a4 4 0 0 0 0-6l-1-1"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <div>
            <span className="devices-summary__label">Paired</span>
            <strong>{dashboardSummary.pairedDevices}</strong>
          </div>
        </article>
      </section>

      <section className="devices-toolbar">
        <select value={statusFilter} onChange={event => setStatusFilter(event.target.value as DeviceStatusFilter)}>
          <option value="ALL">All Status</option>
          <option value="ONLINE">Online</option>
          <option value="OFFLINE">Offline</option>
        </select>
        <div className="devices-toolbar__search">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
            <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <input
            placeholder="Search by device name or ID..."
            value={searchTerm}
            onChange={event => setSearchTerm(event.target.value)}
          />
        </div>
        <select value={sortBy} onChange={event => setSortBy(event.target.value as DeviceSortBy)}>
          <option value="LAST_SEEN">Sort: Last Seen</option>
          <option value="NAME">Sort: Name</option>
        </select>
      </section>

      {errorMessage ? <p className="devices-screen__error">{errorMessage}</p> : null}
      {isLoading ? <p className="devices-screen__loading">Loading devices...</p> : null}
      {!isLoading && !errorMessage && devices.length > 0 && visibleDevices.length === 0 ? (
        <p className="devices-screen__empty">No devices match your filters.</p>
      ) : null}

      <main className="devices-screen__content">
        {visibleDevices.map(device => (
          <article className="device-row" key={device.id}>
            <div
              className="device-row__thumbnail"
              role="button"
              tabIndex={0}
              onClick={() => navigate(`/devices/${device.id}`)}
              onKeyDown={event => {
                if (event.key === 'Enter') {
                  navigate(`/devices/${device.id}`);
                }
              }}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <rect x="3" y="4" width="18" height="12" rx="2" stroke="currentColor" strokeWidth="2" />
                <path d="M8 20h8M12 16v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
            <div className="device-row__body">
              <div className="device-row__top">
                <h3>{device.deviceName}</h3>
                <span className={`device-row__status device-row__status--${device.status.toLowerCase()}`}>{device.status}</span>
              </div>
              <ul className="device-row__details">
                <li>Paired: {device.isPaired ? 'Yes' : 'No'}</li>
                <li>Content items: {device.contentCount}</li>
                <li>Last heartbeat: {formatDateTime(device.lastHeartbeatAt)}</li>
                <li>Last seen: {formatDateTime(device.lastSeen)}</li>
                <li>App version: {device.appVersion || '-'}</li>
              </ul>
              <div className="device-row__footer">
                <button type="button" className="device-row__view-button" onClick={() => navigate(`/devices/${device.id}`)}>
                  View Details
                </button>
              </div>
            </div>
          </article>
        ))}

        <article className="pair-device-card" role="button" tabIndex={0} onClick={handleOpenPairingModal} onKeyDown={event => {
          if (event.key === 'Enter') {
            handleOpenPairingModal();
          }
        }}>
          <span className="pair-device-card__icon">+</span>
          <h3>Pair a New Device</h3>
          <p>Add and configure a new display device to your network.</p>
        </article>
      </main>

      <Modal isOpen={pairingState.isModalOpen} title="Pair Device" onClose={handleClosePairingModal}>
        <label>4-digit pairing code</label>
        <input
          autoFocus
          placeholder="0000"
          maxLength={4}
          value={pairingState.code}
          disabled={pairingState.isSaving}
          onChange={event => setPairingState(prev => ({ ...prev, code: event.target.value.replace(/\D/g, ''), error: '' }))}
        />
        {pairingState.error ? <p className="devices-screen__error" role="alert">{pairingState.error}</p> : null}
        <div className="modal-actions">
          <button type="button" disabled={pairingState.isSaving} onClick={handleClosePairingModal}>
            Cancel
          </button>
          <button type="button" className="primary" disabled={pairingState.isSaving} onClick={handlePairDevice}>
            {pairingState.isSaving ? 'Pairing...' : 'Pair Device'}
          </button>
        </div>
      </Modal>
    </section>
  );
};
