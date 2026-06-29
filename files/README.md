# Intel Echo

A compiler for reasoning. It does not improve an AI's answer or solve the task —
it points, with evidence, at where the reasoning **exceeded its mandate**. The
question it asks is not "was the answer correct?" but "where did the reasoning
exceed its epistemic standing?"

This repo is the **shared core**. Two faces will sit on top of it later (a dev
CLI, and a pilot report). Both call the same `audit()` engine, so every fix lands
once and both inherit it.

```
intel-echo/
  core/
    taxonomy.js    drift primitives as data — DP-IDs, counter-examples,
                   known false positives (the IP layer)
    mandate.js     THE FIX — reconstruct the active mandate per turn before
                   judging drift, so authorized redirection isn't flagged as drift
    witness.js     assembles the prompt, calls an injected model, validates output
    parse.js       salvages JSON even from truncated / prose-wrapped output
    schema.js      the output contract + the decision-relevance gate
    labels.js      turns findings into dataset rows + computes the north-star metric
  run.js           live runner: transcript in → report.json / report.md / labels.csv
  selftest.js      runs the whole core offline with a mock model (no API key)
  examples/        labeled transcripts (the growing dataset)
```

## Try it without spending anything

```bash
node selftest.js
```

This exercises the entire deterministic core — parsing, mandate validation, the
decision-relevance gate, label generation, and the scoring metric — against a
mock model. No key, no network. It should print `6/6 checks passed`.

## Run it on a real transcript

```bash
npm install
export ANTHROPIC_API_KEY=sk-...
node run.js examples/your_conversation.md
```

Mark turns with `USER:` and `AI:`. You get three files: the structured
`.report.json`, a readable `.report.md`, and a `.labels.csv` with one row per
finding and empty verdict columns for two annotators.

## The one real bug this core fixes

On a real transcript, v0 produced false positives because it judged each AI turn
against a **stale mandate** — it didn't notice the human had re-set the objective
a turn earlier (e.g. pushing back with "6 months?"). An AI response that follows a
freshly-changed mandate is **authorized redirection, not drift**.

The fix (in `core/mandate.js`) makes the witness reconstruct the mandate in force
at each turn *before* classifying drift. It's one extra reasoning step in the same
pass — not a separate service or state machine. That stays v0-sized on purpose.

## How the dataset compounds (Phase 0.5)

Every run emits label rows. As you run 10, 20, 30 real transcripts and two people
independently mark each finding `keep` (real) or `kill` (noise), the rows
accumulate into a test set. Then the north star computes automatically:

- **precision** — of what the tool flagged, how much was real (`1 − false-flag-rate`)
- **inter-annotator agreement** — are humans even consistent? If low, the
  taxonomy is unclear, not the model.

Precision is weighted over recall by design: a false flag costs more than a miss,
because a tool that cries wolf gets uninstalled.

## Honest limits

- The witness is one model call. It can miss subtle drift and occasionally
  over-flag. That is *why* correctness is defined by human-confirmed labels, not
  by the tool's own confidence.
- This core is for auditing transcripts and building the dataset. It is not yet a
  shipped product — the CLI and pilot faces come next, on top of this.
- An LLM auditing an LLM shares failure modes. The mandate step, the
  evidence-quoting requirement, and the decision-relevance gate reduce that, but
  do not eliminate it. Treat findings as prompts for human judgment, not verdicts.
```
