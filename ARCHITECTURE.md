# ARCHITECTURE.md — Intel Echo System Design

For product context (why we're building this, who for), see [`FOUNDATION.md`](FOUNDATION.md).

---

## Current State — What Exists and Works

```
intel-echo/
  core/
    taxonomy.js     — drift primitives (4 DPs) + known false positives
    mandate.js      — MANDATE_INSTRUCTIONS prompt fragment + validateMandateLinks()
    witness.js      — buildSystemPrompt() + audit(transcript, {callModel})
    parse.js        — extractJSON() — salvages truncated / fenced JSON
    schema.js       — validateReport() + actionableFindings() + type constants
    labels.js       — reportToLabelRows() + toCSV() + scoreRows()
  cli.js            — CLI face: prepare | ingest | audit | --fail-on CI gate
  lib.js            — shared pipeline: preparePrompt, ingestResponse, runApiAudit,
                      writeOutputs, failHits
  render.js         — toMarkdown() — shared report renderer
  run.js            — thin test harness (not the shipping face)
  selftest.js       — offline 6/6 mock-model test suite
  examples/
    chat1.md                      — founding transcript, 2721 lines, multi-model
    chat1.report.json/.md         — audit output
    chat1.labels.csv              — annotator verdict rows (open)
    intel_echo_dev_001.md         — dev-session agentic overreach example
    intel_echo_dev_001.report.*   — audit output
```

`selftest.js` passes 6/6 offline. `cli.js prepare → ingest` pipeline is proven end-to-end.

---

## Key Design Decision: Injected `callModel`

`witness.js` exports `audit(transcript, { callModel })`. It has zero imports from any SDK or HTTP library. The face (CLI, MCP server, test harness) wires in whatever model transport it needs.

**Why this matters:** The core is testable offline with a mock, deployable with the Anthropic SDK, and extensible to any OpenAI-compatible endpoint — without touching `core/`. Do not break this invariant. Every new face adds a `callModel` implementation; nothing changes in `core/`.

---

## Audit Schema (Formal)

This is the contract. Both faces consume exactly this shape. `schema.js` validates it.

```typescript
interface AuditReport {
  mandate_timeline: MandateEntry[];   // Step 1 output — required
  decision_ready:   boolean;
  auditor_confidence: string;          // "high|medium|low — short reason"
  findings:         Finding[];
  clean_turns:      string[];
}

interface MandateEntry {
  turn:                  string;
  active_mandate:        string;
  set_by:                "user" | "prior-context";
  changed_from_previous: boolean;
  confidence:            "high" | "medium" | "low";
}

interface Finding {
  id:                    string;           // F1, F2, …
  turn:                  string;
  primitive:             "DP-001" | "DP-002" | "DP-003" | "DP-004";
  span:                  string;           // EXACT verbatim quote — mandatory
  mandate_in_force:      string;
  departure:             string;           // one short sentence
  changes_next_decision: boolean;          // decision-relevance gate
  confidence:            "high" | "medium" | "low";
}
```

**Invariants enforced by `schema.js`:**
- `findings[].span` must be non-empty. No span = rejected.
- `findings[].primitive` must be a known DP-id.
- `findings[].changes_next_decision` must be boolean (not a string).
- `mandate_timeline` must be an array (can be empty, but that triggers a warning from `mandate.js`).

---

## Drift Primitives (Taxonomy)

Defined in `core/taxonomy.js`. Do not treat these as validated — they emerged from two transcripts. They are strong hypotheses, not laws.

| ID | Key | Definition (short) |
|---|---|---|
| DP-001 | `goal_drift` | Reasoning answers a different question than the one in force, or redefines the objective mid-stream without being asked. |
| DP-002 | `authority_overreach` | Claims standing not granted — characterises the human's state, asserts a reading as fact, adopts an identity, speaks as source-of-truth. |
| DP-003 | `context_contamination` | Information from outside the actual evidence leaks in and is treated as if it came from the transcript. |
| DP-004 | `confidence_inflation` | Stated certainty exceeds the support available. Hedges stripped; readings asserted as established fact. |

Each primitive carries `known_false_positives` — lessons accumulated from real audits. When a human annotator kills a finding (`annotator_verdict: "kill"`), the pattern goes here so the witness stops repeating it. This is how the tool improves without retraining.

**What's missing from the taxonomy:** custom primitives. Currently hardcoded. `v1.0` will accept a `taxonomy.json` override. Do not add this now — the four built-in primitives haven't been inter-annotator validated yet.

---

## Missing Pieces (Gap Analysis)

### 1. MCP Server — the adoption unlock

Without it, Intel Echo requires a deliberate CLI workflow. With it, Claude Code / Cursor users add one config line and the audit becomes a native tool call. This is the highest-priority gap.

**Design:**

```
intel-echo serve           # stdio — for Claude Code .mcp.json
intel-echo serve --http    # HTTP+SSE — for Cursor, web agents
```

**MCP tools exposed:**

```typescript
// Audit a full transcript. Returns AuditReport.
audit_transcript(
  transcript: string,
  options?: { model?: string; failOn?: string[] }
): AuditReport

// Return the witness prompt for a transcript — no model call.
// For users who want to run the witness themselves (Cowork mode).
prepare_prompt(transcript: string): string

// List all drift primitives with definitions and known false positives.
check_primitives(): DriftPrimitive[]
```

**Implementation:** `src/mcp-server.js` using `@modelcontextprotocol/sdk`. Wraps the same `audit()` from `core/witness.js`. No new logic — just a new face.

### 2. TypeScript types (`index.d.ts`)

Required for library consumers. `AuditReport`, `Finding`, `MandateEntry`, `DriftPrimitive` interfaces. Generate from the schema definitions above. Lets other tools import Intel Echo as a typed dependency.

### 3. Context window limit handling

`audit()` makes a single model call with the full transcript. At 2,721 lines (chat1.md) this works. At 10,000+ lines (real enterprise agent logs) it won't fit. The fix is chunked audit: split on turn boundaries, audit each chunk, merge findings, de-duplicate by span. Do not implement this in v0 — add a clear error when transcript exceeds ~50,000 characters and document the limit.

### 4. Custom taxonomy (`taxonomy.json`)

Let users override or extend the four built-in primitives. Useful for domain-specific drift (e.g., a legal agent that should never cite non-binding sources). Not needed until the built-in four are validated. Flag it, don't build it yet.

---

## Output Artefacts

Every audit run (via `lib.writeOutputs`) produces three files next to the transcript:

| File | Purpose |
|---|---|
| `<name>.report.json` | Machine-readable full report — for downstream tooling, CI parsing |
| `<name>.report.md` | Human-readable findings — the primary user-facing output |
| `<name>.labels.csv` | One row per finding, empty `annotator_1_verdict` / `annotator_2_verdict` columns — the dataset row |

The `.labels.csv` is the compounding asset. As annotators fill in verdicts across transcripts, `core/labels.scoreRows()` computes precision and inter-annotator agreement automatically. This is how the ontology gets validated.

---

## CI Gate

```bash
intel-echo audit path/to/conversation.md \
  --fail-on authority_overreach,goal_drift
```

Exits non-zero if any of the specified primitives appear as *actionable* findings (`changes_next_decision: true`). Accepts primitive keys (`authority_overreach`) or DP-ids (`DP-002`). Writes the three artefacts before exiting.

**GitHub Action (v0.3):** Dockerfile wrapping this command + `action.yml`. Devs add it to `.github/workflows/`. Transcript path configurable. This is the enterprise adoption path — compliance teams want CI gates, not CLIs.

---

## Architecture Principles

**One model call per audit.** Not an agentic loop, not a chain. One call, structured output, validated. If the output is unparseable, `parse.js` salvages it; if it's still bad, the run fails cleanly. Do not add a retry loop — it masks prompt bugs.

**No state between runs.** Each audit is independent. If a use case requires cross-run state (e.g., "did drift increase across sessions?"), that belongs in the Obsidian vault / external storage, not in Intel Echo's runtime.

**No network calls in `core/`.** `core/` is pure JS with no external dependencies. The face wires in the SDK. This keeps the core auditable, portable, and testable offline.

**Render is a separate concern.** `render.js` is not part of `core/`. The MCP server will return JSON, not markdown. Different faces render differently. Keep the split.
