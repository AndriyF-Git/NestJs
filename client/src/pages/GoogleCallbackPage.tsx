import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const GoogleCallbackPage: React.FC = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuth();

  useEffect(() => {
    const token = params.get('token');

    if (!token) {
      navigate('/login');
      return;
    }

    login(token);
    window.history.replaceState({}, document.title, '/me');
    navigate('/me', { replace: true });
  }, [params, login, navigate]);

  return <div style={{ padding: 20 }}>Logging in with Google...</div>;
};

export default GoogleCallbackPage;
