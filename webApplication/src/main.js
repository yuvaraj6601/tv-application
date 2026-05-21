import { jsx as _jsx } from "react/jsx-runtime";
import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { AppRouter } from './app/app.router';
import { dashboardStore } from './store/store';
ReactDOM.createRoot(document.getElementById('root')).render(_jsx(React.StrictMode, { children: _jsx(Provider, { store: dashboardStore, children: _jsx(BrowserRouter, { children: _jsx(AppRouter, {}) }) }) }));
