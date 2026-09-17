# Branch Protection Setup

After exporting to GitHub (Code panel → GitHub button), configure branch protection rules in your GitHub repository settings.

## Recommended Branch Strategy

```
main          ← Production only. Protected. Requires PR + CI pass.
develop       ← Integration branch. Requires PR from feature branches.
feature/*     ← Individual feature branches. Merge to develop via PR.
hotfix/*      ← Emergency fixes. Merge directly to main + develop.
```

## Setting Up Branch Protection on GitHub

Navigate to **Settings → Branches → Add branch protection rule** for each branch.

### `main` branch rules

| Setting | Value |
|---|---|
| Require a pull request before merging | ✅ |
| Required approvals | 1 |
| Dismiss stale reviews when new commits are pushed | ✅ |
| Require status checks to pass before merging | ✅ |
| Required status checks | `typecheck`, `test`, `build` |
| Require branches to be up to date before merging | ✅ |
| Do not allow bypassing the above settings | ✅ |
| Restrict who can push to matching branches | Admins only |

### `develop` branch rules

| Setting | Value |
|---|---|
| Require a pull request before merging | ✅ |
| Required approvals | 1 |
| Require status checks to pass before merging | ✅ |
| Required status checks | `typecheck`, `test` |

## GitHub Secrets Required

Add these secrets in **Settings → Secrets and variables → Actions**:

| Secret | Description |
|---|---|
| `DATABASE_URL` | Production database connection string |
| `OPENROUTER_API_KEY` | OpenRouter API key for AI review workflow |
| `BUILT_IN_FORGE_API_KEY` | Manus built-in API key |
| `BUILT_IN_FORGE_API_URL` | Manus built-in API URL |
| `SENTRY_DSN` | Sentry DSN for error monitoring (optional) |
| `POSTHOG_KEY` | PostHog project API key (optional) |
