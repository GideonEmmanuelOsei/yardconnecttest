# Yard Connect — order backend setup

This folder makes "Order now" on the site send the order straight to you
via WhatsApp and email. The customer never touches WhatsApp — they just
see a success message.

I can't create your Twilio account or email credentials for you (they
need your phone number, identity, and billing), but everything else is
wired up and ready — just drop your own values in and deploy.

## 1. Put these files with your site

Copy `netlify.toml`, `package.json`, and the `netlify/functions/` folder
into the **same folder as `index.html`** (your site's root), so the
structure looks like:

```
your-site/
  index.html
  netlify.toml
  package.json
  netlify/
    functions/
      order.js
```

## 2. Deploy via Netlify CLI or Git (not Netlify Drop)

Netlify Drop (the drag-and-drop uploader) only hosts static files — it
does **not** run serverless functions. To get the order backend live,
use one of these instead:

- **Netlify CLI** (fastest): install it, then from the site folder run:
  ```
  npm install
  netlify deploy --prod
  ```
- **Git-connected site**: push this folder to a GitHub/GitLab repo and
  connect it in the Netlify dashboard ("Add new site" > "Import from
  Git"). Netlify will auto-detect the functions folder.

## 3. Set up WhatsApp sending (Twilio)

1. Create a free account at [twilio.com](https://www.twilio.com).
2. Find your **Account SID** and **Auth Token** on the Twilio Console
   dashboard.
3. For WhatsApp, Twilio gives you a **Sandbox number** immediately
   (free, good for testing): Console > Messaging > Try it out > Send a
   WhatsApp message. It'll give you a number like
   `whatsapp:+14155238886` and a join code.
4. **Important sandbox limitation:** the number receiving messages
   (your WhatsApp, `0503457268`) has to send that join code to the
   Twilio sandbox number once, or messages won't arrive. This only
   needs to be done once, but it does expire periodically and needs
   redoing.
5. For a permanent setup with no join code needed, you'd apply for a
   Twilio **WhatsApp Sender** on your own number — this goes through
   Meta's business verification and can take a few days. Worth doing
   once you're ready to go fully live.

## 4. Set up email sending (SMTP)

Any SMTP-capable mailbox works. Easiest options:

- **Gmail** (if you have 2-factor auth on): create an
  ["app password"](https://myaccount.google.com/apppasswords) and use:
  - `SMTP_HOST` = `smtp.gmail.com`
  - `SMTP_PORT` = `587`
  - `SMTP_SECURE` = `false`
  - `SMTP_USER` = your Gmail address
  - `SMTP_PASS` = the app password (not your normal Gmail password)
- **A transactional email service** (Mailgun, SendGrid, Resend, etc.)
  if you'd rather not use a personal inbox — they all give you SMTP
  credentials in their dashboard.

## 5. Set the environment variables in Netlify

In the Netlify dashboard: **Site settings > Environment variables**,
add:

| Variable | Example value |
|---|---|
| `TWILIO_ACCOUNT_SID` | `ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` |
| `TWILIO_AUTH_TOKEN` | `your_auth_token` |
| `TWILIO_WHATSAPP_FROM` | `whatsapp:+14155238886` |
| `OWNER_WHATSAPP_TO` | `whatsapp:+233591580768` |
| `SMTP_HOST` | `smtp.gmail.com` |
| `SMTP_PORT` | `587` |
| `SMTP_SECURE` | `false` |
| `SMTP_USER` | `you@example.com` |
| `SMTP_PASS` | `your_app_password` |
| `SMTP_FROM` | `you@example.com` (optional) |
| `OWNER_EMAIL_TO` | `you@example.com` |

Redeploy after adding/changing these (Netlify needs a fresh deploy to
pick up new environment variables).

## 6. Test it

Place a test order on the live site. You should get a WhatsApp message
and an email within a few seconds. If something's off, check
**Site > Functions > order > Logs** in Netlify — the function logs the
specific error for whichever channel (WhatsApp or email) failed, and
still lets the order through if only one of the two works.

## How the order actually flows

1. Customer fills in name, phone, and their cart, then taps "Order now".
2. The site sends that as JSON to `/.netlify/functions/order`.
3. The function sends a WhatsApp message and an email to you with the
   order details, then reports back success/failure.
4. Customer sees "Order placed!" and your follow-up number
   (`0503457268`) — nothing about WhatsApp or email is shown to them.
