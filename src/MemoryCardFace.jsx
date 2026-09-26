/** Partner gloss under the hero word. Smaller than the 26px face lock so it stays inside the card. */
export const MEMORY_CARD_GLOSS_PX = 12;

/** Face-up Memory card: hero word, then the partner in parentheses on the next line. */
export function MemoryCardFace({ word, translation }) {
  if (!word) return null;
  return (
    <span
      data-testid="memory-card-face"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "stretch",
        justifyContent: "center",
        width: "100%",
        minWidth: 0,
        maxWidth: "100%",
        textAlign: "center",
        gap: 2,
      }}
    >
      <span
        data-testid="memory-card-word"
        style={{
          display: "block",
          width: "100%",
          minWidth: 0,
          maxWidth: "100%",
          lineHeight: 1.1,
          whiteSpace: "normal",
          overflowWrap: "break-word",
          wordBreak: "normal",
        }}
      >{word}</span>
      {translation ? (
        <span
          data-testid="memory-card-gloss"
          style={{
            display: "block",
            width: "100%",
            minWidth: 0,
            maxWidth: "100%",
            fontSize: MEMORY_CARD_GLOSS_PX,
            lineHeight: 1.15,
            whiteSpace: "normal",
            overflowWrap: "anywhere",
            wordBreak: "break-word",
          }}
        >{`(${translation})`}</span>
      ) : null}
    </span>
  );
}
