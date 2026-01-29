---
name: using-gitflow
description: Apply the Gitflow workflow for structured branch management, releases, and hotfixes. Use this skill when you need to manage a robust release process or work with multiple branches (feature, develop, main).
---

# Using Gitflow Workflow

## Overview

This skill helps you manage the repository using the industry-standard **Gitflow** workflow. It defines clear rules for branching, merging, and releasing.

## Branch Strategy

### Main Branches
- **`main`**: Production-ready code. Never commit directly here.
- **`develop`**: Main development branch. Source for feature branches.

### Supporting Branches
- **Feature** (`feature/*`): Created from `develop`, merges back to `develop`.
- **Release** (`release/*`): Created from `develop`, merges to `main` AND `develop`.
- **Hotfix** (`hotfix/*`): Created from `main`, merges to `main` AND `develop`.

## Common Actions

### 1. Start a New Feature
When starting work on a new task:

```bash
git checkout develop
git pull origin develop
git checkout -b feature/<descriptive-name>
```

### 2. Finish a Feature
When development is done:
1. Ensure tests pass.
2. Merge back to `develop`:

```bash
git checkout develop
git pull origin develop
git merge --no-ff feature/<descriptive-name>
git branch -d feature/<descriptive-name>
git push origin develop
```

### 3. Prepare a Release
When ready to ship a new version (e.g., v1.1.0):

```bash
git checkout develop
git pull origin develop
git checkout -b release/v1.1.0
# ... perform last minute fixes, bump version numbers ...
```

### 4. Publish a Release
To finalize `release/v1.1.0`:

```bash
# 1. Merge to main and tag
git checkout main
git pull origin main
git merge --no-ff release/v1.1.0
git tag -a v1.1.0 -m "Release v1.1.0"
git push origin main --tags

# 2. Sync changes back to develop
git checkout develop
git pull origin develop
git merge --no-ff release/v1.1.0
git push origin develop

# 3. Cleanup
git branch -d release/v1.1.0
```

### 5. Hotfix (Emergency Fix)
For urgent bugs on `main` (e.g., v1.1.1):

```bash
git checkout main
git pull origin main
git checkout -b hotfix/v1.1.1
# ... fix bug, bump version ...
```

**Finish Hotfix:**
Same as Release: Merge to `main` (tag it) AND `develop`, then cleanup.

## Commit Guidelines (Conventional Commits)
Format: `type(scope): description`
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Formatting
- `refactor`: Restructuring code
- `test`: Adding tests
- `chore`: Maintenance

## When to Use This Skill
- When starting a significant new feature.
- When preparing for a production release.
- When needing to fix a bug in production while development continues.
