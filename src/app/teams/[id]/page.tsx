// Team page — server-rendered, reads from Supabase via anon client.
//
// Route: /teams/[id] where id is the Football-Data.org team ID (integer).
// 404 if no match_results rows exist for this team ID.
//
// Sections (top to bottom):
//   1. Masthead
//   2. Breadcrumb subnav  (Home / League / Short name)
//   3. Team header  — 96px crest + name + league tag + Position/Points/GD + FormPills
//   4. Week in context  — league_overview EditorialBlock (md)
//   5. Recent matches  — last 5 FINISHED MatchCards with captions
//   6. Upcoming fixtures  — next 3 TIMED/SCHEDULED cards
//   7. Ripple effects  — DEFERRED (Phase 6)
//   8. Season stats panel  — dark pitch section with aggregate figures
//   9. Footer
//
// Query plan (6 queries, 2 network round-trips):
//   Round 1 — Q1: recent matches (derives leagueCode + season)
//   Round 2 — Q2-Q6 in parallel:
//     Q2: upcoming matches
//     Q3: match captions by match_id
//     Q4: season_stats (standings → position/points/GD/form)
//     Q5: league_overview editorial
//     Q6: all FINISHED season matches (for aggregate computation in JS)
//
// Note on Q6: PostgREST does not support arbitrary SQL aggregations.
// Fetching all season matches (max 38) and computing in JS is safe and avoids
// adding a Postgres function/migration.

import { notFound } from "next/navigation";
import Link from "next/link";
import Masthead from "@/components/Masthead";
import Footer from "@/components/Footer";
import EditorialBlock, { EditorialBlockEmpty } from "@/components/EditorialBlock";
import MatchCard, { type MatchStatus } from "@/components/MatchCard";
import TeamCrest from "@/components/TeamCrest";
import SeasonStatsPanel from "./SeasonStatsPanel";
import SectionHeader from "@/app/SectionHeader";
import GnGMark from "@/app/GnGMark";
import { createBrowserClient } from "@/lib/supabase";
import {
  getTeamRecentMatches,
  getTeamUpcomingMatches,
  getMatchCaptionsByMatchIds,
  getTeamSeasonMatches,
  getLeagueSeasonStats,
  getLatestLeagueOverview,
  type MatchResultRow,
} from "@/lib/queries";
import { LEAGUE_META, leagueByCode } from "@/lib/leagues";
import type { StandingTableEntry } from "@/lib/query-types";

// ── helpers ───────────────────────────────────────────────────────────────────

function ordSuffix(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}

function formatLongDate(dateStr: string): string {
  const d = new Date(`${dateStr}T12:00:00Z`);
  const weekday = new Intl.DateTimeFormat("en-GB", { weekday: "short", timeZone: "UTC" }).format(d);
  const day = new Intl.DateTimeFormat("en-GB", { day: "numeric", timeZone: "UTC" }).format(d);
  const month = new Intl.DateTimeFormat("en-GB", { month: "long", timeZone: "UTC" }).format(d);
  const year = new Intl.DateTimeFormat("en-GB", { year: "numeric", timeZone: "UTC" }).format(d);
  return `${weekday} · ${day} ${month} ${year}`;
}

function formatShortDate(dateStr: string): string {
  const d = new Date(`${dateStr}T12:00:00Z`);
  const weekday = new Intl.DateTimeFormat("en-GB", { weekday: "short", timeZone: "UTC" }).format(d);
  const day = new Intl.DateTimeFormat("en-GB", { day: "numeric", timeZone: "UTC" }).format(d);
  const month = new Intl.DateTimeFormat("en-GB", { month: "short", timeZone: "UTC" }).format(d);
  return `${weekday} · ${day} ${month}`;
}

function teamCrestUrl(teamId: number): string {
  return `https://crests.football-data.org/${teamId}.png`;
}

// ── FormPillsRow ──────────────────────────────────────────────────────────────
// Renders form string as a row of 24×24 rounded pills.
// W=pitch bg, D=paper2 bg + border, L=crimson bg.
// The API provides form most-recent-first; we render as-is (newest on left).

