---
name: pi-subagents-local-maintenance
description: Maintain Edoardo's local pi-subagents checkout, personal GitHub fork, BYCO Forgejo mirror, and temporary chezmoi Windows package pin. Use when working in F:/source/libraries_OSS/pi-subagents, checking byco/origin/upstream sync, rebasing the Windows EPERM fix branch, or updating the chezmoi pi-subagents commit pin.
---

# Pi Subagents Local Maintenance

## Quick start

```bash
cd F:/source/libraries_OSS/pi-subagents
git status --short --branch
git fetch upstream --prune --tags
git fetch origin --prune
git fetch byco --prune
```

Expected remotes:

```text
origin   git@github.com:EdoardoBaima/pi-subagents.git
upstream https://github.com/nicobailon/pi-subagents.git
byco     ssh://git@192.168.1.200:2222/byco/pi-subagents.git
```

## Branch hygiene / fork model

- `upstream/main` is the external vendor truth.
- `byco/main` and local `main` are BYCO's deployable downstream truth. They may intentionally drift from `upstream/main` when Windows/local operations need a carried patch.
- `origin/main` is the optional GitHub fork mirror/baseline for upstream PR work; keep it aligned with `upstream/main` unless deliberately publishing downstream state there.
- Keep BYCO drift minimal and legible:

```bash
git log --oneline upstream/main..byco/main
git diff --stat upstream/main..byco/main
```

- `fix/windows-status-json-eperm` is a topic/PR candidate branch for the clean Windows fix only.
- Personal teaching artifacts for this package belong on `teaching/pi-subagents-internals`, not on the fix branch or `byco/main`.
- After rebasing a topic branch, push personal mirrors with `--force-with-lease`:

```bash
git push --force-with-lease origin HEAD:fix/windows-status-json-eperm
git push --force-with-lease byco HEAD:fix/windows-status-json-eperm
```

To promote a validated downstream fix to BYCO `main`, prefer a fast-forward push of the exact clean commit:

```bash
git merge-base --is-ancestor byco/main <fix-commit>
git push byco <fix-commit>:refs/heads/main
git fetch byco --prune
git branch -f main byco/main
git branch --set-upstream-to=byco/main main
git log --oneline upstream/main..byco/main
```

## Chezmoi Windows pin

Windows temporarily pins `pi-subagents` in:

```text
C:/Users/Edoardo/.local/share/chezmoi/home/dot_pi/agent/settings.json.tmpl
```

Pin shape:

```text
git:ssh://git@192.168.1.200:2222/byco/pi-subagents.git@<commit>
```

When changing the Windows pin:

1. Prefer a target commit reachable from `byco/main`.
2. Verify the BYCO drift is intentional and minimal with `git log --oneline upstream/main..byco/main`.
3. Update the template pin.
4. Update `PI_COMPATIBILITY.md`.
5. Update `PI_SUBAGENTS_EPERM_INTEGRATION_HANDOFF.md`.
6. Run:

```bash
cd C:/Users/Edoardo/.local/share/chezmoi
chezmoi cat ~/.pi/agent/settings.json | rg "pi-subagents"
chezmoi diff ~/.pi/agent/settings.json
```

Do not apply automatically if the diff includes unrelated live Pi runtime drift.

## Validation

For the EPERM fix branch, prefer targeted checks:

```bash
node --experimental-strip-types --test test/unit/atomic-json.test.ts
node --experimental-transform-types --import ./test/support/register-loader.mjs --test test/integration/async-execution.test.ts --test-name-pattern "background child event processing survives exhausted transient status rename retries"
```

`npm run test:unit` may expose unrelated failures; report them separately from the EPERM path.

## Stop conditions

Do not commit or chezmoi-manage Pi runtime state:

```text
~/.pi/agent/auth.json
~/.pi/agent/run-history.jsonl
~/.pi/agent/sessions/**
~/.pi/agent/git/**
~/.pi/agent/npm/**
~/.pi/agent/node_modules/**
~/.pi/agent/logs/**
~/.pi/agent/cache/**
```
