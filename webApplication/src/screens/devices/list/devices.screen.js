import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { setDevices } from '../../../store/slices/devices.slice';
import { deviceService } from '../../../services/device.service';
import { dashboardSocketService } from '../../../services/socket.service';
import { clearSession } from '../../../store/slices/auth.slice';
import './devices.screen.scss';
const formatDateTime = (value) => {
    if (!value) {
        return '-';
    }
    return new Date(value).toLocaleString();
};
export const DevicesScreen = () => {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const devices = useSelector((state) => state.devices.list);
    const token = useSelector((state) => state.auth.token);
    const [pairingCode, setPairingCode] = useState('');
    const [testingCodes, setTestingCodes] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isGeneratingCodes, setIsGeneratingCodes] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
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
    const reloadDevices = async () => {
        setIsLoading(true);
        setErrorMessage('');
        try {
            const list = await deviceService.list();
            dispatch(setDevices(list));
            try {
                const codes = await deviceService.getTestingPairingCodes();
                setTestingCodes(codes);
            }
            catch (_error) {
                setTestingCodes([]);
            }
        }
        catch (_error) {
            setErrorMessage('Failed to load devices.');
        }
        finally {
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
        const reload = () => {
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
    const handlePairDevice = async () => {
        if (pairingCode.length !== 4) {
            return;
        }
        try {
            await deviceService.pairByCode(pairingCode);
            setPairingCode('');
            await reloadDevices();
        }
        catch (_error) {
            setErrorMessage('Pairing failed. Please verify the code.');
        }
    };
    const handleLogout = () => {
        dashboardSocketService.disconnect();
        dispatch(clearSession());
        navigate('/login');
    };
    const handleGenerateTestingCodes = async () => {
        setIsGeneratingCodes(true);
        setErrorMessage('');
        try {
            await deviceService.generateTestingPairingCodes(5);
            await reloadDevices();
        }
        catch (_error) {
            setErrorMessage('Failed to generate testing verification codes.');
        }
        finally {
            setIsGeneratingCodes(false);
        }
    };
    const handleCopyCode = async (value) => {
        if (!value) {
            return;
        }
        try {
            await navigator.clipboard.writeText(value);
        }
        catch (_error) {
            setErrorMessage('Unable to copy code from browser clipboard.');
        }
    };
    return (_jsxs("section", { className: "devices-screen", children: [_jsxs("header", { className: "devices-screen__header", children: [_jsxs("div", { className: "devices-screen__heading", children: [_jsx("p", { className: "devices-screen__eyebrow", children: "Digital Signage Control" }), _jsx("h1", { children: "Device Fleet" }), _jsx("p", { children: "Monitor live status, pair new screens, and open any device to manage playlist content." })] }), _jsxs("div", { className: "pairing-panel", children: [_jsx("input", { placeholder: "4-digit pairing code", value: pairingCode, maxLength: 4, onChange: event => {
                                    setPairingCode(event.target.value.replace(/\D/g, ''));
                                } }), _jsx("button", { type: "button", onClick: handlePairDevice, children: "Pair Device" }), _jsx("button", { type: "button", onClick: handleLogout, className: "pairing-panel__logout-button", children: "Logout" })] })] }), _jsxs("section", { className: "devices-summary", children: [_jsxs("article", { className: "devices-summary__card", children: [_jsx("span", { children: "Total Devices" }), _jsx("strong", { children: dashboardSummary.totalDevices })] }), _jsxs("article", { className: "devices-summary__card", children: [_jsx("span", { children: "Online" }), _jsx("strong", { children: dashboardSummary.onlineDevices })] }), _jsxs("article", { className: "devices-summary__card", children: [_jsx("span", { children: "Offline" }), _jsx("strong", { children: dashboardSummary.offlineDevices })] }), _jsxs("article", { className: "devices-summary__card", children: [_jsx("span", { children: "Paired" }), _jsx("strong", { children: dashboardSummary.pairedDevices })] })] }), _jsxs("section", { className: "testing-pairing-codes", children: [_jsxs("div", { className: "testing-pairing-codes__header", children: [_jsx("h2", { children: "Verification Codes (Testing)" }), _jsx("button", { type: "button", onClick: handleGenerateTestingCodes, disabled: isGeneratingCodes, children: isGeneratingCodes ? 'Generating...' : 'Generate 5 Codes' })] }), _jsx("p", { children: "Use any active code below to pair quickly during testing." }), _jsx("div", { className: "testing-pairing-codes__list", children: testingCodes.length === 0 ? (_jsx("div", { className: "testing-pairing-codes__empty", children: "No active verification codes found." })) : (testingCodes.map(code => (_jsxs("article", { className: "testing-code-card", children: [_jsx("p", { className: "testing-code-card__device", children: code.deviceName }), _jsxs("div", { className: "testing-code-card__code-row", children: [_jsx("strong", { children: code.pairingCode || '----' }), _jsx("button", { type: "button", onClick: () => {
                                                handleCopyCode(code.pairingCode);
                                            }, children: "Copy" })] }), _jsxs("span", { children: ["Updated: ", formatDateTime(code.updatedAt)] })] }, code.id)))) })] }), errorMessage ? _jsx("p", { className: "devices-screen__error", children: errorMessage }) : null, isLoading ? _jsx("p", { className: "devices-screen__loading", children: "Loading devices..." }) : null, _jsx("main", { className: "devices-screen__content", children: devices.map(device => (_jsxs("article", { className: "device-card", role: "button", tabIndex: 0, onClick: () => {
                        navigate(`/devices/${device.id}`);
                    }, onKeyDown: event => {
                        if (event.key === 'Enter') {
                            navigate(`/devices/${device.id}`);
                        }
                    }, children: [_jsxs("div", { className: "device-card__top", children: [_jsx("h3", { children: device.deviceName }), _jsx("span", { className: `device-card__status device-card__status--${device.status.toLowerCase()}`, children: device.status })] }), _jsxs("p", { children: ["Paired: ", device.isPaired ? 'Yes' : 'No'] }), _jsxs("p", { children: ["Content items: ", device.contentCount] }), _jsxs("p", { children: ["Last heartbeat: ", formatDateTime(device.lastHeartbeatAt)] }), _jsxs("p", { children: ["Last seen: ", formatDateTime(device.lastSeen)] }), _jsxs("p", { children: ["App version: ", device.appVersion || '-'] })] }, device.id))) })] }));
};
