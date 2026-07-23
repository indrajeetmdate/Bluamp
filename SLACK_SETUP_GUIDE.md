# 🚀 Complete Slack Setup & Integration Guide
**Bluamp Plant OS**

This guide provides step-by-step instructions for setting up your Slack App for:
1. **AI Invoice & Quotation Assistant (`/doc` / `/make-invoice` / `/make_invoice` / `/invoice`)**
2. **Automated Daily 11:30 AM IST Employee Task Digest** (Incoming Webhook)
3. **Mobile Slack Commands (`/tasks` / `/todo`)**

---

## ⚡ Method 1: Instant Setup via App Manifest (Recommended — Takes 30 Seconds)

1. Go to **[https://api.slack.com/apps](https://api.slack.com/apps)** and log into your Slack workspace.
2. Click **Create New App** → Select **From an app manifest**.
3. Choose your **Workspace** and click **Next**.
4. Paste the following Manifest JSON into the editor:

```json
{
    "_metadata": {
        "major_version": 1,
        "minor_version": 1
    },
    "display_information": {
        "name": "Bluamp Plant OS",
        "description": "Bluamp Energies Plant Management, Task Broadcasts & AI Invoice Assistant",
        "background_color": "#1e3a8a"
    },
    "features": {
        "incoming_webhooks": {
            "single_team_settings": {
                "active": true
            }
        },
        "slash_commands": [
            {
                "command": "/doc",
                "url": "https://blueamp.cnergy.co.in/api/slack-invoice",
                "description": "Create an AI draft invoice/quotation",
                "usage_hint": "e.g. Create quotation for ACME Corp, 5x 48V 100Ah Batteries",
                "should_escape": false
            },
            {
                "command": "/make-invoice",
                "url": "https://blueamp.cnergy.co.in/api/slack-invoice",
                "description": "Create an AI draft invoice/quotation",
                "usage_hint": "e.g. Create quotation for ACME Corp, 5x 48V 100Ah Batteries",
                "should_escape": false
            },
            {
                "command": "/make_invoice",
                "url": "https://blueamp.cnergy.co.in/api/slack-invoice",
                "description": "Create an AI draft invoice/quotation",
                "usage_hint": "e.g. Create quotation for ACME Corp, 5x 48V 100Ah Batteries",
                "should_escape": false
            },
            {
                "command": "/invoice",
                "url": "https://blueamp.cnergy.co.in/api/slack-invoice",
                "description": "Create an AI draft invoice/quotation",
                "usage_hint": "e.g. Create invoice for Tata Power, 10x 12V 200Ah cells",
                "should_escape": false
            },
            {
                "command": "/tasks",
                "url": "https://blueamp.cnergy.co.in/api/slack-daily-tasks",
                "description": "View active factory employee tasks digest",
                "usage_hint": "[optional username]",
                "should_escape": false
            }
        ]
    },
    "oauth_config": {
        "scopes": {
            "bot": [
                "incoming-webhook",
                "commands"
            ]
        }
    },
    "settings": {
        "org_deploy_enabled": false,
        "socket_mode_enabled": false,
        "token_rotation_enabled": false
    }
}
```

5. Click **Next** → Review summary → Click **Create**.
6. Click **Install to Workspace** and select your desired default channel (e.g., `#factory-tasks` or `#general`).
7. Done! All commands (`/doc`, `/make-invoice`, `/make_invoice`, `/invoice`, `/tasks`) are active.

---

## 🛠️ Resolving "The app did not respond" Error in Slack

If Slack reports: *"failed because the app did not respond"*:

### 1. Cause
Slack requires any serverless endpoint handling slash commands to return an **HTTP 200 response within 3000ms (3 seconds)**. If Vercel functions parse URL-encoded payloads standard to Slack incorrectly or exceed 3 seconds, Slack marks the request as failed.

### 2. Resolution Applied in App Backend
Both `api/slack-invoice.ts` and `api/slack-daily-tasks.ts` have been updated with:
* **Universal Payload Parser**: Parses URL-encoded form data (`application/x-www-form-urlencoded`), raw JSON, and query parameters reliably.
* **Instant Acknowledgment (< 100ms)**: Uses `@vercel/functions` `waitUntil()` to immediately send HTTP 200 to Slack, preventing timeout errors while AI background processing runs asynchronously.
* **Helpful Fallback Guidance**: If a user runs `/doc` or `/make-invoice` with no text prompt, it returns instant ephemeral usage instructions directly in Slack.

---

## 📍 Summary of API Endpoints

| Feature | Slack Slash Commands | Endpoint URL | Description |
| :--- | :--- | :--- | :--- |
| **AI Invoice Assistant** | `/doc`<br>`/make-invoice`<br>`/make_invoice`<br>`/invoice` | `https://blueamp.cnergy.co.in/api/slack-invoice` | Generates pre-filled AI invoice draft |
| **Task Broadcast Digest** | `/tasks`<br>`/todo` | `https://blueamp.cnergy.co.in/api/slack-daily-tasks` | Fetches active employee pending tasks |
| **Daily Scheduled Digest** | *(Automated)* | `https://blueamp.cnergy.co.in/api/slack-daily-tasks` | Vercel Cron trigger at 11:30 AM IST |
