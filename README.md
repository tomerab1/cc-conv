# cc-bridge

A two-way bridge that lets two Claude Code sessions push tasks to each other and act on
them automatically — no copy-paste, no "check your inbox." Built on Claude Code's official
[Channels](https://code.claude.com/docs/en/channels) feature.

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
4. Launch each session:
   ```bash
   claude --dangerously-load-development-channels server:bridge
   ```

## Usage

In session A, tell Claude: *"send a message to the peer: …"*. It calls `send_to_peer`, the
message arrives in session B as a channel event, and B acts on it on its own. Reply the same
way in reverse.

## Security

A received peer message is untrusted input (a prompt-injection surface). The defenses live in
`security/settings.template.json` — copy it into each project's `.claude/settings.json`:

- Run with **normal permissions** (never `--dangerously-skip-permissions`) so risky ops pause
  for your approval.
- A **deny-list** blocks destructive commands outright.
- The **PreToolUse firewall** (`pretool-firewall.ts`) hard-blocks dangerous Bash and writes
  outside the project / to secret paths — deterministically, regardless of the model.
- The **secret gate** means only the paired peer can inject messages.

The firewall is a pattern backstop, not airtight — keeping permissions on is what makes the
combination safe.

## Layout

| Path | What |
| --- | --- |
| `bridge/` | the channel server, split by concern (`main`, `config`, `channel-server`, `send-tool`, `peer-client`, `inbound-server`, `echo-guard`, `types`) |
| `pretool-firewall.ts` | PreToolUse safety hook |
| `security/settings.template.json` | permissions + hook wiring to copy into a project |
| `examples/{server-side,native-side}/.mcp.json` | runnable two-instance demo (ports 8801/8802) |
| `test/` | unit + integration tests (`npm test`) |

## Reuse in other projects

Run `npm link` once, then reference the path-free commands `cc-bridge` (and `cc-firewall` for
the hook) from any project's `.mcp.json` / `.claude/settings.json` — see `examples/`. No
absolute paths, so moving or renaming this repo doesn't break consumers (re-run `npm link` if
you move it).

## Caveats

Research preview — the `--channels` flag and protocol may change. Events arrive only while a
session is open. Delivery is best-effort (no ack).
