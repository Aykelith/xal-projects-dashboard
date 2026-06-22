#!/usr/bin/env bash
set -euo pipefail

# Remotes to push to after committing. Add/remove as needed.
REMOTES=(
  # origin
)

MSG="${1:-}"
if [[ -z "$MSG" ]]; then
  echo "Usage: bash scripts/commit.sh \"commit message\"" >&2
  exit 1
fi

git add -A
git commit -m "$MSG"

for REMOTE in "${REMOTES[@]}"; do
  echo "Pushing to $REMOTE…"
  git push "$REMOTE" HEAD
done

echo "Done."
