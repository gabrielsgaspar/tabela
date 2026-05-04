// Anthropic SDK wrapper for editorial generation.
// All four editorial formats (match caption, match summary, league overview,
// day overview) flow through generate(). Prompt construction is in prompts.ts;
// this file only handles the API call and extracts the tool_use result.
//
// Prompt caching: the VOICE_BLOCK in every PromptPackage is marked
// cache_control: ephemeral. With many caption calls per run, this saves
// re-encoding ~600 tokens on every request after the first.

import Anthropic from "@anthropic-ai/sdk";
import type { PromptPackage } from "./prompts";

// Singleton — created once per process. The SDK reads ANTHROPIC_API_KEY
// from the environment automatically.
const anthropic = new Anthropic();

// The model to use for all editorial generation. Claude Sonnet 4.6 gives
// the right balance of quality and speed for a daily briefing pipeline.
const MODEL = "claude-sonnet-4-6";

/**
 * Call Claude with a prompt package and extract the tool_use output.
 * T should match the tool's input_schema shape (e.g. MatchCaption, LeagueOverview).
 * Throws on API errors or missing tool_use block — let the caller decide
 * whether to retry or log-and-skip.
 */
export async function generate<T>(pkg: PromptPackage): Promise<T> {
  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 1024,
    // The system array is structurally identical to Anthropic.Messages.TextBlockParam[].
    // The local types in prompts.ts mirror the SDK types exactly — cast to bridge them.
    system: pkg.systemBlocks as Parameters<typeof anthropic.messages.create>[0]["system"],
    tools: [pkg.tool] as Parameters<typeof anthropic.messages.create>[0]["tools"],
    tool_choice: { type: "tool", name: pkg.toolName },
    messages: [{ role: "user", content: pkg.userText }],
  });

  const toolUse = response.content.find(
    (b): b is Anthropic.Messages.ToolUseBlock => b.type === "tool_use",
  );

  if (!toolUse) {
    throw new Error(
      `generate: expected tool_use block for "${pkg.toolName}" ` +
        `but got stop_reason="${response.stop_reason}" with ` +
        `${response.content.length} content block(s).`,
    );
  }

  return toolUse.input as T;
}
