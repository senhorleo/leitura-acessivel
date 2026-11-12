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
 *
 * Etapas de uma leitura:
 *   1. collectText: percorre a página e junta o texto visível, anotando
 *      de qual pedaço da página (nó de texto) veio cada caractere;
 *   2. splitChunks: divide esse texto em frases;
 *   3. speakCurrent: fala uma frase por vez e, enquanto fala, destaca
 *      essa frase na página (highlight) e rola a tela até ela.
 */
(() => {
  // Só a página principal fala; iframes ignoram (evita vozes duplicadas).
  if (window !== window.top) return;
  if (!("speechSynthesis" in window)) return;

  const { api } = LA;
  const synth = window.speechSynthesis;
  const HIGHLIGHT_NAME = "la-leitura"; // mesmo nome usado em estilos.css

  /* Estado da leitura atual. */
  let text = "";        // todo o texto que será lido
  let map = [];         // de onde veio cada pedaço do texto (ver collectText)
  let chunks = [];      // frases: [{ start, end }] = posições dentro de "text"
  let index = 0;        // frase sendo lida agora
  let state = "parado"; // "parado" | "lendo" | "pausado"
  let session = 0;      // muda a cada nova leitura (ignora eventos antigos)

  /* ================================================================
   * 1. Juntar o texto da página
   * ================================================================ */

  // Elementos que nunca têm texto para ler.
  const SKIP_TAGS = new Set([
    "SCRIPT", "STYLE", "NOSCRIPT", "TEMPLATE", "SVG", "CANVAS", "IFRAME",
    "VIDEO", "AUDIO", "OBJECT", "EMBED", "SELECT", "TEXTAREA", "INPUT",
  ]);
  // Ao ler a página inteira, pulamos menus, barras laterais e rodapés.
  const PAGE_CHROME =
    "nav, aside, footer, [role='navigation'], [role='banner'], " +
    "[role='contentinfo'], [role='complementary'], [role='search']";

  /* Percorre "root" e devolve:
   *   text: o texto visível, com "\n" separando parágrafos/blocos;
   *   map:  lista de { node, nodeStart, textStart, textEnd } dizendo que
   *         text[textStart..textEnd] veio do nó de texto "node", a
   *         partir da posição "nodeStart" dele. É o que permite depois
   *         achar a frase na página para destacá-la.
   * Se "range" for passado (texto selecionado), só entra o que estiver
   * dentro da seleção. */
  function collectText(root, range = null) {
    let out = "";
    const outMap = [];
    const wholePage = !range;

    const lineBreak = () => {
      if (out && !out.endsWith("\n")) out += "\n";
    };

    function addTextNode(node) {
      let from = 0;
      let to = node.data.length;
      if (range) {
        if (!range.intersectsNode(node)) return;
        if (node === range.startContainer) from = range.startOffset;
        if (node === range.endContainer) to = range.endOffset;
      }
      const piece = node.data.slice(from, to);
      if (!piece.trim()) {
        // Só espaços: guarda um espaço para não grudar duas palavras.
        if (piece && out && !/\s$/.test(out)) out += " ";
        return;
      }
      outMap.push({ node, nodeStart: from, textStart: out.length, textEnd: out.length + piece.length });
      out += piece;
    }

    function walk(node) {
      if (node.nodeType === Node.TEXT_NODE) return addTextNode(node);
      if (node.nodeType !== Node.ELEMENT_NODE) return;

      const tag = node.tagName.toUpperCase();
      if (tag === "BR") return lineBreak();
      if (SKIP_TAGS.has(tag)) return;
      if (node.getAttribute("aria-hidden") === "true") return;
      if (node.matches(LA.ICONS)) return; // ícone não é texto
      if (wholePage && node !== root && node.matches(PAGE_CHROME)) return;

      const style = getComputedStyle(node);
      if (style.display === "none" || style.visibility === "hidden") return;

      // Elementos "de bloco" (parágrafo, título, item de lista...) viram
      // quebras de linha, para a frase não emendar com a do bloco vizinho.
      const isBlock = !style.display.startsWith("inline") && style.display !== "contents";
      if (isBlock) lineBreak();
      for (const child of node.childNodes) walk(child);
      if (isBlock) lineBreak();
    }

    walk(root);
    return { text: out, map: outMap };
  }

  /* Página inteira: tenta achar o conteúdo principal (<article>,
   * <main>) para não ler o que está em volta; se não achar, usa o
   * <body> (já sem menus e rodapés, ver PAGE_CHROME). */
  function collectPage() {
    const candidates = [
      document.querySelector("main article, article"),
      document.querySelector("main, [role='main']"),
      document.body,
    ];
    for (const root of candidates) {
      if (!root) continue;
      const result = collectText(root);
      // Um <article> quase vazio (ex.: um cartão) não é o conteúdo principal.
      if (result.text.trim().length > 200 || root === document.body) return result;
    }
    return { text: "", map: [] };
  }

  /* Texto selecionado com o mouse (ou null se não houver seleção). */
  function collectSelection() {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.rangeCount) return null;
    const range = sel.getRangeAt(0);
    let root = range.commonAncestorContainer;
    if (root.nodeType !== Node.ELEMENT_NODE) root = root.parentElement;
    const result = collectText(root, range);
    if (!result.text.trim()) return null;
    // Tira a seleção azul para ela não cobrir o destaque amarelo.
    sel.removeAllRanges();
    return result;
  }

  /* ================================================================
   * 2. Dividir em frases
   * Motivos: falas muito longas travam ou são cortadas em alguns
   * navegadores; frases curtas deixam pausa e velocidade responderem
   * rápido; e é a frase que destacamos na tela.
   * Devolve posições { start, end } dentro do texto, sem alterá-lo.
   * ================================================================ */
  function splitChunks(str, max = 220) {
    const out = [];

    // Guarda o trecho [a, b), sem espaços nas pontas, se tiver alguma
    // letra ou número (ignora "•", "—" etc.).
    const push = (a, b) => {
      while (a < b && /\s/.test(str[a])) a++;
      while (b > a && /\s/.test(str[b - 1])) b--;
      if (b > a && /[\p{L}\p{N}]/u.test(str.slice(a, b))) out.push({ start: a, end: b });
    };

    // Frase longa demais: corta na última vírgula (ou espaço) antes do limite.
    const pushSentence = (a, b) => {
      while (b - a > max) {
        const piece = str.slice(a, a + max);
        let cut = Math.max(piece.lastIndexOf(", "), piece.lastIndexOf("; "), piece.lastIndexOf(": "));
        if (cut < max / 2) cut = piece.lastIndexOf(" ");
        if (cut <= 0) cut = max - 1;
        push(a, a + cut + 1);
        a += cut + 1;
      }
      push(a, b);
    };

    // Fim de frase: ponto, "!", "?" ou "…" seguidos de espaço (assim
    // "3.14" e "www.site.com" não são cortados), ou quebra de linha.
    const endOfSentence = /[.!?…]+["'”’)\]]*(?=\s|$)|\n+/g;
    let start = 0;
    let m;
    while ((m = endOfSentence.exec(str))) {
      const end = m[0].startsWith("\n") ? m.index : m.index + m[0].length;
      pushSentence(start, end);
      start = m.index + m[0].length;
    }
    pushSentence(start, str.length);
    return out;
  }

  /* ================================================================
   * 3. Destacar a frase na página
   * ================================================================ */

  /* Acha no "map" o registro que contém a posição "pos" do texto. */
  function findEntry(pos) {
    let lo = 0;
    let hi = map.length - 1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (pos < map[mid].textStart) hi = mid - 1;
      else if (pos >= map[mid].textEnd) lo = mid + 1;
      else return map[mid];
    }
    return null;
  }

  /* Converte uma frase { start, end } num Range (trecho da página). */
  function rangeFor(chunk) {
    const first = findEntry(chunk.start);
    const last = findEntry(chunk.end - 1);
    if (!first || !last || !first.node.isConnected || !last.node.isConnected) return null;
    const range = document.createRange();
    range.setStart(first.node, first.nodeStart + (chunk.start - first.textStart));
    range.setEnd(last.node, last.nodeStart + (chunk.end - last.textStart));
    return range;
  }

  function clearHighlight() {
    try {
      window.CSS?.highlights?.delete(HIGHLIGHT_NAME);
    } catch { /* navegador sem suporte: nada a limpar */ }
  }

  /* Pinta a frase atual e rola a página se ela estiver fora da tela.
   * Tudo dentro de try/catch: se o navegador não tiver a Highlight API
   * (Firefox antes da versão 140) ou a página tiver mudado, a leitura
   * continua normalmente, só sem o destaque. */
  function showChunk(chunk) {
    try {
      const range = rangeFor(chunk);
      if (!range) return clearHighlight();

      if (window.Highlight && window.CSS?.highlights) {
        window.CSS.highlights.set(HIGHLIGHT_NAME, new window.Highlight(range));
      }

      const box = range.getBoundingClientRect();
      const margin = 80;
      if (box.top < margin || box.bottom > window.innerHeight - margin) {
        const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        range.startContainer.parentElement?.scrollIntoView({
          block: "center",
          behavior: reduceMotion ? "auto" : "smooth",
        });
      }
    } catch { /* segue sem destaque */ }
  }

  /* ================================================================
   * Vozes. A lista pode vir vazia no começo: alguns navegadores só a
   * preenchem depois do evento "voiceschanged".
   * ================================================================ */
  let waitedForVoices = false;
  function waitForVoices() {
    const voices = synth.getVoices();
    // Só esperamos uma vez: se o sistema não tem voz nenhuma, não
    // adianta atrasar cada frase esperando de novo.
    if (voices.length || waitedForVoices) return Promise.resolve(voices);
    return new Promise((resolve) => {
      const done = () => {
        waitedForVoices = true;
        resolve(synth.getVoices());
      };
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

  /* ================================================================
   * Falar
   * ================================================================ */

  /* Avisa o popup (se estiver aberto) sobre o estado atual. */
  function broadcast(extra = {}) {
    api.runtime
      .sendMessage({ type: "tts-estado", ...status(), ...extra })
      .catch(() => {}); // popup fechado: ninguém para ouvir, tudo bem
  }

  function status() {
    return { state, current: Math.min(index + 1, chunks.length), total: chunks.length };
  }

  function finish() {
    state = "parado";
    clearHighlight();
    broadcast();
  }

  /* Fala a frase "index" e, ao terminar, chama a próxima. */
  async function speakCurrent(mySession) {
    if (mySession !== session) return;
    if (index >= chunks.length) return finish();

    const settings = LA.getCurrentSettings();
    const voices = await waitForVoices();
    if (mySession !== session) return; // o usuário parou enquanto esperávamos
    const voice = pickVoice(voices, settings.ttsVoice);

    const chunk = chunks[index];
    const phrase = text.slice(chunk.start, chunk.end).replace(/\s+/g, " ");
    const utter = new SpeechSynthesisUtterance(phrase);
    utter.lang = voice ? voice.lang : "pt-BR";
    if (voice) utter.voice = voice;
    // A velocidade é lida a cada frase: mudar o slider vale a partir
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
      finish();
      broadcast({ error: e.error });
    };

    showChunk(chunk);
    synth.speak(utter);
  }

  /* ------------------------ Comandos ------------------------------ */
  function start(collected) {
    stop();
    text = collected.text;
    map = collected.map;
    chunks = splitChunks(text);
    if (!chunks.length) return { ok: false };
    index = 0;
    state = "lendo";
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
    synth.resume(); // se estava pausado, "despausa" para a próxima leitura
    text = "";
    map = [];
    chunks = [];
    index = 0;
    state = "parado";
    clearHighlight();
    broadcast();
  }

  /* Recebe os comandos do popup. Usamos "sendResponse" + "return true"
   * porque é o jeito que funciona igual no Firefox e no Chrome. */
  api.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (!msg || msg.type !== "tts") return;
    let result = { ok: true };
    switch (msg.action) {
      case "ler-selecao": {
        const selected = collectSelection();
        result = selected ? start(selected) : { ok: false };
        break;
      }
      case "ler-pagina":
        result = start(collectPage());
        break;
      case "pausar":    pause();  break;
      case "continuar": resume(); break;
      case "parar":     stop();   break;
      case "estado":    break;
    }
    // Responde com o resultado + estado atual (o popup usa para os botões).
    sendResponse({ ...result, ...status() });
    return true;
  });

  // Se a pessoa sair da página, para de falar.
  window.addEventListener("pagehide", () => synth.cancel());
})();
