// Re-export the canonical useAuth hook from AuthContext so all callers that
// import from this path get the full context-backed implementation (including
// session, isDemoMode, signUp, signIn, signOut, etc.) rather than the
// previous minimal standalone hook.
export { useAuth } from '../contexts/AuthContext';
