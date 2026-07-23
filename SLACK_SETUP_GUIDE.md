# 🚀 Complete Slack Setup & Integration Guide
**Datlion Cnergy Plant OS**

This guide provides step-by-step instructions for setting up Slack integration for:
1. **Automated Daily 11:30 AM IST Employee Task Digest** (Incoming Webhook)
2. **Mobile Slack Commands (`/tasks` / `/todo`)** (Interactive Slash Commands)
3. **AI Invoice & Quotation Assistant via Slack** (Gemini AI Integration)

---

## Step 1: Create a Slack App

1. Go to [https://api.slack.com/apps](https://api.slack.com/apps).
2. Click **Create New App** → Choose **From scratch**.
3. Set **App Name**: `Datlion Cnergy Plant OS`
4. Select your **Slack Workspace** and click **Create App**.

---

## Step 2: Enable Incoming Webhook (For Daily 11:30 AM Task Digest)

This allows Vercel Cron to send daily task digests automatically to your team channel at 11:30 AM IST.

1. In your Slack App settings, select **Incoming Webhooks** from the left menu.
2. Toggle the switch to **On**.
3. Click **Add New Webhook to Workspace** at the bottom.
4. Choose the channel where daily tasks should be posted (e.g., `#factory-tasks` or `#general`).
5. Click **Allow**.
6. Copy the generated **Webhook URL** (starts with `https://hooks.slack.com/services/...`).

---

## Step 3: Add Environment Variables in Vercel

1. Log into your [Vercel Dashboard](https://vercel.com).
2. Select your project (`DC_Inventory_190526` / `plant-inventory-deploy`).
3. Go to **Settings** → **Environment Variables**.
4. Add the following environment variable:
   * **Key**: `SLACK_WEBHOOK_URL`
   * **Value**: *(Paste the Webhook URL copied from Step 2)*
   * **Environments**: Production, Preview, Development
5. Click **Save**.
6. Redeploy the project on Vercel so the cron job picks up the new key.

---

## Step 4: Configure Slash Commands (Optional - For Mobile Phone Usage)

Employees using Slack on their phone can type `/tasks` to see their pending tasks instantly.

1. In Slack App settings, click **Slash Commands** → **Create New Command**.
2. Fill out the details:
   * **Command**: `/tasks`
   * **Request URL**: `https://inventory.cnergy.co.in/api/slack-daily-tasks`
   * **Short Description**: View pending employee tasks
   * **Usage Hint**: [optional username]
3. Click **Save**.

---

## Step 5: Configure AI Invoice Assistant (Optional)

To enable creating invoice/quotation drafts directly from Slack:

1. In Slack App settings, click **Slash Commands** → **Create New Command**.
   * **Command**: `/invoice`
   * **Request URL**: `https://inventory.cnergy.co.in/api/slack-invoice`
   * **Short Description**: Generate AI invoice draft
   * **Usage Hint**: e.g., "Create quotation for ACME Corp, 5x 48V 100Ah Batteries"
2. Click **Save**.

---

## Step 6: Test & Verify

### 1. Test 11:30 AM Task Digest Manually
* Open the Datlion Cnergy Web/Mobile App → Navigate to **Employee To-Do Management**.
* Click the **📢 Send Slack Digest** button in the header bar.
* Check your Slack channel to verify the message appears with priority badge colors and action buttons.

### 2. Automated Daily Schedule Verification
* The cron schedule in `vercel.json` (`"schedule": "0 6 * * *"`) will run automatically every day at **6:00 AM UTC (11:30 AM IST)**.
* Check Vercel → **Logs** / **Cron Jobs** to verify executions.

---

## Summary of URL Endpoints
| Feature | Endpoint URL | Trigger |
| :--- | :--- | :--- |
| **Daily 11:30 AM Task Digest** | `https://inventory.cnergy.co.in/api/slack-daily-tasks` | Vercel Cron at 11:30 AM IST / Webhook |
| **On-Demand Slash Command** | `/tasks` → `.../api/slack-daily-tasks` | User types `/tasks` in Slack mobile |
| **AI Invoice Generator** | `/invoice` → `.../api/slack-invoice` | User types `/invoice` in Slack |
