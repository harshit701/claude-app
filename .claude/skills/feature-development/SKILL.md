---
name: feature-development
description: Orchestrates the complete feature-development workflow for this project — understand, plan, implement, test, review, commit, PR, and (after human approval) merge. Delegates code review to the backend-code-reviewer agent and local commits to the git-commit skill; does not reimplement either. Use when asked to build/implement a new feature end-to-end, or to run the full feature-development workflow.
---

# Feature Development

You are an **orchestrator**, not an implementation or review agent. Your job is to drive the existing pieces of this project's workflow in the right order, with the right approval gates — not to invent new review logic or a new commit workflow. Two rules override everything else in this skill:

- **Never review code yourself.** All code review is done by invoking the `backend-code-reviewer` agent (`Agent` tool, `subagent_type: "backend-code-reviewer"`). Do not write your own findings list, do not skip it, do not substitute your own judgment for its review.
- **Never hand-roll git staging/commit logic.** All local commits are done by invoking the `git-commit` skill (`Skill` tool, `skill: "git-commit"`). Do not `git add`/`git commit` directly outside of that skill.

Everything else — branching, pushing, PR creation/review, merging, cleanup — you do directly with `git` (Bash) and the GitHub MCP tools, following the phases below in order. Do not skip phases. Do not reorder the approval gates.

## Before starting: read CLAUDE.md

Always re-read `CLAUDE.md` at the start of a feature-development run, not from memory — it may have changed since you last saw it. Its architecture (Route → Middleware → Controller → Service → Repository → data layer), incremental-scope rule, dependency rules, and "do not anticipate future requirements" rule govern every phase below.

## Phase 1 — Understand and plan

