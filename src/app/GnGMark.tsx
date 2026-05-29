// The give-and-go mark: dot — line — dot. Tabela's small brand glyph, used in
// the masthead and as a quiet ornament above empty-state copy. Styling lives in
// globals.css (.gng-mark / .gng-dot / .gng-line).

export default function GnGMark() {
  return (
    <span className="gng-mark" aria-hidden="true">
      <span className="gng-dot" />
      <span className="gng-line" />
      <span className="gng-dot" />
    </span>
  );
}
