// run.js
// The thin test harness that wires the real model into the core, so you can
// run a transcript end-to-end. This is NOT a "face" — it's the minimal runner
// that makes the core testable. The CLI and pilot faces come later, on top of
// this same audit() call.
//
//   export ANTHROPIC_API_KEY=sk-...
//   node run.js path/to/conversation.md
//
// Writes next to the transcript:
//   <name>.report.json   full structured report
//   <name>.report.md     human-readable findings
//   <name>.labels.csv     one row per finding, open verdict slots for annotators

const fs = require("fs");
const path = require("path");
const { audit } = require("./core/witness");
const { actionableFindings } = require("./core/schema");
const { reportToLabelRows, toCSV } = require("./core/labels");
const { toMarkdown } = require("./render");

const MODEL = process.env.INTEL_ECHO_MODEL || "claude-sonnet-4-6";

// Wire the real Anthropic SDK in here, behind the injected callModel interface.
async function callModel({ system, user }) {
  let Anthropic;
  try {
    Anthropic = require("@anthropic-ai/sdk");
  } catch (_) {
    throw new Error("Run `npm install` first (needs @anthropic-ai/sdk).");
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("Set ANTHROPIC_API_KEY in your environment.");
  }
  const client = new Anthropic();
  const msg = await client.messages.create({
    model: MODEL,
    max_tokens: 4000,
    system,
    messages: [{ role: "user", content: user }],
  });
  return (msg.content || [])
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("\n");
}

(async () => {
  const file = process.argv[2];
  if (!file) {
    console.error("Usage: node run.js path/to/conversation.md");
    process.exit(1);
  }
  const transcript = fs.readFileSync(file, "utf8");
  const base = file.replace(/\.(md|markdown|txt)$/i, "");
  const id = path.basename(base);

  console.log(`Auditing ${path.basename(file)} with ${MODEL}…`);
  const res = await audit(transcript, { callModel });

  if (!res.ok && res.reason === "unparseable") {
    console.error("Model output was not parseable JSON. Raw output saved for inspection.");
    fs.writeFileSync(base + ".raw.txt", res.raw || "");
    process.exit(2);
  }
  if (!res.ok) {
    console.warn("Report parsed but failed validation:", JSON.stringify(res.checks, null, 2));
  }

  const report = res.report;
  fs.writeFileSync(base + ".report.json", JSON.stringify(report, null, 2));
  fs.writeFileSync(base + ".report.md", toMarkdown(report, file));
  fs.writeFileSync(base + ".labels.csv", toCSV(reportToLabelRows(report, { transcript_id: id })));

  const act = actionableFindings(report).length;
  console.log(`Done. ${act} actionable finding(s). Wrote .report.json, .report.md, .labels.csv`);
})().catch((e) => {
  console.error("Error:", e.message);
  process.exit(1);
});
