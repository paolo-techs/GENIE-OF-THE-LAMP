(function () {
  "use strict";

  const FREE_WISHES = 3;
  const STORAGE_KEY = "genieLampState";
  const RUB_NEEDED = 12;

  const form = document.getElementById("wishForm");
  const questionEl = document.getElementById("question");
  const nameEl = document.getElementById("seekerName");
  const rubBtn = document.getElementById("rubBtn");
  const answerPanel = document.getElementById("answerPanel");
  const answerText = document.getElementById("answerText");
  const answerWhisper = document.getElementById("answerWhisper");
  const answerRecall = document.getElementById("answerRecall");
  const thinkingRow = document.getElementById("thinkingRow");
  const againBtn = document.getElementById("againBtn");
  const lampWrap = document.getElementById("lampWrap");
  const lamp = document.getElementById("lampSvg") || document.querySelector(".lamp");
  const smokes = document.querySelectorAll(".smoke");
  const genieAura = document.getElementById("genieAura");
  const genieAura2 = document.getElementById("genieAura2");
  const genieEntity = document.getElementById("genieEntity");
  const genieFigure = document.getElementById("genieFigure");
  const genieSpeech = document.getElementById("genieSpeech");
  const thinkBubbles = document.getElementById("thinkBubbles");
  const sparkBurst = document.getElementById("sparkBurst");
  const shockwave = document.getElementById("shockwave");
  const shockwave2 = document.getElementById("shockwave2");
  const wishesText = document.getElementById("wishesText");
  const wishOrbs = document.querySelectorAll(".wish-orb");
  const payModal = document.getElementById("payModal");
  const modalClose = document.getElementById("modalClose");
  const confirmPay = document.getElementById("confirmPay");
  const payPacks = document.querySelectorAll(".pay-pack");
  const langEn = document.getElementById("langEn");
  const langEs = document.getElementById("langEs");
  const memoryToggle = document.getElementById("memoryToggle");
  const memoryBody = document.getElementById("memoryBody");
  const memoryList = document.getElementById("memoryList");
  const memoryStats = document.getElementById("memoryStats");
  const memoryEmpty = document.getElementById("memoryEmpty");
  const clearMemoryBtn = document.getElementById("clearMemory");
  const settingsBtn = document.getElementById("settingsBtn");
  const settingsModal = document.getElementById("settingsModal");
  const settingsClose = document.getElementById("settingsClose");
  const apiKeyInput = document.getElementById("apiKeyInput");
  const saveApiKeyBtn = document.getElementById("saveApiKey");
  const removeApiKeyBtn = document.getElementById("removeApiKey");
  const aiStatus = document.getElementById("aiStatus");
  const aiDot = document.getElementById("aiDot");
  const rubBar = document.getElementById("rubBar");
  const rubFill = document.getElementById("rubFill");
  const rubHint = document.getElementById("rubHint");
  const suggestions = document.getElementById("suggestions");

  let lang = localStorage.getItem("genieLang") || "en";
  let selectedPack = null;
  let isAnimating = false;
  let rubCount = 0;
  let rubPointerDown = false;
  let lastRubMove = 0;

  function getState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (_) { /* ignore */ }
    return { freeUsed: 0, bonusWishes: 0 };
  }

  function saveState(state) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function totalWishesAvailable(state) {
    return Math.max(0, FREE_WISHES - state.freeUsed) + (state.bonusWishes || 0);
  }

  function consumeWish(state) {
    if (state.freeUsed < FREE_WISHES) state.freeUsed += 1;
    else if (state.bonusWishes > 0) state.bonusWishes -= 1;
    saveState(state);
    return state;
  }

  function t(key, vars) {
    let str = window.GENIE_I18N[lang][key] || key;
    if (vars) {
      Object.keys(vars).forEach((k) => {
        str = String(str).replace(new RegExp(`\\{${k}\\}`, "g"), vars[k]);
      });
    }
    return str;
  }

  function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function detectIntent(q) {
    const patterns = window.GENIE_I18N[lang].intentPatterns;
    for (const [intent, regex] of Object.entries(patterns)) {
      if (regex.test(q)) return intent;
    }
    return "wisdom";
  }

  function setGenieMood(mood) {
    genieEntity.className = genieEntity.className
      .replace(/mood-\w+/g, "")
      .trim();
    genieEntity.classList.add(`mood-${mood || "idle"}`);
  }

  function moodFromIntent(intent) {
    const map = {
      love: "love",
      feelings: "happy",
      career: "thinking",
      decision: "surprised",
      health: "thinking",
    };
    return map[intent] || "happy";
  }

  function applyLanguage() {
    document.documentElement.lang = lang;
    langEn.classList.toggle("active", lang === "en");
    langEs.classList.toggle("active", lang === "es");

    document.querySelectorAll("[data-i18n]").forEach((el) => {
      const key = el.getAttribute("data-i18n");
      if (key && typeof t(key) === "string") el.textContent = t(key);
    });

    nameEl.placeholder = t("placeholderName");
    questionEl.placeholder = t("placeholderQuestion");
    apiKeyInput.placeholder = t("settingsKeyPlaceholder");

    suggestions.querySelectorAll(".chip").forEach((chip) => {
      const key = chip.getAttribute("data-q");
      chip.textContent = t(key);
    });

    aiStatus.textContent = window.GenieAI.hasApiKey() ? t("aiActive") : t("aiOff");
    aiDot.classList.toggle("on", window.GenieAI.hasApiKey());

    updateWishesUI();
    renderMemory();
    updatePayButton();
  }

  function updateWishesUI() {
    const state = getState();
    const freeLeft = Math.max(0, FREE_WISHES - state.freeUsed);
    const bonus = state.bonusWishes || 0;
    const total = totalWishesAvailable(state);

    wishOrbs.forEach((orb, i) => {
      orb.classList.toggle("spent", i < state.freeUsed);
      orb.classList.toggle("glow", i >= state.freeUsed && i < FREE_WISHES);
    });

    if (total === 0) {
      wishesText.textContent = t("wishesNone");
      wishesText.classList.add("empty");
      rubBtn.querySelector(".btn-inner").textContent = t("blockedRub");
    } else {
      wishesText.classList.remove("empty");
      wishesText.textContent =
        freeLeft > 0
          ? t("wishesLeft", { n: freeLeft }) + (bonus ? ` · ${t("wishesBonus", { n: bonus })}` : "")
          : t("wishesBonus", { n: bonus });
      rubBtn.querySelector(".btn-inner").textContent = t("btnRub");
    }
  }

  function renderMemory() {
    const mem = window.GenieMemory.get();
    memoryStats.textContent = `${t("memoryVisits", { n: mem.visitCount })} · ${t("memoryQuestions", { n: mem.totalQuestions })}${mem.name ? ` · ${mem.name}` : ""}`;

    memoryList.innerHTML = "";
    if (!mem.history.length) {
      memoryEmpty.hidden = false;
      return;
    }
    memoryEmpty.hidden = true;
    mem.history.slice(0, 6).forEach((h) => {
      const li = document.createElement("li");
      li.innerHTML = `<strong>${escapeHtml(h.question.slice(0, 70))}${h.question.length > 70 ? "…" : ""}</strong><span>${escapeHtml(h.answer.slice(0, 90))}…</span>`;
      memoryList.appendChild(li);
    });
  }

  function escapeHtml(s) {
    const d = document.createElement("div");
    d.textContent = s;
    return d.innerHTML;
  }

  async function getAnswer(question, name, intent) {
    const ctx = window.GenieMemory.getContextForAI(lang);

    if (window.GenieAI.hasApiKey()) {
      try {
        return await window.GenieAI.ask(question, lang, ctx);
      } catch (err) {
        showToast(err.message || "AI error", true);
      }
    }

    return window.GenieAI.buildSmartFallback(question, name, lang, ctx, intent);
  }

  function splitWhisper(full) {
    const parts = full.split(/\n+/);
    if (parts.length >= 2) {
      return { main: parts.slice(0, -1).join(" ").trim(), whisper: parts[parts.length - 1].trim() };
    }
    const sentences = full.match(/[^.!?]+[.!?]+/g) || [full];
    if (sentences.length >= 3) {
      return {
        main: sentences.slice(0, -1).join(" ").trim(),
        whisper: sentences[sentences.length - 1].trim(),
      };
    }
    return { main: full, whisper: pick(window.GENIE_I18N[lang].whispers) };
  }

  function resetEffects() {
    lamp.classList.remove("rubbing", "revealed", "lamp-burst");
    genieAura.classList.remove("active");
    genieAura2.classList.remove("active");
    genieEntity.hidden = true;
    genieEntity.classList.remove("emerged", "speaking", "waving");
    genieSpeech.hidden = true;
    thinkBubbles.hidden = true;
    sparkBurst.classList.remove("active");
    shockwave.classList.remove("active");
    shockwave2.classList.remove("active");
    document.querySelectorAll(".magic-ring").forEach((r) => r.classList.remove("active"));
    smokes.forEach((s) => {
      s.classList.remove("active");
      void s.offsetWidth;
    });
    setGenieMood("idle");
  }

  function playReveal() {
    lamp.classList.add("rubbing");
    document.querySelectorAll(".magic-ring").forEach((r) => r.classList.add("active"));

    setTimeout(() => {
      lamp.classList.remove("rubbing");
      lamp.classList.add("revealed", "lamp-burst");
      shockwave.classList.add("active");
      shockwave2.classList.add("active");
      sparkBurst.classList.add("active");
      smokes.forEach((s) => s.classList.add("active"));
      genieAura.classList.add("active");
      genieAura2.classList.add("active");
    }, 350);

    setTimeout(() => {
      genieEntity.hidden = false;
      genieEntity.classList.add("emerged", "waving");
    }, 700);

    setTimeout(() => genieEntity.classList.remove("waving"), 2200);
  }

  function setThinking(on) {
    thinkBubbles.hidden = !on;
    setGenieMood(on ? "thinking" : "happy");
    genieEntity.classList.toggle("speaking", on);
  }

  function typeAnswer(fullText, onDone) {
    answerText.textContent = "";
    answerText.hidden = false;
    answerText.classList.add("typing");
    setGenieMood("happy");
    genieEntity.classList.add("speaking");

    let i = 0;
    const speed = Math.max(8, Math.min(22, 1600 / fullText.length));

    function tick() {
      if (i < fullText.length) {
        answerText.textContent += fullText[i];
        i += 1;
        setTimeout(tick, speed);
      } else {
        answerText.classList.remove("typing");
        genieEntity.classList.remove("speaking");
        if (onDone) onDone();
      }
    }
    tick();
  }

  function resetRub() {
    rubCount = 0;
    rubFill.style.width = "0%";
    rubBar.hidden = true;
  }

  function addRub(n) {
    if (isAnimating) return;
    rubBar.hidden = false;
    rubCount = Math.min(RUB_NEEDED, rubCount + n);
    const pct = Math.round((rubCount / RUB_NEEDED) * 100);
    rubFill.style.width = pct + "%";
    rubHint.textContent = t("rubProgress", { n: pct });
    lamp.classList.add("rubbing");
    setTimeout(() => lamp.classList.remove("rubbing"), 200);

    if (rubCount >= RUB_NEEDED) {
      resetRub();
      rubHint.textContent = t("rubHint");
      if (questionEl.value.trim()) form.requestSubmit();
    }
  }

  async function handleWish() {
    if (isAnimating) return;

    const question = questionEl.value.trim();
    if (!question) return;

    const state = getState();
    if (totalWishesAvailable(state) <= 0) {
      openPayModal();
      return;
    }

    const name = nameEl.value.trim();
    window.GenieMemory.touch(name);

    const intent = detectIntent(question);
    isAnimating = true;
    rubBtn.disabled = true;
    answerPanel.hidden = false;
    answerText.hidden = true;
    answerText.textContent = "";
    answerRecall.hidden = true;
    thinkingRow.hidden = false;
    resetEffects();
    playReveal();
    setGenieMood(moodFromIntent(intent));

    const newState = consumeWish(state);
    updateWishesUI();

    const recall = window.GenieMemory.getRecallLine(lang, question);

    setTimeout(async () => {
      setThinking(true);
      let answer;
      try {
        answer = await getAnswer(question, name || window.GenieMemory.get().name, intent);
      } catch (_) {
        answer = window.GenieAI.buildSmartFallback(
          question,
          name,
          lang,
          window.GenieMemory.getContextForAI(lang),
          intent
        );
      }

      setThinking(false);
      thinkingRow.hidden = true;

      if (recall) {
        answerRecall.textContent = recall;
        answerRecall.hidden = false;
      }

      const parts = splitWhisper(answer);
      window.GenieMemory.rememberExchange(question, parts.main, intent);
      renderMemory();

      answerWhisper.textContent = parts.whisper;
      answerPanel.scrollIntoView({ behavior: "smooth", block: "nearest" });
      typeAnswer(parts.main, function () {
        rubBtn.disabled = false;
        isAnimating = false;
        setGenieMood("happy");
        if (totalWishesAvailable(newState) <= 0) setTimeout(openPayModal, 600);
      });
    }, 1500);
  }

  function showToast(msg, isError) {
    const toast = document.createElement("div");
    toast.className = isError ? "toast-error" : "toast-success";
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
  }

  function openPayModal() {
    payModal.hidden = false;
    document.body.classList.add("modal-open");
    selectedPack = null;
    payPacks.forEach((p) => p.classList.remove("selected"));
    updatePayButton();
  }

  function closePayModal() {
    payModal.hidden = true;
    if (settingsModal.hidden) document.body.classList.remove("modal-open");
  }

  function updatePayButton() {
    if (selectedPack) {
      confirmPay.disabled = false;
      const pack = payPacks[selectedPack === 15 ? 1 : 0];
      confirmPay.textContent = `${t("btnPay")} — +${pack.dataset.pack} ($${pack.dataset.price})`;
    } else {
      confirmPay.disabled = true;
      confirmPay.textContent = t("paySelect");
    }
  }

  function processPayment() {
    if (!selectedPack) return;
    const state = getState();
    state.bonusWishes = (state.bonusWishes || 0) + selectedPack;
    saveState(state);
    closePayModal();
    showToast(t("paySuccess"));
    updateWishesUI();
    lamp.classList.add("lamp-celebrate");
    setTimeout(() => lamp.classList.remove("lamp-celebrate"), 1200);
  }

  /* ——— Interactivity ——— */
  lampWrap.addEventListener("mousedown", () => { rubPointerDown = true; addRub(1); });
  lampWrap.addEventListener("touchstart", (e) => { e.preventDefault(); rubPointerDown = true; addRub(1); }, { passive: false });
  window.addEventListener("mouseup", () => { rubPointerDown = false; });
  window.addEventListener("touchend", () => { rubPointerDown = false; });
  lampWrap.addEventListener("mousemove", (e) => {
    if (!rubPointerDown || e.buttons !== 1) return;
    const now = Date.now();
    if (now - lastRubMove < 80) return;
    lastRubMove = now;
    addRub(1);
  });

  genieFigure.addEventListener("click", () => {
    if (!genieEntity.classList.contains("emerged")) return;
    const pokes = window.GENIE_I18N[lang].geniePoke;
    genieSpeech.textContent = pick(pokes);
    genieSpeech.hidden = false;
    genieEntity.classList.add("giggle");
    setTimeout(() => {
      genieSpeech.hidden = true;
      genieEntity.classList.remove("giggle");
    }, 2200);
  });

  document.addEventListener("mousemove", (e) => {
    if (!genieEntity.classList.contains("emerged") || isAnimating) return;
    const stage = document.querySelector(".lamp-stage");
    const rect = stage.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const dx = (e.clientX - cx) / rect.width;
    genieFigure.style.transform = `translateX(${dx * 18}px) rotate(${dx * 4}deg)`;
  });

  suggestions.querySelectorAll(".chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      const key = chip.getAttribute("data-q");
      questionEl.value = t(key);
      questionEl.focus();
      addRub(2);
    });
  });

  memoryToggle.addEventListener("click", () => {
    const open = memoryBody.hidden;
    memoryBody.hidden = !open;
    memoryToggle.setAttribute("aria-expanded", String(open));
    memoryToggle.classList.toggle("open", open);
  });

  clearMemoryBtn.addEventListener("click", () => {
    window.GenieMemory.clear();
    renderMemory();
    nameEl.value = "";
  });

  settingsBtn.addEventListener("click", () => {
    apiKeyInput.value = window.GenieAI.getApiKey();
    settingsModal.hidden = false;
    document.body.classList.add("modal-open");
  });

  settingsClose.addEventListener("click", () => {
    settingsModal.hidden = true;
    if (payModal.hidden) document.body.classList.remove("modal-open");
  });

  saveApiKeyBtn.addEventListener("click", () => {
    window.GenieAI.setApiKey(apiKeyInput.value);
    applyLanguage();
    settingsModal.hidden = true;
    document.body.classList.remove("modal-open");
    showToast(t("aiActive"));
  });

  removeApiKeyBtn.addEventListener("click", () => {
    window.GenieAI.setApiKey("");
    apiKeyInput.value = "";
    applyLanguage();
  });

  langEn.addEventListener("click", () => { lang = "en"; localStorage.setItem("genieLang", lang); applyLanguage(); });
  langEs.addEventListener("click", () => { lang = "es"; localStorage.setItem("genieLang", lang); applyLanguage(); });

  payPacks.forEach((pack) => {
    pack.addEventListener("click", () => {
      selectedPack = parseInt(pack.dataset.pack, 10);
      payPacks.forEach((p) => p.classList.toggle("selected", p === pack));
      updatePayButton();
    });
  });

  confirmPay.addEventListener("click", processPayment);
  modalClose.addEventListener("click", closePayModal);
  payModal.addEventListener("click", (e) => { if (e.target === payModal) closePayModal(); });
  settingsModal.addEventListener("click", (e) => { if (e.target === settingsModal) settingsClose.click(); });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    handleWish();
  });

  againBtn.addEventListener("click", () => {
    if (totalWishesAvailable(getState()) <= 0) {
      openPayModal();
      return;
    }
    answerPanel.hidden = true;
    resetEffects();
    resetRub();
    questionEl.focus();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (!payModal.hidden) closePayModal();
      if (!settingsModal.hidden) settingsClose.click();
    }
  });

  const mem = window.GenieMemory.get();
  if (mem.name) nameEl.value = mem.name;
  window.GenieMemory.touch(mem.name);
  applyLanguage();
})();
