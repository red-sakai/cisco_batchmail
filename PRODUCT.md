# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

CNCP (Cisco NetConnect PUP – Manila) officers. A small group of signed-in members who use the tool in short bursts around events and recruitment, sending announcements and acceptance, interview, or rejection emails.

## Product Purpose

BatchMail sends personalized bulk email. An officer uploads a recipient CSV, optionally matches attachments by name, authors or picks an HTML template with variables, reviews each rendered email, and sends it under the CNCP sender identity. Success is every intended recipient getting the right message, with failures visible and nothing sent by accident.

## Operating Context

Three locked steps in order: Recipients, Message, Review & Send. Help sits alongside them. Sending is paced in small batches with a delay per email, so a run can take minutes while the officer watches a live log. Guided tours run on driver.js and target stable element IDs.

## Capabilities and Constraints

- Internal tool behind a credentials sign-in; sessions last 7 days.
- Sends through the CNCP Gmail account. Credentials live only in the server environment.
- Batch size is 4 without attachments, 3 with attachments, and 1 when a 1–2 MB PDF is attached.
- Outgoing email templates and the email-sending logic must not change as a side effect of interface work. The template editor and preview show the email as recipients will see it, so they stay light.

## Brand Commitments

- The logo is the CNCP mark, `public/cncp-white.png`, not the old blue Cisco logo. Keep the name "Cisco NetConnect PUP · Manila".
- This term's theme is galaxy/space, in purple. It opens in dark mode, and a light mode stays available through the toggle.
- Motion: a living sky with quick interface transitions, respecting reduced-motion settings.

## Evidence on Hand

Assets: `public/cncp-white.png` (the logo), `public/cyberph-logo.svg`, and HTML templates in `public/templates/`. There are no testimonials or metrics, and none should be invented.

## Product Principles

- Nothing goes out by accident: the officer can always see who gets what, and from which identity.
- Failures are never quieter than successes.
- The tool stays out of the way of a task done under time pressure.
