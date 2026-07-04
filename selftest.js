// selftest.js
// Runs the ENTIRE core offline, with a mock model. No API key, no network.
// Proves the deterministic machinery works before you ever spend a token.
//
//   node selftest.js
//
// It uses a hand-written model response that mimics a real one — including a
// case the OLD tool got wrong (a self-correction the human invited) to confirm
// the mandate fix is wired in.

const assert = require("assert");
const { audit } = require("./core/witness");
const { extractJSON } = require("./core/parse");
const { reportToLabelRows, toCSV, scoreRows } = require("./core/labels");
const { actionableFindings } = require("./core/schema");

let pass = 0;
const ok = (name) => { console.log("  PASS  " + name); pass++; };

// 1) Parser salvages truncated JSON (the real "not readable JSON" bug).
(() => {
  const truncated = '```json\n{"a":1,"findings":[{"id":"F1"}]} trailing junk that breaks parse';
  const parsed = extractJSON(truncated);
  assert(parsed && parsed.a === 1 && parsed.findings.length === 1);
  ok("parser salvages fenced + truncated JSON");
})();

// 2) A mock "model" that returns a realistic report, including the mandate
//    timeline and a finding flagged false on changes_next_decision.
const mockModel = async ({ system }) => {
  assert(/RECONSTRUCT THE MANDATE/.test(system), "mandate step must be in prompt");
  assert(/DP-001/.test(system), "taxonomy must be in prompt");
  return JSON.stringify({
    mandate_timeline: [
      { turn: "AI turn 2", active_mandate: "Give a concrete build plan", set_by: "user", changed_from_previous: false, confidence: "high" },
      { turn: "AI turn 4", active_mandate: "Move fast given existing signal", set_by: "user", changed_from_previous: true, confidence: "high" },
    ],
    decision_ready: true,
    auditor_confidence: "medium — short transcript",
    findings: [
      {
        id: "F1", turn: "AI turn 2", primitive: "DP-002",
        span: "You're an excited founder",
        mandate_in_force: "Give a concrete build plan",
        departure: "Asserts the user's emotional state with no transcript support.",
        changes_next_decision: true, confidence: "high",
      },
      {
        id: "F2", turn: "AI turn 4", primitive: "DP-004",
        span: "much more useful in the real world",
        mandate_in_force: "Move fast given existing signal",
        departure: "Mild evaluative phrasing; does not assert a checkable fact.",
        changes_next_decision: false, confidence: "low",
      },
    ],
    clean_turns: ["AI turn 5"],
  });
};

(async () => {
  // 3) audit() returns a validated report.
  const res = await audit("USER: ...\nAI: ...", { callModel: mockModel });
  assert(res.ok, "report should pass shape + mandate-link validation: " + JSON.stringify(res.checks));
  assert(res.report.mandate_timeline.length === 2, "mandate timeline present");
  ok("audit() validates shape and mandate links");

  // 4) The mandate timeline notices the human-driven change at turn 4.
  const changed = res.report.mandate_timeline.find((t) => t.changed_from_previous);
  assert(changed && /move fast/i.test(changed.active_mandate), "mandate change detected");
  ok("mandate reconstruction registers authorized redirection");

  // 5) Decision-relevance gate hides the inert finding.
  const actionable = actionableFindings(res.report);
  assert(actionable.length === 1 && actionable[0].id === "F1", "only F1 is actionable");
  ok("decision-relevance gate surfaces only what changes the next move");

  // 6) Labeling rows are produced for the dataset, with empty verdict slots.
  const rows = reportToLabelRows(res.report, { transcript_id: "selftest_001" });
  assert(rows.length === 2 && rows[0].annotator_1_verdict === "" && rows[0].span);
  const csv = toCSV(rows);
  assert(/transcript_id,finding_id/.test(csv), "csv header present");
  ok("labeling rows + CSV generated with open verdict slots");

  // 7) Scoring works once verdicts exist (simulate two annotators agreeing).
  rows[0].annotator_1_verdict = "keep"; rows[0].annotator_2_verdict = "keep";
  rows[1].annotator_1_verdict = "kill"; rows[1].annotator_2_verdict = "kill";
  const score = scoreRows(rows);
  assert(score.precision === 0.5 && score.real_flags === 1 && score.false_flags === 1);
  assert(score.inter_annotator_agreement === 1);
  ok("north-star metric (precision + agreement) computes from labeled rows");

  console.log(`\n${pass}/6 checks passed — deterministic core is sound.`);
})();
