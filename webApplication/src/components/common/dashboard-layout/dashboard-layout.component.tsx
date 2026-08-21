import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from '../sidebar/sidebar.component';
import './dashboard-layout.component.scss';

export const DashboardLayout = (): React.JSX.Element => {
  return (
    <div className="dashboard-layout">
      <Sidebar />
      <div className="dashboard-layout__content">
        <Outlet />
      </div>
    </div>
  );
};
