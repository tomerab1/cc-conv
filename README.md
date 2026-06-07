# cc-bridge

A two-way bridge that lets two Claude Code sessions push tasks to each other and act on
them automatically — no copy-paste, no "check your inbox." Built on Claude Code's official
[Channels](https://code.claude.com/docs/en/channels) feature.

It also ships a **Telegram control channel** (message your agents from your phone) and a
PreToolUse **firewall** that hard-blocks dangerous commands.

## How it works

```
session A ──send_to_peer tool──► bridge(:8801) ──HTTP POST + secret──► bridge(:8802)
                                                                          │ notifications/claude/channel
                                                                          ▼
                                                       session B sees <channel source="A"> and acts
        ◄───────────────────────── symmetric in reverse ─────────────────────────►
```

Each project runs a small MCP **channel server** (`bridge/`). It:

- declares the `claude/channel` capability, so Claude Code injects pushed events into the
  live session;
- exposes a `send_to_peer` tool the local Claude calls to message the other session;
- listens on a localhost port — inbound peer messages (secret-gated) are pushed into the
  session as `<channel source="…">` events.

Two instances point at each other over localhost. No central broker.

## Requirements

- Node 22+
- Claude Code v2.1.80+ (Channels is a research preview)
- claude.ai or Console API-key auth (not Bedrock/Vertex/Foundry); channels not blocked by org policy

## Setup

1. `npm install && npm link` (installs deps; puts `cc-bridge` / `cc-firewall` on your PATH)
2. Create the shared secret both sides read:
   `openssl rand -hex 32 > ~/.claude/bridge-secret && chmod 600 ~/.claude/bridge-secret`
   (or set `BRIDGE_SECRET` in the env instead).
3. Add a `bridge` server to each project's `.mcp.json` (see `examples/*/.mcp.json` for the exact
   shape): `"command": "cc-bridge"` with its `env`: `SELF_NAME`, `PEER_NAME`, `SELF_PORT`, `PEER_URL`.
4. Launch each session (load whichever channels you use):
   ```bash
   claude --dangerously-load-development-channels server:bridge server:telegram
   ```

## Usage

In session A, tell Claude: *"send a message to the peer: …"*. It calls `send_to_peer`, the
message arrives in session B as a channel event, and B acts on it on its own. Reply the same
way in reverse.

## Telegram control

Message your agents from your phone. Run **one bot per agent** in a common Telegram group;
Telegram's group privacy mode means each bot only sees messages that **@mention** it, so
`@myproj_native_bot update the client` reaches only that agent. Replies come back in the group.
Only your Telegram user id is allowed to command the agents. You can also **DM a single bot
directly** (no @mention needed) — handy for one agent or quick testing.

Setup:

1. Create one bot per agent with [@BotFather](https://t.me/BotFather); save each token:
   `pbpaste | npm run set-token -- server` (then `… -- native`) → `~/.claude/telegram-<agent>.token` (chmod 600).
2. Get your numeric id from [@userinfobot](https://t.me/userinfobot) and save it **outside the repo**:
   `echo <id> > ~/.claude/telegram-allowed-user` (or set `ALLOWED_USER_ID` in the env). Keeping it in
   `~/.claude` keeps your id out of git.
3. Make a group with you + both bots (keep bot privacy mode ON).
4. Add a `telegram` server to each project's `.mcp.json` (`"command": "cc-bridge-telegram"`,
   `env`: `AGENT_NAME`, `ALLOWED_USER_ID`) — see `examples/*/.mcp.json` — and include
   `server:telegram` in the `--dangerously-load-development-channels` launch.

In the group, @mention an agent to task it; it answers via the `reply_to_telegram` tool.

**Images:** send a photo — caption it `@bot …` in a group, or just send it in a DM — and the agent
downloads it to `<project>/.cc-telegram/` and views it with the `Read` tool. e.g. send a screenshot
and ask what's wrong.

**Permission relay (optional):** set `TELEGRAM_CHAT_ID` (the group id) in the `telegram` env, and
risky tool approvals are forwarded to the group — reply `yes <id>` / `no <id>` to approve or deny
from your phone. The terminal prompt also stays live, and the first answer wins.

## Security

A received peer message is untrusted input (a prompt-injection surface). The defenses live in
`security/settings.template.json` — copy it into each project's `.claude/settings.json`:

- Run with **normal permissions** (never `--dangerously-skip-permissions`) so risky ops pause
  for your approval.
- A **deny-list** blocks destructive commands outright.
- The **PreToolUse firewall** (`cc-firewall`) hard-blocks dangerous Bash and writes
  outside the project / to secret paths — deterministically, regardless of the model.
- The **secret gate** means only the paired peer can inject messages.

The firewall is a pattern backstop, not airtight — keeping permissions on is what makes the
combination safe.

## Layout

| Path | What |
| --- | --- |
| `bridge/` | the channel server, split by concern (`main`, `config`, `channel-server`, `send-tool`, `peer-client`, `inbound-server`, `echo-guard`, `types`) |
| `telegram/` | Telegram control channel (`cc-bridge-telegram`): client, routing, reply tool, poll loop |
| `firewall/` | PreToolUse safety hook: pure `rules.ts` + thin `main.ts`, run as `cc-firewall` |
| `security/settings.template.json` | permissions + hook wiring to copy into a project |
| `examples/{server-side,native-side}/.mcp.json` | runnable two-instance demo (ports 8801/8802) |
| `test/` | unit + integration tests (`npm test`) |
| `scripts/` | helpers (e.g. `set-token` for saving bot tokens) |
| `bin/` | `cc-bridge` / `cc-bridge-telegram` / `cc-firewall` launchers (linked via `npm link`) |

## Reuse in other projects

Run `npm link` once, then reference the path-free commands `cc-bridge`, `cc-bridge-telegram`,
and `cc-firewall` from any project's `.mcp.json` / `.claude/settings.json` — see `examples/`. No
absolute paths, so moving or renaming this repo doesn't break consumers (re-run `npm link` if
you move it).

## Caveats

Research preview — the `--channels` flag and protocol may change. Events arrive only while a
session is open. Delivery is best-effort (no ack).
