// ==UserScript==
// @name         Sales Navigator Autopilot: Lead Scraper & Auto-Sender
// @namespace    https://github.com/hamdan-Deb/salesnav-autopilot-userscript
// @version      3.0
// @description  Automates lead extraction to CSV and sends personalized connect invitations on LinkedIn Sales Navigator
// @author       Hamdan Sajid
// @match        https://www.linkedin.com/sales/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    const sleep = (ms) => new Promise(r => setTimeout(r, ms));

    const extractCity = (loc) => {
        if (!loc) return "your area";
        return loc.split(",")[0].replace("Metropolitan Area", "").trim();
    };

    // ==========================================
    // CUSTOMIZE YOUR PITCH TEMPLATE HERE
    // (Ensure output is under 300 characters)
    // ==========================================
    const generatePitch = (firstName, city) => {
        const name = firstName || "there";
        const c = city || "your area";
        const pitch = `Hi ${name}, saw your profile in ${c}. I specialize in back-office operations, CRM management, and tech workflows. Would love to connect and share insights!`;
        return pitch.slice(0, 295);
    };

    // Auto-detect the middle column virtual scroll container in Sales Nav
    const getInnerScrollContainer = () => {
        const sampleEl = document.querySelector("[data-anonymize='person-name']");
        if (!sampleEl) return window;
        let parent = sampleEl.parentElement;
        while (parent && parent !== document.body) {
            const style = window.getComputedStyle(parent);
            if ((style.overflowY === 'auto' || style.overflowY === 'scroll') && parent.scrollHeight > parent.clientHeight) {
                return parent;
            }
            parent = parent.parentElement;
        }
        return window;
    };

    // Ember-compliant mouse event dispatcher (Triggers native mousedown listeners)
    const triggerEmberClick = (element) => {
        if (!element) return;
        element.focus();
        ['mouseenter', 'mouseover', 'mousedown', 'mouseup', 'click'].forEach(eventType => {
            element.dispatchEvent(new MouseEvent(eventType, {
                view: window,
                bubbles: true,
                cancelable: true,
                buttons: 1
            }));
        });
    };

    // Native property injection into Ember Textarea
    const injectTextCleanly = async (textarea, text) => {
        textarea.focus();
        await sleep(150);

        const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value").set;
        setter.call(textarea, text);

        textarea.dispatchEvent(new InputEvent('input', {
            bubbles: true,
            cancelable: true,
            inputType: 'insertText',
            data: text
        }));
        textarea.dispatchEvent(new Event('change', { bubbles: true }));

        await sleep(500);
    };

    // Build Floating UI Panel
    const createUI = () => {
        if (document.getElementById("autopilot-panel")) return;

        const panel = document.createElement("div");
        panel.id = "autopilot-panel";
        panel.innerHTML = `
            <div style="position:fixed; top:75px; right:20px; z-index:999999; width:290px; background:#1b1f23; color:#fff; border-radius:10px; box-shadow:0 8px 24px rgba(0,0,0,0.5); font-family:Arial, sans-serif; font-size:12px; border:1px solid #38444d; padding:15px;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                    <strong style="font-size:14px; color:#70b5f9;">⚡ SalesNav Autopilot</strong>
                    <span id="ap-status-dot" style="height:8px; width:8px; background:#00ff88; border-radius:50%; display:inline-block;"></span>
                </div>
                <div style="color:#aaa; font-size:11px; margin-bottom:12px;">Universal Lead Scraper & Auto-Sender</div>
                
                <button id="ap-scrape-btn" style="width:100%; background:#28a745; color:white; border:none; padding:10px; border-radius:5px; cursor:pointer; font-weight:bold; margin-bottom:8px;">
                    💾 1. Scrape & Download CSV
                </button>

                <button id="ap-send-btn" style="width:100%; background:#0073b1; color:white; border:none; padding:10px; border-radius:5px; cursor:pointer; font-weight:bold; margin-bottom:8px;">
                    🚀 2. Start Auto-Sender
                </button>

                <button id="ap-stop-btn" style="width:100%; background:#dc3545; color:white; border:none; padding:6px; border-radius:5px; cursor:pointer; font-weight:bold; display:none; margin-bottom:8px;">
                    ⏹ Stop Runner
                </button>

                <div id="ap-log" style="background:#0d1117; color:#58a6ff; height:120px; overflow-y:auto; padding:6px; border-radius:4px; font-family:monospace; font-size:10px; border:1px solid #21262d;">
                    Ready. Hit Scrape or Auto-Send!
                </div>
            </div>
        `;
        document.body.appendChild(panel);

        const log = (msg) => {
            const box = document.getElementById("ap-log");
            if (box) {
                box.innerHTML += `<div>> ${msg}</div>`;
                box.scrollTop = box.scrollHeight;
            }
        };

        let isRunning = false;

        // ==========================================
        // ACTION 1: VIRTUAL-DOM CSV SCRAPER
        // ==========================================
        document.getElementById("ap-scrape-btn").addEventListener("click", async () => {
            log("Hydrating virtualized DOM...");
            const container = getInnerScrollContainer();
            const leadsMap = new Map();

            const grabVisible = () => {
                const nameElements = Array.from(document.querySelectorAll("[data-anonymize='person-name']"));
                nameElements.forEach(nameEl => {
                    const card = nameEl.closest("li") || nameEl.closest("[data-view-name*='result']") || nameEl.parentElement;
                    const fullName = nameEl.innerText.trim();
                    const firstName = fullName.split(" ")[0];
                    const locEl = card ? card.querySelector("[data-anonymize='location']") : null;
                    const location = locEl ? locEl.innerText.trim() : "";
                    const city = extractCity(location);
                    const linkEl = card ? (card.querySelector("a[href*='/sales/lead/']") || card.querySelector("a[data-control-name*='search_lead_name']")) : null;

                    if (firstName && fullName.length > 2 && !leadsMap.has(fullName)) {
                        leadsMap.set(fullName, {
                            fullName, firstName, city, location,
                            profileUrl: linkEl ? linkEl.href : "",
                            pitch: generatePitch(firstName, city)
                        });
                    }
                });
            };

            if (container === window) window.scrollTo(0, 0);
            else container.scrollTop = 0;
            await sleep(500);

            for (let i = 0; i < 14; i++) {
                grabVisible();
                if (container === window) window.scrollBy(0, 600);
                else container.scrollTop += 600;
                await sleep(300);
            }
            grabVisible();

            const leads = Array.from(leadsMap.values());
            log(`Extracted ${leads.length} leads! Formatting CSV...`);

            if (leads.length === 0) {
                log("❌ 0 leads captured. Check search page!");
                return;
            }

            const headers = ["Full Name", "First Name", "City", "Location", "Profile URL", "Personalized Pitch"];
            const rows = leads.map(l => [
                `"${l.fullName.replace(/"/g, '""')}"`,
                `"${l.firstName.replace(/"/g, '""')}"`,
                `"${l.city.replace(/"/g, '""')}"`,
                `"${l.location.replace(/"/g, '""')}"`,
                `"${l.profileUrl.replace(/"/g, '""')}"`,
                `"${l.pitch.replace(/"/g, '""')}"`
            ]);

            const csvString = [headers.join(","), ...rows.map(e => e.join(","))].join("\n");

            try {
                await navigator.clipboard.writeText(csvString);
                log("📋 Copied to clipboard!");
            } catch(e) {}

            try {
                const blob = new Blob(["\uFEFF" + csvString], { type: 'text/csv;charset=utf-8;' });
                const a = document.createElement("a");
                a.href = URL.createObjectURL(blob);
                a.download = `salesnav_leads_${leads.length}.csv`;
                document.body.appendChild(a);
                a.click();
                setTimeout(() => document.body.removeChild(a), 1000);
                log(`✅ Saved ${leads.length} leads to CSV!`);
            } catch (err) {
                log("⚠️ File blocked: Paste directly into Excel with Ctrl+V!");
            }
        });

        // ==========================================
        // ACTION 2: EMBER CONNECT AUTO-SENDER
        // ==========================================
        document.getElementById("ap-send-btn").addEventListener("click", async () => {
            isRunning = true;
            document.getElementById("ap-send-btn").style.display = "none";
            document.getElementById("ap-stop-btn").style.display = "block";

            log("Starting Auto-Sender (Mousedown enabled)...");

            const container = getInnerScrollContainer();
            if (container === window) window.scrollTo(0, 0);
            else container.scrollTop = 0;
            await sleep(1500);

            const processedNames = new Set();
            let sent = 0;
            let emptyScrolls = 0;

            while (isRunning && sent < 25 && emptyScrolls < 5) {
                document.querySelectorAll(".artdeco-hoverable-content").forEach(el => el.remove());

                const currentCards = Array.from(document.querySelectorAll("ol.artdeco-list li.artdeco-list__item, [data-view-name*='result']"));
                let foundNewLead = false;

                for (let i = 0; i < currentCards.length && isRunning; i++) {
                    const card = currentCards[i];
                    const nameEl = card.querySelector("[data-anonymize='person-name']");
                    const fullName = nameEl ? nameEl.innerText.trim() : "";
                    const firstName = fullName.split(" ")[0];

                    if (!firstName || processedNames.has(fullName)) continue;

                    foundNewLead = true;
                    emptyScrolls = 0;
                    processedNames.add(fullName);

                    card.scrollIntoView({ behavior: "smooth", block: "center" });
                    await sleep(1000);

                    const locEl = card.querySelector("[data-anonymize='location']");
                    const city = extractCity(locEl ? locEl.innerText.trim() : "");

                    log(`Target: ${firstName} (${city})`);

                    // 1. Locate overflow trigger button
                    const moreBtn = card.querySelector("button[data-search-overflow-trigger]") || 
                                   card.querySelector("button[id^='hue-menu-trigger-']") || 
                                   card.querySelector("button[aria-label*='See more actions' i]");

                    if (!moreBtn) {
                        log(`Overflow button missing for ${firstName}. Skipping.`);
                        continue;
                    }

                    const menuId = moreBtn.getAttribute("aria-controls");
                    
                    // Trigger Ember click with native mousedown
                    triggerEmberClick(moreBtn);
                    log(`Opening menu for ${firstName}...`);
                    await sleep(1400);

                    // 2. Locate Connect option inside active menu
                    const menu = menuId ? document.getElementById(menuId) : null;
                    const searchRoot = menu || document;

                    const allItems = Array.from(searchRoot.querySelectorAll("li, div, span, button, a"));
                    const connectOption = allItems.reverse().find(el => {
                        const t = (el.innerText || el.textContent || "").trim().toLowerCase();
                        return (t === "connect" || t.startsWith("connect\n") || t.startsWith("connect with")) && !t.includes("connection");
                    });

                    if (!connectOption) {
                        log(`Connect not available for ${firstName}.`);
                        document.body.click();
                        await sleep(800);
                        continue;
                    }

                    log(`Clicking Connect for ${firstName}...`);
                    triggerEmberClick(connectOption);

                    // 3. Dynamically poll for modal textarea to render
                    let textarea = null;
                    for (let w = 0; w < 12; w++) {
                        textarea = document.getElementById("connect-cta-form__invitation") || document.querySelector("textarea");
                        if (textarea && textarea.offsetParent !== null) break;
                        await sleep(500);
                    }

                    if (!textarea) {
                        log(`Modal textarea missing. Skipping.`);
                        const cancel = document.querySelector(".connect-cta-form__cancel, button[aria-label='Dismiss']");
                        if (cancel) cancel.click();
                        await sleep(1000);
                        continue;
                    }

                    // 4. Inject personalized pitch cleanly
                    const pitchText = generatePitch(firstName, city);
                    await injectTextCleanly(textarea, pitchText);
                    await sleep(800);

                    // 🛑 HARD SAFETY CHECK: ABORT IF TEXT IS BLANK
                    if (!textarea.value || textarea.value.trim().length < 50) {
                        log(`⚠️ ERROR: Text missing in box! ABORTING to prevent blank invite!`);
                        const cancelBtn = document.querySelector(".connect-cta-form__cancel, button[aria-label='Dismiss']");
                        if (cancelBtn) cancelBtn.click();
                        await sleep(1500);
                        continue;
                    }

                    log(`Pitch verified in box (${textarea.value.length} chars). Sending...`);

                    // 5. Click Send Invitation
                    const sendBtn = document.querySelector("button.connect-cta-form__send") || 
                                    Array.from(document.querySelectorAll("button")).find(b => (b.innerText || "").trim().toLowerCase() === "send invitation");

                    if (sendBtn && !sendBtn.disabled) {
                        triggerEmberClick(sendBtn);
                        await sleep(2500);

                        if (!document.getElementById("connect-cta-form__invitation")) {
                            sent++;
                            log(`🚀 DELIVERED invite to ${firstName}! (${sent} sent)`);
                        } else {
                            log(`Retrying Send click...`);
                            triggerEmberClick(sendBtn);
                            await sleep(1500);
                            if (!document.getElementById("connect-cta-form__invitation")) {
                                sent++;
                                log(`🚀 DELIVERED invite to ${firstName}! (${sent} sent)`);
                            }
                        }
                    } else {
                        log(`Send button disabled.`);
                    }

                    if (!isRunning) break;

                    const delay = Math.floor(Math.random() * 4000) + 14000;
                    log(`Cooldown ${(delay/1000).toFixed(0)}s...`);
                    await sleep(delay);
                }

                if (!foundNewLead) {
                    emptyScrolls++;
                    log("Scrolling down to reveal next cards...");
                    if (container === window) window.scrollBy(0, 700);
                    else container.scrollTop += 700;
                    await sleep(1500);
                }
            }

            log(`Done! Sent ${sent} total verified invites.`);
            document.getElementById("ap-send-btn").style.display = "block";
            document.getElementById("ap-stop-btn").style.display = "none";
        });

        document.getElementById("ap-stop-btn").addEventListener("click", () => {
            isRunning = false;
            log("🛑 Stopped.");
            document.getElementById("ap-send-btn").style.display = "block";
            document.getElementById("ap-stop-btn").style.display = "none";
        });
    };

    const initTimer = setInterval(() => {
        if (document.body) {
            clearInterval(initTimer);
            setTimeout(createUI, 2000);
        }
    }, 500);

})();
