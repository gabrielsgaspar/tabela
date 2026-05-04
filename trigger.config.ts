import { defineConfig } from "@trigger.dev/sdk/v3";

export default defineConfig({
  project: "proj_mrvlprkjhscqdserptaz",
  dirs: ["./src/trigger"],
  // Five leagues × two fetches × ~6 s sleep = ~90 s worst case; 300 s is generous headroom.
  maxDuration: 300,
  retries: {
    enabledInDev: false,
    default: {
      maxAttempts: 3,
      minTimeoutInMs: 1000,
      maxTimeoutInMs: 10000,
      factor: 2,
      randomize: true,
    },
  },
});
