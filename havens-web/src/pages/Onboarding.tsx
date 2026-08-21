/**
 * ============================================================================
 * ONBOARDING VIEW (FACADE AGGREGATOR)
 * ============================================================================
 * This file serves as a backwards-compatible entry point re-exporting the
 * decomposed Onboarding wizard components from `./Onboarding/`.
 *
 * Modular Structure:
 *   - ./Onboarding/types.ts                   -> Taxonomy models, gradients & constants
 *   - ./Onboarding/components/Step1Account.tsx -> Account credentials & invite code
 *   - ./Onboarding/components/Step2Categories.tsx -> Primary categories selector
 *   - ./Onboarding/components/Step3Hobbies.tsx    -> Sub-category tags selector
 *   - ./Onboarding/components/Step4ProfilePhoto.tsx -> Avatar photo upload
 *   - ./Onboarding/index.tsx                  -> 4-Step Wizard coordinator
 * ============================================================================
 */

export * from './Onboarding/types';
export { OnboardingView, default } from './Onboarding/index';
