# BUILD_PLAN.md — Intel Echo Implementation Roadmap

For what we're building and why, see [`FOUNDATION.md`](FOUNDATION.md).  
For system design and module map, see [`ARCHITECTURE.md`](ARCHITECTURE.md).

---

## Current State (Milestone 0 — Done)

**What exists:**
- Core engine: `taxonomy.js`, `mandate.js`, `witness.js`, `parse.js`, `schema.js`, `labels.js`
- CLI: `prepare | ingest | audit | --fail-on` CI gate
- Self-test: 6/6 offline, zero API spend
- Two labeled examples in `examples/`
- Git remote: `github.com/praveenshahi/IntelEcho`

**What's broken about the current state:**
- `package.json` has no `files` array — `npm publish` would ship everything including internal notes
- `README.md` is internal developer documentation, not a public landing page
- No annotator verdicts filled in `labels.csv` rows — `scoreRows()` returns `null` for precision
- Old source folders (`files/`, `facefile2/`, `facefiles/`, `zip/`) still in repo, confusing the layout
- Name risk unresolved (see [`RISKS.md`](RISKS.md#1-intel-trademark-collision))

**Acceptance criteria for "Milestone 0 is actually done":**
- [ ] `npx intel-echo prepare examples/chat1.md` works cold (no global install)
- [ ] `node selftest.js` prints `6/6 checks passed`
- [ ] `git status` shows a clean working tree with no redundant folders

---

## Milestone 1 — Publishable npm Package (3 days)

**Goal:** A developer can discover and run Intel Echo without cloning the repo.

### Tasks

**1.1 — Clean `package.json`**
```json
{
  "name": "intel-echo",
  "version": "0.1.0",
  "files": ["core/", "cli.js", "lib.js", "render.js", "run.js"],
  "bin": { "intel-echo": "cli.js" },
  "engines": { "node": ">=18.0.0" }
}
```
Remove `facefile2/`, `facefiles/`, `files/` from tracked files (`.npmignore` or `files` array).

**1.2 — Write public `README.md`**  
Replace current internal docs. See [`README.md`](README.md). Must include real CLI output, not mocked.

**1.3 — Annotate first two examples**  
Fill in `annotator_1_verdict` in `examples/chat1.labels.csv` and `examples/intel_echo_dev_001.labels.csv`. Get one other person to fill `annotator_2_verdict` independently. Run `scoreRows()` — the precision number must be non-null before launch.

**1.4 — `npm publish --access public`**  
Requires npm account. Confirm `npx intel-echo --help` works from a machine that has never seen the repo.

**Acceptance criteria:**
- [ ] `npx intel-echo prepare examples/chat1.md` works on a clean machine
- [ ] `npm show intel-echo` returns package metadata
- [ ] `scoreRows()` on `examples/chat1.labels.csv` returns a non-null precision value
- [ ] `README.md` shows real (not mocked) CLI output

---

## Milestone 2 — MCP Server (1 week)

**Goal:** A developer using Claude Code or Cursor can add Intel Echo as an MCP tool with one config line, without learning a new workflow.

### Tasks

**2.1 — Install MCP SDK**
```bash
npm install @modelcontextprotocol/sdk
```

**2.2 — Write `src/mcp-server.js`**

Three tools (see [`ARCHITECTURE.md`](ARCHITECTURE.md#1-mcp-server--the-adoption-unlock)):
- `audit_transcript(transcript, options?)` → `AuditReport`
- `prepare_prompt(transcript)` → `string`
- `check_primitives()` → `DriftPrimitive[]`

No new logic. Wraps `core/witness.js audit()` with `callModel` using `@anthropic-ai/sdk`.

**2.3 — Add `serve` command to `cli.js`**
```bash
intel-echo serve           # stdio (Claude Code)
intel-echo serve --http    # HTTP+SSE (Cursor, web)
```

**2.4 — Document `.mcp.json` integration**
```json
{
  "mcpServers": {
    "intel-echo": {
      "command": "npx",
      "args": ["intel-echo", "serve"],
      "env": { "ANTHROPIC_API_KEY": "${ANTHROPIC_API_KEY}" }
    }
  }
}
```

**2.5 — Write integration test**  
Mock MCP client calls `audit_transcript` with `examples/chat1.md` content. Assert two actionable findings returned. Must pass in CI.

**Acceptance criteria:**
- [ ] Claude Code can call `audit_transcript` via MCP and receive a valid `AuditReport`
- [ ] `intel-echo serve` starts without error, logs ready message to stderr
- [ ] Integration test passes in CI
- [ ] README updated with `.mcp.json` snippet

---

## Milestone 3 — Launch (2 weeks)

**Goal:** 100 GitHub stars. One HN "Show HN" post with net-positive reception. Five independent developers have run it on their own transcripts.

### Tasks

**3.1 — GitHub Action**  
`Dockerfile` + `action.yml`. Exposes `transcript-path` and `fail-on` inputs.  
```yaml
- uses: intel-echo/action@v0.1
  with:
    transcript-path: examples/agent_session.md
    fail-on: authority_overreach,goal_drift
```

**3.2 — Five labeled examples**  
At least three examples outside the founding conversation. Ideally: one agentic coding session, one customer support bot, one research assistant. Each with two independent annotator verdicts. `scoreRows()` precision must be ≥ 0.6 before claiming the tool "works."

**3.3 — Launch execution**  
See [`LAUNCH.md`](LAUNCH.md) for exact copy and platform sequence.

**Acceptance criteria:**
- [ ] GitHub Action works end-to-end in a forked repo's CI
- [ ] Five examples in `examples/` with completed `labels.csv` verdicts
- [ ] `scoreRows()` across all labeled rows returns precision ≥ 0.6
- [ ] HN "Show HN" post submitted with real demo output
- [ ] ≥ 3 external developers have opened issues or starred the repo

---

## Milestone 4 — Hardening (Month 2–3)

**Goal:** Intel Echo is usable as a library, not just a CLI. Handles transcripts that would break v0.

### Tasks

**4.1 — TypeScript declarations (`index.d.ts`)**  
`AuditReport`, `Finding`, `MandateEntry`, `DriftPrimitive`, `audit()` signature. Required for typed library consumers.

**4.2 — Transcript length guard**  
If `transcript.length > 50_000` characters, emit a clear error:  
`"Transcript exceeds 50k characters. Use --chunk to split by turn boundaries."`  
Do not silently truncate.

**4.3 — `--chunk` flag (batch audit)**  
Split long transcripts on turn boundaries, audit each chunk, merge findings, de-duplicate by span. Required for real enterprise agent logs.

**4.4 — Custom taxonomy (`--taxonomy taxonomy.json`)**  
Accept a JSON file overriding or extending the four built-in primitives. Schema-validated. Lets domain teams define their own drift types without forking the repo.

**4.5 — Batch mode**  
```bash
intel-echo audit-batch examples/ --output summary.md
```
Audit every `.md` file in a directory. Aggregate findings, compute dataset-wide precision.

**Acceptance criteria:**
- [ ] A TypeScript project can `import { audit, AuditReport } from 'intel-echo'` without type errors
- [ ] Attempting to audit a 60k-character transcript fails with a clear, actionable error
- [ ] `--chunk` correctly splits and re-merges a 10,000-line transcript
- [ ] A custom taxonomy with one extra primitive validates and is used by the witness

---

## What Is Not On This Roadmap

The following were discussed and are deliberately excluded until v0 adoption proves the core:

- **Web UI / dashboard** — the markdown report is the UI for v0
- **SaaS API** — the npm package + MCP server covers the use case without ops overhead
- **Multi-agent council mode** — interesting, not necessary for adoption
- **Fine-tuning the witness** — the `known_false_positives` mechanism is cheaper and more transparent
- **Scoring / percentage bars** — `scoreRows()` on labeled data is the only credible metric; don't invent others

Write discovered ideas to `later.md`, not to issues or PRs, until Milestone 3 acceptance criteria are met.
