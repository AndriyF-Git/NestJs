import React, { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { resetPassword } from '../api/password';

const ResetPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = useMemo(() => searchParams.get('token') || '', [searchParams]);

  const [newPassword, setNewPassword] = useState('');
  const [repeatPassword, setRepeatPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!token) {
      setError('Invalid or missing token');
      return;
    }

    if (newPassword !== repeatPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const data = await resetPassword({ token, newPassword });
      const message =
        (data && (data.message as string | undefined)) ||
        'Password has been reset successfully. You can now log in.';
      setSuccess(message);
    } catch (err: unknown) {
      console.error(err);
      if (axios.isAxiosError(err)) {
        const msg =
          (err.response?.data as { message?: string })?.message ||
          'Failed to reset password';
        setError(msg);
      } else {
        setError('Unexpected error');
      }
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div style={{ maxWidth: 400, margin: '40px auto', color: 'red' }}>
        Invalid or missing reset token.
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 400, margin: '40px auto' }}>
      <h1>Reset password</h1>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 12 }}>
          <label>
            New password<br />
            <input
              type="password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              required
              style={{ width: '100%' }}
            />
          </label>
        </div>

        <div style={{ marginBottom: 12 }}>
          <label>
            Repeat new password<br />
            <input
              type="password"
              value={repeatPassword}
              onChange={e => setRepeatPassword(e.target.value)}
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
          {loading ? 'Resetting...' : 'Reset password'}
        </button>
      </form>
    </div>
  );
};

export default ResetPasswordPage;
