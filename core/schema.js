// core/schema.js
// The output contract. Both faces (CLI, pilot report) consume exactly this
// shape. Defining it once here is what makes "same engine, two renderers" real.
//
// Report shape:
// {
//   mandate_timeline: [
//     { turn, active_mandate, set_by: "user"|"prior-context",
//       changed_from_previous: bool, confidence: "high"|"medium"|"low" }
//   ],
//   decision_ready: bool,
//   auditor_confidence: string,
//   findings: [
//     { id, turn, primitive: "DP-001..DP-004", span, mandate_in_force,
//       departure, changes_next_decision: bool, confidence }
//   ],
//   clean_turns: [string]
// }

const VALID_PRIMITIVES = new Set(["DP-001", "DP-002", "DP-003", "DP-004"]);
const VALID_CONF = new Set(["high", "medium", "low"]);

function validateReport(report) {
  const errors = [];
  if (!report || typeof report !== "object") {
    return { ok: false, errors: ["Report is not an object."] };
  }
  if (!Array.isArray(report.mandate_timeline)) errors.push("mandate_timeline must be an array.");
  if (!Array.isArray(report.findings)) errors.push("findings must be an array.");
  if (typeof report.decision_ready !== "boolean") errors.push("decision_ready must be a boolean.");

  (report.findings || []).forEach((f, i) => {
    if (!VALID_PRIMITIVES.has(f.primitive))
      errors.push(`finding[${i}].primitive "${f.primitive}" is not a known DP-id.`);
    if (!f.span || !String(f.span).trim())
      errors.push(`finding[${i}] has no span (evidence is mandatory).`);
    if (typeof f.changes_next_decision !== "boolean")
      errors.push(`finding[${i}].changes_next_decision must be a boolean.`);
  });

  return { ok: errors.length === 0, errors };
}

// The decision-relevance gate (council's "could this change the next decision?
// if no, hide it"). Keeps the surfaced report useful, not merely comprehensive.
function actionableFindings(report) {
  return (report.findings || []).filter((f) => f.changes_next_decision);
}

module.exports = { validateReport, actionableFindings, VALID_PRIMITIVES, VALID_CONF };
