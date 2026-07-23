import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useLazyQuery, useApolloClient } from '@apollo/client';
import { MY_PROFILE } from '../graphql/operations';
import { HAVENS_JWT_TOKEN_KEY } from '../services/apollo';
import { secureStorage } from '../services/secureStore';

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  totalPoints?: number;
  bio?: string;
  neighbourhood?: string;
  photoUrl?: string;
}

interface AuthContextType {
  token: string | null;
  user: UserProfile | null;
  isLoading: boolean;
  login: (token: string) => Promise<void>;
  logout: () => void;
  refetchUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * AuthProvider component managing authentication state for the havens app.
 * Persists session tokens using secureStorage and loads user profile metrics.
 */
export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => secureStorage.getItemSync(HAVENS_JWT_TOKEN_KEY));
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const apolloClient = useApolloClient();

  const [fetchProfile] = useLazyQuery(MY_PROFILE, {
    fetchPolicy: 'network-only',
    onCompleted: (data) => {
      if (data && data.myProfile) {
        setUser(data.myProfile);
      } else {
        setUser(null);
      }
      setIsLoading(false);
    },
    onError: () => {
      setUser(null);
      setIsLoading(false);
    },
  });

  // Automatically fetch profile metrics on mount when token is present
  useEffect(() => {
    if (token) {
      setIsLoading(true);
      fetchProfile();
    } else {
      setUser(null);
      setIsLoading(false);
    }
  }, [token, fetchProfile]);

  /**
   * Saves new JWT token using secureStorage and populates active session state.
   */
  const login = async (newToken: string) => {
    await secureStorage.setItem(HAVENS_JWT_TOKEN_KEY, newToken);
    setToken(newToken);
    setIsLoading(true);
    await fetchProfile();
  };

  /**
   * Removes session token from secureStorage, clears Apollo cache, and resets state.
   */
  const logout = () => {
    secureStorage.removeItem(HAVENS_JWT_TOKEN_KEY);
    setToken(null);
    setUser(null);
    setIsLoading(false);
    apolloClient.resetStore().catch(() => {});
  };

  const refetchUser = async () => {
    if (token) {
      await fetchProfile();
    }
  };

  return (
    <AuthContext.Provider value={{ token, user, isLoading, login, logout, refetchUser }}>
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
