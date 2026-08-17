import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useLazyQuery, useApolloClient } from '@apollo/client';
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
 * AuthProvider component managing authentication state for the havens app.
 * Persists session tokens using secureStorage and loads user profile metrics.
 * 
 * Includes robust network error recovery to prevent infinite loading screens
 * when the backend is unreachable (e.g. ERR_CONNECTION_REFUSED) or returns errors.
 */
export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => {
    let t = secureStorage.getItemSync(HAVENS_JWT_TOKEN_KEY);
    if (!t && typeof window !== 'undefined' && window.localStorage) {
      t =
        localStorage.getItem('token') ||
        localStorage.getItem('havens_jwt_token') ||
        localStorage.getItem(HAVENS_JWT_TOKEN_KEY);
    }
    return t;
  });

  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(Boolean(token));
  const [networkError, setNetworkError] = useState<string | null>(null);
  const apolloClient = useApolloClient();

  const [fetchProfile, { data: profileData, error: profileError }] = useLazyQuery(MY_PROFILE, {
    fetchPolicy: 'network-only',
    errorPolicy: 'all',
  });

  /**
   * Helper to clear all session artifacts safely
   */
  const clearSession = useCallback(() => {
    secureStorage.removeItem(HAVENS_JWT_TOKEN_KEY);
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem('token');
      localStorage.removeItem('havens_jwt_token');
      localStorage.removeItem(HAVENS_JWT_TOKEN_KEY);
    }
    setToken(null);
    setUser(null);
  }, []);

  // Handle lazy query result via standard React useEffect (Apollo 3.14+ compliant)
  useEffect(() => {
    if (profileData) {
      if (profileData.myProfile) {
        setUser(profileData.myProfile);
        setNetworkError(null);
      } else {
        // Token was invalid or user record not found
        clearSession();
      }
      setIsLoading(false);
    } else if (profileError) {
      console.warn('[AuthContext] Session fetch error / network unreachable:', profileError.message);
      // Gracefully clear broken session on connection refusal / network error
      clearSession();
      setNetworkError('Cannot connect to server. Please check your connection and try again.');
      setIsLoading(false);
    }
  }, [profileData, profileError, clearSession]);

  // Automatically fetch profile metrics on mount when token is present
  useEffect(() => {
    if (token) {
      setIsLoading(true);
      fetchProfile().catch((err) => {
        console.warn('[AuthContext] fetchProfile unhandled catch:', err);
        clearSession();
        setNetworkError('Cannot connect to server. Please try again later.');
        setIsLoading(false);
      });
    } else {
      setUser(null);
      setIsLoading(false);
    }
  }, [token, fetchProfile, clearSession]);

  /**
   * Saves new JWT token using secureStorage and populates active session state.
   */
  const login = async (newToken: string) => {
    await secureStorage.setItem(HAVENS_JWT_TOKEN_KEY, newToken);
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem('token', newToken);
      localStorage.setItem('havens_jwt_token', newToken);
      localStorage.setItem(HAVENS_JWT_TOKEN_KEY, newToken);
    }
    setToken(newToken);
    setNetworkError(null);
    setIsLoading(true);
    try {
      await fetchProfile();
    } catch (err: any) {
      console.warn('[AuthContext] Login fetchProfile error:', err);
      clearSession();
      setNetworkError(err?.message || 'Cannot connect to server.');
      setIsLoading(false);
    }
  };

  /**
   * Removes session token from secureStorage, clears Apollo cache, and resets state.
   */
  const logout = () => {
    clearSession();
    setNetworkError(null);
    setIsLoading(false);
    apolloClient.resetStore().catch(() => {});
  };

  const refetchUser = async () => {
    if (token) {
      try {
        await fetchProfile();
      } catch (err) {
        console.warn('[AuthContext] refetchUser error:', err);
        setIsLoading(false);
      }
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
