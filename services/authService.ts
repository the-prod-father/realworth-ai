
import { User } from '@/types';

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
export const isGoogleClientIdConfigured = !!GOOGLE_CLIENT_ID;

// A simple JWT decoder, no need for a full library for this
const decodeJwt = (token: string): any => {
  try {
    return JSON.parse(atob(token.split('.')[1]));
  } catch (e) {
    return null;
  }
};

class AuthService {
  private readonly USER_KEY = 'realworth_user';

  public signInWithGoogle(): Promise<User | null> {
    return new Promise((resolve, reject) => {
      if (!isGoogleClientIdConfigured) {
        const errorMsg = "Google Client ID not found. Please set NEXT_PUBLIC_GOOGLE_CLIENT_ID in your .env.local file.";
        console.error(errorMsg);
        return reject(new Error(errorMsg));
      }

      try {
        // Wait for Google script to load with retry logic
        const waitForGoogle = (attempts = 0): void => {
          if (typeof google !== 'undefined' && google.accounts?.id) {
            // Script is loaded, proceed with initialization
            google.accounts.id.initialize({
              client_id: GOOGLE_CLIENT_ID,
              callback: (response) => {
                const userData = decodeJwt(response.credential);
                if (userData) {
                  const user: User = {
                    id: userData.sub,
                    name: userData.name,
                    email: userData.email,
                    picture: userData.picture,
                  };
                  localStorage.setItem(this.USER_KEY, JSON.stringify(user));
                  resolve(user);
                } else {
                  reject(new Error("Failed to decode user data from Google."));
                }
              },
            });

            google.accounts.id.prompt((notification) => {
              if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
                console.warn("Google One Tap was not displayed:", notification.getNotDisplayedReason());
              }
            });
          } else if (attempts < 20) {
            // Retry up to 20 times (2 seconds total)
            setTimeout(() => waitForGoogle(attempts + 1), 100);
          } else {
            reject(new Error("Google Identity Services failed to load. Please refresh the page and try again."));
          }
        };

        waitForGoogle();

      } catch (error) {
        console.error("Sign in error:", error);
        reject(error);
      }
    });
  }

  public signOut() {
    localStorage.removeItem(this.USER_KEY);
    if (typeof google !== 'undefined') {
        google.accounts.id.disableAutoSelect();
    }
  }

  public getCurrentUser(): User | null {
    const userJson = localStorage.getItem(this.USER_KEY);
    return userJson ? JSON.parse(userJson) : null;
  }
}

export const authService = new AuthService();
