# `ask` — human-in-the-loop via runtime-authored forms

**Status:** design, approved for planning
**Date:** 2026-07-29

## Problem

A flow can act on real infrastructure (restart a Deployment, scale a StatefulSet)
but it cannot stop and ask a human first. There is no way for a running flow to
present a decision to a person and continue from their answer. That gap makes
acting agents unsafe to point at production: the choice today is fully automatic
or not automated at all.

The flagship user story:

> *"Watch my pods; when one crashloops, pull logs, ask the LLM what's wrong,
> restart it — but ask me before touching prod."*

Everything in that sentence exists as a component today except **ask me**.

## What this is (and is not)

This is **not** chat. There is no message stream, no scrollable thread of
free text, no conversation state inside the flow.

It is **one form at a time**: the flow presents a form (fields, buttons), a human
fills it in and submits, the submitted values flow onward as a normal message.
Approval is the degenerate case — a form whose only fields are Approve/Deny
buttons. Data entry, parameter confirmation, and "the model asks for an action"
are the same mechanism with a different form.

This framing is a deliberate consequence of a hard constraint: **JSON Schema
cannot describe a heterogeneous list**. `type: array` takes a single `items`
schema, so a port can never carry "a history of N differently-shaped forms."
One live schema, one live form. History of past submissions is a separate,
schemaless concern (see [History](#history)).

## Architecture

Three layers, mirroring how `http_server` works today (a thin flow-facing
component riding platform machinery it does not reimplement):

| Layer | Owns |
|---|---|
| `ask` component | flow-facing ports; holds the current form; emits the answer |
| SDK | lets a component publish a runtime-authored schema for a port |
| Editor / platform | renders the schema as a form; records past submissions |

The flow talks to `ask` the same way it talks to any node: **edges**. No new
communication model.

### The schema channel already exists

Every component already communicates with the UI through its port schema. The
runtime mints `TinyNode.Status.Ports[].Schema` in `ReadStatus`
(`module/internal/scheduler/runner/runner.go:347`) by reflecting the live value a
component puts in `Port.Configuration`, via `schema.CreateSchema`. Both consumers
read that same artifact:

- the dashboard widget (`pkg/utils/nodes.go:177` → platform `get-stream.go:701`),
  rendered as a form by `JsonEditor`, submitted with `runAction`;
- the MCP tool `get_node_port_schema`
  (`mcp-server/internal/adapters/port_inspector.go:69`).

Components already vary that schema **by state**: `ticker` returns a different Go
type from `getControl()` depending on whether it is running, so the UI shows a
Start button or a Stop button
(`modules/common-module/components/ticker/ticker.go:60-73, 283`).

So dynamic forms are an established idiom. What is missing is *runtime-authored*
forms — a schema that is not any Go type known at compile time.

### The one SDK change: `Port.Schema`

`module.Port` (`module/module/node.go:16-31`) carries `Configuration` and
`ResponseConfiguration` and no schema field. Add one optional field:

```go
type Port struct {
    Source                bool
    Position              Position
    Name                  string
    Label                 string
    Configuration         interface{}
    ResponseConfiguration interface{}

    // Schema, when non-nil, is published verbatim as this port's schema
    // instead of reflecting Configuration. For runtime-authored forms whose
    // shape is not a compile-time Go type. Must be a JSON Schema object.
    Schema json.RawMessage
}
```

And one branch at the single mint point, `ReadStatus` (runner.go:347):

```go
if p.Schema != nil {
    portStatus.Schema = p.Schema
} else {
    s, _ := schema.CreateSchema(p.Configuration) // unchanged behaviour
    portStatus.Schema = s
}
```

Nothing downstream changes. The widget and `get_node_port_schema` already publish
whatever bytes land in `Status.Ports[].Schema`.

`json.RawMessage` (not `map[string]any`) is deliberate: the target field is
already `[]byte`, so the bytes pass through unparsed, and **key order is
preserved** — decoding to a map would scramble `propertyOrder` and shuffle the
rendered form.

This also repays existing documentation debt. `platform/apps/docs/docs/developer-guide/components/control-ports.md`
documents exactly this API — `Schema: schema.FromGo(c.getControl())` — but
neither `Port.Schema` nor `schema.FromGo` exists in the code. Implementing
`Port.Schema` makes the documented API real. `schema.FromGo(v)` is added as a
thin helper (`CreateSchema` + `MarshalJSON`) so components can author a schema
from a Go value where one exists.

### The `ask` component

Lives in **common-module** (it is a flow primitive, like `signal` and `debug`).
It is a fusion of the two: it *displays* like `debug` and *sends* like `signal`.

Ports:

| Port | Direction | Payload |
|---|---|---|
| `request` | in | `{form, values, context}` — the form to present |
| `_control` | source | the live form (schema = `form`, data = `values`) |
| `out` | source | `{values, context}` — what the human submitted |

```go
type Request struct {
    Form    json.RawMessage `json:"form"`    // JSON Schema, opaque to ask
    Values  any             `json:"values"`  // initial/prefilled form data
    Context any             `json:"context" configurable:"true"` // passthrough
}

type Reply struct {
    Values  any `json:"values"`  // what the human submitted
    Context any `json:"context"` // the request context, unchanged
}
```

Behaviour:

1. A message on `request` stores `form`, `values`, `context` in node state and
   emits on `_control`, which re-runs `ReadStatus` and publishes the new form.
   The inbound branch **returns immediately** — it does not block.
2. The editor renders `_control` as a form and the human submits it
   (`runAction`).
3. `OnControl` receives the submission, appends it to the submission log, and
   emits `Reply{values, context}` on `out`.

`ask` never parses the form. It is a pass-through blob.

**Where the form comes from.** Three producers, and v1 only needs the first:

1. **Authored on the node** (settings) — a fixed form, e.g. Approve/Deny. The
   *data* under review still varies per message via edge configuration; only the
   form's shape is fixed. This covers the flagship story and needs no
   LLM-generated schema.
2. **Supplied per message** on `request` — an upstream component or edge config
   provides the form. This is the "model asks for an action" path: `llm_tools`
   with an `ask_human(form)` tool emits the schema it wants rendered.
3. **Both** — settings supply a default, an incoming message overrides it.

### Turn-based, not suspended

`ask` does **not** suspend a run. There is no durable park-and-resume in the
runtime today: a handler that blocked waiting for a human would hold its
JetStream message past `AckWait` (30s), be redelivered, and be terminated after
`MaxDeliver` (3).

Instead the exchange is two independent hops:

```
… → ask.request   (branch ends; form is now published)
human submits → ask._control → ask.out → … → k8s restart
```

Continuity lives in `ask`'s node state, not in a held message. The pending
request survives pod restarts because node state is persisted
(`TinyNode.Status.Metadata` via `module.State`, converged across replicas by the
k8s watch). Durable suspend/resume remains a possible future addition; this
design does not need it.

### Submissions arrive untyped

`ControlHandler.OnControl(ctx, control any)`
(`module/module/lifecycle.go:64-69`) normally delivers a decoded Go value that
components type-switch on (as `ticker` does). `ask`'s form has **no Go type** —
its shape is only known at runtime — so its submission decodes to a generic
`map[string]interface{}`.

`ask` handles that shape directly: it does not type-switch, it forwards the
submitted map as `Reply.Values`. The plan must verify that a control submission
against a runtime-authored schema decodes to a map rather than failing to bind,
and specify the fallback if the runtime insists on a registered type.

### Distinguishing a submit from a stale render

A control submission carries the whole form, so `ask` must not mistake a
re-render for an answer. The form is expected to include at least one field with
`format:"button"`; a submission is treated as an answer when a button field is
true (the editor sets `isAction` only on button clicks — `BooleanEditor.vue:189-194`
— and both the inspector and widget gate `runAction` on it). Requests carry a
monotonically increasing id; a submission for a superseded id is ignored.

## History

Past submissions are **not** part of the port schema and not a thread inside the
component. They are recorded per node — a "previous submissions" panel in the
editor/platform, alongside traces.

This is forced by the JSON Schema constraint above and is also the right split:
past turns need no validation and no live form, so they render as plain JSON
(`VueJsonPretty` already renders arbitrary port data in the inspector). Only the
current turn is schema-driven.

`ask` keeps a bounded submission log in node state (most recent N, oldest
pruned) as the data source. Node state is capped (`MaxStateBytes` 900KB across
all `_state/*`), so the log is bounded by count and per-record size.

## Documenting the form vocabulary

The schema attributes are already documented for **author-time Go struct tags**
(`reference/struct-tags/complete-reference.md`: `required`, `enum`, `pattern`,
`minimum`, `format`, …; `developer-guide/components/control-ports.md`:
`format:"button"`). The SDK passes a fixed custom-attribute set through to the UI
(`module/pkg/schema/json.go:23-27`): `propertyOrder`, `colSpan`, `tab`, `align`,
`configurable`, `shared`, `readonly`, `format`, `language`, `requiredWhen`,
`optionalWhen`, `enumTitles`.

Missing, and added by this work: a **runtime form schema** reference — the same
vocabulary expressed as raw JSON Schema rather than struct tags — so a human or
a model authoring a form knows what renders. It must state the supported field
formats (from `editor/src/json-editor/common/index.ts:105-134`: string
`textarea|code|password|radiobox|…`, boolean `checkbox|select|button`, number,
enum + `enumTitles`, arrays, nested objects) and give a canonical
approve/deny example.

## Testing

- **SDK unit:** `Port.Schema` non-nil publishes verbatim; nil falls back to
  reflection (existing components unaffected); malformed bytes are rejected at
  the port rather than corrupting node status.
- **Component unit:** `request` stores and publishes the form; a button
  submission emits `Reply` with values + unchanged context; a submission for a
  superseded request id is ignored; the submission log prunes at its bound.
- **End-to-end on minikube:** the flagship flow — a crashlooping pod is detected,
  logs are pulled, an LLM diagnoses, `ask` presents Approve/Deny, approving
  restarts the workload and denying does not. Verified via traces plus actual
  cluster state.

## Scope

**In:** `Port.Schema` + `schema.FromGo`; the `ask` component with an authored
form (producer 1); the runtime-form documentation; the end-to-end approval flow.

**Out (deliberate):** durable suspend/resume; chat/message-threading; the
editor's "previous submissions" panel (data is recorded; the panel is a
follow-on); LLM-generated forms (producer 2 — designed for, not built);
approval surfaces outside the editor (Slack/email need public inbound webhooks,
which minikube lacks without tunnelling).
