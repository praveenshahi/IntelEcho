// core/parse.js
// Salvage JSON from model output even if it is wrapped in prose or fences,
// or trails off mid-structure (the bug that caused the "not readable JSON"
// failure on real transcripts). Returns the parsed object, or null.

function extractJSON(raw) {
  if (!raw || typeof raw !== "string") return null;
  let s = raw.replace(/```json/gi, "").replace(/```/g, "").trim();
  const start = s.indexOf("{");
  if (start === -1) return null;
  s = s.slice(start);

  // 1) try as-is
  try {
    return JSON.parse(s);
  } catch (_) {}

  // 2) walk back to the last closing brace and retry — recovers truncated tails
  for (let i = s.length; i > 0; i--) {
    if (s[i - 1] !== "}") continue;
    try {
      return JSON.parse(s.slice(0, i));
    } catch (_) {}
  }
  return null;
}

module.exports = { extractJSON };
