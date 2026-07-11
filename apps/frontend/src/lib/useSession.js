import { useLocation } from 'react-router-dom';

const STORAGE_KEY = 'calico_session';

/**
 * Saves session data (role, branchName, userName) to localStorage.
 * Called once after successful login.
 */
export function saveSession({ role, branchName, userName }) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ role, branchName, userName }));
}

/**
 * Clears session data from localStorage.
 * Called on logout.
 */
export function clearSession() {
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Reads session data. Priority:
 *   1. location.state (from React Router navigation)
 *   2. localStorage  (persisted session — survives refresh)
 *   3. Defaults       (kasir / pusat)
 */
export function useSession() {
  const location = useLocation();
  const stateRole = location.state?.role;
  const stateBranch = location.state?.branchName;
  const stateUserName = location.state?.userName;

  // If location.state has the role, trust it and also re-persist it
  if (stateRole) {
    const session = { role: stateRole, branchName: stateBranch || 'pusat', userName: stateUserName || '' };
    // Silently keep localStorage in sync
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(session)); } catch {}
    return session;
  }

  // Otherwise fall back to localStorage
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        role: parsed.role || 'kasir',
        branchName: parsed.branchName || 'pusat',
        userName: parsed.userName || '',
      };
    }
  } catch {}

  // Last resort defaults
  return { role: 'kasir', branchName: 'pusat', userName: '' };
}
