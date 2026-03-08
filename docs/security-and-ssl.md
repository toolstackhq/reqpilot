# Security and SSL

ReqPilot includes request-level controls for secure communication and certificate handling.

## SSL Options

<DocTabs
  :tabs="[
    { id: 'verify', label: 'SSL Verification' },
    { id: 'certs', label: 'Client Certificates' },
    { id: 'proxy', label: 'Local Proxy Model' }
  ]"
>
  <template v-slot:verify>
    <ul>
      <li>Toggle SSL verification at request level.</li>
      <li>Keep verification on by default for production-like behavior.</li>
      <li>Disable only for local or self-signed development endpoints.</li>
    </ul>

  </template>

  <template v-slot:certs>
    <ul>
      <li>Add client certificate (<code>.pem</code>) and private key (<code>.pem</code>) per target host.</li>
      <li>Provide cert/key values by uploading files or pasting text.</li>
      <li>Use this for mTLS APIs and internal enterprise gateways.</li>
    </ul>

  </template>

  <template v-slot:proxy>
    <ul>
      <li>ReqPilot routes requests through a local proxy layer to avoid browser CORS restrictions.</li>
      <li>Security settings are applied in that proxy request pipeline.</li>
      <li>The proxy stays an implementation detail for the user.</li>
    </ul>

  </template>
</DocTabs>

## Recommended Defaults

1. Keep SSL verification enabled.
2. Use host-scoped certs for private APIs.
3. Avoid committing sensitive cert/key files to source control.
