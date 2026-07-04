# RISKS.md — Intel Echo Risk Register

Risks are rated by severity (impact × likelihood). High = block launch or fundamentally changes direction. Medium = needs mitigation plan before Milestone 3. Low = monitor.

---

## 1. Intel Trademark Collision

**Severity: HIGH — resolve before any public launch.**

Intel Corporation holds registered trademarks on "Intel" in the United States, EU, and most major markets, specifically in the developer/technology space. The likelihood that Intel Corporation's legal team would consider "Intel Echo" confusingly similar to their brand in the developer tooling market is non-trivial. Cease-and-desist after launch is expensive and reputation-damaging.

**Mitigation options (choose one before launch):**
- Conduct a trademark clearance search (USPTO TESS + EU EUIPO). This costs ~$500 with a trademark attorney and takes a week.
- Rename before any public announcement. The name is not the moat — the labeled ontology is. Renaming costs nothing at this stage.
- If proceeding with the name, obtain a legal opinion letter on likelihood of confusion. Do not rely on a hunch.

**If ignored:** A C&D post-launch requires renaming the npm package, the GitHub repo, the domain, and all community posts simultaneously — while actively managing user confusion. This is a solvable problem now and an expensive one later.

---

## 2. LLM Auditing LLM — Shared Failure Modes

**Severity: MEDIUM — acknowledged and partially mitigated, but not eliminated.**

The witness model can drift in the same ways it is auditing for. It can over-flag (false positive), miss subtle drift (false negative), or hallucinate a span that doesn't exist in the transcript. These are not theoretical — they will happen.

**Current mitigations:**
- Evidence-quoting requirement: no span = no finding. The witness cannot flag drift without citing verbatim text.
- Mandate-reconstruction step: forces the model to reconstruct authorized context before judging.
- Decision-relevance gate: hides findings that wouldn't change the next decision, reducing noise.
- `known_false_positives` in `taxonomy.js`: accumulated institutional memory from real audits.
- `auditor_confidence` field: the witness reports its own uncertainty.

**What's not mitigated:** the witness has no way to know when it is confidently wrong. The only external check is the human-labeled dataset. `scoreRows()` on labeled rows is the only credible precision metric. Do not claim the tool "works" until that number is non-null and ≥ 0.6.

**Long-term mitigation:** as the labeled dataset grows, model-specific false-positive patterns will emerge (GPT-4 tends to X; Claude Sonnet tends to Y). These can be encoded into model-specific `known_false_positives`, making the witness progressively more calibrated per model. This is the paid-product moat — see the architecture note below.

---

## 3. False Positive Rate Kills Adoption

**Severity: HIGH — this is the product's existential risk.**

A tool that flags things developers disagree with gets turned off. The design is precision-over-recall by intent, but the taxonomy is unvalidated on real transcripts at scale. If the four primitives are poorly defined, the false positive rate will be high enough to erode trust before the `known_false_positives` mechanism can correct it.

**Mitigation:**
- The decision-relevance gate is the first line of defence — it hides true-but-inert findings.
- Require annotator verdicts on the first 10 example transcripts before claiming any precision number.
- Never claim "87% accuracy" or any fabricated metric. Ship with `scoreRows()` returning a real number from real labels.
- Treat every HN comment that says "this false-flagged my session" as a bug, not feedback. Fix it in `taxonomy.js` within 24 hours.

---

## 4. Context Window Limit on Long Transcripts

**Severity: MEDIUM — will surface immediately for enterprise users.**

`audit()` makes a single model call with the full transcript. chat1.md at 2,721 lines is ~67k characters — at the edge of what works reliably. Real enterprise agent logs can be 10x–100x longer. The current implementation fails silently (truncation) or with a confusing API error.

**Mitigation (v0):** Add an explicit guard: if `transcript.length > 50_000` characters, fail with a clear error message before any API call. Do not silently truncate — that's worse than failing.

**Mitigation (v1):** Chunked audit. Split on turn boundaries, audit each chunk independently, merge findings, de-duplicate by span. Implement in Milestone 4 (see [`BUILD_PLAN.md`](BUILD_PLAN.md)).

---

## 5. Taxonomy Ossification

**Severity: MEDIUM — slow-burning, not immediate.**

If the four primitives get adopted as-is and encoded into CI pipelines, team standards, and downstream tooling before they're validated, incorrect primitives become load-bearing. Changing them later breaks things and loses trust.

**Current state:** The four primitives (goal_drift, authority_overreach, context_contamination, confidence_inflation) emerged from two transcripts. They are well-reasoned hypotheses, not empirically validated categories. The inter-annotator agreement metric (`scoreRows()`) exists specifically to catch this — if two independent annotators consistently disagree on what constitutes a primitive, the primitive is poorly defined.

**Mitigation:**
- Do not market the primitives as "validated" until `inter_annotator_agreement ≥ 0.7` across ≥ 20 labeled examples.
- Keep `taxonomy.js` human-readable and easily editable. The primitives are data, not code.
- In v1, support custom taxonomy so domain teams can extend without being bound by the defaults.
- If a primitive consistently produces kills, consider splitting or removing it.

---

## 6. Competition from Platform Providers

**Severity: MEDIUM — real but slow-moving.**

Anthropic, OpenAI, or LangChain could build mandate-compliance checking into their native tooling. If Anthropic adds "drift detection" to Claude Console, it undercuts the CLI audience.

**Why this is less urgent than it sounds:** Platform providers optimize for capability (correctness, speed, cost). They have no incentive to build the thing that tells you their model overreached — the conflict of interest is structural. An independent tool with a community-owned ontology is harder to replicate than a feature shipped by the model provider.

**Mitigation:** The labeled dataset is the moat. Move fast to get community members contributing annotated transcripts. Once 50+ examples exist with inter-annotator verdicts from independent researchers, the dataset has value that can't be reproduced by a platform team in a quarter.

---

## 7. "Just Another Eval Framework" Positioning Confusion

**Severity: LOW — messaging risk, not product risk.**

Developers will initially bucket Intel Echo with PromptFoo, Braintrust, or LangSmith. If the first impression is "another eval tool," they'll skip it. The distinction (correctness ≠ mandate compliance) is real but requires one sentence to explain.

**Mitigation:** The README, HN post, and all copy lead with the concrete `rm -rf` and "scientific law" examples before explaining the theory. The finding is surprising — the explanation follows. Do not lead with taxonomy; lead with the caught finding.

---

## 8. No-API Workflow Adds Friction Without Adding Enough Value

**Severity: LOW — reassess at Milestone 2.**

The `prepare → paste → ingest` no-API path is clever but requires the user to manually copy-paste a prompt and save a response. For developers already with an API key, this is more friction than `audit`. For developers without one, it's a workaround that signals the product isn't fully built.

**Flag:** Consider whether the no-API path is worth maintaining after the MCP server ships. At that point, Cowork / Claude Pro users have a better no-API path (the Cowork CLAUDE.md workflow). The CLI `prepare` command still has value for transparency (developers can inspect the witness prompt), but the `ingest` command may be vestigial post-MCP.

**Mitigation:** Keep it in v0 (it's already built and costs nothing to maintain). Reassess at Milestone 3 based on which path developers actually use.
