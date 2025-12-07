import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import ReCAPTCHA from 'react-google-recaptcha';
import { register } from '../api/auth';

const siteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY as string | undefined;

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordRepeat, setPasswordRepeat] = useState('');

  const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (password !== passwordRepeat) {
      setError('Passwords do not match');
      return;
    }

    if (!recaptchaToken) {
      setError('Please complete the captcha');
      return;
    }

    setLoading(true);
    try {
      const data = await register({
        email,
        password,
        recaptchaToken, // відправляємо токен на бек
      });
      setSuccess('Registration successful. Check your email or go to login.');
      console.log('Register response:', data);
    } catch (err: unknown) {
      console.error(err);

      if (axios.isAxiosError(err)) {
        const message =
          (err.response?.data as { message?: string })?.message ||
          'Registration failed';
        setError(message);
      } else {
        setError('Unexpected error');
      }
    } finally {
      setLoading(false);
    }
  };

  // Якщо ключа немає — не рендеримо капчу, а показуємо зрозумілий текст
  if (!siteKey) {
    console.error('VITE_RECAPTCHA_SITE_KEY is not set');
    return (
      <div style={{ maxWidth: 400, margin: '40px auto', color: 'red' }}>
        reCAPTCHA is not configured. Please set VITE_RECAPTCHA_SITE_KEY in your
        client .env file and restart the dev server.
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 400, margin: '40px auto' }}>
      <h1>Register</h1>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 12 }}>
          <label>
            Email
            <br />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{ width: '100%' }}
            />
          </label>
        </div>

        <div style={{ marginBottom: 12 }}>
          <label>
            Password
            <br />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{ width: '100%' }}
            />
          </label>
        </div>

        <div style={{ marginBottom: 12 }}>
          <label>
            Repeat password
            <br />
            <input
              type="password"
              value={passwordRepeat}
              onChange={(e) => setPasswordRepeat(e.target.value)}
              required
              style={{ width: '100%' }}
            />
          </label>
        </div>

        <div style={{ marginBottom: 12 }}>
          <ReCAPTCHA
            sitekey={siteKey}
            onChange={(value) => setRecaptchaToken(value)}
          />
        </div>

        {error && (
          <div style={{ color: 'red', marginBottom: 12 }}>{error}</div>
        )}

        {success && (
          <div style={{ color: 'green', marginBottom: 12 }}>{success}</div>
        )}

        <button type="submit" disabled={loading || !recaptchaToken}>
          {loading ? 'Registering...' : 'Register'}
        </button>
      </form>

      <p style={{ marginTop: 16 }}>
        Already have an account?{' '}
        <button type="button" onClick={() => navigate('/login')}>
          Go to login
        </button>
      </p>
    </div>
  );
};

export default RegisterPage;