function FormPillsRow({ form }: { form: string | null }) {
  if (!form) return null;
  const results = form.split(",").filter(Boolean);
  return (
    <div className="flex items-center gap-1.5">
      {results.map((r, i) => {
        const bg =
          r === "W" ? "#0F3D2E"
          : r === "L" ? "#B33A2E"
          : "transparent";
        const border = r === "D" ? "1px solid var(--color-rule2)" : undefined;
        const textColor =
          r === "W" ? "#F2EEE5"
          : r === "L" ? "#F2EEE5"
          : undefined;
        return (
          <span
            key={i}
            className="inline-flex items-center justify-center w-6 h-6 rounded-full font-mono text-[11px] font-medium text-ink2"
            style={{ backgroundColor: bg, border, color: textColor }}
            title={r === "W" ? "Win" : r === "D" ? "Draw" : "Loss"}
          >
            {r}
          </span>
        );
      })}
    </div>
  );
}

// ── StatItem ──────────────────────────────────────────────────────────────────
// Small label + large number for the team header stats row.

function StatItem({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <dt className="text-[11px] font-mono uppercase tracking-[0.14em] text-ink3">
        {label}
      </dt>
      <dd className="mt-1 num text-[32px] md:text-[36px] font-medium tracking-tighter2 text-ink">
        {value}
      </dd>
    </div>
  );
}

// ── UpcomingCard ──────────────────────────────────────────────────────────────

function UpcomingCard({
  match,
  teamId,
}: {
  match: MatchResultRow;
  teamId: number;
}) {
  const isHome = match.home_team_id === teamId;
  const oppId = isHome ? match.away_team_id : match.home_team_id;
  const oppName = isHome ? match.away_team_name : match.home_team_name;

  return (
    <div className="rule-t pt-5">
      <div className="text-[11px] font-mono uppercase tracking-[0.14em] text-ink3">
        {formatShortDate(match.date)}
        {match.matchday != null && (
          <span className="ml-2 text-rule2">· Matchday {match.matchday}</span>
        )}
      </div>
      <div className="mt-3 flex items-center gap-3">
        <span className="text-[11px] font-mono uppercase tracking-[0.12em] text-ink3 w-8 shrink-0">
          {isHome ? "vs" : "@"}
        </span>
        <TeamCrest src={teamCrestUrl(oppId)} alt={oppName} size={32} />
        <div
          className="h-serif text-[20px] md:text-[22px] text-ink truncate"
          style={{ textWrap: "pretty" } as React.CSSProperties}
        >
          {oppName}
        </div>
      </div>
    </div>
  );
}

// ── season aggregate computation ──────────────────────────────────────────────

interface TeamSeasonAggregate {
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  cleanSheets: number;
}

function computeAggregate(
  matches: Pick<MatchResultRow, "home_team_id" | "away_team_id" | "score_home" | "score_away">[],
  teamId: number
): TeamSeasonAggregate {
  let wins = 0, draws = 0, losses = 0, goalsFor = 0, goalsAgainst = 0, cleanSheets = 0;

  for (const m of matches) {
    const isHome = m.home_team_id === teamId;
    const gf = isHome ? (m.score_home ?? 0) : (m.score_away ?? 0);
    const ga = isHome ? (m.score_away ?? 0) : (m.score_home ?? 0);
    goalsFor += gf;
    goalsAgainst += ga;
    if (gf > ga) wins++;
    else if (gf === ga) draws++;
    else losses++;
    if (ga === 0) cleanSheets++;
  }

  return {
    played: matches.length,
    wins,
    draws,
    losses,
    goalsFor,
    goalsAgainst,
    goalDifference: goalsFor - goalsAgainst,
    cleanSheets,
  };
}

// ── page ──────────────────────────────────────────────────────────────────────

