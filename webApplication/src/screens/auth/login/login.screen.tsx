import React from 'react';
import { useForm } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { AxiosError } from 'axios';
import { authService } from '../../../services/auth.service';
import { setSession } from '../../../store/slices/auth.slice';
import { RootState } from '../../../store/store';
import './login.screen.scss';

interface LoginFormModel {
  email: string;
  password: string;
}

export const LoginScreen = (): React.JSX.Element => {
  const { register, handleSubmit, setValue, formState } = useForm<LoginFormModel>();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const token = useSelector((state: RootState) => state.auth.token);
  const [errorMessage, setErrorMessage] = React.useState<string>('');
  const [isSubmitting, setIsSubmitting] = React.useState<boolean>(false);
  const sampleAdminCredentials: LoginFormModel = {
    email: 'admin@signage.local',
    password: 'admin12345'
  };

  const resolveErrorMessage = (error: unknown): string => {
    if (error instanceof AxiosError) {
      const responseData = error.response?.data as { message?: string; errors?: string[] } | undefined;
      if (responseData?.errors && responseData.errors.length > 0) {
        return responseData.errors.join(', ');
      }

      if (responseData?.message) {
        return responseData.message;
      }
    }

    return 'Invalid credentials or server unavailable.';
  };

  const onSubmit = async (form: LoginFormModel): Promise<void> => {
    setIsSubmitting(true);
    setErrorMessage('');
    try {
      const response = await authService.login(form);
      dispatch(setSession(response));
      navigate('/devices');
    } catch (error) {
      setErrorMessage(resolveErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const prefillSampleAdminCredentials = (): void => {
    setValue('email', sampleAdminCredentials.email);
    setValue('password', sampleAdminCredentials.password);
  };

  React.useEffect(() => {
    if (token) {
      navigate('/devices');
    }
  }, [token, navigate]);

  return (
    <section className="login-screen">
      <div className="login-screen__brand-panel">
        <p className="login-screen__eyebrow">Android TV Digital Signage</p>
        <h1>Admin Control Center</h1>
        <p className="login-screen__description">
          Manage device pairing, playlist scheduling, media uploads, and realtime status from one dashboard.
        </p>
      </div>
      <form className="login-screen__form" onSubmit={handleSubmit(onSubmit)}>
        <h2>Sign in</h2>
        <input {...register('email', { required: true })} placeholder="Email" />
        <input {...register('password', { required: true })} placeholder="Password" type="password" />
        {formState.errors.email || formState.errors.password ? <p className="login-screen__error">Email and password are required.</p> : null}
        {errorMessage ? <p className="login-screen__error">{errorMessage}</p> : null}
        <button className="login-screen__prefill-button" onClick={prefillSampleAdminCredentials} type="button">
          Prefill Sample Admin
        </button>
        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Logging in...' : 'Login'}
        </button>
        <p className="login-screen__hint">Tip: Configure `DEFAULT_ADMIN_EMAIL` and `DEFAULT_ADMIN_PASSWORD` in backend `.env` for production.</p>
      </form>
    </section>
  );
};
