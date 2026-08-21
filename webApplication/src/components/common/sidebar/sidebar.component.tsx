import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { dashboardSocketService } from '../../../services/socket.service';
import { clearSession } from '../../../store/slices/auth.slice';
import './sidebar.component.scss';

export const Sidebar = (): React.JSX.Element => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const handleLogout = (): void => {
    dashboardSocketService.disconnect();
    dispatch(clearSession());
    navigate('/login');
  };

  return (
    <nav className="sidebar">
      <div className="sidebar__brand">Signage Admin</div>
      <ul className="sidebar__nav">
        <li>
          <NavLink to="/devices" className={({ isActive }) => `sidebar__link${isActive ? ' sidebar__link--active' : ''}`}>
            Device Management
          </NavLink>
        </li>
        <li>
          <NavLink to="/content" className={({ isActive }) => `sidebar__link${isActive ? ' sidebar__link--active' : ''}`}>
            Content Management
          </NavLink>
        </li>
      </ul>
      <button type="button" className="sidebar__logout" onClick={handleLogout}>
        <svg className="sidebar__logout-icon" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <path
            d="M7.5 17.5H4.375A1.875 1.875 0 0 1 2.5 15.625V4.375A1.875 1.875 0 0 1 4.375 2.5H7.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path d="M13.125 14.167 17.5 10l-4.375-4.167" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M17.5 10H7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span>Logout</span>
      </button>
    </nav>
  );
};
