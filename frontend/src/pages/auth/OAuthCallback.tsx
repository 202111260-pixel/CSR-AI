import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { authService } from '../../services/authService';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';

export default function OAuthCallback() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { user, setAccessToken, setUser } = useAuthStore();

  useEffect(() => {
    // If already authenticated, go straight to dashboard
    if (user) {
      navigate('/dashboard', { replace: true });
      return;
    }

    const error = params.get('error');

    if (error) {
      navigate('/login?error=' + encodeURIComponent(error), { replace: true });
      return;
    }

    // Cookies were set by the backend OAuth redirect — fetch user profile
    authService.getMe()
      .then((res) => {
        const u = res.data;
        if (u?.id) {
          setAccessToken('cookie');
          setUser({ id: u.id, name: u.name, email: u.email, avatarUrl: u.avatarUrl, role: u.role, department: u.department });
          navigate('/dashboard', { replace: true });
        } else {
          navigate('/login?error=' + encodeURIComponent('Authentication failed'), { replace: true });
        }
      })
      .catch(() => {
        navigate('/login?error=' + encodeURIComponent('Authentication failed'), { replace: true });
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#080805',
    }}>
      <LoadingSpinner size="lg" />
    </div>
  );
}
