#!/usr/bin/env node
// cli.js — Intel Echo, Face #1 (the dev tool).
// A compiler for reasoning, on the command line.
//
//   intel-echo prepare <file.md>            no-API: write a pasteable prompt
//   intel-echo ingest  <response.txt>       no-API: turn Claude's reply into a report
//   intel-echo audit   <file.md>            API: run end-to-end (needs ANTHROPIC_API_KEY)
//
// Flags:
//   --json                 print the raw report JSON to stdout
//   --fail-on a,b          exit non-zero if those primitives appear as actionable
//                          findings (CI/CD gate). Accepts keys (authority_overreach)
//                          or DP-ids (DP-002).
//   --model <name>         override the model (audit only)

const fs = require("fs");
const { preparePrompt, ingestResponse, runApiAudit, failHits } = require("./lib");
const { actionableFindings } = require("./core/schema");

function parseArgs(argv) {
  const a = { _: [], flags: {} };
  for (let i = 0; i < argv.length; i++) {
    const t = argv[i];
    if (t === "--json") a.flags.json = true;
    else if (t === "--fail-on") a.flags.failOn = (argv[++i] || "").split(",").filter(Boolean);
    else if (t.startsWith("--fail-on=")) a.flags.failOn = t.slice(10).split(",").filter(Boolean);
    else if (t === "--model") a.flags.model = argv[++i];
    else a._.push(t);
  }
  return a;
}

function summarize(report, flags) {
  if (flags.json) { console.log(JSON.stringify(report, null, 2)); return; }
  const act = actionableFindings(report);
  console.log(report.decision_ready ? "decision-ready" : "NOT decision-ready", "·", report.auditor_confidence);
  if (!act.length) { console.log("  no actionable drift found."); return; }
  for (const f of act) {
    console.log(`  [${f.primitive}] ${f.turn} (${f.confidence})`);
    console.log(`     “${f.span}”`);
    console.log(`     ${f.departure}`);
  }
}

function gate(report, flags) {
  const hits = failHits(report, flags.failOn);
  if (hits.length) {
    console.error(`\nFAIL — fail-on matched: ${[...new Set(hits)].join(", ")}`);
    process.exit(1);
  }
}

(async () => {
  const { _, flags } = parseArgs(process.argv.slice(2));
  const [cmd, file] = _;

  if (!cmd || !file) {
    console.log("usage: intel-echo <prepare|ingest|audit> <file> [--json] [--fail-on a,b] [--model name]");
    process.exit(1);
  }

  try {
    if (cmd === "prepare") {
      const out = preparePrompt(file);
      console.log(`Wrote ${out}`);
      console.log("Paste it into Claude (Pro / Code / Cowork). Save the JSON reply, then:");
      console.log(`  intel-echo ingest ${out.replace(/\.prompt\.txt$/, "")}.response.txt`);
      return;
    }

    if (cmd === "ingest") {
      const res = ingestResponse(file);
      if (!res.ok && res.reason === "no-response") {
        console.error(`No response file found (looked for ${res.responseFile}). Run prepare first, then save Claude's JSON reply there.`);
        process.exit(2);
      }
      if (!res.ok) { console.error("Could not find valid JSON in the response file."); process.exit(2); }
      console.log(`Wrote ${res.base}.report.json / .report.md / .labels.csv`);
      summarize(res.report, flags);
      gate(res.report, flags);
      return;
    }

    if (cmd === "audit") {
      const res = await runApiAudit(file, { model: flags.model });
      if (!res.ok) {
        console.error("Model output was not parseable JSON.");
        if (res.raw) fs.writeFileSync(file.replace(/\.\w+$/, "") + ".raw.txt", res.raw);
        process.exit(2);
      }
      console.log(`Wrote ${res.base}.report.json / .report.md / .labels.csv`);
      summarize(res.report, flags);
      gate(res.report, flags);
      return;
    }

    console.error(`Unknown command: ${cmd}`);
    process.exit(1);
  } catch (e) {
    console.error("Error:", e.message);
    process.exit(1);
  }
})();
