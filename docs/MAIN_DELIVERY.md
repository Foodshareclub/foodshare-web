# FoodShare delivery to main

User instruction, 2026-10-20: **Always deliver to main.** Applies to FoodShare
repositories unless the user explicitly changes the destination.

1. Inspect repository instructions, dirty files, branch history and fresh
   `origin/main`. Use the existing lowercase local FoodShare workspace.
2. Preserve unrelated work. Scope commits to the authorized task; do not use
   blanket staging, destructive resets, branch switches or force-pushes.
3. Validate the actual changes. Mobile changes retain fresh Swift-to-Kotlin,
   iOS, Android and runtime parity gates. Documentation changes require review,
   link and whitespace checks.
4. Commit and deliver to `origin/main` with a normal fast-forward push or the
   required protected-branch review and merge. Report a rejected push and follow
   repository protections. A local diff, feature branch or unmerged PR is pending
   delivery. Never silently include other sessions' edits or branch commits.
5. Verify the exact remote SHA and inspect its CI runs. Report passed, failed
   and pending checks accurately. Coordinate updates in a shared checkout.

A main push may trigger existing deployment workflows. Use those workflows,
keep secrets outside Git, and verify deployment separately. Store submission,
publication, live billing and whole-app visual parity require their own evidence
and existing user authorization. A source push does not establish production
release or device parity.
