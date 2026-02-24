# 📘 Election Intelligence Engine — User Manual
**Version 5.2 | intelhub.live**

---

## Table of Contents
1. [Logging In](#1-logging-in)
2. [Dashboard](#2-dashboard)
3. [Campaign Map](#3-campaign-map)
4. [Voter List](#4-voter-list)
5. [Upload Voter List (OCR)](#5-upload-voter-list-ocr)
6. [Send Messages](#6-send-messages)
7. [Voter Slips](#7-voter-slips)
8. [User Settings (Admin Only)](#8-user-settings-admin-only)
9. [User Roles Explained](#9-user-roles-explained)
10. [Frequently Asked Questions](#10-frequently-asked-questions)

---

## 1. Logging In

**URL:** [https://intelhub.live](https://intelhub.live)

1. Enter your **Username** and **Password** (provided by your administrator).
2. Tick the checkbox to confirm authorization.
3. Click **Initiate Uplink**.

> ⚠️ If you see "Invalid credentials", contact your administrator to reset your password.

---

## 2. Dashboard

The Dashboard shows a live summary of campaign data across all areas you have access to.

| Card | What it shows |
|------|---------------|
| Total Voters | Total registered voters in your area |
| UDF Supporters | Voters marked as UDF leaning |
| LDF Supporters | Voters marked as LDF leaning |
| Undecided | Voters with no declared leaning |
| Contacted | Voters who have been called or messaged |

### Filtering the Dashboard
Use the **Constituency** and **Local Body** dropdowns at the top to zoom into a specific area.

You can also toggle between **V2 Dashboard** (visual charts) and the legacy view using the toggle at the bottom of the sidebar.

---

## 3. Campaign Map

The Campaign Map (formerly "Tactical War Room") gives you a booth-by-booth visual overview of the entire campaign.

- Each cell in the grid represents a **booth**.
- Hover over a booth to see its supporter breakdown.
- Use this to identify **weak booths** that need more attention.

---

## 4. Voter List

This is the master list of all voters you have access to.

### Searching
Type a name, EPIC ID, or phone number in the search box to find a voter instantly.

### Filtering
Use the filter bar to narrow results by:
- **Constituency / Local Body / Booth**
- **Gender** (Male / Female)
- **Age range**
- **Voter leaning** (UDF / LDF / Undecided)
- **Location** (Local / Away / NRI)

### Editing a Voter
Click the **Edit** button on any voter row to update:
- Phone number
- Voter leaning (UDF/LDF/Other)
- Current location
- Voting probability

Click **Save** to confirm changes.

---

## 5. Upload Voter List (OCR)

This tool lets you scan and upload printed voter rolls (PDF format) into the database automatically.

### Step-by-Step

1. **Select Location** — Choose the Constituency, Local Body, and Booth that this voter roll belongs to.
2. **Upload PDF** — Click the upload area and select the scanned voter roll PDF file.
3. **Convert Pages** — Click "Convert to Images" to prepare the PDF.
4. **Detect Voters** — Click "Detect Voter Boxes" to identify individual voter entries.
5. **Run OCR** — Click "Run OCR" to extract the text from each voter entry.
6. **Review** — Go through the extracted data. Fix any entries that look incorrect.
7. **Save to Database** — Click "Save All to Database" to commit the data.

> 💡 **Tip:** If a voter entry looks garbled, click Edit on that row to manually correct it before saving.

> 🛑 **Stop & Clear:** If the OCR is taking too long or you need to start over, click the red "Stop & Clear" button to cancel the process.

---

## 6. Send Messages

Send WhatsApp messages, SMS, or make calls to voters in bulk.

### How to Send

1. **Choose message type** — WhatsApp, SMS, or Call.
2. **Write your message** — Type your message in the text box. You can attach an image for WhatsApp.
3. **Choose your audience** — Filter by constituency, local body, booth, gender, etc.
4. **Send** — Click the Send button.

> ⚠️ Only voters with a phone number on file will receive the message.

### Message Templates
Save common messages as templates so you can reuse them quickly.

---

## 7. Voter Slips

Generate and print physical voter slips for door-to-door distribution.

### Generating Slips

1. **Filter** — Select a Constituency, Local Body, and Booth to generate slips for.
2. **Choose Party Branding** — Select a party from the "Slip Branding" dropdown to apply the party's logo and colors to the slips.
3. **Apply Filters** — Click the Apply Filters button to load the voter list.
4. **Print** — Click "Print Selected Slips" to open the print dialog.

### Branding Options
The following parties have official branding configured:
- Indian National Congress (INC)
- Communist Party of India (Marxist) — CPIM
- Communist Party of India — CPI
- Indian Union Muslim League — IUML
- Kerala Congress (M) — KCM
- Kerala Congress (J) — KCJ
- Revolutionary Socialist Party — RSP

> 💡 If no party options appear, go to **User Settings → Party Branding → Sync Party Data**.

---

## 8. User Settings (Admin Only)

This section is only visible to **Admins and Super Admins**.

---

### 8.1 Staff Accounts Tab

This is where you create and manage login accounts for your team.

#### Creating a New User — Step by Step

**Step 1: Select a Role**
Choose the appropriate role from the dropdown. The role determines what data the user can see and what areas they are assigned to. See [Section 9](#9-user-roles-explained) for a full explanation of each role.

**Step 2: Assign Location**
Depending on the role selected, you will see the relevant location selector:
- **Booth Agent / Zone Commander** → Select one or more specific booths.
- **Local Body Head** → Select one or more local bodies (panchayat/municipality).
- **Constituency Admin** → Select one or more constituencies.
- **Manager / Operator / Super Admin** → Full access, no location restriction.

Click on a location to toggle it on/off. Selected locations are highlighted in blue.

**Step 3: Enter Login Details**
- **Username** — The login name for the staff member.
- **Password** — Set an initial password. The user can change it later.

**Step 4: Set Permissions**
Toggle individual permissions on/off:

| Permission | What it allows |
|---|---|
| Download Data | Export the voter list as Excel/CSV |
| Upload & OCR | Upload and process scanned voter rolls |
| Verify Records | Approve OCR-scanned data |
| Edit Voters | Edit voter phone numbers and details |
| Send Messages | Send WhatsApp/SMS broadcasts |
| Manage System | Add locations and manage parties |

**Finally:** Click **Create Account** to save.

#### Editing an Existing User
Find the user in the Staff Members list on the right side. Click **Edit** to load their details into the form. Make changes and click **Save Changes**.

#### Removing a User
Click **Remove** next to any staff member to delete their account. You will be asked to confirm.

---

### 8.2 Locations Tab

Add new geographical units to the system.

| Type | What it is | What you need |
|---|---|---|
| Constituency | Top-level area (e.g. North Paravur) | A name |
| Local Body | Panchayat or Municipality within a constituency | Select parent constituency + give it a name |
| Booth | A single polling booth | Select constituency → select local body → booth number + polling station details |

Click **Add Constituency / Add Local Body / Add Booth** after filling in the details.

---

### 8.3 Party Branding Tab

#### Sync Official Parties (Recommended)
Click **Sync Party Data** to automatically load all official party branding (INC, CPM, IUML, etc.) into the system. This only needs to be done once per environment (once locally, once on the live server).

#### Add a Custom Party
If you need to add a party that is not in the official list:
1. Select a template from the dropdown (optional, to pre-fill values).
2. Enter the **Party Name** and **Short Code** (e.g., INC).
3. Pick the **Party Colour** using the colour picker.
4. Upload the **Party Logo** (PNG recommended).
5. Click **Add Party**.

---

## 9. User Roles Explained

| Role | Who it's for | Data Access |
|---|---|---|
| **Booth Agent** | A ground-level worker assigned to specific booths | Can only see voters in their assigned booths |
| **Zone Commander** | Someone managing a cluster of booths | Can only see voters in their assigned booths |
| **Local Body Head** | Head of a panchayat/municipality | Can see all booths within their assigned local body |
| **Constituency Admin** | A constituency-level manager | Can see all data within their assigned constituency |
| **Manager** | A campaign manager with full data access | Can see everything; can upload and export data |
| **Operator** | Data entry staff | Can upload and process OCR; limited other access |
| **Super Admin** | The system owner | Full access to everything, including user management |

---

## 10. Frequently Asked Questions

**Q: I can't log in. What do I do?**
Contact your Super Admin to check your username and reset your password.

---

**Q: The Voter Slips page doesn't show any party options in the dropdown.**
Go to **User Settings → Party Branding tab → click "Sync Party Data"**. This loads all official party logos and colors into the system.

---

**Q: I uploaded a PDF but the OCR results look wrong.**
Use the Review step to manually correct any errors before clicking "Save to Database". The system highlights rows it is unsure about.

---

**Q: I can see voters from other booths that aren't mine.**
Contact your Super Admin — your account may have been assigned to incorrect booths. They can edit your account in the User Settings page.

---

**Q: How do I change my own password?**
Click the 🔐 icon next to your username at the top of the sidebar.

---

**Q: The dashboard is showing old data.**
The dashboard updates automatically when you visit it. If data looks stale, try navigating away and coming back.

---

*For technical support or emergencies, contact the system administrator.*

---
*Election Intelligence Engine v5.2 | Confidential — Internal Use Only*
