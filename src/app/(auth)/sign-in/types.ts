// Shared form state for the magic-link sign-in flow. Kept out of actions.ts so
// that file can export only async server actions (a "use server" constraint).

export interface SignInState {
  status: "idle" | "sent" | "error";
  message?: string;
}
