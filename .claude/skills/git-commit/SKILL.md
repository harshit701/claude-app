---
name: git-commit
description: Review staged/unstaged changes, summarize them, propose a conventional commit message, and create the commit only after explicit user approval. Use when the user asks to commit changes, create a commit, or "commit this".
---

# Git Commit

Create well-scoped, conventional commits with mandatory human approval before anything is staged or committed.

## Workflow

1. **Inspect status** — run `git status` to see staged, unstaged, and untracked files.
2. **Review the diff** — run `git diff` (unstaged) and `git diff --staged` (already staged) for the relevant files. Read enough of the diff to understand the actual change, not just the file list.
3. **Summarize the change** — in 1-3 sentences, describe what changed and why, based on the diff (not guesses).
4. **Suggest a commit message** — propose one conventional-commit message using a prefix appropriate to the change:
   - `feat:` new functionality
   - `fix:` bug fix
   - `refactor:` code change with no behavior change
   - `test:` adding/updating tests
   - `docs:` documentation only
   - `chore:` tooling, config, dependencies, maintenance
   If the changes span multiple unrelated concerns, propose splitting them into multiple logically grouped commits instead of one mixed commit, and list what would go in each.
5. **Stop and ask for approval** — present the summary and proposed message(s) and explicitly ask the user to approve, edit, or reject before doing anything else. Do not proceed without an explicit yes.
6. **After approval only:**
   - Stage only the specific files relevant to the approved commit (`git add <file> <file> ...`) — never `git add .` or `git add -A`.
   - Create the commit with the approved message using `git commit -m "..."`.
   - Run `git log -1` (or equivalent) and report the resulting commit hash and message back to the user.

## Rules

- Never push to a remote.
- Never modify files outside of staging them for commit — no editing, formatting, or "cleaning up" unrelated code.
- Never create a commit without explicit approval of the message.
- Never use `git add .` or `git add -A` — stage files by explicit name only.
- Never amend an existing commit unless the user explicitly asks for an amend.
- Keep commits logically grouped by concern; prefer multiple small commits over one mixed commit.
- If `git status` shows nothing to commit, say so and stop — do not fabricate a commit.
