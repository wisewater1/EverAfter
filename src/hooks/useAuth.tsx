// Re-export useAuth from AuthContext to ensure a single consistent implementation.
// All consumers should get the context-based hook that provides the full auth state.
export { useAuth } from '../contexts/AuthContext';
