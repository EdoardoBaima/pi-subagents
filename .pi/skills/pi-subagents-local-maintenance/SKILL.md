---
name: pi-subagents-local-maintenance
description: Run upstream intake for Edoardo's Windows pi-subagents downstream. Use when assessing or accepting nicobailon upstream updates, reconciling the BYCO main branch, refreshing the Windows Pi package, or checking the related chezmoi state.
---

# Pi Subagents Upstream Intake

Treat `upstream/main` as vendor truth and `byco/main` as the Windows deployment branch. Preserve a downstream change only while evidence shows that upstream does not provide the required behaviour.

## 1. Account for the drift

From `F:/source/libraries_OSS/pi-subagents`, verify a clean worktree and fetch all three remotes:

```bash
git status --short --branch
git fetch upstream --prune --tags
git fetch origin --prune
git fetch byco --prune
git rev-list --left-right --count byco/main...upstream/main
git log --oneline upstream/main..byco/main
git diff --name-status upstream/main...byco/main
```

Expected remotes:

```text
upstream  https://github.com/nicobailon/pi-subagents.git
byco      ssh://git@192.168.1.200:2222/byco/pi-subagents.git
origin    git@github.com:EdoardoBaima/pi-subagents.git
```

Classify every downstream delta as one of:

- Still-required Windows behaviour.
- Behaviour now supplied upstream.
- Repo-local maintenance material under `.pi/`.

This step is complete when every commit and changed file in `upstream/main..byco/main` has a classification. Stop on a dirty worktree or an unexpected remote.

## 2. Build the intake merge

Create an integration branch from the deployed commit, then merge without committing:

```bash
git switch -c integrate/upstream-YYYYMMDD byco/main
git merge --no-ff --no-commit upstream/main
```

Resolve conflicts by taking the current upstream design, then reapplying only classified downstream behaviour that remains necessary. Retire superseded patches instead of preserving their old implementation. Keep this skill under Pi's project skill path, `.pi/skills/`.

```bash
git diff --check
git diff --name-only --diff-filter=U
```

This step is complete when there are no unmerged paths, `git diff --check` passes, and the resulting tree contains only classified downstream differences from `upstream/main`.

## 3. Prove the Windows candidate

Install the merged lockfile and run the upstream test contract:

```bash
npm ci
npm run test:all
```

Run focused Windows tests for every retained Windows-only change. For atomic status writes, include:

```bash
node --experimental-strip-types --test test/unit/atomic-json.test.ts
```

Inspect the final downstream surface:

```bash
git diff --stat upstream/main
git diff --name-status upstream/main
```

This step is complete when all tests pass and every remaining downstream file matches the classifications from step 1. Report unrelated failures; do not weaken the test gate.

## 4. Promote the exact candidate

Read the `commit` skill before creating the merge commit. Record the validated upstream commit in the commit message. Then fast-forward local and BYCO `main` to that exact merge commit:

```bash
git switch main
git merge --ff-only integrate/upstream-YYYYMMDD
git push byco main:main
git fetch byco --prune
git rev-parse HEAD
git rev-parse byco/main
```

Push only after the user approves promotion. This step is complete when local `main` and `byco/main` equal the tested commit. Leave `origin/main` unchanged unless the user explicitly asks to update the GitHub fork.

## 5. Refresh Windows and verify chezmoi

Chezmoi owns the package declaration, while Pi owns the installed clone. The Windows template must keep this source:

```text
git:ssh://git@192.168.1.200:2222/byco/pi-subagents.git@main
```

After promotion, refresh that package and verify the installed clone reached `byco/main`:

```bash
pi update --extension 'git:ssh://git@192.168.1.200:2222/byco/pi-subagents.git@main'
git -C ~/.pi/agent/git/192.168.1.200/byco/pi-subagents rev-parse HEAD
git -C ~/.pi/agent/git/192.168.1.200/byco/pi-subagents status --short
```

From `C:/Users/Edoardo/.local/share/chezmoi`, run:

```bash
chezmoi diff
~/.pi/agent/skills/chezmoi-parity/scripts/check-parity.ps1
```

Approved runtime drift may remain in `settings.json` and the Better OpenAI `active` field. Apply chezmoi only when the diff contains an intended source change and none of these runtime paths:

```text
.pi/agent/auth.json
.pi/agent/run-history.jsonl
.pi/agent/sessions/**
.pi/agent/git/**
.pi/agent/npm/**
.pi/agent/node_modules/**
.pi/agent/logs/**
.pi/agent/cache/**
```

The intake is complete when the installed Windows package, local `main`, and `byco/main` share the tested commit, and the Windows parity check passes.
