import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
import { useForm } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { AxiosError } from 'axios';
import { authService } from '../../../services/auth.service';
import { setSession } from '../../../store/slices/auth.slice';
import './login.screen.scss';
export const LoginScreen = () => {
    const { register, handleSubmit, setValue, formState } = useForm();
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const token = useSelector((state) => state.auth.token);
    const [errorMessage, setErrorMessage] = React.useState('');
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const sampleAdminCredentials = {
        email: 'admin@signage.local',
        password: 'admin12345'
    };
    const resolveErrorMessage = (error) => {
        if (error instanceof AxiosError) {
            const responseData = error.response?.data;
            if (responseData?.errors && responseData.errors.length > 0) {
                return responseData.errors.join(', ');
            }
            if (responseData?.message) {
                return responseData.message;
            }
        }
        return 'Invalid credentials or server unavailable.';
    };
    const onSubmit = async (form) => {
        setIsSubmitting(true);
        setErrorMessage('');
        try {
            const response = await authService.login(form);
            dispatch(setSession(response));
            navigate('/devices');
        }
        catch (error) {
            setErrorMessage(resolveErrorMessage(error));
        }
        finally {
            setIsSubmitting(false);
        }
    };
    const prefillSampleAdminCredentials = () => {
        setValue('email', sampleAdminCredentials.email);
        setValue('password', sampleAdminCredentials.password);
    };
    React.useEffect(() => {
        if (token) {
            navigate('/devices');
        }
    }, [token, navigate]);
    return (_jsxs("section", { className: "login-screen", children: [_jsxs("div", { className: "login-screen__brand-panel", children: [_jsx("p", { className: "login-screen__eyebrow", children: "Android TV Digital Signage" }), _jsx("h1", { children: "Admin Control Center" }), _jsx("p", { className: "login-screen__description", children: "Manage device pairing, playlist scheduling, media uploads, and realtime status from one dashboard." })] }), _jsxs("form", { className: "login-screen__form", onSubmit: handleSubmit(onSubmit), children: [_jsx("h2", { children: "Sign in" }), _jsx("input", { ...register('email', { required: true }), placeholder: "Email" }), _jsx("input", { ...register('password', { required: true }), placeholder: "Password", type: "password" }), formState.errors.email || formState.errors.password ? _jsx("p", { className: "login-screen__error", children: "Email and password are required." }) : null, errorMessage ? _jsx("p", { className: "login-screen__error", children: errorMessage }) : null, _jsx("button", { className: "login-screen__prefill-button", onClick: prefillSampleAdminCredentials, type: "button", children: "Prefill Sample Admin" }), _jsx("button", { type: "submit", disabled: isSubmitting, children: isSubmitting ? 'Logging in...' : 'Login' }), _jsx("p", { className: "login-screen__hint", children: "Tip: Configure `DEFAULT_ADMIN_EMAIL` and `DEFAULT_ADMIN_PASSWORD` in backend `.env` for production." })] })] }));
};
