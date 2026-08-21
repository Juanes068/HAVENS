/**
 * ============================================================================
 * SOCIAL VIEW (FACADE AGGREGATOR)
 * ============================================================================
 * This file serves as a backwards-compatible entry point re-exporting the
 * decomposed Social components from `./Social/`.
 *
 * Modular Structure:
 *   - ./Social/types.ts                   -> Data models & circle data
 *   - ./Social/utils/ignoreStorage.ts     -> 24h suppression & affinity logic
 *   - ./Social/components/MeetTab.tsx     -> Discovery candidate cards
 *   - ./Social/components/ConnectionsTab.tsx -> Requests, friends & chat links
 *   - ./Social/components/CirclesTab.tsx  -> Community micro-groups & explore modal
 *   - ./Social/index.tsx                  -> Social Hub tab coordinator
 * ============================================================================
 */

export * from './Social/types';
export { SocialView, default } from './Social/index';
