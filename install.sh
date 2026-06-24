#!/usr/bin/env bash
set -euo pipefail

SKILL_NAME="anchor-debugger-skill"
SKILL_DIR="$(pwd)"
CLAUDE_DIR="${HOME}/.claude"
SKILLS_DIR="${CLAUDE_DIR}/skills"
TARGET_DIR="${SKILLS_DIR}/${SKILL_NAME}"

echo "Installing ${SKILL_NAME}..."

# Create skills directory if it doesn't exist
mkdir -p "${SKILLS_DIR}"

# If installed as a submodule or clone, link it
if [ -d "${SKILL_DIR}/skill" ]; then
  # Running from inside the repo — symlink or copy
  if command -v ln &>/dev/null; then
    ln -sfn "${SKILL_DIR}" "${TARGET_DIR}"
    echo "Linked ${SKILL_DIR} → ${TARGET_DIR}"
  else
    cp -r "${SKILL_DIR}" "${TARGET_DIR}"
    echo "Copied to ${TARGET_DIR}"
  fi
else
  # Running via curl | bash — clone the repo
  REPO_URL="https://github.com/nayrbryangaming3/anchor-debugger-skill.git"
  if [ -d "${TARGET_DIR}" ]; then
    echo "Updating existing install..."
    git -C "${TARGET_DIR}" pull --ff-only
  else
    git clone --depth=1 "${REPO_URL}" "${TARGET_DIR}"
  fi
fi

# Register skill in Claude settings (if settings.json exists)
SETTINGS_FILE="${CLAUDE_DIR}/settings.json"
if [ -f "${SETTINGS_FILE}" ]; then
  # Check if skill already registered
  if ! grep -q "${SKILL_NAME}" "${SETTINGS_FILE}" 2>/dev/null; then
    echo "Note: Manually add the skill path to your Claude Code settings if needed."
    echo "Skill path: ${TARGET_DIR}/skill/SKILL.md"
  fi
fi

# Register as a git submodule if inside a git repo (optional)
if git rev-parse --is-inside-work-tree &>/dev/null 2>&1; then
  echo ""
  echo "To add as a git submodule to your project:"
  echo "  git submodule add https://github.com/nayrbryangaming3/anchor-debugger-skill.git .claude/skills/anchor-debugger-skill"
fi

echo ""
echo "✓ ${SKILL_NAME} installed successfully!"
echo ""
echo "Usage:"
echo "  /debug-tx <SIGNATURE>        — Diagnose a failing transaction"
echo "  /optimize-cu <FILE>          — Profile and optimize compute units"
echo "  /check-upgrade <IDL> <OLD>   — Verify upgrade safety"
echo ""
echo "Or just ask Claude: 'Why did my transaction fail with 0x1775?'"
