// League page — server-rendered, reads from Supabase via anon client.
//
// Sections (top to bottom):
//   1. Masthead
//   2. Breadcrumb subnav
//   3. League header — flag, name, headline standfirst, matchday number
//   4. Full standings table (FullStandingsTable client component)
//   5. League editorial (league_overview body)
//   6. Stat leaders — top scorer + top assister
//   7. Recent matchdays — last 2 matchdays as dated MatchCard groups
//   8. Footer
//
// Query plan (4 queries, no N+1):
//   Q1  editorials WHERE kind='league_overview' AND league_code=$code → editorial
//   Q2  season_stats WHERE league_code=$code ORDER BY date DESC LIMIT 2 → standings + scorers
//   Q3  match_days WHERE league_code=$code ORDER BY date DESC LIMIT 2 → recent matchdays
//   Q4  editorials WHERE kind='match_caption' AND league_code=$code AND date IN (Q3 dates)

import { notFound } from "next/navigation";
import Link from "next/link";
import Masthead from "@/components/Masthead";
import Footer from "@/components/Footer";
import EditorialBlock, { EditorialBlockEmpty } from "@/components/EditorialBlock";
import StatLeaderCard from "@/components/StatLeaderCard";
import MatchCard, { type MatchStatus } from "@/components/MatchCard";
import FullStandingsTable from "./FullStandingsTable";
import SectionHeader from "@/app/SectionHeader";
import GnGMark from "@/app/GnGMark";
import { createBrowserClient } from "@/lib/supabase";
import {
  getLatestLeagueOverview,
  getLeagueSeasonStats,
  getRecentMatchDaysForLeague,
  getMatchCaptionsForLeagueAndDates,
} from "@/lib/queries";
import { leagueBySlug } from "@/lib/leagues";
import type { ScorerEntry } from "@/lib/football-types";
import type { StandingTableEntry } from "@/lib/query-types";

// ── helpers ───────────────────────────────────────────────────────────────────

function formatMatchdayDate(dateStr: string): string {
  const d = new Date(`${dateStr}T12:00:00Z`);
  const weekday = new Intl.DateTimeFormat("en-GB", { weekday: "short", timeZone: "UTC" }).format(d);
  const day = new Intl.DateTimeFormat("en-GB", { day: "numeric", timeZone: "UTC" }).format(d);
  const month = new Intl.DateTimeFormat("en-GB", { month: "long", timeZone: "UTC" }).format(d);
  const year = new Intl.DateTimeFormat("en-GB", { year: "numeric", timeZone: "UTC" }).format(d);
  return `${weekday} · ${day} ${month} ${year}`;
}

function scorerCrestUrl(teamId: number): string {
  return `https://crests.football-data.org/${teamId}.png`;
}

/** Top assister from the scorers list (max assists, excluding nulls). */
function topAssister(scorers: ScorerEntry[]): ScorerEntry | null {
  const withAssists = scorers.filter((s) => s.assists != null && s.assists > 0);
  if (withAssists.length === 0) return null;
  return withAssists.reduce((best, s) =>
    (s.assists ?? 0) > (best.assists ?? 0) ? s : best
  );
}

// ── page ──────────────────────────────────────────────────────────────────────

