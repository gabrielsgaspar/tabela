/**
 * /styleguide — Design system review route.
 *
 * Server component. Public. No auth required.
 *
 * Sections (top to bottom):
 *   0. Supabase probe  — confirms RLS + anon SELECT are wired correctly
 *   1. Navigation & Structure  — Masthead, Footer
 *   2. League Filter Chips     — interactive via LeagueFilterDemo client wrapper
 *   3. Match Cards             — FINISHED / SCHEDULED / LIVE / POSTPONED variants
 *   4. Editorial Block         — all four states (real, skeleton, empty, error)
 *   5. Race Watch              — full standings with top/bottom zone colouring
 *   6. Sparkline               — edge cases + normal multi-point
 *   7. Stat Leader Cards       — with and without sparkline, with rank change
 *   8. Audio Player            — playing / paused / skeleton / error
 *
 * Supabase probe semantics (three explicit assertions):
 *   a) Error thrown by the client → supabase-error block
 *   b) No error but zero rows → supabase-warning block (silent RLS failure)
 *   c) Real row returned → renders real EditorialBlock data
 */

import Masthead from "@/components/Masthead";
import Footer from "@/components/Footer";
import MatchCard, { MatchCardSkeleton } from "@/components/MatchCard";
import EditorialBlock, {
  EditorialBlockSkeleton,
  EditorialBlockEmpty,
  EditorialBlockError,
} from "@/components/EditorialBlock";
import RaceWatch, { RaceWatchSkeleton } from "@/components/RaceWatch";
import Sparkline from "@/components/Sparkline";
import StatLeaderCard, { StatLeaderCardSkeleton } from "@/components/StatLeaderCard";
import { AudioPlayerSkeleton, AudioPlayerError } from "@/components/AudioPlayer";
import AudioPlayer from "@/components/AudioPlayer";
import BreakpointBadge from "./BreakpointBadge";
import LeagueFilterDemo from "./LeagueFilterDemo";
import { createBrowserClient } from "@/lib/supabase";

// ---------------------------------------------------------------------------
// Supabase probe
// ---------------------------------------------------------------------------

async function fetchProbeRow() {
  const db = createBrowserClient();
  const { data, error } = await db
    .from("editorials")
    .select("headline, body, date, kind, league_code")
    .eq("kind", "day_overview")
    .order("created_at", { ascending: false })
    .limit(1);
  return { data, error };
}

// ---------------------------------------------------------------------------
// Sample data
// ---------------------------------------------------------------------------

// Teams used across match cards
const ARSENAL = { id: 57, name: "Arsenal", shortName: "Arsenal", crestUrl: "https://crests.football-data.org/57.png" };
const MAN_CITY = { id: 65, name: "Manchester City", shortName: "Man City", crestUrl: "https://crests.football-data.org/65.png" };
const LIVERPOOL = { id: 64, name: "Liverpool", shortName: "Liverpool", crestUrl: "https://crests.football-data.org/64.png" };
const CHELSEA = { id: 61, name: "Chelsea", shortName: "Chelsea", crestUrl: "https://crests.football-data.org/61.png" };
const SPURS = { id: 73, name: "Tottenham Hotspur", shortName: "Spurs", crestUrl: "https://crests.football-data.org/73.png" };
const BARCA = { id: 81, name: "FC Barcelona", shortName: "Barcelona", crestUrl: "https://crests.football-data.org/81.png" };
const REAL = { id: 86, name: "Real Madrid", shortName: "Real Madrid", crestUrl: "https://crests.football-data.org/86.png" };
const BAYERN = { id: 5, name: "FC Bayern München", shortName: "Bayern", crestUrl: "https://crests.football-data.org/5.png" };
const DORTMUND = { id: 4, name: "Borussia Dortmund", shortName: "Dortmund", crestUrl: "https://crests.football-data.org/4.png" };

