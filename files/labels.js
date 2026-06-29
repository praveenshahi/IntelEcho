// core/labels.js
// Phase 0.5 — the thing that makes 30 transcripts COMPOUND into a dataset
// instead of evaporating into 30 impressions.
//
// Every run emits one row per finding, with empty verdict slots for two
// independent annotators. You fill them in later. Once enough rows exist, the
// north-star metric (catch-rate vs false-flag-rate) computes automatically off
// these rows with no human in the live loop.

function reportToLabelRows(report, meta = {}) {
  const ts = meta.transcript_id || "unknown";
  return (report.findings || []).map((f, i) => ({
    transcript_id: ts,
    finding_id: f.id || `F${i + 1}`,
    turn: f.turn || "",
    primitive: f.primitive || "",
    span: (f.span || "").replace(/\s+/g, " ").trim(),
    changes_next_decision: f.changes_next_decision ? "yes" : "no",
    auditor_confidence: f.confidence || "",
    // to be filled by humans, independently:
    annotator_1_verdict: "", // keep | kill
    annotator_2_verdict: "", // keep | kill
    notes: "",
  }));
}

function toCSV(rows) {
  if (!rows.length) return "";
  const cols = Object.keys(rows[0]);
  const esc = (v) => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const head = cols.join(",");
  const body = rows.map((r) => cols.map((c) => esc(r[c])).join(",")).join("\n");
  return head + "\n" + body + "\n";
}

// Once verdicts exist, this computes the north star over a set of rows.
// Precision-weighted by design: a false flag costs more than a miss, because a
// tool that cries wolf gets uninstalled.
function scoreRows(rows) {
  const labeled = rows.filter(
    (r) => r.annotator_1_verdict && r.annotator_2_verdict
  );
  const agreed = labeled.filter(
    (r) => r.annotator_1_verdict === r.annotator_2_verdict
  );
  const keptByBoth = agreed.filter((r) => r.annotator_1_verdict === "keep");
  const killedByBoth = agreed.filter((r) => r.annotator_1_verdict === "kill");

  const flagged = agreed.length;
  const precision = flagged ? keptByBoth.length / flagged : null; // 1 - false-flag-rate
  const inter_annotator_agreement = labeled.length
    ? agreed.length / labeled.length
    : null;

  return {
    rows_total: rows.length,
    rows_labeled: labeled.length,
    rows_agreed: agreed.length,
    real_flags: keptByBoth.length,
    false_flags: killedByBoth.length,
    precision, // headline metric: of what it flagged, how much was real
    inter_annotator_agreement, // are humans even consistent? if low, taxonomy is unclear
  };
}

module.exports = { reportToLabelRows, toCSV, scoreRows };
