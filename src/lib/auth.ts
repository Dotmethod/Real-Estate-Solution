import { supabase } from './supabase';

/**
 * Safely retrieves the current session.
 * Handles common auth errors like "Refresh Token Not Found" by clearing corrupted state.
 */
export async function getSafeSession() {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      if (
        error.message.includes('Refresh Token Not Found') || 
        error.message.includes('invalid_grant') ||
        error.message.includes('database error') ||
        error.status === 400 ||
        error.status === 401
      ) {
        console.warn('Auth session corrupted, clearing local state:', error.message);
        await handleAuthCorruption();
        return { session: null, error: null };
      }
      return { session: null, error };
    }
    
    return { session, error: null };
  } catch (err) {
    console.error('Fatal error during session retrieval:', err);
    return { session: null, error: err };
  }
}

/**
 * Clears local auth state when corruption is detected.
 */
export async function handleAuthCorruption() {
  try {
    // Attempt to sign out properly to notify Supabase server if possible
    await supabase.auth.signOut().catch(() => {});
  } finally {
    // Force clear everything
    localStorage.clear();
    sessionStorage.clear();
    
    // Optional: force a page refresh if we're in a completely broken state
    // but only if we're not already on the login page to avoid infinite loops
    if (!window.location.pathname.includes('/login')) {
      window.location.href = '/login?reset=true';
    }
  }
}
