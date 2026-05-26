/* global window */
(function () {
  "use strict";

  const MEMORY_KEY = "genieLampMemory";
  const MAX_HISTORY = 20;

  function load() {
    try {
      const raw = localStorage.getItem(MEMORY_KEY);
      if (raw) return { ...defaultMemory(), ...JSON.parse(raw) };
    } catch (_) { /* ignore */ }
    return defaultMemory();
  }

  function defaultMemory() {
    return {
      name: "",
      visitCount: 0,
      firstVisit: null,
      history: [],
      topics: [],
      totalQuestions: 0,
    };
  }

  function save(mem) {
    localStorage.setItem(MEMORY_KEY, JSON.stringify(mem));
  }

  function extractTopics(question) {
    const words = question
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .split(/\s+/)
      .filter((w) => w.length > 4);
    const stop = new Set([
      "about", "would", "could", "should", "there", "their", "quiero",
      "como", "para", "esta", "este", "pregunta", "because", "really",
    ]);
    return [...new Set(words.filter((w) => !stop.has(w)))].slice(0, 5);
  }

  window.GenieMemory = {
    get() {
      return load();
    },

    touch(name) {
      const mem = load();
      mem.visitCount += 1;
      if (!mem.firstVisit) mem.firstVisit = new Date().toISOString();
      if (name && name.trim()) mem.name = name.trim();
      save(mem);
      return mem;
    },

    rememberExchange(question, answer, intent) {
      const mem = load();
      mem.totalQuestions += 1;
      mem.history.unshift({
        question: question.trim(),
        answer: answer.trim(),
        intent: intent || "wisdom",
        at: new Date().toISOString(),
      });
      if (mem.history.length > MAX_HISTORY) mem.history.length = MAX_HISTORY;

      const topics = extractTopics(question);
      topics.forEach((t) => {
        if (!mem.topics.includes(t)) mem.topics.push(t);
      });
      if (mem.topics.length > 12) mem.topics = mem.topics.slice(-12);
      save(mem);
      return mem;
    },

    getContextForAI(lang) {
      const mem = load();
      const recent = mem.history.slice(0, 5);
      const lines = recent.map(
        (h, i) =>
          `${i + 1}. Q: ${h.question}\n   A: ${h.answer.slice(0, 200)}${h.answer.length > 200 ? "…" : ""}`
      );
      return {
        name: mem.name || (lang === "es" ? "viajero" : "traveler"),
        visitCount: mem.visitCount,
        totalQuestions: mem.totalQuestions,
        topics: mem.topics.join(", ") || (lang === "es" ? "ninguno aún" : "none yet"),
        recentBlock: lines.length ? lines.join("\n") : (lang === "es" ? "Primera visita." : "First visit."),
        isReturning: mem.totalQuestions > 0,
      };
    },

    getRecallLine(lang, question) {
      const mem = load();
      if (!mem.history.length) return null;
      const prev = mem.history[0];
      const sameTopic =
        extractTopics(question).some((t) => extractTopics(prev.question).includes(t));
      if (!sameTopic && mem.history.length < 2) return null;

      if (lang === "es") {
        if (mem.name) {
          return `Recuerdo que la última vez, ${mem.name}, preguntaste sobre «${prev.question.slice(0, 60)}${prev.question.length > 60 ? "…" : ""}».`;
        }
        return `La última vez hablaste de «${prev.question.slice(0, 60)}…».`;
      }
      if (mem.name) {
        return `I remember last time, ${mem.name}, you asked about "${prev.question.slice(0, 60)}${prev.question.length > 60 ? "…" : ""}".`;
      }
      return `Last time you spoke of "${prev.question.slice(0, 60)}…".`;
    },

    clear() {
      localStorage.removeItem(MEMORY_KEY);
    },
  };
})();
