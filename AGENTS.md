# Repository Guidelines

## Project Structure & Module Organization
This repository is currently documentation-first. All content lives at the repo root:
- `README.md` for the project summary.
- Date-stamped planning docs such as `2026-02-27-meeting-body-language-coach.md` and `2026-02-27-meeting-body-language-coach-design.md`.

When adding new documents, keep related files grouped by topic and use consistent, searchable names. Preferred pattern: `YYYY-MM-DD-<topic>.md` and `YYYY-MM-DD-<topic>-design.md`.

## Build, Test, and Development Commands
There is no build pipeline yet. Use lightweight checks before opening a PR:
- `rg --files` lists tracked files quickly.
- `git status` verifies only intended changes are staged.
- `npx markdownlint-cli2 "**/*.md"` checks Markdown style (if Node tooling is available).
- `npx prettier --check "**/*.md"` checks formatting consistency (optional, if Prettier is available).

## Coding Style & Naming Conventions
Write in clear, instructional Markdown:
- Use ATX headings (`#`, `##`, `###`) in logical order.
- Keep sections short; prefer bullets over long paragraphs.
- Use backticks for commands, paths, and identifiers.
- Keep filenames lowercase with hyphens; use date prefixes for planning artifacts.

## Testing Guidelines
Automated tests are not configured in this repo. “Testing” means document quality checks:
- Run lint/format checks when available.
- Verify links and command examples manually.
- Confirm new docs do not contradict existing plans.

## Commit & Pull Request Guidelines
Current history favors short, direct commit subjects (for example: `Initial commit`, `Adding plans to git`). Follow this style:
- Use a concise subject line in present tense.
- Keep each commit focused on one logical change.

PRs should include:
- A brief summary of what changed and why.
- Referenced issue/task (if applicable).
- Notes on validation performed (lint, formatting, manual review).

## Security & Configuration Tips
Do not commit secrets, API keys, or personal data in documentation. If examples require sensitive values, use placeholders such as `<API_KEY>`.
