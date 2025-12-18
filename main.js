(() => {
  const KEY = "CHASE_INTERVAL_V1";
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const norm = (s) => (s || "").trim().toLowerCase();

  const save = (s) => localStorage.setItem(KEY, JSON.stringify(s));
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY) || "null"); } catch { return null; } };

  const isHub = () => location.href.includes("offer-hub");
  const isBookmarks = () => /bookmark|bookmarks|favorite|favorites|saved/i.test(location.href);

  const getTiles = () =>
    [...document.querySelectorAll('div[data-testid="commerce-tile"][role="button"]')];

  const findAddButton = () => {
    const keys = ["add", "add offer", "add to card", "activate", "activate offer", "enroll"];
    return [...document.querySelectorAll("button")].find(b => {
      const t = norm(b.innerText);
      return keys.some(k => t === k || t.includes(k));
    }) || null;
  };

  // One "tick" handles exactly one step, depending on where we are.
  const tick = async () => {
    const s = load();
    if (!s?.running) return;

    // If we ever land on bookmarks, back out and skip that item.
    if (!isHub() && isBookmarks()) {
      console.warn("🚫 Bookmarks route detected. Skipping this tile and going back.");
      s.index += 1;
      save(s);
      await sleep(200);
      history.back();
      return;
    }

    if (isHub()) {
      const tiles = getTiles();

      if (!tiles.length) {
        console.warn("No offer tiles found. Scroll so offers load, then RESUME.");
        s.running = false; save(s);
        return;
      }

      // If we've reached the end of currently loaded tiles, scroll to load more and wait for next tick.
      if (s.index >= tiles.length) {
        window.scrollBy(0, Math.round(window.innerHeight * 0.9));
        return;
      }

      const tile = tiles[s.index];
      console.log(`➡️ Opening ${s.index + 1}/${tiles.length}:`, tile.getAttribute("aria-label") || "");

      // Persist before click (so if page navigates, we don't lose our place)
      save(s);

      tile.scrollIntoView({ block: "center" });
      // Click the TILE CONTAINER (NOT the plus icon)
      tile.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
      return;
    }

    // Detail page: click Add/Activate if available, then go back and increment index.
    const btn = findAddButton();

    if (btn) {
      btn.click();
      console.log("✅ Clicked Add/Activate");
      await sleep(350);
    } else {
      console.warn("⚠️ Add/Activate not found (maybe already added) — skipping.");
    }

    const s2 = load();
    s2.index += 1;
    save(s2);

    history.back();
  };

  window.CHASE_INTERVAL = {
    START: () => {
      if (!isHub()) return console.warn("Go to Offer Hub first (URL contains offer-hub).");
      save({ running: true, index: 0 });
      console.log("▶️ Started CHASE_INTERVAL");
    },
    RESUME: () => {
      const s = load();
      if (!s) return console.warn("No state. Run START first.");
      s.running = true; save(s);
      console.log(`▶️ Resuming at index ${s.index}`);
    },
    STOP: () => {
      const s = load();
      if (!s) return;
      s.running = false; save(s);
      console.log("⏹️ Stopped");
    },
    RESET: () => {
      localStorage.removeItem(KEY);
      console.log("🗑️ Reset state");
    },
    STATUS: () => console.log(load())
  };

  // Interval loop (your preferred style)
  const intervalId = setInterval(() => {
    const s = load();
    if (!s?.running) return;
    tick().catch(err => console.warn("Tick error:", err));
  }, 1200);

  console.log("Loaded CHASE_INTERVAL. Run: CHASE_INTERVAL.START()");
})();
