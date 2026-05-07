// Home page — server-rendered, reads from Supabase via anon client.
// Shows the latest day overview, yesterday's match cards (with AI captions),
// season-to-date top scorers, and race-watch standings for all five leagues.
// ?league=<slug> filters match groups, stat leaders, and race watch server-side.

import { Suspense } from "react";
import Link from "next/link";
import Masthead from "@/components/Masthead";
import Footer from "@/components/Footer";
import EditorialBlock from "@/components/EditorialBlock";
import MatchCard, { type MatchStatus } from "@/components/MatchCard";
import StatLeaderCard from "@/components/StatLeaderCard";
import RaceWatch, { type StandingRow } from "@/components/RaceWatch";
import SectionHeader from "./SectionHeader";
import GnGMark from "./GnGMark";
import FollowTeamCTA from "./FollowTeamCTA";
import FilterBar from "./FilterBar";
import { createBrowserClient } from "@/lib/supabase";
import {
  getLatestDayOverview,
  getMatchDaysForDate,
  getMatchCaptionsForDate,
  getLatestSeasonStats,
} from "@/lib/queries";
import { LEAGUE_META, leagueBySlug } from "@/lib/leagues";

// ── helpers ───────────────────────────────────────────────────────────────────

function formatMastheadDate(dateStr: string): string {
  // Parse at noon UTC to avoid date-shifting from local timezone offset.
  const d = new Date(`${dateStr}T12:00:00Z`);
  const weekday = new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    timeZone: "UTC",
  }).format(d);
  const day = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    timeZone: "UTC",
  }).format(d);
  const month = new Intl.DateTimeFormat("en-GB", {
    month: "long",
    timeZone: "UTC",
  }).format(d);
  const year = new Intl.DateTimeFormat("en-GB", {
    year: "numeric",
    timeZone: "UTC",
  }).format(d);
  return `${weekday} · ${day} ${month} ${year}`;
}

/** Deterministic crest URL for a scorer's team (ScorerEntry.team has no crest field). */
function scorerCrestUrl(teamId: number): string {
  return `https://crests.football-data.org/${teamId}.png`;
}

