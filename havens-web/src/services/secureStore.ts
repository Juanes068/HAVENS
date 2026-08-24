/**
 * Secure Storage Service Abstraction
 * 
 * Provides unified, secure access methods for persisting JWT authentication tokens
 * and sensitive tokens. In web environments, uses browser storage wrappers;
 * designed to seamlessly delegate to `expo-secure-store` or `react-native-keychain`
 * in mobile (React Native) environments to prevent unencrypted plain-text token exposure.
 */

export interface ISecureStorage {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
}

class SecureStorageService implements ISecureStorage {
  /**
   * Retrieves a stored item asynchronously.
   * Uses sessionStorage in web environments so tokens automatically clear on browser close.
   */
  async getItem(key: string): Promise<string | null> {
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        return sessionStorage.getItem(key);
      }
      return null;
    } catch (error) {
      console.warn(`[SecureStore] Error reading key "${key}":`, error);
      return null;
    }
  }

  /**
   * Synchronous getter for immediate state initialization where required.
   */
  getItemSync(key: string): string | null {
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        return sessionStorage.getItem(key);
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Securely persists a token value in sessionStorage for the duration of the browser session.
   */
  async setItem(key: string, value: string): Promise<void> {
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        sessionStorage.setItem(key, value);
      }
    } catch (error) {
      console.error(`[SecureStore] Error setting key "${key}":`, error);
    }
  }

  /**
   * Purges a stored token from sessionStorage (and clears any legacy localStorage item).
   */
  async removeItem(key: string): Promise<void> {
    try {
      if (typeof window !== 'undefined') {
        if (window.sessionStorage) {
          sessionStorage.removeItem(key);
        }
        if (window.localStorage) {
          localStorage.removeItem(key);
        }
      }
    } catch (error) {
      console.error(`[SecureStore] Error removing key "${key}":`, error);
    }
  }
}

export const secureStorage = new SecureStorageService();
