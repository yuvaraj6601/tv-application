import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { contentService } from '../../../services/content.service';
import { deviceService } from '../../../services/device.service';
import './device-detail.screen.scss';
export const DeviceDetailScreen = () => {
    const navigate = useNavigate();
    const { deviceId = '' } = useParams();
    const [items, setItems] = useState([]);
    const [deviceDetail, setDeviceDetail] = useState(null);
    const [webUrl, setWebUrl] = useState('');
    const [duration, setDuration] = useState('10');
    const [uploadType, setUploadType] = useState('IMAGE');
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const formatDateTime = (value) => {
        if (!value) {
            return '-';
        }
        return new Date(value).toLocaleString();
    };
    const loadItems = async () => {
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
        }
        catch (_error) {
            setErrorMessage('Failed to load device details.');
        }
        finally {
            setIsLoading(false);
        }
    };
    useEffect(() => {
        loadItems().catch(() => undefined);
    }, [deviceId]);
    const handleAddWebpage = async () => {
        if (!deviceId || !webUrl) {
            return;
        }
        try {
            await contentService.createWebpage(deviceId, {
                url: webUrl,
                order: items.length + 1,
                duration: Number(duration) || 10
            });
            setWebUrl('');
            await loadItems();
        }
        catch (_error) {
            setErrorMessage('Failed to add webpage content.');
        }
    };
    const handleUploadMedia = async (event) => {
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
        }
        catch (_error) {
            setErrorMessage('Failed to upload media.');
        }
    };
    const handleDelete = async (contentId) => {
        if (!deviceId) {
            return;
        }
        try {
            await contentService.remove(deviceId, contentId);
            await loadItems();
        }
        catch (_error) {
            setErrorMessage('Failed to delete content.');
        }
    };
    const moveItem = async (index, direction) => {
        if (!deviceId) {
            return;
        }
        const nextList = [...items];
        const swapIndex = direction === 'UP' ? index - 1 : index + 1;
        if (swapIndex < 0 || swapIndex >= nextList.length) {
            return;
        }
        const temp = nextList[index];
        nextList[index] = nextList[swapIndex];
        nextList[swapIndex] = temp;
        setItems(nextList);
        try {
            await contentService.reorder(deviceId, nextList.map(item => item.id));
            await loadItems();
        }
        catch (_error) {
            setErrorMessage('Failed to update playlist order.');
        }
    };
    return (_jsxs("section", { className: "device-detail-screen", children: [_jsxs("header", { className: "device-detail-screen__header", children: [_jsxs("div", { children: [_jsx("button", { className: "device-detail-screen__back-button", type: "button", onClick: () => {
                                    navigate('/devices');
                                }, children: "Back to Device Fleet" }), _jsx("h1", { children: "Device Workspace" }), _jsx("p", { children: "Configure media, playlist sequence, and viewing duration for this screen." })] }), _jsxs("div", { className: "device-detail-screen__identity", children: [_jsxs("p", { children: ["Device ID: ", deviceId] }), _jsxs("p", { children: ["Unique ID: ", deviceDetail?.deviceUniqueId || '-'] })] })] }), errorMessage ? _jsx("p", { className: "device-detail-screen__error", children: errorMessage }) : null, isLoading ? _jsx("p", { className: "device-detail-screen__loading", children: "Loading device data..." }) : null, _jsxs("section", { className: "device-health-panel", children: [_jsxs("div", { className: "device-health-panel__item", children: [_jsx("span", { children: "Status" }), _jsx("strong", { children: deviceDetail?.status || '-' })] }), _jsxs("div", { className: "device-health-panel__item", children: [_jsx("span", { children: "Paired" }), _jsx("strong", { children: deviceDetail?.isPaired ? 'Yes' : 'No' })] }), _jsxs("div", { className: "device-health-panel__item", children: [_jsx("span", { children: "Content count" }), _jsx("strong", { children: deviceDetail?.contentCount || 0 })] }), _jsxs("div", { className: "device-health-panel__item", children: [_jsx("span", { children: "Last heartbeat" }), _jsx("strong", { children: formatDateTime(deviceDetail?.lastHeartbeatAt || null) })] }), _jsxs("div", { className: "device-health-panel__item", children: [_jsx("span", { children: "Last seen" }), _jsx("strong", { children: formatDateTime(deviceDetail?.lastSeen || null) })] }), _jsxs("div", { className: "device-health-panel__item", children: [_jsx("span", { children: "App version" }), _jsx("strong", { children: deviceDetail?.appVersion || '-' })] }), _jsxs("div", { className: "device-health-panel__item", children: [_jsx("span", { children: "Last heartbeat IP" }), _jsx("strong", { children: deviceDetail?.lastHeartbeatIpAddress || '-' })] })] }), _jsxs("section", { className: "content-tools", children: [_jsxs("div", { className: "tool-card", children: [_jsx("h3", { children: "Add Webpage" }), _jsx("label", { children: "Web URL" }), _jsx("input", { value: webUrl, placeholder: "https://example.com", onChange: event => setWebUrl(event.target.value) }), _jsx("label", { children: "Duration (seconds)" }), _jsx("input", { value: duration, placeholder: "Duration (seconds)", onChange: event => setDuration(event.target.value.replace(/\D/g, '')) }), _jsx("button", { type: "button", onClick: handleAddWebpage, children: "Add Webpage" })] }), _jsxs("div", { className: "tool-card", children: [_jsx("h3", { children: "Upload Media" }), _jsx("label", { children: "Media Type" }), _jsxs("select", { value: uploadType, onChange: event => setUploadType(event.target.value), children: [_jsx("option", { value: "IMAGE", children: "IMAGE" }), _jsx("option", { value: "VIDEO", children: "VIDEO" })] }), _jsx("label", { children: "Media File" }), _jsx("input", { type: "file", accept: uploadType === 'IMAGE' ? 'image/*' : 'video/*', onChange: handleUploadMedia })] })] }), _jsxs("section", { className: "content-list", children: [_jsx("h3", { className: "content-list__title", children: "Playlist Items" }), items.length === 0 ? _jsx("p", { className: "content-list__empty", children: "No playlist items yet. Add webpage or media content to start playback." }) : null, items.map((item, index) => (_jsxs("article", { className: "content-row", children: [_jsxs("div", { children: [_jsxs("h4", { children: ["#", index + 1, " ", item.type] }), _jsx("p", { children: item.url })] }), _jsxs("div", { className: "content-row__actions", children: [_jsx("button", { type: "button", onClick: () => moveItem(index, 'UP'), children: "Up" }), _jsx("button", { type: "button", onClick: () => moveItem(index, 'DOWN'), children: "Down" }), _jsx("button", { type: "button", onClick: () => handleDelete(item.id), children: "Delete" })] })] }, item.id)))] })] }));
};
