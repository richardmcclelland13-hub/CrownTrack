---
name: qa-audit
description: Quality and self-review workflow. Use before finishing every Codex task to validate scope, commands, tests, accessibility, architecture, and known gaps.
---


# qa-audit

## Purpose

Catch bad agent work before returning it.

## Workflow

Before final response:

1. Review changed files.
2. Run relevant tests/typecheck/lint.
3. Check scope: did we add anything prohibited?
4. Check architecture boundaries.
5. Check UI accessibility basics for UI tasks.
6. Summarize risks/gaps honestly.

## Required final report

- Files changed
- Commands run
- Results
- Manual verification steps
- Known gaps
- Deferred items
- Next recommended prompt/stage
