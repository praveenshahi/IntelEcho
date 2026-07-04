# FOUNDATION.md — Intel Echo Product Foundation

> **⚠ Name Risk:** "Intel" is a registered trademark of Intel Corporation in the developer/technology space. Resolve this before any public launch. See [`RISKS.md`](RISKS.md#1-intel-trademark-collision).

---

## Vision

Every AI interaction should be auditable — not because AI is untrustworthy by default, but because unwitnessed reasoning is. Intel Echo makes drift visible before it becomes a decision, an agent action, or a liability.

The long game: a labeled ontology of cognitive drift that is to AI reliability what CVE is to security — a shared, compound-interest asset that makes every AI system that uses it measurably more trustworthy than one that doesn't.

---

## The Problem

### What developers are actually experiencing

You deploy an AI agent. It produces a confident, coherent output. The output is wrong — not factually wrong (hallucination), but *mandate wrong*: it answered a different question than it was asked, claimed authority it wasn't given, or quietly redefined the goal mid-session. You don't know where it went wrong. You tweak the system prompt, run it again, hope for the best.

This is the problem. It has no name yet, no tooling, and no metric. The industry calls it "alignment" or "reliability" or "trust" — vague enough to avoid funding. Intel Echo names it **epistemic drift** and makes it measurable.

### Why existing tools don't catch it

| Tool category | What it checks | What it misses |
|---|---|---|
| Tracing (LangSmith, Weave) | What happened, when | Whether what happened was *authorized* |
| Evals (PromptFoo, Braintrust) | Correctness vs. reference | Mandate compliance — was the question even answered? |
| Guardrails (NeMo, Llama Guard) | Harmful / unsafe content | Scope creep, confidence inflation, goal mutation |
| Observability (tokens, latency, cost) | Infrastructure metrics | Reasoning quality |

None of these tools ask: *did the AI do what it was asked to do, or something adjacent it preferred?* Intel Echo asks only that question.

### The real cost

In chat: 3–8 wasted correction cycles per drifted session (~10,000–40,000 tokens).  
In agents: an action that reached the world — wrong refund, wrong clause, wrong code shipped — that now has to be unwound.  
In pipelines: a CI stage that passed because nobody checked whether the agent exceeded its mandate.

The correction-cycle cost is the token-budget argument. The agentic cost is the liability argument. Both are real. Lead with whichever the ICP cares about.

---

## Positioning

**Intel Echo is a drift detector for AI reasoning.**

It occupies white space between observability and evals. It does not score correctness. It does not block harmful content. It reads a transcript and points, with exact quoted evidence, at where the reasoning exceeded what it was asked to do. That is the entire product, and that specificity is the moat.

**One-line version:** "The AI did something. Intel Echo shows you where it went off-mandate."

**Token-budget version (for devs already using OmniRoute or similar):** "OmniRoute compresses tokens per request. Intel Echo compresses correction loops per session. Run them together."

**Compliance version (for enterprise, v2+):** "Accountability infrastructure for agentic AI — catches overreach before it becomes a liability event."

Do not position this as a "trust score," a "cognitive integrity platform," or "AI safety" tooling at launch. Those are true but unkillable in a sales conversation. Stick to the concrete, falsifiable claim: *we catch drift, we show evidence, we report confidence.*

---

## ICP

### v0 ICP — the only one that matters right now

**Developer building or debugging a multi-turn AI agent or assistant.** Has been burned by an agent that confidently did the wrong thing. Uses Claude Code, Cursor, or Cline daily. Has an API key. Thinks in transcripts and system prompts, not in dashboards.

They do not need to be sold on the problem. They have felt it. The barrier is discovery and friction, not conviction.

**What they will do with Intel Echo:**
1. Paste a broken agent transcript → get a finding that names the exact sentence that went off-mandate
2. Fix the system prompt based on the finding → run the agent again
3. Add `intel-echo audit` to their CI pipeline → sleep better

### v2 ICP (do not build for this yet)

Teams shipping agents into regulated domains (finance, legal, healthcare, ops) where overreach is a compliance event. They need audit trails, team verdicts, and SLA-backed precision. Build the labeled dataset first; the compliance product follows from it.

---

## Jobs To Be Done

**Primary JTBD:** When my agent produces output that seems wrong-for-the-wrong-reason, I need to pinpoint where the reasoning went off-mandate, so I can fix the system prompt rather than guessing and rerunning.

**Secondary JTBD:** When I'm shipping an agent to production, I need a CI gate that fails if the agent overreached on test transcripts, so I can catch mandate violations before they reach users.

**Dataset JTBD (v2):** When I'm evaluating AI reliability at scale, I need a labeled ontology of drift types with inter-annotator agreement metrics, so I have a falsifiable benchmark rather than vibes.

---

## Principles

These are constraints on the product, not aspirations. Violating them is how the product becomes useless.

**1. Evidence, not opinion.** Every finding quotes an exact verbatim span from the AI's text. No span = no finding. A witness that paraphrases is making things up.

**2. Mandate first.** Reconstruct what the human was actually asking for at each turn *before* judging drift. An AI that follows a human-invited redirect is not drifting; flagging it is a false positive. See `core/mandate.js`.

**3. Decision-relevance gate.** A finding that would not change the next decision is hidden, not surfaced. Noise is the cardinal failure, not missed findings. Precision is weighted over recall by design.

**4. False positive is the cardinal sin.** A tool that cries wolf gets uninstalled. Every known false positive goes into `taxonomy.js`'s `known_false_positives` — the institutional memory that makes the tool better without retraining anything.

**5. The witness is not a judge.** Intel Echo never says "you're wrong." It says "the transcript does not support this, given the mandate." It reports its own confidence. It can return zero findings. That is correct and expected.

**6. Scope discipline.** Do not add features mid-task. If a good idea appears during development, write it to `later.md` and keep going. The product exists to catch reasoning that exceeds its mandate; hold the same standard while building it.

---

## Roadmap

For implementation detail, see [`BUILD_PLAN.md`](BUILD_PLAN.md).

| Phase | What ships | Why this order |
|---|---|---|
| **v0.1** (now) | npm package, public README, selftest green | Discovery requires being findable |
| **v0.2** (1–2 weeks) | MCP server (`intel-echo serve`) | Claude Code / Cursor integration is the adoption unlock |
| **v0.3** (3–4 weeks) | GitHub Action, 5+ labeled examples, real precision score | CI gate + credibility via dataset |
| **v1.0** (2–3 months) | Custom taxonomy API, batch audit, TypeScript types | Library consumers, enterprise extensions |

**What is explicitly NOT on this roadmap:** a web UI, a SaaS dashboard, a scoring API, multi-agent council mode, or anything requiring a database. Those are v2+ and only justified if v0 adoption proves the core value.
