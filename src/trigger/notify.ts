// Run notification — fires after each daily pipeline run.
//
// Destination: Discord webhook (DISCORD_NOTIFY_WEBHOOK env var).
// If the env var is absent the function is a no-op, so local runs and
// test invocations do not require a real webhook URL.
//
// Set DISCORD_NOTIFY_WEBHOOK in:
//   - Trigger.dev Production environment variables
//   - .env.local for local testing (optional)
//
// To create a webhook: Discord → channel settings → Integrations →
// Webhooks → New Webhook → Copy URL.

import type { PipelineResult } from "./pipeline";

export async function notifyRunComplete(result: PipelineResult): Promise<void> {
  const webhookUrl = process.env.DISCORD_NOTIFY_WEBHOOK;
  if (!webhookUrl) return; // silent no-op when not configured

  const ok = result.leaguesDataFailed.length === 0 && result.editorialsFailed === 0;
  const audioOk = result.audioFailed === 0;

  const statusIcon = ok ? "✅" : "⚠️";
  const audioIcon = audioOk ? "🔊" : "🔇";

  const leaguesLine =
    result.leaguesDataOk.length > 0
      ? `Leagues OK: ${result.leaguesDataOk.join(", ")}`
      : "Leagues OK: none";

  const failedLine =
    result.leaguesDataFailed.length > 0
      ? `\nLeagues FAILED: ${result.leaguesDataFailed.join(", ")}`
      : "";

  const editorialLine = `📝 Editorials: ${result.editorialsWritten} written, ${result.editorialsFailed} failed`;
  const audioLine = `${audioIcon} Audio: ${result.audioSynthesised} synthesised, ${result.audioFailed} failed`;

  const content = [
    `${statusIcon} **Tabela — ${result.date}**`,
    leaguesLine + failedLine,
    editorialLine,
    audioLine,
  ].join("\n");

  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
    if (!res.ok) {
      console.warn(`[notify] Discord webhook returned ${res.status} — notification may not have delivered.`);
    }
  } catch (err) {
    // Notification failures are non-fatal. Log and continue.
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[notify] Discord webhook failed: ${msg}`);
  }
}
