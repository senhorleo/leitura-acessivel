/*
 * content/tts.js
 * ------------------------------------------------------------------
 * Leitura em voz alta (Text-to-Speech) com a Web Speech API
 * (window.speechSynthesis), que já vem no navegador e usa as vozes
 * instaladas no sistema operacional. Não precisa de internet nem de
 * servidor.
 *
 * Por que a fala roda aqui, dentro da página, e não no popup?
 * Porque o popup fecha assim que o usuário clica fora dele, e tudo o
 * que roda nele morre junto. A página continua aberta.
 *
 * Fluxo:
 *   popup  --(mensagem "tts")-->  este script  --> speechSynthesis
 *   este script --(mensagem "tts-estado")--> popup (atualiza botões)
 */
(() => {
  // Só a página principal fala; iframes ignoram (evita vozes duplicadas).
  if (window !== window.top) return;
  if (!("speechSynthesis" in window)) return;

  const { api } = LA;
  const synth = window.speechSynthesis;

  /* Estado da leitura atual. */
  let chunks = [];      // texto dividido em trechos
  let index = 0;        // trecho sendo lido agora
  let state = "parado"; // "parado" | "lendo" | "pausado"
  let session = 0;      // muda a cada nova leitura (ignora eventos antigos)

  /* ----------------------------------------------------------------
   * Vozes. A lista pode vir vazia no começo: alguns navegadores só a
   * preenchem depois do evento "voiceschanged".
   * ---------------------------------------------------------------- */
  function waitForVoices() {
    const voices = synth.getVoices();
    if (voices.length) return Promise.resolve(voices);
    return new Promise((resolve) => {
      const done = () => resolve(synth.getVoices());
      synth.addEventListener("voiceschanged", done, { once: true });
      setTimeout(done, 1500); // não esperar para sempre
    });
  }

  /* Escolhe a voz: a escolhida no popup; senão pt-BR; senão
   * qualquer português; senão a padrão do sistema (null). */
  function pickVoice(voices, preferredName) {
    const norm = (lang) => lang.replace("_", "-").toLowerCase();
    return (
      voices.find((v) => v.name === preferredName) ||
      voices.find((v) => norm(v.lang) === "pt-br") ||
      voices.find((v) => norm(v.lang).startsWith("pt")) ||
      null
    );
  }

  /* ----------------------------------------------------------------
   * Divide o texto em trechos curtos (frases de até ~200 caracteres).
   * Motivo: falas muito longas travam ou são cortadas em alguns
   * navegadores, e trechos curtos deixam a pausa/velocidade responder
   * mais rápido.
   * ---------------------------------------------------------------- */
  function splitText(text, max = 200) {
    const clean = text.replace(/\s+/g, " ").trim();
    const sentences = clean.match(/[^.!?…;:]+[.!?…;:]*\s*/g) || [];
    const out = [];
    for (let sentence of sentences) {
      sentence = sentence.trim();
      // Frase grande demais: quebra nas vírgulas ou espaços.
      while (sentence.length > max) {
        let cut = sentence.lastIndexOf(", ", max);
        if (cut < max / 2) cut = sentence.lastIndexOf(" ", max);
        if (cut <= 0) cut = max;
        out.push(sentence.slice(0, cut + 1).trim());
        sentence = sentence.slice(cut + 1).trim();
      }
      if (sentence) out.push(sentence);
    }
    return out;
  }

  /* Texto da página: tenta achar o conteúdo principal (<article>,
   * <main>) para não ler menus e rodapés; se não achar, lê o <body>. */
  function pageText() {
    const main =
      document.querySelector("article") ||
      document.querySelector("main, [role='main']") ||
      document.body;
    return main ? main.innerText : "";
  }

  function selectedText() {
    return String(window.getSelection() || "").trim();
  }

  /* Avisa o popup (se estiver aberto) sobre o estado atual. */
  function broadcast(extra = {}) {
    api.runtime
      .sendMessage({ type: "tts-estado", ...status(), ...extra })
      .catch(() => {}); // popup fechado: ninguém para ouvir, tudo bem
  }

  function status() {
    return { state, current: index + 1, total: chunks.length };
  }

  /* Fala o trecho "index" e, ao terminar, chama o próximo. */
  async function speakCurrent(mySession) {
    if (mySession !== session) return;
    if (index >= chunks.length) {
      state = "parado";
      broadcast();
      return;
    }

    const settings = LA.getCurrentSettings();
    const voices = await waitForVoices();
    const voice = pickVoice(voices, settings.ttsVoice);

    const utter = new SpeechSynthesisUtterance(chunks[index]);
    utter.lang = voice ? voice.lang : "pt-BR";
    if (voice) utter.voice = voice;
    // A velocidade é lida a cada trecho: mudar o slider vale a partir
    // da próxima frase, sem precisar recomeçar.
    utter.rate = settings.ttsRate;

    utter.onend = () => {
      if (mySession !== session) return;
      index += 1;
      broadcast();
      speakCurrent(mySession);
    };
    utter.onerror = (e) => {
      if (mySession !== session) return;
      // "interrupted"/"canceled" acontecem quando o usuário clica em Parar.
      if (e.error === "interrupted" || e.error === "canceled") return;
      state = "parado";
      broadcast({ error: e.error });
    };

    synth.speak(utter);
  }

  /* ------------------------ Comandos ------------------------------ */
  function start(text) {
    stop();
    chunks = splitText(text);
    if (!chunks.length) return { ok: false, reason: "sem-texto" };
    index = 0;
    state = "lendo";
    session += 1;
    speakCurrent(session);
    broadcast();
    return { ok: true };
  }

  function pause() {
    if (state !== "lendo") return;
    synth.pause();
    state = "pausado";
    broadcast();
  }

  function resume() {
    if (state !== "pausado") return;
    synth.resume();
    state = "lendo";
    broadcast();
  }

  function stop() {
    session += 1; // invalida os eventos da leitura anterior
    synth.cancel();
    chunks = [];
    index = 0;
    state = "parado";
    broadcast();
  }

  /* Recebe os comandos do popup. Usamos "sendResponse" + "return true"
   * porque é o jeito que funciona igual no Firefox e no Chrome. */
  api.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (!msg || msg.type !== "tts") return;
    let result = { ok: true };
    switch (msg.action) {
      case "ler-selecao": {
        const text = selectedText();
        result = text ? start(text) : { ok: false, reason: "sem-selecao" };
        break;
      }
      case "ler-pagina":
        result = start(pageText());
        break;
      case "pausar":   pause();  break;
      case "continuar": resume(); break;
      case "parar":    stop();   break;
      case "estado":   break;
    }
    // Responde com o resultado + estado atual (o popup usa para os botões).
    sendResponse({ ...result, ...status() });
    return true;
  });

  // Se a pessoa sair da página, para de falar.
  window.addEventListener("pagehide", () => synth.cancel());
})();
