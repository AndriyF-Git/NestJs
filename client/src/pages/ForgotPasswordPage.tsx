import React, { useState } from 'react';
import axios from 'axios';
import { requestPasswordReset } from '../api/password';

const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    setLoading(true);
    try {
      const data = await requestPasswordReset({ email });
      // Бек у тебе повертає щось типу message → використаємо його, якщо є
      const message =
        (data && (data.message as string | undefined)) ||
        'If this email is registered, a password reset link has been sent.';
      setSuccess(message);
    } catch (err: unknown) {
      console.error(err);
      if (axios.isAxiosError(err)) {
        const msg =
          (err.response?.data as { message?: string })?.message ||
          'Failed to request password reset';
        setError(msg);
      } else {
        setError('Unexpected error');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: '40px auto' }}>
      <h1>Forgot password</h1>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 12 }}>
          <label>
            Email<br />
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              style={{ width: '100%' }}
            />
          </label>
        </div>

        {error && (
          <div style={{ color: 'red', marginBottom: 12 }}>{error}</div>
        )}

        {success && (
          <div style={{ color: 'green', marginBottom: 12 }}>{success}</div>
        )}

        <button type="submit" disabled={loading}>
          {loading ? 'Sending...' : 'Send reset link'}
        </button>
      </form>
    </div>
  );
};

export default ForgotPasswordPage;
