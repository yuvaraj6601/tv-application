import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../../store/store';
import { setDevices } from '../../../store/slices/devices.slice';
import { deviceService } from '../../../services/device.service';
import { dashboardSocketService } from '../../../services/socket.service';
import { clearSession } from '../../../store/slices/auth.slice';
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
  const [pairingCode, setPairingCode] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

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

  const handlePairDevice = async (): Promise<void> => {
    if (pairingCode.length !== 4) {
      return;
    }

    try {
      await deviceService.pairByCode(pairingCode);
      setPairingCode('');
      await reloadDevices();
    } catch (_error) {
      setErrorMessage('Pairing failed. Please verify the code.');
    }
  };

  const handleLogout = (): void => {
    dashboardSocketService.disconnect();
    dispatch(clearSession());
    navigate('/login');
  };

  return (
    <section className="devices-screen">
      <header className="devices-screen__header">
        <div className="devices-screen__heading">
          <p className="devices-screen__eyebrow">Digital Signage Control</p>
          <h1>Device Fleet</h1>
          <p>Monitor live status, pair new screens, and open any device to manage playlist content.</p>
        </div>
        <div className="pairing-panel">
          <input
            placeholder="4-digit pairing code"
            value={pairingCode}
            maxLength={4}
            onChange={event => {
              setPairingCode(event.target.value.replace(/\D/g, ''));
            }}
          />
          <button type="button" onClick={handlePairDevice}>
            Pair Device
          </button>
          <button type="button" onClick={handleLogout} className="pairing-panel__logout-button">
            Logout
          </button>
        </div>
      </header>
      <section className="devices-summary">
        <article className="devices-summary__card">
          <span>Total Devices</span>
          <strong>{dashboardSummary.totalDevices}</strong>
        </article>
        <article className="devices-summary__card">
          <span>Online</span>
          <strong>{dashboardSummary.onlineDevices}</strong>
        </article>
        <article className="devices-summary__card">
          <span>Offline</span>
          <strong>{dashboardSummary.offlineDevices}</strong>
        </article>
        <article className="devices-summary__card">
          <span>Paired</span>
          <strong>{dashboardSummary.pairedDevices}</strong>
        </article>
      </section>
      {errorMessage ? <p className="devices-screen__error">{errorMessage}</p> : null}
      {isLoading ? <p className="devices-screen__loading">Loading devices...</p> : null}
      <main className="devices-screen__content">
        {devices.map(device => (
          <article
            className="device-card"
            key={device.id}
            role="button"
            tabIndex={0}
            onClick={() => {
              navigate(`/devices/${device.id}`);
            }}
            onKeyDown={event => {
              if (event.key === 'Enter') {
                navigate(`/devices/${device.id}`);
              }
            }}
          >
            <div className="device-card__top">
              <h3>{device.deviceName}</h3>
              <span className={`device-card__status device-card__status--${device.status.toLowerCase()}`}>{device.status}</span>
            </div>
            <p>Paired: {device.isPaired ? 'Yes' : 'No'}</p>
            <p>Content items: {device.contentCount}</p>
            <p>Last heartbeat: {formatDateTime(device.lastHeartbeatAt)}</p>
            <p>Last seen: {formatDateTime(device.lastSeen)}</p>
            <p>App version: {device.appVersion || '-'}</p>
          </article>
        ))}
      </main>
    </section>
  );
};
