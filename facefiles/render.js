// render.js
// Presentation logic shared by the live runner and the no-API ingest path.
// Pure JS — no model calls, no cost.

const path = require("path");
const { actionableFindings } = require("./core/schema");
const { PRIMITIVES } = require("./core/taxonomy");

const idToName = Object.fromEntries(PRIMITIVES.map((p) => [p.id, p.name]));

function toMarkdown(report, file) {
  const lines = [];
  lines.push(`# Intel Echo — reasoning audit`);
  lines.push(`*${path.basename(file)}*\n`);
  lines.push(
    report.decision_ready
      ? `**Decision-ready.** ${report.auditor_confidence}\n`
      : `**Not yet decision-ready.** ${report.auditor_confidence}\n`
  );

  lines.push(`## Mandate timeline`);
  for (const t of report.mandate_timeline || []) {
    const mark = t.changed_from_previous ? " ← changed (human redirect)" : "";
    lines.push(`- **${t.turn}** — ${t.active_mandate}${mark}`);
  }
  lines.push("");

  const actionable = actionableFindings(report);
  lines.push(`## Findings (${actionable.length} actionable of ${(report.findings || []).length})`);
  for (const f of actionable) {
    lines.push(`### ${idToName[f.primitive] || f.primitive} · ${f.turn} · ${f.confidence}`);
    lines.push(`> ${f.span}`);
    lines.push(`- **Mandate in force:** ${f.mandate_in_force}`);
    lines.push(`- **Departure:** ${f.departure}\n`);
  }
  const hidden = (report.findings || []).length - actionable.length;
  if (hidden > 0)
    lines.push(`_${hidden} finding(s) hidden — true but would not change the next decision._\n`);
  return lines.join("\n");
}

module.exports = { toMarkdown, idToName };
