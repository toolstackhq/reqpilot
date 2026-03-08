# Features

<DocTabs
  :tabs="[
    { id: 'requests', label: 'Requests' },
    { id: 'collections', label: 'Collections' },
    { id: 'environments', label: 'Environments' },
    { id: 'history', label: 'History' },
    { id: 'import', label: 'Import' }
  ]"
>
  <template v-slot:requests>
    <h3>Request Builder</h3>
    <ul>
      <li>Request tabs for multi-endpoint workflows.</li>
      <li>Method selector with per-method coloring.</li>
      <li>URL field with variable interpolation placeholders.</li>
      <li>Tabbed editors: Parameters, Body, Headers, Authorization, Scripts.</li>
      <li>JSON editor supports prettify and syntax highlighting.</li>
    </ul>

  </template>

  <template v-slot:collections>
    <h3>Collections</h3>
    <ul>
      <li>Persistent left panel with expandable collection folders.</li>
      <li>Save requests using modal flow to choose existing collections.</li>
      <li>Create a new collection inline from the same flow.</li>
      <li>Request metadata saved with method, URL, headers, auth, body, and scripts.</li>
    </ul>

  </template>

  <template v-slot:environments>
    <h3>Environments</h3>
    <ul>
      <li>Create and edit environments with key-value variables.</li>
      <li>Switch active environment from the main UI.</li>
      <li>Resolved variables are highlighted in green, unresolved in red.</li>
      <li>Variables work in URL, headers, auth, and request body.</li>
    </ul>

  </template>

  <template v-slot:history>
    <h3>History Log</h3>
    <ul>
      <li>Every request execution is logged.</li>
      <li>Drill into full request and response details.</li>
      <li>Includes URL resolution, status, time, size, headers, and body snapshots.</li>
      <li>Copy actions available for easier debugging and sharing.</li>
    </ul>

  </template>

  <template v-slot:import>
    <h3>Import Support</h3>
    <ul>
      <li>Postman collections (v2.0 and v2.1).</li>
      <li>OpenAPI 3.x.</li>
      <li>Swagger 2.0.</li>
      <li>Imported requests are normalized into ReqPilot collections.</li>
    </ul>

  </template>
</DocTabs>
