# 📘 Meta Graph API & Multi-Account Master Setup Guide
> **OmniStudio AI • Autonomous Multi-Tenant Instagram Automation Platform**  
> *Targeted for Notion Workspace Documentation & Team Onboarding*

---

## 📑 Table of Contents
1. [Architecture Overview & Scaling Model](#1-architecture-overview--scaling-model)
2. [Phase 1: Instagram & Facebook Account Foundation](#phase-1-instagram--facebook-account-foundation)
3. [Phase 2: Meta for Developers Account & App Creation](#phase-2-meta-for-developers-account--app-creation)
4. [Phase 3: Meta Business Portfolio & System User (Never-Expiring Token)](#phase-3-meta-business-portfolio--system-user-never-expiring-token)
5. [Phase 4: Extracting Required IDs & Credentials](#phase-4-extracting-required-ids--credentials)
6. [Phase 5: Connecting to OmniStudio AI & GitHub Actions](#phase-5-connecting-to-omnistudio-ai--github-actions)
7. [Phase 6: Scaling to 50+ Accounts (Centralized Multi-Tenancy)](#phase-6-scaling-to-50-accounts-centralized-multi-tenancy)
8. [Phase 7: Troubleshooting, Token Health & Emergency SOP](#phase-7-troubleshooting-token-health--emergency-sop)

---

## 1. Architecture Overview & Scaling Model

OmniStudio AI automates video reel downloads, AI framing/branding, and publishing directly to Instagram through the official **Meta Graph API (v21.0)**.

To automate at scale (from 1 account to 50+ accounts) without constant token expirations or manual maintenance:
* **You do NOT need 50 developer apps or 50 separate API keys.**
* You use **1 Meta Developer App** linked to **1 Meta Business Portfolio**.
* You create **1 Permanent System User Access Token** that has administrative access over all 50+ connected Facebook Pages and Instagram accounts.
* The agent routes posts dynamically using the target account's `ig_user_id`.

```
                      ┌────────────────────────────────────────┐
                      │          1 Meta Developer App          │
                      │         (App ID + App Secret)          │
                      └───────────────────┬────────────────────┘
                                          │
                      ┌───────────────────▼────────────────────┐
                      │      1 Meta Business Portfolio         │
                      │       (Business Manager Admin)         │
                      └───────────────────┬────────────────────┘
                                          │
                      ┌───────────────────▼────────────────────┐
                      │   1 Master "System User" Token         │
                      │     (Permanent — NEVER EXPIRES)        │
                      └───────┬───────────┬────────────┬───────┘
                              │           │            │
                    ┌─────────▼─┐   ┌─────▼─────┐   ┌──▼────────┐
                    │ Page #1   │   │ Page #2   │   │ Page #50+ │
                    │ (@gta6)   │   │ (@movies) │   │ (@...)    │
                    └───────────┘   └───────────┘   └───────────┘
```

---

## Phase 1: Instagram & Facebook Account Foundation

> [!IMPORTANT]
> Meta’s Graph API **strictly forbids** publishing to personal Instagram accounts. Every target account must be converted to a **Professional (Creator or Business)** account and linked to a dedicated **Facebook Page**.

### Step 1.1: Convert Instagram Account to Professional
1. Open the **Instagram App** on your phone.
2. Go to **Profile** > Tap the **Hamburger Menu (≡)** in the top-right corner.
3. Tap **Settings and privacy** > Scroll down to **For professionals** > Tap **Account type and tools**.
4. Tap **Switch to professional account**.
5. Choose a category (e.g. *Video Creator*, *Gaming*, *Entertainment Website*).
6. Select **Creator** (recommended for reels and media) or **Business**.

### Step 1.2: Create a Facebook Page for the Brand
1. Log into Facebook on your desktop: [https://www.facebook.com/pages/create](https://www.facebook.com/pages/create).
2. **Page Name:** Match your Instagram niche (e.g., `GTA 6 Updates 007` or `Movie Recommendations`).
3. **Category:** Choose *Media/News Company* or *Video Creator*.
4. Click **Create Page**. (Profile picture/bio optional during setup).

### Step 1.3: Link the Instagram Account to the Facebook Page
1. From your newly created Facebook Page, switch to its profile.
2. Go to **Settings & Privacy** > **Settings** > **Linked Accounts**.
3. Select **Instagram** on the left menu.
4. Click **Connect Account** > Confirm password and permissions.
5. Ensure **Allow access to Instagram messages in Inbox** is toggled **ON**.
6. Refresh the page: It should display `Connected Instagram Account: @your_handle`.

---

## Phase 2: Meta for Developers Account & App Creation

### Step 2.1: Register as a Meta Developer
1. Go to [https://developers.facebook.com/](https://developers.facebook.com/).
2. Log in with your primary Facebook account.
3. Click **Get Started** (or **My Apps** > **Register** if you are already registered).
4. Accept the Meta Platform Terms and verify your phone number or email address.

### Step 2.2: Create the Master App
1. Navigate to [https://developers.facebook.com/apps/](https://developers.facebook.com/apps/).
2. Click the green **Create App** button.
3. **What do you want your app to do?** Select **Other** > Click **Next**.
4. **Select an app type:** Select **Business** > Click **Next**.
5. Fill out the App Details:
   * **App Display Name:** `OmniStudio Automation Engine` (or your company name).
   * **App Contact Email:** Your active email address.
   * **Business Account:** Select your Meta Business Portfolio (if already created; otherwise leave default for now).
6. Click **Create App** and complete the security captcha.

### Step 2.3: Add Instagram Graph API Product
1. You will be redirected to the **App Dashboard** (`Add products to your app`).
2. Locate **Instagram Graph API** (or **Instagram**) and click **Set Up**.
3. Locate **Webhooks** (optional for analytics/comments) and click **Set Up**.

---

## Phase 3: Meta Business Portfolio & System User (Never-Expiring Token)

> [!WARNING]
> Standard User Tokens generated from Graph API Explorer expire after **1 to 2 hours** (short-lived) or **60 days** (long-lived). If you use a regular user token, the agent will stop working every 60 days.  
> **Always use a System User Token, which NEVER expires.**

### Step 3.1: Access Meta Business Suite
1. Navigate to **Meta Business Settings**: [https://business.facebook.com/settings/](https://business.facebook.com/settings/).
2. If you don't have a Business Portfolio, click **Create a Business Account** and enter your organization name and work email.

### Step 3.2: Add Your Pages & Instagram Accounts
1. In the left sidebar under **Accounts**:
   * Click **Pages** > Click **Add** > **Add a Page** > Search for your Facebook Page (e.g. `GTA 6 Updates 007`) and claim it.
   * Click **Instagram Accounts** > Click **Add** > Log in to connect `@gta6_updates_007`.
2. Repeat this for any additional accounts (e.g. Page 2, Page 3, up to Page 50).

### Step 3.3: Create an Admin System User
1. In the left sidebar under **Users**, click **System Users**.
2. Click **Add** (or **Create System User**).
3. **System Username:** `omni-bot-admin`.
4. **System User Role:** Select **Admin** (Crucial: Employee role cannot generate full-permission tokens).
5. Click **Create System User**.

### Step 3.4: Assign Assets to the System User
1. Select `omni-bot-admin` in the System Users list.
2. Click **Assign Assets**.
3. Under **Pages**, select all your Facebook Pages > Toggle **Full Control (Manage Page)** to **ON**.
4. Under **Instagram Accounts**, select all your connected Instagram accounts > Toggle **Full Control** to **ON**.
5. Under **Apps**, select your app (`OmniStudio Automation Engine`) > Toggle **Full Control** to **ON**.
6. Click **Save Changes**.

### Step 3.5: Generate the Permanent Access Token
1. With `omni-bot-admin` still selected, click **Generate New Token**.
2. **Select App:** Choose `OmniStudio Automation Engine`.
3. **Token Expiration:** Select **Never** (or `Permanent`).
4. **Select Permissions (Scopes):** Select the following mandatory checkboxes:
   * ✅ `instagram_basic`
   * ✅ `instagram_content_publish`
   * ✅ `instagram_manage_comments`
   * ✅ `instagram_manage_insights`
   * ✅ `pages_show_list`
   * ✅ `pages_read_engagement`
   * ✅ `pages_manage_posts`
   * ✅ `business_management`
   * ✅ `public_profile`
5. Click **Generate Token**.
6. **IMPORTANT:** Copy the token immediately and save it in a secure password manager. Meta will **never show this token again**.

---

## Phase 4: Extracting Required IDs & Credentials

You need 4 specific credentials to configure the automation engine:

| Key | Format | Where to Find |
| :--- | :--- | :--- |
| **Meta App ID** | `123456789012345` | Top bar of [developers.facebook.com/apps](https://developers.facebook.com/apps) |
| **Meta App Secret** | `a1b2c3d4e5f6...` | App Settings > Basic > App Secret (Click *Show*) |
| **Permanent Access Token** | `EAAG...` (180+ chars) | Generated in Step 3.5 (System Users) |
| **Instagram Account ID (`ig_user_id`)** | `178414...` (17 digits) | Extracted via Graph API Explorer (Step 4.1 below) |

### Step 4.1: Find the 17-Digit `ig_user_id`
1. Open the **Meta Graph API Explorer**: [https://developers.facebook.com/tools/explorer/](https://developers.facebook.com/tools/explorer/).
2. In the top-right:
   * **Meta App:** Select `OmniStudio Automation Engine`.
   * **User or Page:** Paste your System User Token in the **Access Token** field.
3. In the query box, paste:
   ```http
   GET /me/accounts?fields=id,name,instagram_business_account{id,username}
   ```
4. Click **Submit**. You will receive a JSON response:
   ```json
   {
     "data": [
       {
         "id": "104829104810294",
         "name": "GTA 6 Updates 007",
         "instagram_business_account": {
           "id": "17841428668115319",
           "username": "gta6_updates_007"
         }
       }
     ]
   }
   ```
5. Copy the 17-digit `id` under `instagram_business_account`. This is your target destination ID.

### Step 4.2: Verify Token in the Access Token Debugger
1. Open [https://developers.facebook.com/tools/debug/accesstoken/](https://developers.facebook.com/tools/debug/accesstoken/).
2. Paste your System User Token and click **Debug**.
3. Verify:
   * **App ID:** Matches your app.
   * **Type:** `SYSTEM_USER`.
   * **Expires:** `Never`.
   * **Scopes:** Contains `instagram_content_publish` and `pages_manage_posts`.

---

## Phase 5: Connecting to OmniStudio AI & GitHub Actions

### Step 5.1: Configure Local Database (`database.sqlite`)
The agent manages multiple accounts inside the `pages` table.

```sql
-- Check current active pages
SELECT id, name, handle, ig_user_id, post_mode, is_active FROM pages;

-- Update or insert Page 1 (GTA 6)
UPDATE pages 
SET ig_user_id = '17841428668115319',
    access_token = 'EAAG...',
    post_mode = 'auto',
    is_active = 1
WHERE id = 1;
```

### Step 5.2: Configure `.env` File
Create or update your `.env` in the repository root:
```env
# Meta Graph API Master Credentials
INSTAGRAM_ACCESS_TOKEN="EAAG..."
INSTAGRAM_PAGE_ID="17841428668115319"
FB_PAGE_ID="104829104810294"
META_APP_ID="YOUR_APP_ID"
META_APP_SECRET="YOUR_APP_SECRET"

# Telegram Admin Notification Alerts
TELEGRAM_BOT_TOKEN="123456789:ABCdefGhIJKlmNoPQRstuVWxYz"
TELEGRAM_ADMIN_CHAT_ID="5443723531"

# Instagram Scout Session (Bypasses Datacenter Login Wall)
INSTAGRAM_SESSION_ID="YOUR_BURNER_SESSION_ID"
```

### Step 5.3: Set GitHub Actions Repository Secrets
For 24/7 cloud automation via GitHub Actions:
1. Go to your GitHub repository: `https://github.com/harshparmar2004/omni_ai_agent`.
2. Navigate to **Settings** > **Secrets and variables** > **Actions**.
3. Add the following secrets:
   * `INSTAGRAM_ACCESS_TOKEN`: The permanent System User Token.
   * `INSTAGRAM_PAGE_ID`: The 17-digit `ig_user_id`.
   * `TELEGRAM_BOT_TOKEN`: Your Telegram Bot API token.
   * `TELEGRAM_CHAT_ID`: Your Telegram chat ID (`5443723531`).
   * `INSTAGRAM_SESSION_ID`: The `sessionid` cookie of your scout account.

---

## Phase 6: Scaling to 50+ Accounts (Centralized Multi-Tenancy)

When onboarding accounts #3, #4, up to #50+, **never create new Meta Apps**. Follow this 3-minute onboarding procedure:

### 3-Minute Account Onboarding Checklist:
1. **Instagram:** Convert the new IG account to Professional (Creator).
2. **Facebook:** Create a new Facebook Page for the niche and link the IG account.
3. **Meta Business Suite:**
   * Go to `business.facebook.com/settings/pages` > Add the new Page.
   * Go to `business.facebook.com/settings/system-users` > Click `omni-bot-admin` > **Assign Assets** > Select the new Page and Instagram Account > Grant **Full Control**.
4. **Get the ID:** Run the Graph API Explorer query:
   ```http
   GET /me/accounts?fields=name,instagram_business_account{id,username}
   ```
5. **Register in OmniStudio:**
   Add a single row to the `pages` table in `database.sqlite` (or via Dashboard):
   ```sql
   INSERT INTO pages (name, handle, ig_user_id, post_mode, is_active, daily_quota, access_token)
   VALUES ('Niche Title', '@new_handle', '17841499999999999', 'auto', 1, 7, 'EAAG...');
   ```
6. **Assign Competitor Sources:** Add creator handles into `config/competitors.json`:
   ```json
   {
     "gta6": ["grandtheftauto6", "gta6.only", "paradoks.plays"],
     "niche_3": ["creator_a", "creator_b", "creator_c"]
   }
   ```
*Done! The agent will automatically evaluate, download, frame, and publish reels for the new account during its scheduled windows.*

---

## Phase 7: Troubleshooting, Token Health & Emergency SOP

### Common Meta API Errors & Immediate Fixes

#### 1. `Error 190 (Invalid OAuth access token / Token expired)`
* **Cause:** The access token was revoked, password changed, or a temporary user token expired.
* **Fix:** Verify in [Access Token Debugger](https://developers.facebook.com/tools/debug/accesstoken/). Ensure you generated a **System User Token**, not a User Token.

#### 2. `Error 10 / 200 (Permission Denied / (#200) Requires instagram_content_publish)`
* **Cause:** The System User does not have the asset assigned or missed a permission scope.
* **Fix:** Go to Business Settings > System Users > `omni-bot-admin` > **Assign Assets** > Verify the Page is listed with Full Control. Regenerate token with `instagram_content_publish` checked.

#### 3. `Error 36003 (Media upload error / Video aspect ratio invalid)`
* **Cause:** Raw video is not 9:16 or audio bitrate/codec is unsupported.
* **Fix:** OmniStudio's built-in FFmpeg helper automatically transcodes all reels to standard 1080x1920 (or adaptive 852x476) with H.264 AAC audio before upload.

#### 4. `Error: Instagram Login Required (302 Redirect)`
* **Cause:** Datacenter IP blocked during competitor reel discovery.
* **Fix:** Update your `INSTAGRAM_SESSION_ID` secret in GitHub with a fresh burner cookie.

---

### 🛡️ Platform Rate Limits & Safety Rules
* **Meta Graph API Rate Limit:** 200 calls per hour per user account. OmniStudio uses ~4 calls per published reel, consuming less than 5% of your quota.
* **Instagram Reel Cap:** Meta allows up to 50 reels per 24 hours per account. OmniStudio paces at 7 reels/day for optimal algorithmic reach.
* **Night Blackout:** Zero automated activity between 09:30 PM and 08:30 AM IST protects accounts from platform spam filters.

---
*OmniStudio AI Engine Documentation • Maintained by Harsh Parmar*
