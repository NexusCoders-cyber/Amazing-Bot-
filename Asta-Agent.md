# Terry Agent

Terry is a root-level maintenance AI helper for Asta-Bot.

## Capabilities
- Qwen text replies for diagnostics and repo questions.
- Qwen image generation (`terry img <prompt>`).
- Console log inspection (`terry logs [n]`).
- Safe terminal diagnostics for owner (`terry sh <safe-command>`).

## Safety
- Shell mode is owner-only.
- Shell mode allows read-only diagnostics (`pwd`, `ls`, `cat`, `rg`, `node -v`, `npm -v`, `git status`, `pm2 logs --lines`).
- High-risk commands are blocked.

## Usage
- `.terry <question>`
- `.terry img cinematic wallpaper`
- `.terry logs 120`
- `.terry sh git status`
