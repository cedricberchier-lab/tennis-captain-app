// Client-side authentication utilities (browser only)
const USERS_STORAGE_KEY = 'tennis-captain-users';

// Check if we have local users (client-side only)
export function hasLocalUsers(): boolean {
  if (typeof window === 'undefined') return false;
  
  try {
    const stored = localStorage.getItem(USERS_STORAGE_KEY);
    const users = stored ? JSON.parse(stored) : [];
    return users.length > 0;
  } catch (error) {
    console.error('Error checking local users:', error);
    return false;
  }
}

// Get local users count (client-side only)
export function getLocalUsersCount(): number {
  if (typeof window === 'undefined') return 0;
  
  try {
    const stored = localStorage.getItem(USERS_STORAGE_KEY);
    const users = stored ? JSON.parse(stored) : [];
    return users.length;
  } catch (error) {
    console.error('Error getting local users count:', error);
    return 0;
  }
}