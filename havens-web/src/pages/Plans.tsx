/**
 * ============================================================================
 * PLANS VIEW (FACADE AGGREGATOR)
 * ============================================================================
 * This file serves as a backwards-compatible entry point re-exporting the
 * decomposed Plans components from `./Plans/`.
 *
 * Modular Structure:
 *   - ./Plans/types.ts                   -> Data models, constants & helpers
 *   - ./Plans/components/PlanCreateForm.tsx -> Creation form & live preview
 *   - ./Plans/components/PlanCardGrid.tsx   -> Filter pills & event feed
 *   - ./Plans/components/PlanDeleteModal.tsx-> Delete confirmation modal
 *   - ./Plans/index.tsx                  -> SubTab coordinator
 * ============================================================================
 */

export * from './Plans/types'
export { PlansView, default } from './Plans/index'
