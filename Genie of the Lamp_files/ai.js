/* global window */
(function () {
  "use strict";

  const API_KEY_STORAGE = "genieOpenAIKey";

  window.GenieAI = {
    getApiKey() {
      return localStorage.getItem(API_KEY_STORAGE) || "";
    },

    setApiKey(key) {
      if (key && key.trim()) {
        localStorage.setItem(API_KEY_STORAGE, key.trim());
      } else {
        localStorage.removeItem(API_KEY_STORAGE);
      }
    },

    hasApiKey() {
      return !!this.getApiKey();
    },

    async ask(question, lang, memoryContext) {
      const apiKey = this.getApiKey();
      if (!apiKey) return null;

      const langName = lang === "es" ? "Spanish" : "English";
      const system = `You are Zuzu, an adorable, warm, cute genie who lives in a golden lamp. You speak ONLY in ${langName}.

PERSONALITY: Friendly, playful, mystical but specific. Use 1-2 cute expressions (✨, little star, puff of smoke). Never generic — always reference EXACT details from the user's question.

MEMORY ABOUT THIS USER:
- Name: ${memoryContext.name}
- Visits: ${memoryContext.visitCount}
- Questions asked before: ${memoryContext.totalQuestions}
- Topics they care about: ${memoryContext.topics}
- Recent conversation:
${memoryContext.recentBlock}

RULES:
- Answer in 4-6 sentences maximum.
- Mention their name if you know it.
- If they return, briefly acknowledge continuity (e.g. "you asked about X before, now Y...").
- Give concrete, actionable advice tied to their exact situation — not vague proverbs.
- Do not mention OpenAI, APIs, or being an AI.
- End with one short mystical whisper sentence in italics tone (plain text, no markdown).`;

      const userMsg = `Their new question: "${question}"`;

      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: system },
            { role: "user", content: userMsg },
          ],
          max_tokens: 380,
          temperature: 0.85,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error?.message || `API error ${res.status}`);
      }

      const data = await res.json();
      const text = data.choices?.[0]?.message?.content?.trim();
      if (!text) throw new Error("Empty response");
      return text;
    },

    buildSmartFallback(question, name, lang, memoryContext, intent) {
      const dict = window.GENIE_I18N[lang];
      const greeting = name
        ? dict.greetingNamed.replace("{name}", name)
        : dict.greetingDefault;
      const q = question.trim();
      const recall = window.GenieMemory.getRecallLine(lang, q);
      const topicHint =
        memoryContext.topics && memoryContext.topics !== (lang === "es" ? "ninguno aún" : "none yet")
          ? (lang === "es"
              ? ` Veo que te importan temas como ${memoryContext.topics}.`
              : ` I notice you often explore ${memoryContext.topics}.`)
          : "";

      const specific = lang === "es"
        ? {
            decision: `${greeting}sobre «${q}»: no busco darte un sí rotundo. Imagina que ya elegiste — ¿qué sensación te deja en el pecho? Eso es tu brújula. Si la duda vuelve en 48 horas, espera; si la claridad crece, actúa este mismo week.`,
            love: `${greeting}tu pregunta «${q}» merece honestidad dulce. Quien te hace dudar de tu valor no es destino — es lección. Hoy escribe tres cosas que mereces sin pedir permiso. El amor correcto las celebrará.`,
            career: `${greeting}en «${q}» hay ambición — me encanta. Elige un paso concreto para los próximos 7 días: un mensaje, un currículum, una hora de estudio. La lámpara no regala éxito; enciende tu disciplina.`,
            future: `${greeting}preguntas «${q}» mirando lejos. El futuro se construye con un hábito pequeño hoy. Nombra uno que pospones y hazlo antes de dormir — el genio apuesta por tu acción, no por la suerte.`,
            feelings: `${greeting}siento la carga en «${q}». Respira 4 segundos, aguanta 4, suelta 6 — tres veces. Luego habla con una persona de confianza; incluso los genios sabemos que nadie sana solo del todo.`,
            self: `${greeting}«${q}» es espejo, no sentencia. Eres versión en beta, no producto terminado. Cambia un micro-hábito esta semana y observa quién aparece — ese es el tú real asomando.`,
            health: `${greeting}en «${q}» cuídate como tesoro. Sueño, agua, movimiento suave y ayuda profesional si el dolor persiste — magia y medicina son aliadas.`,
            wisdom: `${greeting}«${q}» pide más escucha que prisa. Si tu mejor amigo/a preguntara esto, ¿qué le dirías con cariño? Haz exactamente eso contigo — con el doble de paciencia.`,
          }
        : {
            decision: `${greeting}about "${q}": I won't hand you a flat yes. Picture you've already chosen — what stays in your chest, heavy or light? That's your compass. If doubt returns in 48 hours, wait; if clarity grows, act this week.`,
            love: `${greeting}your question "${q}" deserves gentle honesty. Whoever makes you negotiate your worth isn't fate — it's a lesson. List three things you deserve without asking permission; the right love will celebrate them.`,
            career: `${greeting}in "${q}" I smell ambition — good. Pick one concrete step for the next 7 days: one message, one résumé send, one study hour. The lamp doesn't gift success; it lights your discipline.`,
            future: `${greeting}you ask "${q}" while staring far ahead. Tomorrow is built from one small habit today. Name one you've postponed and do it before sleep — I bet on your action, not luck.`,
            feelings: `${greeting}I feel the weight in "${q}". Breathe in 4, hold 4, out 6 — three rounds. Then tell one trusted person; even genies know healing isn't solo work.`,
            self: `${greeting}"${q}" is a mirror, not a verdict. You're a beta version, not a finished product. Change one micro-habit this week and watch who shows up — that's the real you peeking through.`,
            health: `${greeting}for "${q}", treat yourself as treasure. Sleep, water, gentle movement, and professional help if pain stays — magic and medicine are allies.`,
            wisdom: `${greeting}"${q}" needs more listening than rushing. If your best friend asked this, what would you tell them with love? Do exactly that for yourself — with double patience.`,
          };

      let body = specific[intent] || specific.wisdom;
      if (recall) body = `${recall} ${body}`;
      if (topicHint) body += topicHint;
      if (memoryContext.isReturning && memoryContext.totalQuestions > 2) {
        body += lang === "es"
          ? " Me alegra que vuelvas a la lámpara ✨"
          : " I'm glad you returned to the lamp ✨";
      }
      return `${pick(dict.openers)} ${body}`;
    },
  };

  function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }
})();
