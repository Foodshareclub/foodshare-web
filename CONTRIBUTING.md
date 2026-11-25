# Contributing to FoodShare foodshare-web

FoodShare is a small, hands-on team. Development is driven by the maintainers and their
agent fleet; external contributions are welcome as issues and discussion.

## Before you start

1. Read [CLAUDE.md](CLAUDE.md). It is the authoritative description of the toolchain
   and the invariants of this codebase — the rules in it exist because something broke
   before.
2. Search existing issues before opening a new one.
3. Feature and bug intake goes through the **agent-intake** issue form in the Issues
   tab; the maintainers route from there.

## Issues and labels

| Label          | Meaning                                                        |
| -------------- | -------------------------------------------------------------- |
| `intake`       | Filed through the agent-intake form, awaiting triage           |
| `p0`           | Priority 0 — blocks production, handled first                  |
| `prod-gate`    | Work that must land before a production release                |
| `security`     | Security-relevant; see [SECURITY.md](SECURITY.md) for reports  |

## Branching and delivery

`main` is the only long-lived branch. Work is delivered to `origin/main` once the CI
gates pass; a push to `main` runs the deployment pipeline, so a commit is not "done"
until its CI is green.

## Toolchain

Bun is the only runtime — package manager, test runner and type checker (`tsrs`). Format with `bun run format`; lint with `bun run lint`.

CI checks formatting on the whole tree (`bun run format:check`, which is `bun fmt --check` with the
pinned Bun version and the `[fmt]` section of `bunfig.toml`). After pulling or rebasing, run
`bun run format` on files you changed before committing. `bun run format:changed` is a faster
local check of only the files you changed.

The one-time baseline format commit is listed in `.git-blame-ignore-revs`. Make `git blame` skip it:

```sh
git config blame.ignoreRevsFile .git-blame-ignore-revs
```

GitHub applies this file automatically.

## Conduct

By participating in this project you agree to abide by the
[Code of Conduct](CODE_OF_CONDUCT.md).