// Premier League standings (20 rows, realistic 2024-25 snapshot)
// form: comma-separated string "W,D,L,W,W" per StandingRow interface
const PL_STANDINGS = [
  { position: 1, teamId: 64, teamName: "Liverpool", teamShort: "LIV", crestUrl: "https://crests.football-data.org/64.png", played: 36, points: 86, form: "W,W,D,W,W" },
  { position: 2, teamId: 57, teamName: "Arsenal", teamShort: "ARS", crestUrl: "https://crests.football-data.org/57.png", played: 36, points: 80, form: "W,W,W,D,W" },
  { position: 3, teamId: 65, teamName: "Manchester City", teamShort: "MCI", crestUrl: "https://crests.football-data.org/65.png", played: 36, points: 70, form: "W,D,W,L,W" },
  { position: 4, teamId: 58, teamName: "Aston Villa", teamShort: "AVL", crestUrl: "https://crests.football-data.org/58.png", played: 36, points: 64, form: "L,W,W,W,D" },
  { position: 5, teamId: 61, teamName: "Chelsea", teamShort: "CHE", crestUrl: "https://crests.football-data.org/61.png", played: 36, points: 60, form: "D,W,W,L,W" },
  { position: 6, teamId: 73, teamName: "Tottenham", teamShort: "TOT", crestUrl: "https://crests.football-data.org/73.png", played: 36, points: 52, form: "L,W,D,W,L" },
  { position: 7, teamId: 67, teamName: "Newcastle", teamShort: "NEW", crestUrl: "https://crests.football-data.org/67.png", played: 36, points: 50, form: "W,L,W,D,W" },
  { position: 8, teamId: 66, teamName: "Man United", teamShort: "MUN", crestUrl: "https://crests.football-data.org/66.png", played: 36, points: 45, form: "L,L,W,D,L" },
  { position: 9, teamId: 563, teamName: "West Ham", teamShort: "WHU", crestUrl: "https://crests.football-data.org/563.png", played: 36, points: 44, form: "L,D,L,W,D" },
  { position: 10, teamId: 62, teamName: "Everton", teamShort: "EVE", crestUrl: "https://crests.football-data.org/62.png", played: 36, points: 42, form: "D,D,L,W,D" },
  { position: 11, teamId: 63, teamName: "Fulham", teamShort: "FUL", crestUrl: "https://crests.football-data.org/63.png", played: 36, points: 41, form: "W,L,D,L,W" },
  { position: 12, teamId: 76, teamName: "Wolves", teamShort: "WOL", crestUrl: "https://crests.football-data.org/76.png", played: 36, points: 40, form: "D,L,W,D,L" },
  { position: 13, teamId: 402, teamName: "Brentford", teamShort: "BRE", crestUrl: "https://crests.football-data.org/402.png", played: 36, points: 39, form: "L,W,L,D,W" },
  { position: 14, teamId: 397, teamName: "Brighton", teamShort: "BHA", crestUrl: "https://crests.football-data.org/397.png", played: 36, points: 38, form: "W,L,L,W,D" },
  { position: 15, teamId: 354, teamName: "Crystal Palace", teamShort: "CRY", crestUrl: "https://crests.football-data.org/354.png", played: 36, points: 37, form: "D,D,L,W,L" },
  { position: 16, teamId: 1044, teamName: "Bournemouth", teamShort: "BOU", crestUrl: "https://crests.football-data.org/1044.png", played: 36, points: 36, form: "L,W,D,L,D" },
  { position: 17, teamId: 351, teamName: "Nottm Forest", teamShort: "NFO", crestUrl: "https://crests.football-data.org/351.png", played: 36, points: 35, form: "L,D,L,W,L" },
  { position: 18, teamId: 1359, teamName: "Luton Town", teamShort: "LUT", crestUrl: "https://crests.football-data.org/1359.png", played: 36, points: 29, form: "L,L,D,L,W" },
  { position: 19, teamId: 328, teamName: "Burnley", teamShort: "BUR", crestUrl: "https://crests.football-data.org/328.png", played: 36, points: 22, form: "L,L,L,D,L" },
  { position: 20, teamId: 356, teamName: "Sheffield Utd", teamShort: "SHU", crestUrl: "https://crests.football-data.org/356.png", played: 36, points: 14, form: "L,L,L,L,D" },
];

// Sparkline data sets
const SPARK_RISING = [2, 3, 3, 5, 4, 6, 7, 8, 9, 11, 12, 14, 15, 16, 18, 20, 22];
const SPARK_FLAT = [8, 8, 8, 8, 8, 8, 8, 8];
const SPARK_SINGLE = [14];

