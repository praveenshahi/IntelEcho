// prepare.js — thin wrapper. See cli.js / lib.js. No-API, zero cost.
//   node prepare.js examples/chat1.md
const { preparePrompt } = require("./lib");
const file = process.argv[2];
if (!file) { console.error("Usage: node prepare.js path/to/conversation.md"); process.exit(1); }
const out = preparePrompt(file);
console.log(`Wrote ${out}. Paste into Claude, save the JSON reply, then: node ingest.js <base>.response.txt`);
