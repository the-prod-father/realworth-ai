
import { User } from '@/lib/types';

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
export const isGoogleClientIdConfigured = !!GOOGLE_CLIENT_ID;

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
          if (typeof google !== 'undefined' && google.accounts?.oauth2) {
            // Use OAuth 2.0 token client for button-based sign-in
            const client = google.accounts.oauth2.initTokenClient({
              client_id: GOOGLE_CLIENT_ID!,
              scope: 'openid profile email',
              callback: async (tokenResponse: any) => {
                if (tokenResponse.error) {
                  console.error("OAuth error:", tokenResponse);
                  reject(new Error(tokenResponse.error));
                  return;
                }

                try {
                  // Fetch user info from Google using the access token
                  const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                    headers: {
                      'Authorization': `Bearer ${tokenResponse.access_token}`
                    }
                  });

                  if (!userInfoResponse.ok) {
                    throw new Error('Failed to fetch user info');
                  }

                  const userData = await userInfoResponse.json();
                  const user: User = {
                    id: userData.sub,
                    name: userData.name,
                    email: userData.email,
                    picture: userData.picture,
                  };
                  localStorage.setItem(this.USER_KEY, JSON.stringify(user));
                  resolve(user);
                } catch (error) {
                  console.error("Error fetching user info:", error);
                  reject(new Error("Failed to get user information from Google."));
                }
              },
            });

            // Trigger the popup
            client.requestAccessToken();

          } else if (attempts < 20) {
            // Retry up to 20 times (2 seconds total)
            setTimeout(() => waitForGoogle(attempts + 1), 100);
          } else {
            reject(new Error("Google OAuth services failed to load. Please refresh the page and try again."));
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