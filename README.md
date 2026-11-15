# Sales Nav Lead Auto-Connect Userscript

A high-performance, browser-native **Tampermonkey Userscript** designed for **LinkedIn Sales Navigator**. Works dynamically with **any search query, industry, or geography**.

---

## 🎯 Key Problems Solved

1. **Virtualized DOM Culling:** Sales Navigator only renders ~4 visible cards at a time to save browser memory. Standard scrapers only capture what is currently on screen. This tool scrolls the inner container dynamically and accumulates all 25 leads per page without duplicates.
2. **Ember.js Event Dispatches:** Sales Navigator's dropdown menus ignore standard programmatic `.click()` calls. This script dispatches native `mousedown ➔ mouseup ➔ click` sequences to reliably toggle menus.
3. **Two-Way Binding Rollbacks:** This script properly commits values directly to the DOM and Ember virtual tree. This script includes an **Ironclad Safety Guard** that aborts sending if the box contains fewer than 50 characters.

---

## 🚀 Features

* **💾 Button 1: Smart Virtual-DOM Scraper & CSV Exporter**
  * Auto-detects the middle column scroll container.
  * Smoothly steps down through the virtualized list, hydrating cards on the fly.
  * Captures: **Full Name, First Name, Title, City, Full Location, and Profile URL**.
  * Automatically downloads a formatted UTF-8 CSV file and copies the data to your clipboard for instant Excel/Google Sheets pasting (`Ctrl + V`).
  * Works on any Sales Navigator search.

* **🚀 Button 2: Precision Auto-Sender (Connect Runner)**
  * **Card Focus:** Smoothly centers on each target.
  * **Menu Discovery:** Targets the `[data-search-overflow-trigger]` attribute and reads `aria-controls` to find the exact popup menu by ID.
  * **Connect Activation:** Dispatches native mouse events to click **Connect** (even with dynamic accessible names like *"Connect with [Name]"*).
  * **Modal Polling:** Dynamically waits for the `#connect-cta-form__invitation` textarea to mount.
  * **Native Text Injection:** Injects your custom personalized note directly into the input buffer.
  * **Safety Lock Verification:** Ensures text length > 50 characters before proceeding.
  * **Send Execution:** Fires the `.connect-cta-form__send` button.
  * **Safe Human Pacing:** Implements a randomized **14 to 18-second delay** between actions to stay within safe LinkedIn rate limits.

---

## 🛠️ Installation & Setup

1. Install the **[Tampermonkey Extension](https://www.tampermonkey.net/)** for your browser (Chrome, Brave, Edge, Firefox).
2. Click the Tampermonkey extension icon and select **Create a new script...**
3. Copy the entire contents of [`salesnav-autopilot.user.js`](./salesnav-autopilot.user.js) and paste it into the editor.
4. Press **`Ctrl + S`** (or *File ➔ Save*).
5. Open **LinkedIn Sales Navigator** and run any Lead Search.
6. A dark floating control widget (**⚡ SalesNav Autopilot**) will appear in the top-right corner!

---

## ⚙️ How It Works (Technical Flow)

```text
[ Lead Search Page Loaded ]
           │
           ▼
[ Step 1: Detect Inner Scroll Container ]
           │
           ├──────────────────────────────┬──────────────────────────────┐
           ▼                                                             ▼
[ 💾 1. Scrape Leads ]                                        [ 🚀 2. Start Auto-Sender ]
  - Loops down the inner container                              - Focuses on candidate card
  - Hydrates virtualized DOM                                    - Triggers native 'mousedown' on '...' button
  - Collects unique leads in a Map                              - Discovers menu via 'aria-controls' ID
  - Exports clean .CSV & copies to clipboard                    - Clicks 'Connect' (Fuzzy name matcher)
                                                                - Dynamically polls for #connect-cta-form__invitation
                                                                - Injects personalized note
                                                                - 🛑 SAFETY CHECK: Length > 50 chars?
                                                                      ├─ NO  ➔ Closes modal & skips (No blank invites!)
                                                                      └─ YES ➔ Clicks .connect-cta-form__send
                                                                - Waits 14–18s human delay
                                                                - Scrolls down to next target
```

# ✏️ Customizing Your Pitch Template
Inside salesnav-autopilot.user.js, line 28; you can modify the generatePitch function to match your specific offering:

```
const generatePitch = (firstName, city) => {
    const name = firstName || "there";
    const c = city || "your area";
    
    // Keep strictly under 300 characters for LinkedIn connection requests!
    return `Hi ${name}, saw your profile in ${c}. I help teams streamline operations, manage back-office tech, and eliminate administrative bottlenecks. Would love to connect!`;
};
```

# Responsible Use & Anti-Ban Best Practices
- I recommend sending no more than 20–25 connection requests per day on Sales Navigator to protect your account standing.
- Delays: Never remove or reduce the built-in 14–18 second cooldown timer.
- Educational Purpose: This tool is open-source and intended for educational and productivity enhancement purposes. Ensure compliance with LinkedIn's User Agreement when deploying automation.


## Live Demo
<img width="1280" height="639" alt="scriptDemo" src="https://github.com/user-attachments/assets/5cc3e4ce-43f4-4589-92f3-b2bafc4a06e9" />



