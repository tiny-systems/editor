// Widget schema resolution, shared by every surface that renders a widget
// (the project dashboard's Widgets tab, the Agent page, the edit-schema
// modal). A widget renders from its saved `schema` when one exists, else the
// node's published `defaultSchema`; a root `$ref` is resolved against `$defs`
// so the form editor sees a concrete object schema.

// Resolve the schema a widget should render with. `configure` marks the
// resolved definition so the JSON editor opens it in schema-editing mode
// (the edit-widget-schema modal); normal rendering passes false.
export const getWidgetSchema = (widget: any, configure: boolean = false) => {
  if (!widget) return {}
  let schema = widget.schema || widget.Schema
  if (!schema || Object.keys(schema).length === 0) {
    schema = widget.defaultSchema || widget.DefaultSchema || widget.defaultschema
  }
  if (!schema) return {}

  if (schema['$ref'] === undefined) {
    return schema
  }

  const ref = (schema['$ref'] as string).replace('#/$defs/', '')
  if (ref === '') {
    return schema
  }
  if (!schema['$defs'] || schema['$defs'][ref] === undefined) {
    return schema
  }

  schema['$defs'][ref]['configure'] = configure
  return schema
}

// A widget can only render a form once its node published a port schema.
export const widgetHasSchema = (widget: any) => {
  const schema = getWidgetSchema(widget)
  return !!schema && Object.keys(schema).length > 0
}

// The dispatch key: a control schema stamped `format: "chat"` renders as a
// conversation (ChatWidget) instead of a schema form.
export const isChatWidget = (widget: any) => {
  return getWidgetSchema(widget).format === 'chat'
}