export default async function TeamPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const teamId = parseInt(id, 10);
  if (isNaN(teamId)) notFound();

  const db = createBrowserClient();
  const today = new Date().toISOString().slice(0, 10);

  // Q1 — recent finished matches; 404 if the team has no records.
  const recentMatches = await getTeamRecentMatches(db, teamId, 5);
  if (recentMatches.length === 0) notFound();

  // Derive team identity and league from the first result row.
  const firstMatch = recentMatches[0];
  const isHomeInFirst = firstMatch.home_team_id === teamId;
  const teamName = isHomeInFirst ? firstMatch.home_team_name : firstMatch.away_team_name;
  const teamShort = isHomeInFirst ? firstMatch.home_team_short : firstMatch.away_team_short;
  const leagueCode = firstMatch.league_code;
  const season = firstMatch.season;
  const leagueMeta = leagueByCode(leagueCode) ?? null;

  // Q2–Q6 run in parallel — all depend on Q1 outputs.
  const matchIds = recentMatches.map((m) => String(m.match_id));

  const [upcoming, captions, statsRows, overview, seasonMatches] = await Promise.all([
    getTeamUpcomingMatches(db, teamId, today, 3),
    getMatchCaptionsByMatchIds(db, matchIds),
    getLeagueSeasonStats(db, leagueCode, 1),
    getLatestLeagueOverview(db, leagueCode),
    getTeamSeasonMatches(db, teamId, season),
  ]);

  // Extract team standing from the latest season_stats snapshot.
  const latestStats = statsRows[0] ?? null;
  const totalGroup = latestStats?.payload.standings?.standings?.find(
    (s) => s.type === "TOTAL"
  );
  const standing: StandingTableEntry | null =
    totalGroup?.table.find((r) => r.team.id === teamId) ?? null;

  // Compute season aggregate.
  const aggregate = computeAggregate(seasonMatches, teamId);

  // Masthead date — most recent match date.
  const mastheadDate = formatLongDate(firstMatch.date);

  // Editorial content.
  const overviewParagraphs = overview?.body
    ? overview.body.split("\n\n").filter(Boolean)
    : [];

  const gdDisplay =
    standing == null
      ? "—"
      : standing.goalDifference > 0
        ? `+${standing.goalDifference}`
        : String(standing.goalDifference);

  return (
    <div className="min-h-screen bg-paper">
      <Masthead dateLong={mastheadDate} edition="European edition" />

      {/* ── Breadcrumb subnav ─────────────────────────────────────────── */}
      <div
        className="rule-t"
        style={{
          backgroundColor:
            "color-mix(in oklch, var(--color-paper2) 40%, transparent)",
        }}
      >
        <div className="max-w-content mx-auto px-5 md:px-8 py-3 flex items-center gap-3 text-[12px] font-mono uppercase tracking-[0.14em] text-ink3">
          <Link href="/" className="pass-link text-ink2 hover:text-ink transition-colors">
            Home
          </Link>
          {leagueMeta && (
            <>
              <span className="text-rule2" aria-hidden="true">/</span>
              <Link
                href={`/leagues/${leagueMeta.slug}`}
                className="pass-link text-ink2 hover:text-ink transition-colors"
              >
                {leagueMeta.name}
              </Link>
            </>
          )}
          <span className="text-rule2" aria-hidden="true">/</span>
          <span className="text-ink">{teamShort}</span>
        </div>
      </div>

      {/* ── Team header ───────────────────────────────────────────────── */}
      <section className="rule-t">
        <div className="max-w-content mx-auto px-5 md:px-8 py-10 md:py-14">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-end">

            {/* Left: crest + name */}
            <div className="md:col-span-7 flex items-end gap-6">
              <div className="shrink-0">
                <TeamCrest src={teamCrestUrl(teamId)} alt={teamName} size={96} />
              </div>
              <div className="min-w-0">
                {leagueMeta && (
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-[16px]" aria-hidden="true">
                      {leagueMeta.flag}
                    </span>
                    <Link
                      href={`/leagues/${leagueMeta.slug}`}
                      className="pass-link text-[11px] font-mono uppercase tracking-[0.14em] text-ink3 hover:text-ink transition-colors"
                    >
                      {leagueMeta.name}
                    </Link>
                  </div>
                )}
                <h1
                  className="h-serif text-[44px] md:text-[64px] leading-[0.95] text-ink"
                  style={{ textWrap: "balance" } as React.CSSProperties}
                >
                  {teamName}
                </h1>
              </div>
            </div>

            {/* Right: stats + form */}
            <div className="md:col-span-5">
              <dl className="grid grid-cols-3 gap-4 rule-t pt-5">
                <StatItem
                  label="Position"
                  value={
                    standing
                      ? `${standing.position}${ordSuffix(standing.position)}`
                      : "—"
                  }
                />
                <StatItem
                  label="Points"
                  value={standing?.points ?? "—"}
                />
                <StatItem label="GD" value={gdDisplay} />
              </dl>
              {standing?.form && (
                <div className="mt-4 flex items-baseline gap-3">
                  <span className="text-[11px] font-mono uppercase tracking-[0.14em] text-ink3 shrink-0">
                    Form
                  </span>
                  <FormPillsRow form={standing.form} />
                </div>
              )}
            </div>

          </div>
        </div>
      </section>

      {/* ── Week in context ───────────────────────────────────────────── */}
      <section className="rule-t bg-paper">
        <div className="max-w-content mx-auto px-5 md:px-8 py-12 md:py-16">
          {overview ? (
            <>
              <EditorialBlock
                kicker={
                  <>
                    <span>The week in context</span>
                    <span className="text-rule2">·</span>
                    <span>{leagueMeta?.name ?? leagueCode}</span>
                  </>
                }
                headline={overview.headline ?? "This week in the league"}
                paragraphs={overviewParagraphs}
                size="md"
              />
              <p className="mt-5 text-[13px] font-serif italic text-ink3">
                This week&rsquo;s {leagueMeta?.name ?? leagueCode} overview —
                team-specific weekly brief coming in a future edition.
              </p>
            </>
          ) : (
            <EditorialBlockEmpty />
          )}
        </div>
      </section>

      {/* ── Recent matches ────────────────────────────────────────────── */}
      <section className="rule-t">
        <div className="max-w-content mx-auto px-5 md:px-8 py-12 md:py-16">
          <SectionHeader
            eyebrow="Last five"
            title="Recent matches"
            deck="Five fixtures, five sentences. The longer report is one click away."
          />
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-x-12">
            {recentMatches.map((match) => (
              <MatchCard
                key={match.match_id}
                homeTeam={{
                  id: match.home_team_id,
                  name: match.home_team_name,
                  shortName: match.home_team_short,
                  crestUrl: teamCrestUrl(match.home_team_id),
                }}
                awayTeam={{
                  id: match.away_team_id,
                  name: match.away_team_name,
                  shortName: match.away_team_short,
                  crestUrl: teamCrestUrl(match.away_team_id),
                }}
                homeScore={match.score_home}
                awayScore={match.score_away}
                status={match.status as MatchStatus}
                matchday={match.matchday}
                kickoffTime={null}
                leagueCode={match.league_code}
                caption={captions.get(String(match.match_id))}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ── Upcoming fixtures ─────────────────────────────────────────── */}
      {upcoming.length > 0 && (
        <section
          className="rule-t"
          style={{
            backgroundColor:
              "color-mix(in oklch, var(--color-paper2) 60%, transparent)",
          }}
        >
          <div className="max-w-content mx-auto px-5 md:px-8 py-12 md:py-16">
            <SectionHeader
              eyebrow="Next three"
              title="What's coming"
              deck="Next fixtures on the calendar."
            />
            <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-x-10 gap-y-8">
              {upcoming.map((match) => (
                <UpcomingCard
                  key={match.match_id}
                  match={match}
                  teamId={teamId}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Ripple effects — deferred to Phase 6 ──────────────────────── */}
      {/* Computing ripple effects requires comparing pre- and post-matchday  */}
      {/* standings tables — a non-trivial multi-query join. Phase 6 candidate. */}

      {/* ── Season stats panel ────────────────────────────────────────── */}
      {aggregate.played > 0 && (
        <SeasonStatsPanel
          teamName={teamShort}
          played={aggregate.played}
          wins={aggregate.wins}
          draws={aggregate.draws}
          losses={aggregate.losses}
          goalsFor={aggregate.goalsFor}
          goalsAgainst={aggregate.goalsAgainst}
          goalDifference={aggregate.goalDifference}
          cleanSheets={aggregate.cleanSheets}
        />
      )}

      <Footer />
    </div>
  );
}
