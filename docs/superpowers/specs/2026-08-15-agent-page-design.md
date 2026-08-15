# Agent Page — design

Date: 2026-08-15. Owner approved approach A ("Agent page") after browser walkthrough of the current experience; delegated detail decisions ("you do, I will check later").

## Problem

Users build agents via Claude Code (MCP). After build, agents usually need credentials and other settings before they work, and a human needs a place to interact with the running agent (chat, approvals). Today both live inside the developer editor:

- Settings: Flows → open flow → switch to editing mode → double-click node → Configuration → per-node schema form. Six steps, developer chrome, no aggregation, nothing says "this agent needs 2 settings before it works".
- Interaction: project "Widgets" tab — bare schema form (one textarea + Submit) in a white void; errors render as raw text (`⚠️ authentication_error: API key is invalid.`).
- Live bug: node settings don't render at all. In `ObjectEditor.vue`, when any field declares `schema.tab`, every field without a matching tab gets `hidden` — for `llm_chat`, 10 of 11 settings (including API Key) are invisible. "Finish settings in the web" is currently impossible.

## Target user experience

1. User builds an agent in Claude Code. tiny replies: *"Agent needs 2 settings before it can start — finish setup: http://localhost:7775/app/prompt-demo"*.
2. The link opens a clean page: agent name, status badge (**Needs setup** / **Live**), no canvas, no traces, no editing locks.
3. A **Setup** card lists exactly the missing settings (e.g. "Anthropic API Key", masked). Fill, Save. Badge flips to **Live**.
4. Below, the agent's widgets — chat looks like a real chat: user messages right-aligned, agent answers as markdown bubbles, a "working…" indicator while the flow runs, errors as small inline notes in the conversation.
5. The flow editor remains the place for *building*; `/app/<project>` is the place for *using*.

## Design

### 1. Bugfix (standalone, ships first)

`src/json-editor/ObjectEditor.vue:69`: a field is hidden unless `schema.tab == current`. Fix: fields without a `tab` always render; only tabbed fields participate in tab switching. One-line condition change:
`tabs.length > 0 ? (!getMerged(p.schema).tab || getMerged(p.schema).tab == current ? 'block' : 'hidden') : 'block'`.
Verify in browser on `llm_chat` Configuration: all 11 settings visible, tab nav still works for the tabbed field.

### 2. Agent page (route + chrome)

- New SPA route `/app/:project` in the editor app served by tiny (same origin/session as `/`).
- Extract the widget surface out of `ProjectWorkspace.vue` into a shared component + composable:
  - widget state + `UPDATE_WIDGET` handling from the existing Telemetry/leader stream (reuse the post-v0.5.24 abort-safe client; no new stream type),
  - submit path via existing `sendSignal()` → `client.flow.runAction()`.
- `ProjectWorkspace` "Widgets" tab renders the same shared component (one renderer, two homes).
- Page chrome: agent (project) name, status chip, widget list. No dev tabs. Light, quiet product styling consistent with the editor's Tailwind setup; must not require the flow canvas bundle.

### 3. Setup zone

No SDK/module changes. The flow spec carries an agent-authored list (set at build time via MCP `build_flow`/`configure_node`, or editable in the editor):

```yaml
exposedSettings:
  - node: llm-chat-e228c
    field: apiKey
    label: Anthropic API Key
    required: true
    secret: true
```

- The Agent page aggregates these into one Setup card. Secrets render masked; values are written through the existing node-settings save path (same storage, same publish-redaction rules — see `publish-secret-leak`).
- "Configured" for a secret field = non-empty stored value (page never reads the secret back; it shows "set" state only).
- All `required` entries filled → status chip **Live**; otherwise **Needs setup**. No *new* gating machinery: saving a setting updates the node spec, the operator reconciles, and the component (re)starts with the new config — which is the real gate for components that cannot start unconfigured (owner's example: `http_server` needs its settings before it can listen). The setup page is the front door to that existing reconcile path.
- MCP: project/flow info includes `setupUrl` + unfilled required settings, so tiny (and Claude Code) can print the finish-setup line after build.
- Changing settings later: the card does not disappear once complete — it stays on the page as a "Settings" section (collapsed when all required values are set). Open, edit, Save → same node-spec path, component reconfigures live. Secrets display as "set ●●●●" with a Replace action; stored values are never read back into the browser.

### 4. Chat widget renderer

- Widget schema gains a format hint: the `prompt` component's widget schema sets `format: "chat"` (common-module change is owner-owned; until released, the editor may also map the prompt component's widget by port identity as a fallback).
- The Agent page dispatches on widget kind: `chat` → dedicated renderer; anything else → existing JSONEditor schema form (fallback stays universal).
- Chat renderer: message history (user right / agent left, markdown via existing sanitized `MarkdownView`), input pinned at bottom, disabled-with-spinner while a run is in flight ("working…"), error payloads from wired error ports rendered as inline system notes. History keyed on data (not wall-clock — see `prompt-widget-live-cycle`).

### 5. Error handling

- Stream drop on the Agent page: quiet auto-reconnect with a thin "reconnecting…" bar; never a dead white page.
- Save failure in Setup: inline field error, values preserved.
- Widget submit while flow errors: error note in conversation; input re-enabled.

### 6. Testing / verification

- Unit: ObjectEditor tab visibility (untabbed + tabbed mix); setup-card aggregation logic; chat renderer state transitions (idle → working → answer / error).
- Browser acceptance (per `test-like-a-user`, `frontend-verify-visually`): walk the real path — open `/app/prompt-demo`, see Needs setup, field for API Key visible (key itself entered by owner), send chat message, watch working state, answer bubble, error case with bad key. Screenshot worst cases: long messages, many messages, empty state.

## Out of scope (YAGNI)

- Runtime gating / new CRD lifecycle states.
- Redesign of non-chat widget forms beyond page styling.
- Flow-served bespoke apps (approach C) — future, for end-customer products.
- Multi-board layouts (`/app/<project>/<board>`) — later if needed.

## Sequencing

1. ObjectEditor bugfix (verify in browser).
2. Extract shared widget surface; Agent page route + chrome.
3. Setup zone (flow-spec field + aggregation + save + status chip + MCP setupUrl).
4. Chat renderer.
5. Browser acceptance pass + screenshots.
