import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useApolloClient } from '@apollo/client';
import { MY_PROFILE } from '../graphql/operations';
import { HAVENS_JWT_TOKEN_KEY } from '../services/apollo';
import { secureStorage } from '../services/secureStore';

export interface HobbyItem {
  id: string;
  name: string;
  category?: {
    id: string;
    name: string;
  };
}

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  totalPoints?: number;
  bio?: string;
  neighbourhood?: string;
  photoUrl?: string;
  inviteCode?: string;
  hobbies?: HobbyItem[];
}

interface AuthContextType {
  token: string | null;
  user: UserProfile | null;
  isLoading: boolean;
  isOnboarded: boolean;
  networkError: string | null;
  login: (token: string) => Promise<void>;
  logout: () => void;
  refetchUser: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Safely retrieve the JWT token from sessionStorage on startup / page refresh.
 * Tokens stored in sessionStorage automatically expire upon closing the browser.
 */
const getStoredToken = (): string | null => {
  try {
    const direct = secureStorage.getItemSync(HAVENS_JWT_TOKEN_KEY);
    if (direct) return direct;
    if (typeof window !== 'undefined' && window.sessionStorage) {
      const sessionToken =
        sessionStorage.getItem(HAVENS_JWT_TOKEN_KEY) ||
        sessionStorage.getItem('havens_jwt_token') ||
        sessionStorage.getItem('token');
      if (sessionToken) return sessionToken;
    }
  } catch (e) {
    console.warn('[AuthContext] Error reading initial token from storage:', e);
  }
  return null;
};

/**
 * AuthProvider component managing authentication state for the havens app.
 */
export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(getStoredToken);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [networkError, setNetworkError] = useState<string | null>(null);
  const apolloClient = useApolloClient();

  /**
   * Clears all session tokens from sessionStorage and resets in-memory auth state.
   */
  const clearSession = useCallback(() => {
    secureStorage.removeItem(HAVENS_JWT_TOKEN_KEY);
    if (typeof window !== 'undefined') {
      if (window.sessionStorage) {
        sessionStorage.removeItem(HAVENS_JWT_TOKEN_KEY);
        sessionStorage.removeItem('havens_jwt_token');
        sessionStorage.removeItem('token');
      }
      if (window.localStorage) {
        localStorage.removeItem(HAVENS_JWT_TOKEN_KEY);
        localStorage.removeItem('havens_jwt_token');
        localStorage.removeItem('token');
      }
    }
    setToken(null);
    setUser(null);
  }, []);

  /**
   * Fetches the current user's profile metrics from Django GraphQL.
   */
  const loadUserProfile = useCallback(
    async (jwtToken: string): Promise<UserProfile | null> => {
      try {
        const response = await apolloClient.query({
          query: MY_PROFILE,
          fetchPolicy: 'network-only',
          context: {
            headers: {
              authorization: jwtToken.startsWith('JWT ') || jwtToken.startsWith('Bearer ')
                ? jwtToken
                : `JWT ${jwtToken}`,
            },
          },
        });

        if (response.data && response.data.myProfile) {
          setUser(response.data.myProfile);
          setNetworkError(null);
          return response.data.myProfile;
        } else {
          clearSession();
          return null;
        }
      } catch (err: any) {
        console.warn('[AuthContext] Session fetch error:', err?.message || err);
        const msg = (err?.message || '').toLowerCase();
        if (msg.includes('authentication required') || msg.includes('jwt') || msg.includes('signature')) {
          clearSession();
        } else {
          setNetworkError('Cannot connect to server. Please check your connection.');
        }
        return null;
      }
    },
    [apolloClient, clearSession]
  );

  // Automatically validate token and fetch profile on first render / page refresh
  useEffect(() => {
    const initAuth = async () => {
      const stored = getStoredToken();
      if (stored) {
        setToken(stored);
        setIsLoading(true);
        await loadUserProfile(stored);
      } else {
        setToken(null);
        setUser(null);
      }
      setIsLoading(false);
    };

    initAuth();
  }, [loadUserProfile]);

  /**
   * Saves new JWT token in sessionStorage and populates user profile before resolving.
   */
  const login = async (newToken: string) => {
    // 1. Immediately persist token in sessionStorage (expires on browser close)
    await secureStorage.setItem(HAVENS_JWT_TOKEN_KEY, newToken);
    if (typeof window !== 'undefined') {
      if (window.sessionStorage) {
        sessionStorage.setItem(HAVENS_JWT_TOKEN_KEY, newToken);
      }
      // Purge any legacy localStorage tokens to ensure session does not persist across browser restarts
      if (window.localStorage) {
        localStorage.removeItem(HAVENS_JWT_TOKEN_KEY);
        localStorage.removeItem('havens_jwt_token');
        localStorage.removeItem('token');
      }
    }

    // 2. Set token state
    setToken(newToken);
    setNetworkError(null);
    setIsLoading(true);

    // 3. Await user profile fetch so state is ready before navigation
    try {
      const profile = await loadUserProfile(newToken);
      if (!profile) {
        throw new Error('Authentication succeeded but failed to load user profile.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Removes session token, resets Apollo cache, and resets state.
   */
  const logout = () => {
    clearSession();
    setNetworkError(null);
    setIsLoading(false);
    apolloClient.clearStore().catch(() => {});
  };

  const refetchUser = async () => {
    const activeToken = token || getStoredToken();
    if (activeToken) {
      await loadUserProfile(activeToken);
    }
  };

  const clearError = () => {
    setNetworkError(null);
  };

  const isOnboarded = Boolean(user && user.hobbies && user.hobbies.length > 0);

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        isLoading,
        isOnboarded,
        networkError,
        login,
        logout,
        refetchUser,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

/**
 * Custom hook to access havens authentication state and methods.
 */
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