export default async function LeaguePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const league = leagueBySlug(slug);
  if (!league) notFound();

  const db = createBrowserClient();

  // Q1 and Q2+Q3 can start in parallel; Q4 waits for Q3 dates.
  const [overview, statsRows, recentMatchDays] = await Promise.all([
    getLatestLeagueOverview(db, league.code),
    getLeagueSeasonStats(db, league.code, 2),
    getRecentMatchDaysForLeague(db, league.code, 2),
  ]);

  // Q4 — captions for the dates returned by Q3
  const matchDayDates = recentMatchDays.map((md) => md.date);
  const captions = await getMatchCaptionsForLeagueAndDates(db, league.code, matchDayDates);

  const latestStats = statsRows[0] ?? null;
  const totalGroup = latestStats?.payload.standings?.standings?.find(
    (s) => s.type === "TOTAL"
  );
  const standingsRows: StandingTableEntry[] = totalGroup?.table ?? [];
  const scorers: ScorerEntry[] = latestStats?.payload.scorers ?? [];

  // Derive current matchday from the most recent match_days payload.
  const currentMatchday =
    recentMatchDays[0]?.payload.matches?.[0]?.matchday ?? null;

  // Editorial content
  const overviewParagraphs = overview?.body
    ? overview.body.split("\n\n").filter(Boolean)
    : [];

  // Masthead date — most recent editorial date, or today
  const displayDate =
    overview?.date ??
    recentMatchDays[0]?.date ??
    new Date().toISOString().slice(0, 10);
  const mastheadDate = formatMatchdayDate(displayDate);

  // Stat leaders
  const topScorer = scorers[0] ?? null;
  const bestAssister = topAssister(scorers);

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
          <span className="text-rule2" aria-hidden="true">/</span>
          <span className="text-ink">{league.name}</span>
        </div>
      </div>

      {/* ── League header ─────────────────────────────────────────────── */}
      <section className="rule-t">
        <div className="max-w-content mx-auto px-5 md:px-8 py-10 md:py-14">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-end">

            {/* Left: flag + name + standfirst */}
            <div className="md:col-span-8">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-[28px]" aria-hidden="true">
                  {league.flag}
                </span>
                <span className="text-[11px] font-mono uppercase tracking-[0.18em] text-ink3">
                  {league.currentSeason}
                </span>
              </div>
              <h1
                className="h-serif text-[44px] md:text-[64px] leading-[0.95] text-ink"
                style={{ textWrap: "balance" } as React.CSSProperties}
              >
                {league.name}
              </h1>
              {overview?.headline && (
                <p
                  className="mt-4 font-serif italic text-[20px] md:text-[24px] text-ink2 max-w-[44ch]"
                  style={{ textWrap: "balance" } as React.CSSProperties}
                >
                  {overview.headline}
                </p>
              )}
            </div>

            {/* Right: matchday stats */}
            <div className="md:col-span-4 rule-t pt-5">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <div className="text-[11px] font-mono uppercase tracking-[0.14em] text-ink3">
                    Matchday
                  </div>
                  <div className="mt-1 num text-[32px] md:text-[40px] font-medium tracking-tighter2 text-ink">
                    {currentMatchday ?? "—"}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] font-mono uppercase tracking-[0.14em] text-ink3">
                    Season
                  </div>
                  <div className="mt-1 num text-[22px] md:text-[28px] font-medium tracking-tighter2 text-ink">
                    {league.currentSeason}
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── Full standings table ───────────────────────────────────────── */}
      <section className="rule-t bg-paper">
        <div className="max-w-content mx-auto px-5 md:px-8 py-12 md:py-16">
          <SectionHeader
            eyebrow="Standings"
            title="The full table"
            deck="Tap a row to expand. The coloured strip on the left marks European and relegation zones."
          />
          {standingsRows.length > 0 ? (
            <FullStandingsTable rows={standingsRows} leagueCode={league.code} />
          ) : (
            <div className="mt-8 py-10 flex flex-col items-start gap-2">
              <GnGMark />
              <p className="font-serif italic text-[18px] text-ink2">
                Standings not available yet.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* ── League editorial ──────────────────────────────────────────── */}
      <section className="rule-t">
        <div className="max-w-content mx-auto px-5 md:px-8 py-10 md:py-16">
          {overview ? (
            <EditorialBlock
              kicker={
                <>
                  <span>League overview</span>
                  <span className="text-rule2">·</span>
                  <span>{league.name}</span>
                </>
              }
              headline={overview.headline ?? "This week in the league"}
              paragraphs={overviewParagraphs}
              size="md"
            />
          ) : (
            <EditorialBlockEmpty />
          )}
        </div>
      </section>

      {/* ── Stat leaders ──────────────────────────────────────────────── */}
      {(topScorer || bestAssister) && (
        <section
          className="rule-t"
          style={{
            backgroundColor:
              "color-mix(in oklch, var(--color-paper2) 60%, transparent)",
          }}
        >
          <div className="max-w-content mx-auto px-5 md:px-8 py-10 md:py-14">
            <SectionHeader
              eyebrow={`Top performers · ${league.name}`}
              title="The leaders"
              deck="Season-to-date, this competition."
            />
            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-12">
              {topScorer && (
                <StatLeaderCard
                  category="Top scorer"
                  statLabel="Goals"
                  playerName={topScorer.player.name}
                  teamName={topScorer.team.name}
                  teamCrestUrl={scorerCrestUrl(topScorer.team.id)}
                  teamId={topScorer.team.id}
                  statValue={topScorer.goals}
                />
              )}
              {bestAssister && bestAssister.player.name !== topScorer?.player.name && (
                <StatLeaderCard
                  category="Top assister"
                  statLabel="Assists"
                  playerName={bestAssister.player.name}
                  teamName={bestAssister.team.name}
                  teamCrestUrl={scorerCrestUrl(bestAssister.team.id)}
                  teamId={bestAssister.team.id}
                  statValue={bestAssister.assists ?? 0}
                />
              )}
            </div>
          </div>
        </section>
      )}

      {/* ── Recent matchdays ──────────────────────────────────────────── */}
      {recentMatchDays.length > 0 && (
        <section className="rule-t">
          <div className="max-w-content mx-auto px-5 md:px-8 py-10 md:py-14">
            <SectionHeader
              eyebrow="Recent results"
              title="The matches"
              deck="The last two matchdays, with one editor's-cut sentence each."
            />

            <div className="mt-8 space-y-12">
              {recentMatchDays.map((md) => {
                const matches = md.payload.matches ?? [];
                const dateLabel = formatMatchdayDate(md.date);
                // Derive matchday number from first match
                const matchdayNum = matches[0]?.matchday ?? null;

                return (
                  <div key={md.date}>
                    {/* Matchday group header */}
                    <div className="flex items-baseline justify-between gap-4 rule-strong-b pb-3 mb-2">
                      <div className="flex items-baseline gap-3">
                        <h3 className="h-serif text-[22px] md:text-[26px] text-ink">
                          {matchdayNum != null
                            ? `Matchday ${matchdayNum}`
                            : dateLabel}
                        </h3>
                      </div>
                      <span className="text-[12px] font-mono uppercase tracking-[0.14em] text-ink3">
                        {dateLabel}
                      </span>
                    </div>

                    {matches.length === 0 ? (
                      <div className="py-10 flex flex-col items-start gap-2">
                        <GnGMark />
                        <p className="font-serif italic text-[18px] text-ink2">
                          No matches on this matchday.
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
      )}

      <Footer />
    </div>
  );
}
