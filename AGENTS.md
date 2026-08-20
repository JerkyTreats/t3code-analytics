# AGENTS.md

## Purpose

This repository owns research, contracts, transformations, quality evidence, and delivery records for T3Code usage analytics.

It does not own T3Code runtime behavior, source data, provider records, credentials, internal DNS, deployment state, or user identity.

## Working Rules

- Start from source accessibility, authority, grain, semantics, and privacy before metrics or presentation.
- Treat T3Code as read only unless a separately authorized slice explicitly changes it.
- Never query a live operational database through a path that can write. Prefer a verified consistent snapshot.
- Never commit raw source data, message text, prompt content, reasoning content, tool payloads, terminal content, attachments, local paths, network values, account details, session identifiers, or credentials.
- Use stable pseudonymous keys only when a metric truly needs longitudinal grouping.
- Keep product behavior, operational health, cost and capacity, and data quality as separate signal families.
- Distinguish source truth, derived facts, metric definitions, observations, interpretations, and projections.
- Record grain, owner, time semantics, null semantics, dimensions, exclusions, and quality checks for every metric.
- A missing or unmeasured value is `null`, never zero.
- Do not infer human identity, contributor topology, authorship, attention time, or productivity from activity signals.
- Do not add a collector, durable store, scheduler, service, dashboard, or internal hostname without an authorized delivery slice.
- Keep visual work downstream of accepted data contracts and validated metric semantics.

## Evidence References

- Use `t3code:<relative path>` for evidence in the T3Code repository.
- Use `analytics:<relative path>` for evidence in this repository.
- Use a Markdown URL for external evidence.
- Use `live-observation:<date>` for aggregate read-only observations from the hosted instance.
- Never place private source locations or raw values in an evidence reference.

## Repository Shape

- `catalog/` owns source and metric registries.
- `assessment/` owns bounded evidence-backed assessments.
- `research/` owns external platform and method research.
- `.ledger/` owns maturity, authorization, expansion, review, and closeout state.
- `models/` may be added only with an authorized transformation slice.
- `tests/` may be added with the model slice they verify.
