# CLAUDE.md

Read this before doing anything in this repo.

## What is Tabela?

A daily editorial briefing on the top five European football leagues. Every morning a scheduled task fetches yesterday's matches, updates season stats, asks Claude to write a short summary, generates an audio version, and publishes to a Next.js site. See [README.md](./README.md) for the full pitch.

## Stack

Next.js 16 · Trigger.dev v4 · Supabase (Postgres + Storage) · Anthropic Claude · ElevenLabs · Football-Data.org

## Where things live

| Path | What |
|------|------|
| `src/app/` | Next.js app router pages |
| `src/trigger/` | Trigger.dev scheduled tasks (daily report) |
| `src/football/` | Football-Data.org API client |
| `src/editorial/` | Claude prompts, generation pipelines |
| `src/lib/` | Shared types and utilities |
| `claude_design/` | Visual spec — reference only, **do not modify** |
| `ROADMAP.md` | Current phase and what's next |
| `DECISIONS.md` | Architectural choices, append-only |
| `DATA.md` | API endpoints, schemas, data shapes |
| `VOICE.md` | Editorial voice — required reading before writing prompts |

## Current phase

Read [ROADMAP.md](./ROADMAP.md) to find out which phase we're on. Each phase starts with a `PLAN.md` at the repo root that you should write and have approved *before* writing code.

## Voice

Tabela's editorial voice is warm, knowledgeable, allusive — never shouty. Any prompt that generates user-visible text must reference [VOICE.md](./VOICE.md) and follow its examples. This is not optional polish; it's the product.

## ALWAYS

- Start a new phase by writing a `PLAN.md` and waiting for approval before coding.
- Read [VOICE.md](./VOICE.md) before writing or modifying any prompt that generates content.
- Use TypeScript strict mode. Match Football-Data.org response shapes exactly in types.
- Keep secrets out of code. Use `.env.local`. Never commit it.
- Use kebab-case for file names, PascalCase for React components, camelCase for variables.
- Run `pnpm typecheck` and `pnpm lint` before declaring a task done.
- Append to [DECISIONS.md](./DECISIONS.md) for any architectural choice (new dependency, new service, schema change, scheduling change).
- Update [ROADMAP.md](./ROADMAP.md) when a phase milestone is complete.

## NEVER

- Do not commit `.env`, `.env.local`, or any file containing real keys.
- Do not modify files in `claude_design/` — it's the visual reference.
- Do not invent match data. If an API call fails or returns nothing, surface it; do not fill the gap with plausible-looking placeholders.
- Do not let editorial prompts generate facts not present in the input data. The voice is allusive but the facts must be real.
- Do not introduce a new external service or paid dependency without updating `DECISIONS.md` first.
- Do not "improve" the visual design unilaterally. The look in `claude_design/` is the spec.
- Do not skip the phase plan. We work phase by phase.

## How to run

```bash
pnpm install
pnpm dev          # Next.js dev server (Phase 4+)
pnpm trigger:dev  # Trigger.dev local task runner (Phase 1+)
pnpm typecheck
pnpm lint
```

## Working in this repo

- **New phase?** Read `ROADMAP.md`, write `PLAN.md` for the phase, wait for approval.
- **Mid-phase?** Pick up where `ROADMAP.md`'s "current" marker says we are.
- **Stuck or unsure?** Check `DECISIONS.md` for prior context. Ask before making a new architectural call.

## A note on tone in code

Comments and commit messages should match the spirit of the project: clear, specific, no breathless hype. "Adds Football-Data client and basic match fetcher" not "AMAZING new data layer 🚀".


<!-- TRIGGER.DEV basic START -->
# Trigger.dev Basic Tasks (v4)

**MUST use `@trigger.dev/sdk`, NEVER `client.defineJob`**

## Basic Task

```ts
import { task } from "@trigger.dev/sdk";

export const processData = task({
  id: "process-data",
  retry: {
    maxAttempts: 10,
    factor: 1.8,
    minTimeoutInMs: 500,
    maxTimeoutInMs: 30_000,
    randomize: false,
  },
  run: async (payload: { userId: string; data: any[] }) => {
    // Task logic - runs for long time, no timeouts
    console.log(`Processing ${payload.data.length} items for user ${payload.userId}`);
    return { processed: payload.data.length };
  },
});
```

## Schema Task (with validation)

