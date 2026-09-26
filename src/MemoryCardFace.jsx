/** Partner gloss is the hero face, at 70% size, in the muted secondary gray. */
export const MEMORY_CARD_GLOSS_SCALE = 0.7;
export const MEMORY_CARD_GLOSS_COLOR = "#777777";

/** Face-up Memory card: hero word, then the partner in parentheses on the next line. */
export function MemoryCardFace({ word, translation, color = MEMORY_CARD_GLOSS_COLOR }) {
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
        gap: 1,
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
            fontFamily: "inherit",
            fontWeight: "inherit",
            fontSize: `${MEMORY_CARD_GLOSS_SCALE}em`,
            color,
            lineHeight: 1.05,
            whiteSpace: "normal",
            overflowWrap: "anywhere",
            wordBreak: "break-word",
          }}
        >{`(${translation})`}</span>
      ) : null}
    </span>
  );
}