1. Understand the requested feature from the user's own words. If genuinely ambiguous in a way that changes the implementation, ask — don't guess and don't expand scope.
2. Inspect the existing project structure and `CLAUDE.md` relevant to this feature (don't assume prior knowledge of the codebase is still current).
3. Produce a short implementation plan: what changes, in which layers, and why. Keep it to what was actually requested — no speculative extra features.
4. For any **significant architectural decision** (new dependency, schema change, a pattern not already used in this codebase, etc.), explain what you plan to change, why, which layer it belongs to, and how it fits the existing architecture — *before* implementing it. For small, obvious changes, don't stop for approval on this alone; CLAUDE.md's normal "explain significant changes" rule applies here, not a heavier bar.

## Phase 2 — Prepare the branch

5. Verify `main` is clean and up to date:
   - `git status` (must be clean — if not, stop and tell the user rather than stashing/discarding anything of theirs).
   - `git fetch origin`, then confirm local `main` matches `origin/main`. If local `main` is behind, fast-forward with `git pull` (never `--rebase`, never force). If local `main` has diverged in a way that isn't a clean fast-forward, stop and ask the user how to proceed — do not attempt a merge/rebase resolution on your own judgment.
6. Create the feature branch from `main`, named `feature/<short-feature-name>` (short, kebab-case, descriptive of the feature — not the ticket number or date). Confirm the branch was created and checked out.

## Phase 3 — Implement

7. Implement the feature per the plan from Phase 1, following CLAUDE.md's layering and scope rules. Only touch files relevant to this feature — never unrelated files, never opportunistic refactors.
8. Run relevant verification for what changed: typecheck (`npm run typecheck`), the test suite (`npm test`), and a manual/live check where that's the only way to verify behavior (e.g. hitting a running server), matching how verification has been done elsewhere in this project. Fix failures before moving on — don't hand a broken build to the reviewer.

## Phase 4 — Review / fix cycle (delegated)

9. Invoke the `backend-code-reviewer` agent (`Agent` tool, `subagent_type: "backend-code-reviewer"`) to review the changes made so far. Give it enough context to review meaningfully (what changed and why — see this project's established pattern of briefing it with concrete file paths and a summary of design decisions, not just "review my changes").
10. If it reports anything under **Critical Issues**, **Architectural Issues**, **Security / Reliability Issues**, or **Must fix**/**Should fix** under **Recommended Changes**: fix them yourself (directly — this is implementation work, not something to hand to another agent), re-run verification (Phase 3, step 8) if the fix touches tested behavior. (These are the reviewer's actual output headers — see `backend-code-reviewer`'s output format. It does not use the label "Important"; treat the above as the blocking set.)
11. Invoke the `backend-code-reviewer` agent again on the updated code.
12. Repeat steps 10–11 until a review pass reports nothing under those headers. Items under **Code Quality Issues**, **Testing Issues**, or **Nice to have** do not block the cycle — note them for the user, but don't loop on them indefinitely.

## Phase 5 — Local commit (delegated)

13. Invoke the `git-commit` skill (`Skill` tool, `skill: "git-commit"`) to create the local commit(s) for this feature. Let that skill handle its own diff review, message proposal, and approval gate — do not pre-stage files yourself or bypass its approval step.
14. After it completes, verify: `git status` (clean) and `git log -1` (commit present, matches what was approved).

## Phase 6 — Push and open the PR

15. Push the feature branch: `git push -u origin feature/<short-feature-name>`.
16. Create a Pull Request targeting `main` via GitHub MCP. **Tool availability varies by session** — if a PR-creation tool (e.g. `create_pull_request`) is available, use it directly. If it is not (the GitHub MCP server in this project has previously exposed only read tools), prepare the PR title and description yourself (what changed, why, how, testing performed, required setup/env vars — following the pattern already established in this project) and ask the user to create the PR manually with that content, then confirm with them once it exists before continuing.
17. Once the PR exists, use GitHub MCP read tools (`pull_request_read`, `list_pull_requests`, etc.) to inspect it — confirm branch/commits/files match what you pushed.

## Phase 7 — PR review / fix cycle (delegated)

This phase follows the same delegation rule as Phase 4: you do not perform code-review reasoning yourself. Your job here is to gather PR context via GitHub MCP and hand it to the `backend-code-reviewer` agent — the agent does the actual review, same as Phase 4.

18. Use GitHub MCP to inspect the PR's full context: `pull_request_read` (method `get`) for the PR itself, `get_commits` for its commits, `get_files` for changed files, `get_comments`/`get_review_comments` for any existing discussion, and `get_diff` for the actual diff.
19. Invoke the `backend-code-reviewer` agent (`Agent` tool, `subagent_type: "backend-code-reviewer"`) to perform the actual review, briefing it with that PR context (what the PR changes, why, and the diff/file list from step 18) — the same level of concrete briefing established in Phase 4 and in this project's prior reviews.
20. If it reports anything under **Critical Issues**, **Architectural Issues**, **Security / Reliability Issues**, or **Must fix**/**Should fix** under **Recommended Changes** (same blocking set as Phase 4, step 10):
    - Fix them directly (this is implementation work — you do the fix, not the reviewer agent).
    - Run relevant verification (typecheck, test suite, and a manual/live check where applicable — same as Phase 3 step 8) for every fix, **before** invoking `git-commit`. Do not commit an unverified fix.
    - Invoke the `git-commit` skill (`Skill` tool, `skill: "git-commit"`) to commit the fix — never stage/commit outside it.
    - Push the new commit (`git push`).
    - Re-invoke the `backend-code-reviewer` agent against the updated PR (repeat steps 18–19 with the refreshed diff/commit list).
21. Repeat step 20 until a review pass reports nothing under those headers. Items under **Code Quality Issues**, **Testing Issues**, or **Nice to have** do not block the cycle — note them for the user, but don't loop on them indefinitely.

## Phase 8 — STOP for human approval

22. **When the PR is technically ready (review clean), STOP.** Tell the user the PR is ready and ask them to perform the final human review and explicitly approve before anything is merged. Do not proceed past this point on your own judgment, no matter how clean the automated review was.
23. **Do not merge under any circumstances until the user explicitly approves the merge in this conversation.** A prior approval of an earlier step (e.g. approving a commit message) is not merge approval.

## Phase 9 — Merge and clean up (only after explicit approval)

24. Once the user explicitly approves: merge the PR via GitHub MCP if a merge tool is available; otherwise ask the user to merge it manually and confirm once done.
25. Verify the merge succeeded (PR shows `merged: true`, `main` on GitHub has the new commit(s)).
26. Delete the remote feature branch — via GitHub MCP if a delete tool is available; otherwise ask the user to delete it, unless they've said they'll handle remote cleanup themselves (as with local git operations, don't assume — confirm who's doing this step).
27. Switch the local repository to `main` (`git checkout main`).
28. Pull the latest `main` (`git pull`) so local history includes the merge.
29. Delete the local feature branch (`git branch -d feature/<short-feature-name>` — the safe/non-forced delete; if it refuses because `main` isn't actually caught up, fix that first rather than forcing with `-D`).
30. Verify the final state: `git status` clean, `git branch` shows only `main`, `git log` shows the merge commit at `HEAD`. Report this final state to the user.

## Safety rules (apply throughout, not just at specific steps)

- Never commit unrelated changes — only what belongs to this feature.
- Never overwrite unrelated user changes; if `git status` shows unexpected uncommitted work at any point, stop and ask rather than proceeding.
- Never use `git reset --hard`, `git push --force`, or other destructive/history-rewriting commands unless the user explicitly requests that specific action in this conversation.
- Never expose secrets. Never commit `.env`. Verify `.gitignore` still excludes it if you touch config/env-related files.
- Never merge without the user's explicit, in-conversation approval (Phase 8/9) — no exceptions, regardless of how clean the review is.
- Never skip the `backend-code-reviewer` agent, and never write ad hoc review logic in its place.
- Never reimplement the `git-commit` skill's staging/approval logic — always invoke it.
- Never create commits beyond what's needed for the feature and its review fixes — no filler commits.
- Do not implement features or scope beyond what was explicitly requested.
- Follow `CLAUDE.md` at all times; if something in this skill would conflict with it, `CLAUDE.md` wins and you should flag the conflict to the user.
