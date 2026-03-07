import { KeyValueEditor } from './KeyValueEditor.jsx';

export function ParamsEditor({ rows, onChange }) {
  return <KeyValueEditor label="Query Parameters" mode="params" rows={rows} onChange={onChange} />;
}
