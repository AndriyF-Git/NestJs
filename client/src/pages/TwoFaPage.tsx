import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { verifyTwoFactorLogin } from '../api/auth';
import { useAuth } from '../context/AuthContext';

const TwoFactorPage: React.FC = () => {
  const navigate = useNavigate();
  const { login: authLogin } = useAuth();

  const [email, setEmail] = useState<string>('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const storedEmail = localStorage.getItem('twoFactorEmail');
    if (!storedEmail) {
      // якщо немає email — повертаємо на логін
      navigate('/login');
      return;
    }
    setEmail(storedEmail);
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const data = await verifyTwoFactorLogin({ email, code });

      console.log('2FA response:', data); // дебаг лог

      if (data.accessToken) {
        localStorage.removeItem('twoFactorEmail');
        authLogin(data.accessToken);
        navigate('/me');
      } else {
        setError('Invalid response from server');
      }
    } catch (err: unknown) {
      console.error(err);
      if (axios.isAxiosError(err)) {
        const message =
          (err.response?.data as { message?: string })?.message ||
          'Invalid 2FA code';
        setError(message);
      } else {
        setError('Unexpected error');
      }
    } finally {
      setLoading(false);
    }
  };

  if (!email) {
    return null; // поки useEffect не відпрацював
  }

  return (
    <div style={{ maxWidth: 400, margin: '40px auto' }}>
      <h1>Two-factor authentication</h1>
      <p>We sent a 6-digit code to your email: {email}</p>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 12 }}>
          <label>
            2FA code
            <br />
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
              maxLength={6}
              style={{ width: '100%' }}
            />
          </label>
        </div>

        {error && <div style={{ color: 'red', marginBottom: 12 }}>{error}</div>}

        <button type="submit" disabled={loading}>
          {loading ? 'Verifying...' : 'Confirm login'}
        </button>
      </form>

      <p style={{ marginTop: 16 }}>
        <button type="button" onClick={() => navigate('/login')}>
          Back to login
        </button>
      </p>
    </div>
  );
};

export default TwoFactorPage;
