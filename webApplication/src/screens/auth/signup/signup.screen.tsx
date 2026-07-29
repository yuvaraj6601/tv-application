import React from 'react';
import { useForm } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { AxiosError } from 'axios';
import { authService } from '../../../services/auth.service';
import { setSession } from '../../../store/slices/auth.slice';
import { RootState } from '../../../store/store';
import { PasswordInput } from '../../../components/common/password-input/password-input.component';
import './signup.screen.scss';

interface SignupFormModel {
  email: string;
  password: string;
  confirmPassword: string;
}

export const SignupScreen = (): React.JSX.Element => {
  const { register, handleSubmit, watch, formState, reset } = useForm<SignupFormModel>();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const token = useSelector((state: RootState) => state.auth.token);
  const [errorMessage, setErrorMessage] = React.useState<string>('');
  const [isSubmitting, setIsSubmitting] = React.useState<boolean>(false);

  React.useEffect(() => {
    reset({ email: '', password: '', confirmPassword: '' });
  }, [reset]);

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

    return 'Could not create your account. Please try again.';
  };

  const onSubmit = async (form: SignupFormModel): Promise<void> => {
    setIsSubmitting(true);
    setErrorMessage('');
    try {
      const response = await authService.register(form);
      dispatch(setSession(response));
      navigate('/devices');
    } catch (error) {
      setErrorMessage(resolveErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  React.useEffect(() => {
    if (token) {
      navigate('/devices');
    }
  }, [token, navigate]);

  return (
    <section className="signup-screen">
      <div className="signup-screen__brand-panel">
        <p className="signup-screen__eyebrow">Android TV Digital Signage</p>
        <h1>Admin Control Center</h1>
        <p className="signup-screen__description">
          Manage device pairing, playlist scheduling, media uploads, and realtime status from one dashboard.
        </p>
      </div>
      <form className="signup-screen__form" onSubmit={handleSubmit(onSubmit)} autoComplete="off">
        <h2>Create your account</h2>
        {/* Decoy fields absorb the browser's password-manager autofill so it doesn't land in the real inputs below */}
        <input type="text" name="username" className="signup-screen__decoy" tabIndex={-1} aria-hidden="true" autoComplete="username" />
        <input type="password" name="password" className="signup-screen__decoy" tabIndex={-1} aria-hidden="true" autoComplete="current-password" />
        <input {...register('email', { required: true })} placeholder="Email" autoComplete="off" />
        <PasswordInput {...register('password', { required: true, minLength: 6 })} placeholder="Password" autoComplete="new-password" />
        <input
          {...register('confirmPassword', {
            required: true,
            validate: value => value === watch('password') || 'Passwords do not match'
          })}
          placeholder="Re-enter password"
          type="password"
          autoComplete="new-password"
        />
        {formState.errors.email || formState.errors.password ? (
          <p className="signup-screen__error">Email and a password of at least 6 characters are required.</p>
        ) : null}
        {formState.errors.confirmPassword ? <p className="signup-screen__error">{formState.errors.confirmPassword.message}</p> : null}
        {errorMessage ? <p className="signup-screen__error">{errorMessage}</p> : null}
        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Creating account...' : 'Sign up'}
        </button>
        <p className="signup-screen__login-hint">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </form>
    </section>
  );
};
