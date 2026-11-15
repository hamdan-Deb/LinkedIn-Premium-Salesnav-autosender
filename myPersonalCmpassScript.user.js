// ==UserScript==
// @name         Sales Navigator Compass Prospector & Auto-Sender
// @namespace    https://linkedin.com/sales/
// @version      2.7
// @description  Restored Mousedown for Ember Trigger + Separate CSV & Auto-Send Buttons
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

    const getCompassPitch = (firstName, city) => {
        const name = firstName || "there";
        const c = city || "your area";
        return `Hi ${name}, saw your listings with Compass in ${c}. Most top producers lose 10+ hrs/wk wrestling with tech. I’m a specialized Real Estate Tech VA who already knows the Compass ecosystem (Collections, Marketing Center, Business Tracker & Open House app). Open to connecting?`;
    };

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

    // Ember-compliant click that dispatches native mousedown
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

    // Clean text injection into Ember Textarea
    const injectTextCleanly = async (textarea, text) => {
        textarea.focus();
        await sleep(150);

        // Native property setter
        const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value").set;
        setter.call(textarea, text);

        // Fire input and change events
        textarea.dispatchEvent(new InputEvent('input', {
            bubbles: true,
            cancelable: true,
            inputType: 'insertText',
            data: text
        }));
        textarea.dispatchEvent(new Event('change', { bubbles: true }));

        await sleep(500);
    };

    const createUI = () => {
        if (document.getElementById("compass-panel")) return;

        const panel = document.createElement("div");
        panel.id = "compass-panel";
        panel.innerHTML = `
            <div style="position:fixed; top:75px; right:20px; z-index:999999; width:290px; background:#1b1f23; color:#fff; border-radius:10px; box-shadow:0 8px 24px rgba(0,0,0,0.5); font-family:Arial, sans-serif; font-size:12px; border:1px solid #38444d; padding:15px;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                    <strong style="font-size:14px; color:#70b5f9;">⚡ Compass Prospector (v2.7)</strong>
                    <span id="cp-status-dot" style="height:8px; width:8px; background:#00ff88; border-radius:50%; display:inline-block;"></span>
                </div>
                <div style="color:#aaa; font-size:11px; margin-bottom:12px;">Dedicated Buttons: Scrape vs Send</div>

                <button id="cp-scrape-btn" style="width:100%; background:#28a745; color:white; border:none; padding:10px; border-radius:5px; cursor:pointer; font-weight:bold; margin-bottom:8px;">
                    💾 1. Scrape & Download CSV
                </button>

                <button id="cp-send-btn" style="width:100%; background:#0073b1; color:white; border:none; padding:10px; border-radius:5px; cursor:pointer; font-weight:bold; margin-bottom:8px;">
                    🚀 2. Start Auto-Sender
                </button>

                <button id="cp-stop-btn" style="width:100%; background:#dc3545; color:white; border:none; padding:6px; border-radius:5px; cursor:pointer; font-weight:bold; display:none; margin-bottom:8px;">
                    ⏹ Stop Runner
                </button>

                <div id="cp-log" style="background:#0d1117; color:#58a6ff; height:120px; overflow-y:auto; padding:6px; border-radius:4px; font-family:monospace; font-size:10px; border:1px solid #21262d;">
                    Ready. Hit Scrape or Auto-Send!
                </div>
            </div>
        `;
        document.body.appendChild(panel);

        const log = (msg) => {
            const box = document.getElementById("cp-log");
            if (box) {
                box.innerHTML += `<div>> ${msg}</div>`;
                box.scrollTop = box.scrollHeight;
            }
        };

        let isRunning = false;

        // ==========================================
        // BUTTON 1: PURE CSV SCRAPE & DOWNLOAD
        // ==========================================
        document.getElementById("cp-scrape-btn").addEventListener("click", async () => {
            log("Capturing all 25 leads for CSV...");
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
                            pitch: getCompassPitch(firstName, city)
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
            log(`Captured ${leads.length} leads! Formatting CSV...`);

            if (leads.length === 0) {
                log("❌ 0 leads captured. Make sure search is loaded!");
                return;
            }

            const headers = ["Full Name", "First Name", "City", "Location", "Profile URL", "Pitch"];
            const rows = leads.map(l => [
                `"${l.fullName.replace(/"/g, '""')}"`,
                `"${l.firstName.replace(/"/g, '""')}"`,
                `"${l.city.replace(/"/g, '""')}"`,
                `"${l.location.replace(/"/g, '""')}"`,
                `"${l.profileUrl.replace(/"/g, '""')}"`,
                `"${l.pitch.replace(/"/g, '""')}"`
            ]);

            const csvString = [headers.join(","), ...rows.map(e => e.join(","))].join("\n");

            // Copy to clipboard
            try {
                await navigator.clipboard.writeText(csvString);
                log("📋 Copied to clipboard!");
            } catch(e) {}

            // Trigger file download
            try {
                const blob = new Blob(["\uFEFF" + csvString], { type: 'text/csv;charset=utf-8;' });
                const a = document.createElement("a");
                a.href = URL.createObjectURL(blob);
                a.download = `compass_agents_${leads.length}.csv`;
                document.body.appendChild(a);
                a.click();
                setTimeout(() => document.body.removeChild(a), 1000);
                log(`✅ Saved ${leads.length} leads to 'compass_agents_${leads.length}.csv'!`);
            } catch (err) {
                log("⚠️ File blocked: Paste into Excel with Ctrl+V!");
            }
        });

        // ==========================================
        // BUTTON 2: PURE AUTO-SENDER (WITH MOUSEDOWN)
        // ==========================================
        document.getElementById("cp-send-btn").addEventListener("click", async () => {
            isRunning = true;
            document.getElementById("cp-send-btn").style.display = "none";
            document.getElementById("cp-stop-btn").style.display = "block";

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

                    // 1. Locate overflow trigger
                    const moreBtn = card.querySelector("button[data-search-overflow-trigger]") ||
                                   card.querySelector("button[id^='hue-menu-trigger-']") ||
                                   card.querySelector("button[aria-label*='See more actions' i]");

                    if (!moreBtn) {
                        log(`Overflow button missing for ${firstName}. Skipping.`);
                        continue;
                    }

                    const menuId = moreBtn.getAttribute("aria-controls");

                    // Trigger native Ember click (WITH MOUSEDOWN)
                    triggerEmberClick(moreBtn);
                    log(`Opening menu for ${firstName}...`);
                    await sleep(1400);

                    // 2. Locate Connect option
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

                    // 3. Wait for textarea to appear
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

                    // 4. Inject pitch cleanly (WITHOUT BLUR)
                    const pitchText = getCompassPitch(firstName, city);
                    await injectTextCleanly(textarea, pitchText);
                    await sleep(800);

                    // 🛑 HARD SAFETY CHECK: REFUSE TO SEND IF TEXT IS EMPTY!
                    if (!textarea.value || textarea.value.trim().length < 50) {
                        log(`⚠️ ERROR: Text missing in box! ABORTING to prevent blank invite!`);
                        const cancelBtn = document.querySelector(".connect-cta-form__cancel, button[aria-label='Dismiss']");
                        if (cancelBtn) cancelBtn.click();
                        await sleep(1500);
                        continue; // SKIP! DO NOT SEND!
                    }

                    log(`Pitch verified in box (${textarea.value.length} chars). Sending...`);

                    // 5. Click Send Button
                    const sendBtn = document.querySelector("button.connect-cta-form__send") ||
                                    Array.from(document.querySelectorAll("button")).find(b => (b.innerText || "").trim().toLowerCase() === "send invitation");

                    if (sendBtn && !sendBtn.disabled) {
                        triggerEmberClick(sendBtn);
                        await sleep(2500);

                        // Confirm modal closed
                        if (!document.getElementById("connect-cta-form__invitation")) {
                            sent++;
                            log(`🚀 DELIVERED invite to ${firstName} at Compass! (${sent} sent)`);
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
            document.getElementById("cp-send-btn").style.display = "block";
            document.getElementById("cp-stop-btn").style.display = "none";
        });

        document.getElementById("cp-stop-btn").addEventListener("click", () => {
            isRunning = false;
            log("🛑 Stopped.");
            document.getElementById("cp-send-btn").style.display = "block";
            document.getElementById("cp-stop-btn").style.display = "none";
        });
    };

    const initTimer = setInterval(() => {
        if (document.body) {
            clearInterval(initTimer);
            setTimeout(createUI, 2000);
        }
    }, 500);

})();