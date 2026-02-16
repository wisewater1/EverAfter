import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Landing() {
  const navigate = useNavigate();
  const { user, signOut, loading } = useAuth();

  console.log('EVERAFTER: Landing (Diagnostic) rendering...', { user: !!user, loading });

  return (
    <div style={{ padding: '50px', background: '#0a0f15', color: 'white', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <h1>EverAfter Diagnostic View</h1>
      <p>Site is recovered. Diagnostic mode active.</p>

      <div style={{ marginTop: '20px', padding: '20px', border: '1px solid #333' }}>
        <p>User: {user ? user.email : 'Not logged in'}</p>
        <p>Loading: {loading ? 'Yes' : 'No'}</p>
      </div>

      <button onClick={() => navigate('/login')} style={{ marginTop: '20px' }}>Go to Login</button>
    </div>
  );
}
