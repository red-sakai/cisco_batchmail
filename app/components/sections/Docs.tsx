"use client";

export default function Docs() {
  return (
    <div className="prose max-w-none">
      <h1>BatchMail Documentation</h1>
      <p>
        BatchMail is the bulk email tool of <strong>Cisco NetConnect PUP – Manila</strong>.
        Upload a recipient CSV, author a Jinja-style HTML template, preview &amp;
        validate, then send as the CNCP sender identity.
      </p>

      <h2 className="mt-8">Quick Start</h2>
      <ol>
        <li>
          <strong>CSV Tab:</strong> Upload your CSV (first row must be headers).
          Map required columns.
        </li>
        <li>
          <strong>Template Tab:</strong> Upload or edit HTML. Insert variables
          using <code>{"{{ variable }}"}</code>.
        </li>
        <li>
          <strong>Preview &amp; Send Tab:</strong> Provide a dynamic subject,
          confirm the sender credentials check, then send.
        </li>
      </ol>
      <hr className="my-6" />

      <h2 className="mt-8">Sender Credentials (CISCO_*)</h2>
      <p>
        The app sends through the Cisco NetConnect PUP – Manila Gmail account.
        Set these keys in a <strong>.env.local</strong> file at the project root,
        then restart the server:
      </p>
      <pre className="whitespace-pre-wrap break-word">
        <code>
          {`CISCO_SENDER_EMAIL=netconnect.pup@gmail.com
CISCO_SENDER_PASSWORD=your-app-password
CISCO_SENDER_NAME=Cisco NetConnect PUP - Manila`}
        </code>
      </pre>
      <ul>
        <li>
          <strong>CISCO_SENDER_EMAIL</strong> – CNCP mailbox you will send from.
        </li>
        <li>
          <strong>CISCO_SENDER_PASSWORD</strong> – Gmail App Password (aliases:{" "}
          <code>CISCO_SENDER_APP_PASSWORD</code> and lowercase variants).
        </li>
        <li>
          <strong>CISCO_SENDER_NAME</strong> – Friendly display name shown to
          recipients.
        </li>
      </ul>
      <p>
        <strong>Note:</strong> Credentials are read from the server environment
        only; nothing is uploaded or stored by this UI.
      </p>

      <h2 className="mt-8">CSV Requirements</h2>
      <p>
        Required headers: an email address column and a name column. Add any
        number of extra personalization columns (e.g. <code>event</code>,{" "}
        <code>school</code>, <code>certificate_id</code>).
      </p>
      <p>
        You can edit any cell inline by double‑clicking, add/remove columns, and
        insert/delete rows. Download the modified CSV at any time.
      </p>
      <h3>Example CSV</h3>
      <pre className="whitespace-pre-wrap break-word">
        <code>
          {`recipient,name,event,school
alice@example.com,Alice,Cisco Day 2026,PUP Manila
bob@example.com,Bob,Cisco Day 2026,PUP San Pedro`}
        </code>
      </pre>

      <h2 className="mt-8">Template Authoring</h2>
      <p>
        Write standard HTML. Use Jinja/Handlebars‑like syntax for variables:
      </p>
      <pre className="whitespace-pre-wrap break-word">
        <code>{`<p>Hello {{ name }}, welcome to {{ event }}!</p>`}</code>
      </pre>
      <p>Available variables:</p>
      <ul>
        <li>
          <code>{"{{ name }}"}</code>, <code>{"{{ recipient }}"}</code>
        </li>
        <li>
          Every CSV header (e.g. <code>{"{{ event }}"}</code>,{" "}
          <code>{"{{ school }}"}</code>)
        </li>
      </ul>
      <p>
        Logic, filters, loops, etc. supported by Nunjucks can be added if needed
        (<code>{`{% if school %}...{% endif %}`}</code>).
      </p>

      <h2 className="mt-8">Subject Line</h2>
      <p>
        Set a dynamic subject in Preview using the same variable syntax. If the
        subject template is blank, and a mapped subject column exists in the
        CSV, that column’s value is used.
      </p>
      <pre className="whitespace-pre-wrap break-word">
        <code>{`Your {{ event }} Certificate - Cisco NetConnect PUP`}</code>
      </pre>

      <h2 className="mt-8">Validation & Variable Checks</h2>
      <p>
        Unknown variables are flagged so you can correct typos. Keep variable
        names exactly matching CSV headers.
      </p>

      <h2 className="mt-8">Attachments & Batching</h2>
      <ul>
        <li>
          Attachment file names must match the CSV <strong>Name</strong> column
          (diacritic-safe, case-insensitive).
        </li>
        <li>
          With attachments, batches are capped at <strong>3 emails</strong>;
          large 1–2&nbsp;MB PDFs lock batches to <strong>1 email</strong>.
        </li>
        <li>
          Without attachments you can send up to <strong>4 per batch</strong>.
          Emails are paced ~2s apart to avoid throttling.
        </li>
      </ul>

      <h2 className="mt-8">Export JSON</h2>
      <p>Generates an array of rendered objects:</p>
      <pre className="whitespace-pre-wrap break-word">
        <code>{`[
  {
    "to": "alice@example.com",
    "name": "Alice",
    "subject": "Cisco Day 2026",
    "html": "<p>Hello Alice...</p>"
  }
]`}</code>
      </pre>

      <h2 className="mt-8">Sending Emails</h2>
      <ol>
        <li>Confirm the sender badge shows “Sender credentials OK”.</li>
        <li>Review recipient count and batch grouping warnings.</li>
        <li>
          Click <strong>Send Emails</strong> and confirm the CNCP sender
          prompt. Progress and logs stream live.
        </li>
      </ol>

      <h2 className="mt-8">Safety & Sanitization</h2>
      <p>
        HTML edited in the WYSIWYG is sanitized via DOMPurify to strip scripts
        and dangerous attributes. Avoid inline event handlers or script tags.
      </p>

      <h2 className="mt-8">Troubleshooting</h2>
      <ul>
        <li>
          <strong>Missing CISCO_* env:</strong> Ask the tool administrator to
          set the three keys in .env.local and restart the server.
        </li>
        <li>
          <strong>Auth failures:</strong> Verify the Gmail App Password is valid
          and 2FA is enabled on the account.
        </li>
        <li>
          <strong>Unknown variable:</strong> Check spelling; confirm the header
          exists in the CSV.
        </li>
      </ul>

      <h2 className="mt-8">Advanced Template Example</h2>
      <pre className="whitespace-pre-wrap break-word">
        <code>{`<html>\n  <body>\n    <h2>Hello {{ name }}!</h2>\n    {% if event %}<p>You're registered for {{ event }}.</p>{% endif %}\n    <p>School: {{ school | default('PUP Manila') }}</p>\n  </body>\n</html>`}</code>
      </pre>

      <h2 className="mt-8">Security Notes</h2>
      <p>
        No secrets are handled client-side. For production use, add encrypted
        storage, audit logging, and rate limiting at the server layer.
      </p>
    </div>
  );
}
