# Repository instructions

## Git branches and commits

- Use `feat/`, `fix/`, `refactor/`, `test/`, or `chore/` as the branch prefix that matches the work. Do not create `codex/` branches.
- Write commit messages in Conventional Commits format, such as `feat(editor): add section sorting` or `fix(ai): handle interrupted streams`.
- Keep the configured Git Author and Committer identity of the actual contributor. Do not impersonate the repository owner or rewrite contributor identity.
- Do not add Codex or AI `Co-authored-by` trailers or other AI-generation labels unless a human explicitly requests a specific attribution.
- Do not rewrite published Git history without explicit user authorization.
- Do not delete an unmerged branch. Before deleting a merged remote branch, verify its PR status, merge reachability, worktree checkouts, active task use, and automation/deployment references.
