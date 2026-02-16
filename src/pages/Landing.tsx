import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Landing() {
  const navigate = useNavigate();
  const { user, signOut, loading } = useAuth();

  console.log('EVERAFTER: Landing component rendering...', { user: !!user, loading });

  return (
    <div style={{ padding: '50px', background: '#0a0f15', color: 'white', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <h1 style={{ fontSize: '3rem', marginBottom: '20px' }}>EverAfter Diagnostic View</h1>
      <p style={{ fontSize: '1.2rem', color: '#888' }}>If you are seeing this, the React mount and Landing route are working.</p>

      <div style={{ marginTop: '40px', padding: '20px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', width: '100%', maxWidth: '500px' }}>
        <h2>Status Check:</h2>
        <ul>
          <li>Auth Loading: {loading ? 'YES' : 'NO'}</li>
          <li>User Logged In: {user ? user.email : 'NO'}</li>
          <li>Current URL: {window.location.href}</li>
        </ul>
      </div>

      <div style={{ marginTop: '30px', display: 'flex', gap: '20px' }}>
        <button onClick={() => navigate('/login')} style={{ background: '#00ffe0', color: 'black', padding: '10px 20px', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>Go to Login</button>
        {user && <button onClick={() => signOut()} style={{ background: '#333', color: 'white', padding: '10px 20px', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>Sign Out</button>}
      </div>

      <p style={{ marginTop: '50px', fontSize: '0.8rem', color: '#444' }}>Timestamp: {new Date().toISOString()}</p>
    </div>
  );
}
