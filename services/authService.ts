import { User } from '@/lib/types';
import { supabase } from '@/lib/supabase';

export const isSupabaseConfigured = !!(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

class AuthService {
  /**
   * Sign in with Google using Supabase Auth
   * Opens a popup for Google OAuth flow
   */
  public async signInWithGoogle(): Promise<User | null> {
    if (!isSupabaseConfigured) {
      const errorMsg = "Supabase not configured. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your .env.local file.";
      console.error(errorMsg);
      throw new Error(errorMsg);
    }

    try {
      // Ensure we always redirect back to the current origin (localhost in dev, production in prod)
      const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3001';
      const redirectUrl = `${currentOrigin}/`;
      
      console.log('[Auth] Signing in with Google, redirectTo:', redirectUrl);
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) {
        console.error("OAuth error:", error);
        throw error;
      }

      // Note: The user data will be available after redirect
      // Get the current session to return user data
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData.session?.user) {
        return this.mapSupabaseUserToUser(sessionData.session.user);
      }

      return null;
    } catch (error) {
      console.error("Sign in error:", error);
      throw error;
    }
  }

  /**
   * Sign out the current user
   */
  public async signOut(): Promise<void> {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("Sign out error:", error);
        throw error;
      }
    } catch (error) {
      console.error("Sign out error:", error);
      throw error;
    }
  }

  /**
   * Get the current authenticated user
   */
  public async getCurrentUser(): Promise<User | null> {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.user) {
        return null;
      }

      return this.mapSupabaseUserToUser(session.user);
    } catch (error) {
      console.error("Error getting current user:", error);
      return null;
    }
  }

  /**
   * Listen for auth state changes
   */
  public onAuthStateChange(callback: (user: User | null) => void) {
    return supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state changed:', event);

      if (session?.user) {
        callback(this.mapSupabaseUserToUser(session.user));
      } else {
        callback(null);
      }
    });
  }

  /**
   * Map Supabase user to our User type
   */
  private mapSupabaseUserToUser(supabaseUser: any): User {
    return {
      id: supabaseUser.id,
      name: supabaseUser.user_metadata?.name || supabaseUser.user_metadata?.full_name || supabaseUser.email || 'User',
      email: supabaseUser.email || '',
      picture: supabaseUser.user_metadata?.avatar_url || supabaseUser.user_metadata?.picture || '',
    };
  }
}

export const authService = new AuthService();
