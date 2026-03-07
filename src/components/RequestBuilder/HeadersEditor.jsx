import { KeyValueEditor } from './KeyValueEditor.jsx';

const HEADER_SUGGESTIONS = [
  'Content-Type',
  'Authorization',
  'Accept',
  'Cache-Control',
  'User-Agent',
  'X-API-Key',
  'Accept-Language',
  'X-Request-Id',
];

export function HeadersEditor({ rows, onChange }) {
  return <KeyValueEditor label="Header List" mode="headers" rows={rows} onChange={onChange} keySuggestions={HEADER_SUGGESTIONS} />;
}