// ---------------------------------------------------------------------------
// Section header helper
// ---------------------------------------------------------------------------

function SectionHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div className="rule-t pt-4 mb-6">
      <h2 className="font-sans text-lg font-semibold text-ink mb-1">{title}</h2>
      {description && (
        <p className="font-sans text-sm text-ink3">{description}</p>
      )}
    </div>
  );
}

function SubLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-sans text-[10px] text-ink3 uppercase tracking-wider mb-3">
      {children}
    </p>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function StyleguidePage() {
  const { data: probeRows, error: probeError } = await fetchProbeRow();

  return (
    <div className="min-h-screen bg-paper">
      <BreakpointBadge />

      <div className="max-w-content mx-auto px-4 py-8 md:py-12">

        {/* Intro */}
        <div className="mb-10">
          <p className="font-sans text-xs text-ink3 uppercase tracking-wider mb-1">
            Internal
          </p>
          <h1 className="display text-4xl md:text-5xl text-ink mb-3">Styleguide</h1>
          <p className="font-sans text-sm text-ink2 max-w-prose leading-relaxed">
            Every component in the Tabela design system, rendered with realistic sample data.
            Use this route to review spacing, typography, and colour decisions across viewport
            widths before building the real pages. The Supabase probe at the top confirms the
            anon client can reach the database — if it shows real editorial content, wiring is
            correct.
          </p>
        </div>

        {/* ── 0. Supabase Probe ─────────────────────────────────────────────── */}
        <SectionHeader
          title="Supabase Probe"
          description="Fetches the most recent day_overview editorial via the anon key (NEXT_PUBLIC_SUPABASE_ANON_KEY). Three failure modes are surfaced explicitly."
        />

        {probeError ? (
          /* Case (a): request error */
          <div className="rule-t border-crimson pt-4 mb-8">
            <p className="font-sans text-xs font-semibold text-crimson uppercase tracking-wider mb-2">
              Supabase Error — request failed
            </p>
            <p className="font-sans text-sm text-ink2 mb-1">
              The anon client threw an error. Check that{" "}
              <code className="num text-xs bg-paper2 px-1 py-0.5 rounded">NEXT_PUBLIC_SUPABASE_URL</code>{" "}
              and{" "}
              <code className="num text-xs bg-paper2 px-1 py-0.5 rounded">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>{" "}
              are set in <code className="num text-xs bg-paper2 px-1 py-0.5 rounded">.env.local</code>.
            </p>
            <p className="num text-xs text-crimson bg-paper2 rounded px-3 py-2 mt-2">
              {probeError.message}
            </p>
          </div>
        ) : !probeRows || probeRows.length === 0 ? (
          /* Case (b): zero rows — silent RLS failure */
          <div className="rule-t border-mustard pt-4 mb-8">
            <p className="font-sans text-xs font-semibold text-mustard uppercase tracking-wider mb-2">
              Supabase Warning — zero rows returned
            </p>
            <p className="font-sans text-sm text-ink2">
              The query succeeded but returned no rows. This usually means the anon RLS policy
              for <code className="num text-xs bg-paper2 px-1 py-0.5 rounded">editorials</code>{" "}
              is not granting SELECT, or the table is empty. Check{" "}
              <code className="num text-xs bg-paper2 px-1 py-0.5 rounded">0002_rls_read_policies</code>{" "}
              migration and confirm at least one <code className="num text-xs bg-paper2 px-1 py-0.5 rounded">kind = &apos;day_overview&apos;</code>{" "}
              row exists.
            </p>
          </div>
        ) : (
          /* Case (c): real row — render it */
          <div className="mb-8">
            <p className="font-sans text-[10px] text-pitch uppercase tracking-wider mb-4">
              Probe: real editorial row returned
            </p>
            <EditorialBlock
              overline={`${probeRows[0].league_code ?? "Overview"} · ${probeRows[0].date}`}
              headline={probeRows[0].headline ?? "Untitled editorial"}
              body={probeRows[0].body}
            />
          </div>
        )}

        {/* ── 1. Navigation & Structure ─────────────────────────────────────── */}
        <SectionHeader title="Navigation & Structure" />

        <SubLabel>Masthead — with podcast live + audio chip</SubLabel>
        <div className="mb-8 bg-paper">
          <Masthead
            dateLong="Mon · 5 May 2026"
            edition="European edition"
            number="No. 138"
            podLive={true}
            podcastDuration="4:24"
          />
        </div>

        <SubLabel>Masthead — no podcast (live indicator + chip both absent)</SubLabel>
        <div className="mb-8 bg-paper">
          <Masthead
            dateLong="Mon · 5 May 2026"
            edition="European edition"
            number="No. 138"
            podLive={false}
          />
        </div>

        <SubLabel>Footer</SubLabel>
        <div className="mb-8">
          <Footer />
        </div>

        {/* ── 2. League Filter Chips ────────────────────────────────────────── */}
        <SectionHeader
          title="League Filter Chips"
          description="Interactive multi-select. The second row shows display-only chips with no onClick — safe to render from server components across the RSC boundary."
        />
        <div className="mb-8">
          <LeagueFilterDemo />
        </div>

        {/* ── 3. Match Cards ────────────────────────────────────────────────── */}
        <SectionHeader
          title="Match Cards"
          description="All status variants. Score is the visual anchor — 40–52px tabular numerals. Loser dims to 55% opacity."
        />

        <div className="mb-8 max-w-2xl">
          <SubLabel>FINISHED — Home win, with headline + xG + caption</SubLabel>
          <MatchCard
            homeTeam={ARSENAL}
            awayTeam={MAN_CITY}
            status="FINISHED"
            homeScore={3}
            awayScore={1}
            leagueCode="PL"
            matchday={36}
            tag="Title race"
            headline="Saka's masterclass tightens the race, and City's high line never recovered"
            caption="Arsenal's best run at the Emirates since the 2007/08 unbeaten chase. Saka unplayable on the right; Newcastle's high line never recovered."
            xgHome={2.4}
            xgAway={0.9}
            kickoffTime="12:30"
          />

          <SubLabel>FINISHED — Away win, no xG</SubLabel>
          <MatchCard
            homeTeam={CHELSEA}
            awayTeam={LIVERPOOL}
            status="FINISHED"
            homeScore={0}
            awayScore={2}
            leagueCode="PL"
            matchday={36}
            tag="Marquee"
            headline="Anfield finds an old gear, and Stamford Bridge provides no resistance"
            caption="Salah's 18-minute cameo recalled the 2018–19 vintage; Chelsea's midfield, again, never quite arrived."
            kickoffTime="17:30"
          />

          <SubLabel>FINISHED — Draw, with xG (xG favour loser — good editorial tension)</SubLabel>
          <MatchCard
            homeTeam={SPURS}
            awayTeam={ARSENAL}
            status="FINISHED"
            homeScore={1}
            awayScore={1}
            leagueCode="PL"
            matchday={36}
            tag="North London derby"
            headline="Honours even at the Lane, though the xG told a different story"
            caption="A north London derby that looked settled until Gallagher equalised in stoppage time. Arsenal's unbeaten run at the north holds, technically."
            xgHome={0.8}
            xgAway={2.1}
            kickoffTime="16:30"
          />

          <SubLabel>TIMED — Upcoming El Clásico</SubLabel>
          <MatchCard
            homeTeam={BARCA}
            awayTeam={REAL}
            status="TIMED"
            homeScore={null}
            awayScore={null}
            leagueCode="PD"
            matchday={34}
            tag="El Clásico"
            kickoffTime="21:00"
          />

          <SubLabel>IN_PLAY — Live (decorative, no real-time wiring in 4A)</SubLabel>
          <MatchCard
            homeTeam={BAYERN}
            awayTeam={DORTMUND}
            status="IN_PLAY"
            homeScore={1}
            awayScore={0}
            leagueCode="BL1"
            matchday={32}
            tag="Title decider"
            minute={67}
            kickoffTime="18:30"
          />

          <SubLabel>POSTPONED</SubLabel>
          <MatchCard
            homeTeam={CHELSEA}
            awayTeam={SPURS}
            status="POSTPONED"
            homeScore={null}
            awayScore={null}
            leagueCode="PL"
            matchday={36}
            kickoffTime="20:00"
          />

          <SubLabel>Loading skeleton</SubLabel>
          <MatchCardSkeleton />
        </div>

        {/* ── 4. Editorial Block ────────────────────────────────────────────── */}
        <SectionHeader
          title="Editorial Block"
          description="Three size tiers, JSX kicker nodes, dek (standfirst), paragraphs array. The lg tier is the day-overview treatment; md is the team-page week-in-context; sm is the match summary."
        />

        <div className="mb-6 max-w-prose">
          <SubLabel>lg — kicker with author credit, dek, paragraphs, pull quote</SubLabel>
          <EditorialBlock
            size="lg"
            kicker={
              <>
                <span>The morning brief</span>
                <span className="text-rule2">·</span>
                <span>By Marina Reis</span>
              </>
            }
            headline="The title was Liverpool's from the moment Salah turned the corner in February"
            dek="Three points and a formality: Slot's side ends a three-season wait at Anfield, and the margin barely tells the story."
            paragraphs={[
              "Liverpool made it official at Anfield on Saturday, ending a run of three consecutive seasons without the trophy. The margin — six points with two games to spare — flatters Arsenal slightly, who came close enough to make Slot nervous in March but could not sustain the pressure when it mattered.",
              "For City, a third-place finish is the story of a transition that still hasn't found its footing. The goals have dried up in a way that would have seemed unthinkable eighteen months ago.",
            ]}
            byline="Editorial · 5 May 2026"
            pullQuote="Three points and a formality: Liverpool made it official at Anfield on Saturday."
          />
        </div>

        <div className="mb-6 max-w-prose">
          <SubLabel>md — kicker, dek, two paragraphs</SubLabel>
          <EditorialBlock
            size="md"
            kicker={
              <>
                <span>The week in context</span>
                <span className="text-rule2">·</span>
                <span>By Marina Reis</span>
              </>
            }
            headline="A draw that felt like a defeat, and City know it"
            dek="Dropped points at the Etihad against a mid-table side that had nothing to play for."
            paragraphs={[
              "City's inability to break down a resolute Wolves backline confirmed what the xG charts have been whispering for weeks: the creativity hasn't survived the January window unscathed.",
              "De Bruyne's absence in the first half was felt in every slow recycled build-up. The second-half Foden cameo was the best twenty minutes of football City have produced in three months — and it still wasn't enough.",
            ]}
          />
        </div>

        <div className="mb-6 max-w-prose">
          <SubLabel>sm — match summary, paragraphs only (no dek)</SubLabel>
          <EditorialBlock
            size="sm"
            kicker={<span>Match report</span>}
            headline="Bayern hold their nerve in Munich"
            paragraphs={[
              "A late Kimmich free kick rescued a point that does little for either side's ambitions, but the champions will take it.",
            ]}
          />
        </div>

        <div className="mb-6 max-w-prose">
          <SubLabel>Backward compat — overline + body strings (Supabase probe shape)</SubLabel>
          <EditorialBlock
            overline="Premier League · Matchday 36"
            headline="Salah's 30th — the number that put it beyond doubt"
            body="A low block, a set piece, and a moment of individual quality. That was all Saturday required of Liverpool."
          />
        </div>

        <div className="mb-4 max-w-prose">
          <SubLabel>Loading skeleton</SubLabel>
          <EditorialBlockSkeleton />
        </div>

        <div className="mb-4 max-w-prose">
          <SubLabel>Empty state</SubLabel>
          <EditorialBlockEmpty />
        </div>

        <div className="mb-8 max-w-prose">
          <SubLabel>Error state</SubLabel>
          <EditorialBlockError />
        </div>

        {/* ── 5. Race Watch ─────────────────────────────────────────────────── */}
        <SectionHeader
          title="Race Watch"
          description="Top three (pitch-green) and bottom three (crimson) with form guide. Full 20-row table collapses to show only the interesting positions with ··· divider."
        />

        <div className="mb-4 max-w-lg">
          <SubLabel>Full 20-row table — Premier League</SubLabel>
          <RaceWatch
            leagueCode="PL"
            leagueName="Premier League"
            rows={PL_STANDINGS}
          />
        </div>

        <div className="mb-8 max-w-lg">
          <SubLabel>Loading skeleton</SubLabel>
          <RaceWatchSkeleton />
        </div>

        {/* ── 6. Sparkline ──────────────────────────────────────────────────── */}
        <SectionHeader title="Sparkline" description="SVG inline chart. Draw-in animation runs once on mount." />

        <div className="flex flex-wrap items-end gap-8 mb-8">
          <div>
            <SubLabel>Rising (17 points)</SubLabel>
            <Sparkline data={SPARK_RISING} width={120} height={28} highlightLast />
          </div>
          <div>
            <SubLabel>Flat (8 equal points)</SubLabel>
            <Sparkline data={SPARK_FLAT} width={80} height={20} />
          </div>
          <div>
            <SubLabel>Single point</SubLabel>
            <Sparkline data={SPARK_SINGLE} width={80} height={20} />
          </div>
          <div>
            <SubLabel>No highlight (default)</SubLabel>
            <Sparkline data={SPARK_RISING} width={80} height={20} />
          </div>
          <div>
            <SubLabel>Custom colour (mustard)</SubLabel>
            <Sparkline data={[3, 6, 4, 8, 5, 9, 7]} width={80} height={20} color="#D4A24C" highlightLast />
          </div>
        </div>

        {/* ── 7. Stat Leader Cards ──────────────────────────────────────────── */}
        <SectionHeader
          title="Stat Leader Cards"
          description="Player name in h-serif, big number at bottom-left, sparkline + trend at bottom-right. Editor's note optional below."
        />

        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 mb-8">
          <StatLeaderCard
            category="Top Scorer"
            statLabel="Goals"
            playerName="Mohamed Salah"
            teamName="Liverpool"
            teamCrestUrl="https://crests.football-data.org/64.png"
            statValue={28}
            sparkData={SPARK_RISING}
            delta={2}
            deltaLabel="+2 this week"
            note="Four in his last three — he is playing like the league owes him a Ballon d'Or."
          />
          <StatLeaderCard
            category="Most Assists"
            statLabel="Assists"
            playerName="Bukayo Saka"
            teamName="Arsenal"
            teamCrestUrl="https://crests.football-data.org/57.png"
            statValue={14}
            sparkData={[2, 2, 3, 4, 5, 5, 6, 7, 8, 9, 10, 11, 12, 14]}
            delta={0}
            deltaLabel="No change"
          />
          <StatLeaderCard
            category="Clean Sheets"
            statLabel="Clean Sheets"
            playerName="Alisson Becker"
            teamName="Liverpool"
            teamCrestUrl="https://crests.football-data.org/64.png"
            statValue={18}
            delta={-1}
            deltaLabel="One conceded"
          />
          <StatLeaderCard
            category="Top Scorer"
            statLabel="Goals"
            playerName="Harry Kane"
            teamName="FC Bayern München"
            teamCrestUrl="https://crests.football-data.org/5.png"
            statValue={36}
            sparkData={[1, 3, 4, 6, 8, 9, 11, 14, 16, 17, 20, 23, 25, 28, 30, 33, 36]}
            delta={3}
            deltaLabel="+3 this week"
            note="A hat-trick against Dortmund. He is not slowing down."
          />
        </div>

        <div className="mb-8">
          <SubLabel>Loading skeleton</SubLabel>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6">
            <StatLeaderCardSkeleton />
            <StatLeaderCardSkeleton />
          </div>
        </div>

        {/* ── 8. Audio Player ───────────────────────────────────────────────── */}
        <SectionHeader
          title="Audio Player"
          description="Visual-only in Phase 4A. Play/pause icon toggles; no audio wired. Progress always 0%. Real playback comes in Phase 5."
        />

        <div className="space-y-4 mb-8 max-w-lg">
          <SubLabel>Default (paused)</SubLabel>
          <AudioPlayer
            title="Premier League Matchday 36 — Liverpool clinch the title at Anfield"
            durationSec={272}
          />

          <SubLabel>Skeleton</SubLabel>
          <AudioPlayerSkeleton />

          <SubLabel>Error state</SubLabel>
          <AudioPlayerError title="Premier League Matchday 36 — Liverpool clinch the title at Anfield" />
        </div>

      </div>
    </div>
  );
}
