// Fixed-corner debug badge for the styleguide route. Shows which Tailwind
// breakpoint is currently active by toggling labels with responsive `hidden`
// utilities — handy when reviewing components across viewport widths.

export default function BreakpointBadge() {
  return (
    <div className="fixed bottom-3 right-3 z-50 num text-[11px] font-semibold text-paper bg-ink rounded-full px-3 py-1 shadow-lg select-none pointer-events-none">
      <span className="sm:hidden">xs</span>
      <span className="hidden sm:inline md:hidden">sm</span>
      <span className="hidden md:inline lg:hidden">md</span>
      <span className="hidden lg:inline xl:hidden">lg</span>
      <span className="hidden xl:inline 2xl:hidden">xl</span>
      <span className="hidden 2xl:inline">2xl</span>
    </div>
  );
}