```ts
import { schemaTask } from "@trigger.dev/sdk";
import { z } from "zod";

export const validatedTask = schemaTask({
  id: "validated-task",
  schema: z.object({
    name: z.string(),
    age: z.number(),
    email: z.string().email(),
  }),
  run: async (payload) => {
    // Payload is automatically validated and typed
    return { message: `Hello ${payload.name}, age ${payload.age}` };
  },
});
```

## Triggering Tasks

### From Backend Code

```ts
import { tasks } from "@trigger.dev/sdk";
import type { processData } from "./trigger/tasks";

// Single trigger
const handle = await tasks.trigger<typeof processData>("process-data", {
  userId: "123",
  data: [{ id: 1 }, { id: 2 }],
});

// Batch trigger (up to 1,000 items, 3MB per payload)
const batchHandle = await tasks.batchTrigger<typeof processData>("process-data", [
  { payload: { userId: "123", data: [{ id: 1 }] } },
  { payload: { userId: "456", data: [{ id: 2 }] } },
]);
```

### Debounced Triggering

Consolidate multiple triggers into a single execution:

```ts
// Multiple rapid triggers with same key = single execution
await myTask.trigger(
  { userId: "123" },
  {
    debounce: {
      key: "user-123-update",  // Unique key for debounce group
      delay: "5s",              // Wait before executing
    },
  }
);

// Trailing mode: use payload from LAST trigger
await myTask.trigger(
  { data: "latest-value" },
  {
    debounce: {
      key: "trailing-example",
      delay: "10s",
      mode: "trailing",  // Default is "leading" (first payload)
    },
  }
);
```

**Debounce modes:**
- `leading` (default): Uses payload from first trigger, subsequent triggers only reschedule
- `trailing`: Uses payload from most recent trigger

### From Inside Tasks (with Result handling)

```ts
export const parentTask = task({
  id: "parent-task",
  run: async (payload) => {
    // Trigger and continue
    const handle = await childTask.trigger({ data: "value" });

    // Trigger and wait - returns Result object, NOT task output
    const result = await childTask.triggerAndWait({ data: "value" });
    if (result.ok) {
      console.log("Task output:", result.output); // Actual task return value
    } else {
      console.error("Task failed:", result.error);
    }

    // Quick unwrap (throws on error)
    const output = await childTask.triggerAndWait({ data: "value" }).unwrap();

    // Batch trigger and wait
    const results = await childTask.batchTriggerAndWait([
      { payload: { data: "item1" } },
      { payload: { data: "item2" } },
    ]);

    for (const run of results) {
      if (run.ok) {
        console.log("Success:", run.output);
      } else {
        console.log("Failed:", run.error);
      }
    }
  },
});

export const childTask = task({
  id: "child-task",
  run: async (payload: { data: string }) => {
    return { processed: payload.data };
  },
});
```

> Never wrap triggerAndWait or batchTriggerAndWait calls in a Promise.all or Promise.allSettled as this is not supported in Trigger.dev tasks.

## Waits

```ts
import { task, wait } from "@trigger.dev/sdk";

export const taskWithWaits = task({
  id: "task-with-waits",
  run: async (payload) => {
    console.log("Starting task");

    // Wait for specific duration
    await wait.for({ seconds: 30 });
    await wait.for({ minutes: 5 });
    await wait.for({ hours: 1 });
    await wait.for({ days: 1 });

    // Wait until specific date
    await wait.until({ date: new Date("2024-12-25") });

    // Wait for token (from external system)
    await wait.forToken({
      token: "user-approval-token",
      timeoutInSeconds: 3600, // 1 hour timeout
    });

    console.log("All waits completed");
    return { status: "completed" };
  },
});
```

> Never wrap wait calls in a Promise.all or Promise.allSettled as this is not supported in Trigger.dev tasks.

## Key Points

- **Result vs Output**: `triggerAndWait()` returns a `Result` object with `ok`, `output`, `error` properties - NOT the direct task output
- **Type safety**: Use `import type` for task references when triggering from backend
- **Waits > 5 seconds**: Automatically checkpointed, don't count toward compute usage
- **Debounce + idempotency**: Idempotency keys take precedence over debounce settings

## NEVER Use (v2 deprecated)

```ts
// BREAKS APPLICATION
client.defineJob({
  id: "job-id",
  run: async (payload, io) => {
    /* ... */
  },
});
```

Use SDK (`@trigger.dev/sdk`), check `result.ok` before accessing `result.output`

<!-- TRIGGER.DEV basic END -->