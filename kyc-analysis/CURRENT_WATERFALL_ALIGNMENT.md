# Task 1 — Current KYC Waterfall: Alignment vs Expectation

**Verdict: ~32% aligned with the stated model** (1 check fully aligned, 5 partial, 5 gaps — counting partial as half). The reconstruction correctly identifies Idology as L1 and surfaces the big secondary volumes, but it is still an *invocation map*, not the exclusive-path waterfall the assignment asks for — and several stated routing rules are contradicted or not yet proven by the data.

---

## Headline numbers (from your as-is asset)

| Metric | Value |
|---|---|
| Population | **2,515,262** |
| Idology PASS | 2,132,944 (**84.8%**) |
| Idology FAIL | 288,134 (**11.5%**) |
| Idology NOT invoked | 94,184 (**3.7%**) |
| Sum of “Failed” leaf outcomes | **~134,892 (~5.36%)** |
| Target bar | **≤ 5%** non-verification |

The ~5.36% figure is a **ceiling estimate** from summing Failed leaves across overlapping provider branches. An exclusive-path rebuild is required before you can stand behind a single rejection rate in front of a CEO.

---

## Stated model (assignment) vs what your reconstruction shows

| Stated expectation | Status | Evidence from your asset |
|---|---|---|
| L1 = Idology primary | **Aligned** | 84.8% of users hit Idology |
| Idology PASS → verified & **exit** | **Gap** | **131,682** secondary invocations *after* PASS (Lexis 130,713 + ACRO 922 + Manual 47) |
| Only FAIL routes to L2/L3 | **Partial** | FAIL does route to Lexis/ACRO/Manual — but **94,184** never hit Idology at all |
| Split by SSN vs non-SSN failure type | **Gap** | Not reconstructed yet (no reason codes / path labels in the asset) |
| Path A (SSN) → Lexis / legacy Persona-SSN | **Partial** | Lexis is heavy; Persona-SSN lane not isolated; ProviderA vs ProviderB Lexis not split |
| Path B (non-SSN) → ACRO / Persona-IDV | **Partial** | ACRO is the dominant FAIL-path recovery (113k); Persona-IDV ≈ **18** users |
| Manual = safety net after automation fails | **Partial** | Large Manual volume on FAIL (74,381); tiny Manual on PASS (47) |
| Exact path Sankey (no double count) | **Gap** | Asset itself warns: branches may overlap |
| Overall rate vs 5% + genuine vs avoidable | **Partial** | Rate sketched; genuine-vs-avoidable diagnosis not done |

---

## What this means for “how close am I?”

You are **past raw exploration** and have a credible **as-is skeleton** — good enough to brief the leak story. You are **not yet at Task 1 “answer-first” quality** for the interview, because three CEO-grade questions are still open:

1. **What is the true non-verification rate?** (exclusive paths, one denominator)
2. **Does the SSN / non-SSN split actually exist in the data?** (and how does it map to Lexis vs ACRO)
3. **What share of losses are avoidable process leaks vs genuine rejects?**

Until those are closed, the waterfall is a **provider heat map**, not a confirmed routing model.

---

## Leaky-bucket concentrations (where to put a stop later)

Largest Failed concentrations on the Idology FAIL path:

| Leak | Users | % of pop |
|---|---:|---:|
| ACRO FAIL → not verified | 56,449 | 2.24% |
| Manual FAIL → not verified | 48,612 | 1.93% |
| Lexis FAIL → not verified | 28,218 | 1.12% |
| Provider PASS but overall fail | 1,237 | 0.05% |

**Highest-leverage as-is findings (for Task 1 narrative):**

1. **ACRO is both the biggest salvage engine and the biggest terminal sink** after Idology FAIL (45% provider pass rate; 56k still not verified).
2. **Manual is a costly partial rescue** (~32% pass) — volume suggests automation is exhausting too many recoverable users into humans.
3. **Idology bypass / Primary Lexis (93k)** is a parallel onboarding lane missing from the “understood” waterfall — must be explained, not ignored.
4. **PASS-path secondary traffic (131k)** breaks the stated “PASS exits” rule — either policy drift, re-checks, or partner-specific overlays.

---

## Data caveats (assignment explicitly scores these)

- Nulls = empty strings; Persona has PASS only (no FAIL).
- Two Lexis integrations share `lexis_nexis_result` — must split via `kyc_source` (ProviderA vs ProviderB).
- Current chart is **invocation-based**; users can appear in multiple secondary buckets.
- `overall_kyc_status` is the only ground-truth outcome — provider PASS ≠ verified in ~1.2k FAIL-path cases.

---

## Next analytical moves (still Task 1 — current model)

1. Build **exclusive user paths**: Idology → (Lexis | ACRO | Persona | Manual)* → `overall_kyc_status`.
2. Split Idology FAIL by **SSN vs non-SSN** reason (or proxy) and validate Path A/B.
3. Separate **ProviderA_Lexis_Nexis** vs **ProviderB_Lexis_Nexis** behavior.
4. Compute a single **non-verification rate** and partition into genuine vs avoidable.
5. Only then redesign (Task 2).

---

## Artifacts

- Interactive dashboard: `kyc-analysis/current_waterfall_dashboard.html`
- Chart generator: `kyc-analysis/generate_waterfall_charts.py`
