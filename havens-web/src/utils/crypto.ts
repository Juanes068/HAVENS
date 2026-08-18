/**
 * Havens E2EE (End-to-End Encryption) Utility — MVP Placeholder
 *
 * Architecture:
 * - Each match conversation derives a symmetric AES-256-CBC key using
 *   PBKDF2(matchId + appSecret, salt).
 * - The frontend encrypts plaintext before sending via the sendMessage mutation.
 * - Django stores only ciphertext — the backend never sees plaintext.
 * - The frontend decrypts ciphertext after fetching via messagesByMatch query.
 *
 * Production Upgrade Path:
 * - Replace symmetric AES with WebCrypto ECDH key pairs for true zero-knowledge E2EE.
 * - Store public keys on the server, keep private keys in browser IndexedDB.
 *
 * Dependencies (install when wiring full chat):
 * - `npm install crypto-js @types/crypto-js`
 *
 * Usage:
 *   import { encryptMessage, decryptMessage } from '../utils/crypto';
 *
 *   // Before sendMessage mutation:
 *   const ciphertext = encryptMessage('Hello!', matchId);
 *   sendMessageMutation({ variables: { matchId, content: ciphertext } });
 *
 *   // After fetching messages:
 *   const plaintext = decryptMessage(msg.content, matchId);
 */

// The shared secret will come from a Vite environment variable in production.
// For MVP, we use a hardcoded placeholder that will be replaced.
const APP_E2EE_SECRET = import.meta.env.VITE_E2EE_SECRET || 'havens-mvp-e2ee-placeholder-key';

/**
 * Derives a deterministic conversation key from matchId + appSecret.
 * Both users in a match will derive the same key independently.
 *
 * @param matchId - The unique match/conversation ID
 * @returns The derived key string
 */
export const deriveConversationKey = (matchId: number): string => {
  // Placeholder: In production, use CryptoJS.PBKDF2() with proper salt & iterations
  return `${APP_E2EE_SECRET}-match-${matchId}`;
};

/**
 * Encrypts a plaintext message before sending to the backend.
 *
 * @param plaintext - The user's message in plaintext
 * @param matchId - The match/conversation ID for key derivation
 * @returns The encrypted ciphertext string
 *
 * TODO: Replace with CryptoJS.AES.encrypt() when crypto-js is installed:
 *   const key = deriveConversationKey(matchId);
 *   return CryptoJS.AES.encrypt(plaintext, key).toString();
 */
export const encryptMessage = (plaintext: string, matchId: number): string => {
  // MVP Passthrough: Returns plaintext as-is until crypto-js is integrated
  void matchId; // Acknowledge parameter for future use
  return plaintext;
};

/**
 * Decrypts a ciphertext message received from the backend.
 *
 * @param ciphertext - The encrypted message content from the DB
 * @param matchId - The match/conversation ID for key derivation
 * @returns The decrypted plaintext string
 *
 * TODO: Replace with CryptoJS.AES.decrypt() when crypto-js is installed:
 *   const key = deriveConversationKey(matchId);
 *   const bytes = CryptoJS.AES.decrypt(ciphertext, key);
 *   return bytes.toString(CryptoJS.enc.Utf8);
 */
export const decryptMessage = (ciphertext: string, matchId: number): string => {
  // MVP Passthrough: Returns ciphertext as-is until crypto-js is integrated
  void matchId; // Acknowledge parameter for future use
  return ciphertext;
};
