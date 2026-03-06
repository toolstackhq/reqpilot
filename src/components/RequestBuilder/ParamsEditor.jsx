import { KeyValueEditor } from './KeyValueEditor.jsx';

export function ParamsEditor({ rows, onChange }) {
  return <KeyValueEditor label="Params" rows={rows} onChange={onChange} />;
}