// ── page ──────────────────────────────────────────────────────────────────────

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ league?: string }>;
}) {
  const { league: leagueSlug } = await searchParams;
  const activeMeta = leagueSlug ? leagueBySlug(leagueSlug) : undefined;
  // Which leagues to show in filtered sections. Narrative always shows all.
  const filteredLeagues = activeMeta ? [activeMeta] : LEAGUE_META;

  const db = createBrowserClient();

  // Kick off both independent queries in parallel.
  const [dayOverview, seasonStats] = await Promise.all([
    getLatestDayOverview(db),
    getLatestSeasonStats(db),
  ]);

  const matchDate = dayOverview?.date ?? null;

  // Match days and captions require the editorial date, so run after the above.
  const [matchDays, captions] = matchDate
    ? await Promise.all([
        getMatchDaysForDate(db, matchDate),
        getMatchCaptionsForDate(db, matchDate),
      ])
    : [[], new Map<string, string>()];

  // Format the masthead date from the editorial date, or today if no data yet.
  const displayDate = matchDate ?? new Date().toISOString().slice(0, 10);
  const mastheadDate = formatMastheadDate(displayDate);

  // Split the day overview body on double-newlines to get paragraph array.
  const dayParagraphs = dayOverview?.body
    ? dayOverview.body.split("\n\n").filter(Boolean)
    : [];

  // Index match payloads by league code for O(1) lookup.
  const matchesByLeague = new Map<
    string,
    (typeof matchDays)[number]["payload"]["matches"]
  >();
  for (const md of matchDays) {
    matchesByLeague.set(md.league_code, md.payload.matches);
  }

  return (
    <div className="min-h-screen bg-paper">
      <Masthead dateLong={mastheadDate} edition="European edition" />

      {/* ── League filter bar ─────────────────────────────────────────── */}
      {/* Suspense boundary: useSearchParams in FilterBar requires it */}
      <Suspense fallback={<div className="h-[52px] rule-b" />}>
        <FilterBar />
      </Suspense>

      {/* ── Narrative section ──────────────────────────────────────────── */}
      <section className="max-w-content mx-auto px-5 md:px-8 py-10 md:py-16">
        {dayOverview ? (
          <EditorialBlock
            kicker={
              <>
                <span>The morning brief</span>
                <span className="text-rule2">·</span>
                <span>Tabela</span>
              </>
            }
            headline={dayOverview.headline ?? "Today's edition"}
            paragraphs={dayParagraphs}
            size="lg"
          />
        ) : (
          <p className="font-serif italic text-[18px] text-ink2">
            No editorial for today yet — check back after 07:00 UTC.
          </p>
        )}
      </section>

      {/* ── Yesterday's matches ────────────────────────────────────────── */}
      <section className="rule-t bg-paper">
        <div className="max-w-content mx-auto px-5 md:px-8 py-10 md:py-14">
          <SectionHeader
            eyebrow="Yesterday"
            title="The matches"
            deck="Yesterday's results, with one editor's-cut sentence each."
          />

          <div className="mt-8 space-y-12">
            {filteredLeagues.map((league) => {
              const matches = matchesByLeague.get(league.code) ?? [];

              return (
                <div key={league.code}>
                  {/* League group header */}
                  <div className="flex items-baseline justify-between gap-4 rule-strong-b pb-3 mb-2">
                    <div className="flex items-baseline gap-3">
                      <span
                        className="text-[22px] leading-none"
                        aria-hidden="true"
                      >
                        {league.flag}
                      </span>
                      <h3 className="h-serif text-[22px] md:text-[26px] text-ink">
                        <Link href={`/leagues/${league.slug}`} className="hover:text-pitch transition-colors">
                          {league.name}
                        </Link>
                      </h3>
                    </div>
                    <a
                      href={`/leagues/${league.slug}`}
                      className="pass-link text-[12px] font-mono uppercase tracking-[0.14em] text-ink3"
                    >
                      All fixtures
                    </a>
                  </div>

                  {matches.length === 0 ? (
                    <div className="py-10 flex flex-col items-start gap-2">
                      <GnGMark />
                      <p className="font-serif italic text-[18px] text-ink2">
                        No {league.name} matches yesterday.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12">
                      {matches.map((match) => (
                        <MatchCard
                          key={match.id}
                          homeTeam={{
                            id: match.homeTeam.id,
                            name: match.homeTeam.name,
                            shortName: match.homeTeam.shortName,
                            crestUrl: match.homeTeam.crest || null,
                          }}
                          awayTeam={{
                            id: match.awayTeam.id,
                            name: match.awayTeam.name,
                            shortName: match.awayTeam.shortName,
                            crestUrl: match.awayTeam.crest || null,
                          }}
                          homeScore={match.score.fullTime.home}
                          awayScore={match.score.fullTime.away}
                          status={match.status as MatchStatus}
                          matchday={match.matchday}
                          kickoffTime={match.utcDate.slice(11, 16)}
                          leagueCode={league.code}
                          caption={captions.get(String(match.id))}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Stat leaders ──────────────────────────────────────────────── */}
      {/* bg-paper2/60 via inline style until Tailwind v4 opacity modifiers are verified */}
      <section
        className="rule-t"
        style={{
          backgroundColor:
            "color-mix(in oklch, var(--color-paper2) 60%, transparent)",
        }}
      >
        <div className="max-w-content mx-auto px-5 md:px-8 py-10 md:py-14">
          <SectionHeader
            eyebrow="Season-to-date"
            title="The leaders"
            deck="Top scorer in each of the five leagues this season."
          />

          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-12">
            {filteredLeagues.map((league) => {
              const stats = seasonStats.get(league.code);
              const topScorer = stats?.scorers?.[0];
              if (!topScorer) return null;

              return (
                <StatLeaderCard
                  key={league.code}
                  category={league.name}
                  categoryHref={`/leagues/${league.slug}`}
                  statLabel="Goals"
                  playerName={topScorer.player.name}
                  teamName={topScorer.team.name}
                  teamCrestUrl={scorerCrestUrl(topScorer.team.id)}
                  teamId={topScorer.team.id}
                  statValue={topScorer.goals}
                />
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Race watch ────────────────────────────────────────────────── */}
      <section className="rule-t">
        <div className="max-w-content mx-auto px-5 md:px-8 py-10 md:py-14">
          <SectionHeader
            eyebrow="Race watch"
            title="Top three, bottom three"
            deck="Where things stand at the sharp ends of the table."
          />

          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-12 gap-y-10">
            {filteredLeagues.map((league) => {
              const stats = seasonStats.get(league.code);
              const totalGroup = stats?.standings?.standings?.find(
                (s) => s.type === "TOTAL"
              );
              if (!totalGroup) return null;

              const rows: StandingRow[] = totalGroup.table.map((entry) => ({
                position: entry.position,
                teamId: entry.team.id,
                teamName: entry.team.name,
                teamShort: entry.team.shortName || entry.team.tla,
                crestUrl: entry.team.crest || null,
                points: entry.points,
                played: entry.playedGames,
                form: entry.form ?? null,
              }));

              return (
                <RaceWatch
                  key={league.code}
                  leagueCode={league.code}
                  leagueName={league.name}
                  rows={rows}
                />
              );
            })}
          </div>
        </div>
      </section>

      <FollowTeamCTA />
      <Footer />
    </div>
  );
}
