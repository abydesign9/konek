#!/usr/bin/env bash
# Konek — one command to get your machine up to date and push your work.
#
#   npm run sync          pull latest, then push anything you have locally
#   npm run sync -- -m "msg"   commit your changes first, then pull + push
#
# Fixes the "Updates were rejected because the tip of your current branch is
# behind" error by always rebasing on top of the remote before pushing.
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"
BRANCH="$(git rev-parse --abbrev-ref HEAD)"

MSG=""
while [ $# -gt 0 ]; do
  case "$1" in
    -m|--message) MSG="${2:-}"; shift 2 ;;
    *) shift ;;
  esac
done

echo "→ Branch: $BRANCH"

# 1. Commit local changes if asked (or warn and stop if the tree is dirty).
if [ -n "$(git status --porcelain)" ]; then
  if [ -n "$MSG" ]; then
    echo "→ Committing your changes…"
    git add -A
    git commit -q -m "$MSG"
  else
    echo
    echo "⚠️  You have uncommitted changes:"
    git status --short
    echo
    echo "   Commit them:   npm run sync -- -m \"what you changed\""
    echo "   Or stash them: git stash"
    exit 1
  fi
fi

# 2. Bring in remote work, replaying your commits on top (no merge bubbles).
echo "→ Pulling latest from origin/$BRANCH…"
if ! git pull --rebase origin "$BRANCH"; then
  echo
  echo "⚠️  Rebase hit a conflict. Fix the listed files, then:"
  echo "     git add <files> && git rebase --continue"
  echo "   Or back out with: git rebase --abort"
  exit 1
fi

# 3. Push (no-op if there's nothing new).
if [ -z "$(git log "origin/$BRANCH..HEAD" --oneline)" ]; then
  echo "✓ Already up to date — nothing to push."
else
  echo "→ Pushing…"
  git push origin "$BRANCH"
fi

echo "✓ Done. $(git log --oneline -1)"
