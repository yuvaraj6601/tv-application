import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '../store/store';
import { LoginScreen } from '../screens/auth/login/login.screen';
import { SignupScreen } from '../screens/auth/signup/signup.screen';
import { DevicesScreen } from '../screens/devices/list/devices.screen';
import { DeviceDetailScreen } from '../screens/devices/detail/device-detail.screen';
import { ContentScreen } from '../screens/content/list/content.screen';
import { DashboardLayout } from '../components/common/dashboard-layout/dashboard-layout.component';

const ProtectedRoutes = (): React.JSX.Element => {
  const token = useSelector((state: RootState) => state.auth.token);
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return (
    <Routes>
      <Route element={<DashboardLayout />}>
        <Route path="/devices" element={<DevicesScreen />} />
        <Route path="/devices/:deviceId" element={<DeviceDetailScreen />} />
        <Route path="/content" element={<ContentScreen />} />
      </Route>
      <Route path="*" element={<Navigate to="/devices" replace />} />
    </Routes>
  );
};

export const AppRouter = (): React.JSX.Element => {
  return (
    <Routes>
      <Route path="/login" element={<LoginScreen />} />
      <Route path="/signup" element={<SignupScreen />} />
      <Route path="/*" element={<ProtectedRoutes />} />
    </Routes>
  );
};
