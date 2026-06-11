// Shared form state for the onboarding flow. Kept out of actions.ts so that
// file can export only async server actions (a "use server" constraint).

export interface OnboardingState {
  status: "idle" | "error";
  message?: string;
}
