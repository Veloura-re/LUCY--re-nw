#!/usr/bin/env bash
set -euo pipefail

# Determine paths
WORKSPACE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
GLOBAL_CONFIG_DIR="$HOME/.gemini/config"
GLOBAL_PLUGIN_DIR="$GLOBAL_CONFIG_DIR/plugins/lucy-os"

echo "[LUCY-OS GLOBAL SYNC] Starting global synchronization from: $WORKSPACE_DIR"
echo "[LUCY-OS GLOBAL SYNC] Target global directory: $GLOBAL_PLUGIN_DIR"

# Ensure target directories exist
mkdir -p "$GLOBAL_PLUGIN_DIR/skills"
mkdir -p "$GLOBAL_PLUGIN_DIR/agents"
mkdir -p "$GLOBAL_PLUGIN_DIR/rules"
mkdir -p "$GLOBAL_CONFIG_DIR/rules"
mkdir -p "$GLOBAL_CONFIG_DIR/workflows"

# 1. Sync Skills from .agent/skills
if [ -d "$WORKSPACE_DIR/.agent/skills" ]; then
    echo "[LUCY-OS GLOBAL SYNC] Synchronizing skills..."
    for skill_dir in "$WORKSPACE_DIR/.agent/skills"/*; do
        if [ -d "$skill_dir" ]; then
            skill_name="$(basename "$skill_dir")"
            target_skill_dir="$GLOBAL_PLUGIN_DIR/skills/$skill_name"
            mkdir -p "$target_skill_dir"
            cp -rf "$skill_dir"/* "$target_skill_dir/"
            echo "  - Skill installed: $skill_name"
        fi
    done
fi

# 2. Sync Subagents from .agents/agents
if [ -d "$WORKSPACE_DIR/.agents/agents" ]; then
    echo "[LUCY-OS GLOBAL SYNC] Synchronizing subagents..."
    for agent_dir in "$WORKSPACE_DIR/.agents/agents"/*; do
        if [ -d "$agent_dir" ]; then
            agent_name="$(basename "$agent_dir")"
            target_agent_dir="$GLOBAL_PLUGIN_DIR/agents/$agent_name"
            mkdir -p "$target_agent_dir"
            cp -rf "$agent_dir"/* "$target_agent_dir/"
            echo "  - Subagent installed: $agent_name"
        fi
    done
fi

# 3. Sync Workflows from .agent/workflows
if [ -d "$WORKSPACE_DIR/.agent/workflows" ]; then
    echo "[LUCY-OS GLOBAL SYNC] Synchronizing workflows..."
    cp -rf "$WORKSPACE_DIR/.agent/workflows"/* "$GLOBAL_CONFIG_DIR/workflows/" 2>/dev/null || true
fi

# 4. Sync Rules
if [ -f "$WORKSPACE_DIR/.agents/AGENTS.md" ]; then
    echo "[LUCY-OS GLOBAL SYNC] Synchronizing system rules..."
    cp -f "$WORKSPACE_DIR/.agents/AGENTS.md" "$GLOBAL_PLUGIN_DIR/rules/AGENTS.md"
    cp -f "$WORKSPACE_DIR/.agents/AGENTS.md" "$GLOBAL_CONFIG_DIR/rules/AGENTS.md"
fi

# 5. Ensure plugin.json exists
PLUGIN_JSON="$GLOBAL_PLUGIN_DIR/plugin.json"
if [ ! -f "$PLUGIN_JSON" ]; then
    echo "[LUCY-OS GLOBAL SYNC] Generating plugin.json descriptor..."
    cat << 'EOF' > "$PLUGIN_JSON"
{
  "name": "lucy-os",
  "version": "1.0.0",
  "description": "LUCY OS Autonomous Engineering Administrator, Supreme Council Subagents, and Architecture Skills",
  "skills": "./skills",
  "agents": "./agents",
  "rules": "./rules"
}
EOF
fi

# 6. Sanitize emojis across all files in global plugin to enforce Zero-Emoji Mandate
echo "[LUCY-OS GLOBAL SYNC] Enforcing zero-emoji mandate on global definitions..."
python3 - << 'PYEOF'
import os
import re

plugin_dir = os.path.expanduser("~/.gemini/config/plugins/lucy-os")
emoji_pattern = re.compile(
    r"[\U00010000-\U0010ffff]|[\u2600-\u27bf]|[\u2300-\u23ff]|[\u2b50-\u2b55]|[\ufe00-\ufe0f]"
)

count = 0
for root, _, files in os.walk(plugin_dir):
    for file in files:
        if file.endswith(('.md', '.json', '.txt')):
            path = os.path.join(root, file)
            with open(path, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
            cleaned = emoji_pattern.sub('', content)
            if cleaned != content:
                with open(path, 'w', encoding='utf-8') as f:
                    f.write(cleaned)
                count += 1
print(f"Sanitized emojis from {count} files in global plugin.")
PYEOF

echo "[LUCY-OS GLOBAL SYNC] Global synchronization complete."
