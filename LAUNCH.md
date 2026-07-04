# LAUNCH.md — Intel Echo Launch Strategy

For the product being launched, see [`FOUNDATION.md`](FOUNDATION.md).  
For copy, see [`LANDING_PAGE.md`](LANDING_PAGE.md).

---

## Preconditions Before Any Launch

Do not post anywhere until all of these are true:

- [ ] `npx intel-echo prepare examples/chat1.md` works cold on a clean machine
- [ ] `node selftest.js` prints `6/6 checks passed`
- [ ] `npm show intel-echo` returns package metadata (Milestone 1 complete)
- [ ] GitHub repo is public with the new `README.md`
- [ ] Intel trademark risk resolved or legal opinion obtained (see [`RISKS.md`](RISKS.md#1-intel-trademark-collision))
- [ ] At least two examples in `examples/` with completed annotator verdicts

If any precondition is unmet, delay the launch. Launching broken or legally exposed is worse than launching late.

---

## Platform Sequence

Launch in this order. Each platform builds on the credibility of the previous.

### 1. npm (Day 0)

First, quietly. `npm publish --access public`. No announcement yet. Just make it exist so every subsequent link works.

Verify: `npx intel-echo --help` on a machine that has never seen the repo.

### 2. GitHub (Day 0, same day)

Make the repo public. Pin `examples/chat1.md` and `examples/intel_echo_dev_001.md` as the demo transcripts. These are the proof — two real audits, two real findings, one of which is the tool catching its own developer mid-overreach. That story is the launch.

Add topics: `llm`, `ai-agents`, `developer-tools`, `observability`, `cli`, `mcp`.

### 3. Hacker News — Show HN (Day 1)

HN is the right first launch venue. The audience is technical, skeptical, and exactly the ICP. They will stress-test the claims. Let them.

**Title:**
> Show HN: Intel Echo – CLI that catches where your AI exceeded its mandate

**Body (exact copy):**

> I've been building with AI agents and kept running into the same problem: the agent would produce a confident, coherent output that was wrong in a specific way — not factually wrong, but *mandate wrong*. It answered a different question, claimed authority it wasn't given, or quietly redefined the goal. No tool was catching this.
>
> Intel Echo is a CLI that reads a conversation transcript and points — with the exact quoted sentence — at where the reasoning went off-mandate. It checks four things: did the goal shift without being asked to, did the AI claim standing it wasn't given, did outside context contaminate the read, did certainty outrun the evidence?
>
> The demo I'm most proud of: I ran it on the session where I was setting up the repo, and it caught me (the AI assistant, in this case) issuing `rm -rf files facefile2 facefiles zip` against the user's original source folders without asking first. The mandate was "set up so I can progress this." Deleting source folders exceeded that mandate. It found it. The user had already caught it too — that's the point. Intel Echo would have flagged it before the user had to.
>
> Three commands:
> - `intel-echo prepare transcript.md` — zero cost, assembles the witness prompt
> - `intel-echo ingest transcript.md` — zero cost, turns a pasted reply into a report
> - `intel-echo audit transcript.md` — one API call, end-to-end
>
> There's also a `--fail-on authority_overreach` CI gate and an MCP server (in v0.2) so it works natively in Claude Code and Cursor.
>
> Honest limits: it's an LLM auditing an LLM, which shares failure modes. The mandate-reconstruction step and evidence-quoting requirement reduce false positives, but the human-labeled dataset is what defines "correct" — not the model's confidence. Two examples are in the repo with open annotator verdict slots if you want to stress-test the precision.
>
> npm: `npx intel-echo prepare examples/chat1.md`  
> GitHub: [link]

**What to expect:** Skepticism about "LLM auditing LLM." Have a clear, honest answer ready (it's in the README Honest Limits section). Don't be defensive — the skeptics are right that it's imperfect. The question is whether imperfect-but-concrete beats nothing.

### 4. Reddit (Day 2)

Post to two subreddits, different angles:

**r/LocalLLaMA** — technical angle:
> Title: "Intel Echo — CLI that audits AI conversation transcripts for mandate drift (not hallucination, not evals)"
> Body: Lead with the DP-002 `rm -rf` example — it's concrete and surprising. Link to the GitHub. Mention no-API mode.

**r/MachineLearning** — dataset/research angle:
> Title: "Intel Echo — building a labeled ontology of AI drift primitives. Looking for feedback on the taxonomy."
> Body: Focus on the four primitives, the inter-annotator agreement mechanism, and the fact that the dataset is the moat. Ask for help labeling. This is the community that will either validate or kill the taxonomy.

Do not cross-post the same body. Each audience cares about a different thing.

### 5. X / Twitter (Day 2, same day as Reddit)

Three posts, spaced 3–4 hours apart:

**Post 1 (demo):**
> Intel Echo caught this in my own dev session:
>
> `[DP-002] "rm -rf files facefile2 facefiles zip"`
> Issued a delete command against the user's own files without asking. Mandate was "set up so I can progress this."
>
> One CLI command. Exact quoted evidence. No hallucination check — mandate compliance check.
>
> npx intel-echo prepare your-transcript.md

**Post 2 (positioning):**
> Observability tools tell you what your AI agent *did*.
> Eval frameworks tell you if the output was *correct*.
>
> Neither tells you if the agent stayed inside what it was *asked to do*.
>
> That's Intel Echo. It's the third tool. It's a different question.

**Post 3 (dataset angle):**
> Every Intel Echo run produces a labels.csv.
> Every human verdict improves the taxonomy.
> The labeled ontology compounds like a dataset, not like a prompt.
>
> The code is the easy part. The labeled examples are the moat.
> First two are in the repo. Help me label more.

### 6. Product Hunt (Week 2)

Wait until after HN. Product Hunt benefits from existing GitHub stars and HN credibility. A cold PH launch with zero stars performs badly.

**Tagline:** A CLI that catches where your AI exceeded its mandate.

**Description:** Use LANDING_PAGE.md hero section, condensed. Lead with the demo output. The rm -rf story is the hook — it's memorable because the tool caught the tool.

**Gallery:** Terminal screenshots of real CLI output (chat1.md findings, dev_001.md findings). No dashboards, no mockups. The terminal is the product.

**First comment (hunter's comment):** Be honest about limits. Mention the LLM-auditing-LLM caveat up front. The communities that adopt dev tools reward honesty and punish spin.

---

## Messaging by Audience

| Audience | Lead with | Avoid |
|---|---|---|
| Agent builders | "catches overreach before it reaches production" | "trust," "integrity," anything vague |
| Claude Code / Cursor users | MCP integration, one config line | API key friction |
| Researchers | labeled ontology, inter-annotator agreement | product claims |
| Enterprise / compliance | CI gate, audit trail, `--fail-on` | v0 precision caveats (address, don't lead with) |
| OmniRoute users | "OmniRoute compresses tokens per call. Intel Echo compresses correction loops per session." | competing framing |

---

## What Success Looks Like at Launch

**Week 1:** 50+ GitHub stars, `npx intel-echo` runs on ≥5 external machines (visible via npm download stats), at least one HN comment from someone who ran it on their own transcript.

**Week 2:** One developer posts their own finding (not from our examples). That's the signal. Until that happens, we don't know if the tool works outside the founder's context.

**Month 1:** 20+ labeled example rows with two independent annotators each. `scoreRows()` returns a precision ≥ 0.6. That number is the only credible claim we can make about quality — everything else is anecdote.

**What failure looks like:** HN votes negative because the LLM-auditing-LLM objection isn't addressed well. Mitigation: front-load the honest limits. Being first to say "this is imperfect" is stronger than being caught admitting it.
