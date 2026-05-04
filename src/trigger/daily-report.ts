// Daily report task — runs once per day, processes yesterday's matches.
// Scheduled at 07:00 UTC so all late European night matches are finished.
//
// The task delegates to runDailyPipeline() in pipeline.ts, which is also
// used by scripts/backfill.ts. All logic lives there; this file is only
// the Trigger.dev wrapper and schedule definition.

import { task, schedules } from "@trigger.dev/sdk";
import { runDailyPipeline } from "./pipeline";

// Return the UTC date for yesterday as YYYY-MM-DD.
function yesterdayUtc(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

// Scheduled cron: 07:00 UTC every day.
// The schedule is registered here so `pnpm trigger:dev` picks it up.
export const dailyReportSchedule = schedules.task({
  id: "daily-report",
  cron: "0 7 * * *",
  run: async () => {
    const date = yesterdayUtc();
    console.log(`[daily-report] Starting pipeline for ${date}`);

    const result = await runDailyPipeline(date);

    console.log(
      `[daily-report] Done for ${date}: ` +
        `leagues ok=${result.leaguesDataOk.join(",") || "none"} ` +
        `failed=${result.leaguesDataFailed.join(",") || "none"} ` +
        `matches=${result.leaguesWithMatches.join(",") || "none"} ` +
        `editorials written=${result.editorialsWritten} ` +
        `failed=${result.editorialsFailed}`,
    );

    return result;
  },
});

// One-shot task: trigger manually for a specific date.
// Usage: trigger from the dashboard or CLI with payload { date: "YYYY-MM-DD" }.
export const dailyReportOneShot = task({
  id: "daily-report-one-shot",
  run: async (payload: { date: string }) => {
    const { date } = payload;
    console.log(`[daily-report-one-shot] Starting pipeline for ${date}`);
    const result = await runDailyPipeline(date);
    console.log(`[daily-report-one-shot] Done:`, result);
    return result;
  },
});
