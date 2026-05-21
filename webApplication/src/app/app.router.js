import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Navigate, Route, Routes } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { LoginScreen } from '../screens/auth/login/login.screen';
import { DevicesScreen } from '../screens/devices/list/devices.screen';
import { DeviceDetailScreen } from '../screens/devices/detail/device-detail.screen';
const ProtectedRoutes = () => {
    const token = useSelector((state) => state.auth.token);
    if (!token) {
        return _jsx(Navigate, { to: "/login", replace: true });
    }
    return (_jsxs(Routes, { children: [_jsx(Route, { path: "/devices", element: _jsx(DevicesScreen, {}) }), _jsx(Route, { path: "/devices/:deviceId", element: _jsx(DeviceDetailScreen, {}) }), _jsx(Route, { path: "*", element: _jsx(Navigate, { to: "/devices", replace: true }) })] }));
};
export const AppRouter = () => {
    return (_jsxs(Routes, { children: [_jsx(Route, { path: "/login", element: _jsx(LoginScreen, {}) }), _jsx(Route, { path: "/*", element: _jsx(ProtectedRoutes, {}) })] }));
};
