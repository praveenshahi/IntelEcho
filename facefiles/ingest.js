// ingest.js — thin wrapper. See cli.js / lib.js. No-API, zero cost.
//   node ingest.js examples/chat1.response.txt
const { ingestResponse } = require("./lib");
const file = process.argv[2];
if (!file) { console.error("Usage: node ingest.js path/to/claude_response.txt"); process.exit(1); }
const res = ingestResponse(file);
if (!res.ok) { console.error("Could not find valid JSON in that response."); process.exit(2); }
console.log(`Wrote ${res.base}.report.json / .report.md / .labels.csv`);
