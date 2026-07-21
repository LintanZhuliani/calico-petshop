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

export function useSession() {
  // Always prefer localStorage if it exists and is valid
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && parsed.role) {
        return {
          role: parsed.role || 'kasir',
          branchName: parsed.branchName || 'pusat',
          userName: parsed.userName || '',
        };
      }
    }
  } catch (err) {
    // Ignore parse errors
  }

  // Fallback to location.state if localStorage is missing or invalid
  const location = useLocation();
  const stateRole = location.state?.role;
  const stateBranch = location.state?.branchName;
  const stateUserName = location.state?.userName;

  if (stateRole) {
    const session = { role: stateRole, branchName: stateBranch || 'pusat', userName: stateUserName || '' };
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(session)); } catch {}
    return session;
  }

  // Absolute fallback
  return { role: 'kasir', branchName: 'pusat', userName: '' };
}
