#!/bin/sh
# Git does not copy hooks with a clone, so run this once after cloning.
# Installs the indexing guard as a pre-commit hook.
cd "$(git rev-parse --show-toplevel)" || exit 1
cat > .git/hooks/pre-commit << 'HOOK'
#!/bin/sh
python3 scripts/indexing_guard.py || {
  echo ""
  echo "  Commit blocked. Fix the above, or bypass deliberately with --no-verify."
  exit 1
}
HOOK
chmod +x .git/hooks/pre-commit
echo "indexing guard installed as pre-commit hook"
