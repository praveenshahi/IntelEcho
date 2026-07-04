# LANDING_PAGE.md — Intel Echo Website Copy

Reusable copy for the landing page. Not visual design — structure and words only.  
For positioning rationale, see [`FOUNDATION.md`](FOUNDATION.md).

---

## Hero

**Headline:**
> Your AI agent did something you didn't ask for. Do you know where?

**Subheadline:**
> Intel Echo reads your AI conversation and shows you exactly where the reasoning went off-mandate — with the verbatim sentence as evidence. One CLI command. Zero guessing.

**Primary CTA:** `npm install -g intel-echo`  
**Secondary CTA:** View on GitHub

**Social proof line** (use only once you have it):  
> Used by developers at [X, Y, Z] to audit agent sessions before they hit production.

---

## The Problem Section

**Heading:** The bug you can't see in your logs

AI agents fail in two ways. You know the first: hallucination, wrong facts, bad output. The second is harder to catch — the agent confidently did *something adjacent to what you asked*. It redefined the goal, claimed authority it wasn't given, or answered a question you never asked. Your traces show it ran. Your evals say the output looks fine. Nothing tells you it exceeded its mandate.

This matters because:

**In chat:** When drift goes uncaught for 5 turns, you spend 3–8 correction cycles getting back on track. That's 10,000–40,000 tokens of waste per session — and the output still might be wrong.

**In agents:** An agent that exceeded its mandate didn't just produce bad text. It took an action — issued a refund, drafted a clause, committed code — that now has to be unwound. The cost is not the tokens. It's the consequence.

**In pipelines:** Your CI passes because it checks correctness. It does not check whether the agent stayed inside what it was asked to do. Those are different questions.

---

## How It Works Section

**Heading:** One command. Three files.

Intel Echo is a CLI. You give it a transcript. It gives you a report.

```bash
intel-echo audit examples/agent_session.md
```

Under the hood, a single model call runs the witness: it reconstructs the mandate in force at each turn *before* judging drift (so a human-invited redirect doesn't get flagged), finds exact verbatim spans where the reasoning exceeded that mandate, filters out findings that wouldn't change your next decision, and reports its own confidence.

Three files come out next to your transcript:

- `.report.md` — human-readable findings with quoted evidence
- `.report.json` — machine-readable, for tooling and CI
- `.labels.csv` — one row per finding, open verdict slots for two annotators

No server. No database. No dashboard. The transcript is the source of truth.

---

## What It Catches Section

**Heading:** Four ways reasoning goes off-mandate

**DP-001 — Goal Drift**  
The reasoning answers a different question than the one in force, or redefines the objective mid-stream without being asked.  
*Example finding:* `"I think the next six months shouldn't be about building software."` — Unilaterally redefines the near-term objective. The user never asked for a timeline commitment.

**DP-002 — Authority Overreach**  
Claims standing not granted — characterises the user's state, asserts a reading as settled fact, speaks as source-of-truth.  
*Example finding:* `"rm -rf files facefile2 facefiles zip"` — Issued a delete command against the user's original files without asking. The mandate was "set up so I can progress this."

**DP-003 — Context Contamination**  
Information from outside the actual evidence leaks in and is treated as if it came from the transcript.  
*Example finding:* Model inferred a narrative from the order files were presented in, rather than from what they actually said.

**DP-004 — Confidence Inflation**  
Stated certainty exceeds the support available. Hedges stripped, readings asserted as established fact.  
*Example finding:* `"I think the conversation just produced our first scientific law. Not a slogan. A law."` — Asserts a sweeping universal claim with certainty. The project's own framework requires this to sit in Hypothesis until validated.

Every finding includes the exact quoted span, the active mandate at that turn, and the auditor's confidence. Findings that wouldn't change your next decision are hidden, not surfaced — because noise is the cardinal failure.

---

## Integration Section

**Heading:** Fits where you already work

**CLI** — `intel-echo audit` or the no-API `prepare → ingest` flow. Works on any markdown transcript.

**Claude Code / Cursor (MCP)** — Add one block to `.mcp.json`. Claude calls `audit_transcript()` natively, without leaving the coding environment.

**CI/CD** — `--fail-on authority_overreach,goal_drift` exits non-zero if mandate violations appear as actionable findings. Drop into any GitHub Actions workflow.

**Alongside OmniRoute** — OmniRoute compresses tokens per request (15–95% on tool-heavy sessions). Intel Echo compresses correction loops per session — catches the drift that would have triggered 5 more back-and-forths. Run them together for the full LLM cost stack.

---

## The Dataset Section

**Heading:** Gets better every time you use it

Every audit run produces a `labels.csv`. When you and a colleague independently mark each finding `keep` or `kill`, the tool's precision score computes automatically. When a finding is killed (false positive), you add the pattern to `taxonomy.js` — the witness stops repeating it permanently.

This is how Intel Echo improves: not by retraining, but by accumulating human judgment into its own institutional memory. The labeled ontology is the moat.

---

## FAQs

**Isn't this just another eval framework?**  
No. Eval frameworks score output correctness against a reference. Intel Echo checks mandate compliance — did the reasoning stay inside what it was asked to do? Those are different questions. Evals say "the answer was wrong." Intel Echo says "the reasoning was unauthorized." Both matter; they're not the same tool.

**Doesn't LangSmith / Weave already do this?**  
Tracing tools tell you what happened and when. Intel Echo tells you whether what happened was authorized. Tracing is observability for execution. Intel Echo is observability for mandate compliance. They're complementary — you can run Intel Echo on transcripts you extract from LangSmith.

**An LLM auditing an LLM — doesn't that share failure modes?**  
Yes, and we say so explicitly. The mandate-reconstruction step, the evidence-quoting requirement (no span = no finding), and the decision-relevance gate reduce the failure rate. The human-labeled dataset defines what "correct" means — not the model's own confidence. Findings are prompts for human judgment, not verdicts.

**What format does the transcript need to be in?**  
Plain markdown. Mark turns with `USER:` and `AI:`. The tool works on any conversational format — chat exports, agent logs, system-prompt + response sequences. If your format is unusual, use `prepare` and check the assembled prompt before running the full audit.

**Does it work on agentic tool-use traces, not just chat?**  
Yes. The DP-002 (Authority Overreach) finding in our own dev session caught a literal shell command: `rm -rf files facefile2 facefiles zip` — a tool-use action that exceeded the mandate. The tool reads what the AI text contains, including inline tool call representations.

**Can I define my own drift primitives?**  
Not yet in v0. Custom taxonomy is on the v1 roadmap. In the meantime, you can add `known_false_positives` to existing primitives in `taxonomy.js` to tune the witness without forking.

**Is it free?**  
The CLI and MCP server are MIT-licensed open source. The only cost is the one Anthropic API call per audit (a few cents for a typical transcript). The no-API `prepare → ingest` path using Claude Pro / Cowork has no metered cost at all.

---

## Footer CTAs

**Primary:** `npm install -g intel-echo` — Start auditing in 60 seconds  
**Secondary:** Star on GitHub  
**Tertiary:** Read the docs → `FOUNDATION.md`
