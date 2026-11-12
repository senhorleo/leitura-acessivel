/*
 * popup/popup.js
 * ------------------------------------------------------------------
 * Liga os controles do popup às configurações salvas.
 *
 * O popup NÃO mexe no visual da página diretamente: ele só salva no
 * storage. Cada página aberta (content/content.js) percebe a mudança
 * pelo evento "storage.onChanged" e se atualiza sozinha.
 *
 * A exceção é a leitura em voz alta: aí o popup manda uma mensagem
 * para a aba atual (content/tts.js) com o comando (ler, pausar...).
 */
(async () => {
  const { api } = LA;
  const $ = (id) => document.getElementById(id);

  let settings = await LA.loadSettings();

  /* ================================================================
   * Avisos no topo do popup
   * ================================================================ */
  function showWarning(text, { askPermission = false } = {}) {
    $("aviso-texto").textContent = text;
    $("btn-permitir").hidden = !askPermission;
    $("aviso").hidden = !text;
  }

  /* ================================================================
   * Aba atual do navegador: precisamos do site (para "desligar neste
   * site") e do id da aba (para mandar os comandos de voz).
   * No popup isso é lido uma vez. No painel fixado, a pessoa troca de
   * aba e de página com o painel aberto, então é relido a cada troca
   * (ver "Painel fixado", mais abaixo).
   * ================================================================ */
  let tab = null;
  let site = "";

  /* O Firefox deixa o usuário negar o acesso aos sites. Sem ele a
   * extensão não consegue agir, então explicamos e oferecemos o botão. */
  const ALL_SITES = { origins: ["<all_urls>"] };
  const hasPermission = await api.permissions.contains(ALL_SITES).catch(() => true);

  async function readCurrentTab() {
    [tab] = await api.tabs.query({ active: true, currentWindow: true });
    site = "";
    try {
      site = LA.siteKey(new URL(tab.url));
    } catch {
      /* tab.url indisponível */
    }

    if (!hasPermission) {
      showWarning(
        "A extensão ainda não tem permissão para mudar as páginas. " +
          "Clique no botão abaixo e depois recarregue a página (F5).",
        { askPermission: true }
      );
    } else if (!site) {
      showWarning(
        "O navegador não deixa extensões mudarem esta página (páginas internas " +
          "como about: ou a loja de extensões). Abra um site comum para testar."
      );
    } else {
      showWarning("");
    }
  }
  await readCurrentTab();

  $("btn-permitir").addEventListener("click", async () => {
    const granted = await api.permissions.request(ALL_SITES).catch(() => false);
    if (granted) showWarning("Permissão concedida. Recarregue a página (F5).");
  });

  /* ================================================================
   * Salvar com "debounce": enquanto o slider é arrastado, esperamos
   * 60 ms sem mudanças antes de gravar, para não salvar dezenas de
   * vezes por segundo.
   * ================================================================ */
  let pending = {};
  let timer = null;
  let lastSave = 0;
  function save(partial) {
    lastSave = Date.now();
    Object.assign(settings, partial);
    Object.assign(pending, partial);
    clearTimeout(timer);
    timer = setTimeout(flush, 60);
  }
  function flush() {
    clearTimeout(timer);
    if (Object.keys(pending).length) LA.saveSettings(pending);
    pending = {};
  }
  // Se o popup fechar no meio do intervalo, grava o que faltou.
  window.addEventListener("pagehide", flush);

  /* ================================================================
   * Abas do popup (Texto / Cores / Voz / Mais)
   * Padrão "tabs" da WAI-ARIA: clique ou setas ← → trocam de aba; só a
   * aba ativa entra na ordem do Tab. A última aba usada fica lembrada.
   * ================================================================ */
  const tabs = [...document.querySelectorAll('[role="tab"]')];

  function selectTab(selected, { focus = false } = {}) {
    for (const t of tabs) {
      const on = t === selected;
      t.setAttribute("aria-selected", String(on));
      t.tabIndex = on ? 0 : -1;
      $(t.getAttribute("aria-controls")).hidden = !on;
    }
    if (focus) selected.focus();
    try {
      localStorage.setItem("aba", selected.id);
    } catch { /* sem localStorage: só não lembra a aba */ }
  }

  tabs.forEach((t, i) => {
    t.addEventListener("click", () => selectTab(t));
    t.addEventListener("keydown", (e) => {
      const step = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
      if (!step) return;
      e.preventDefault();
      selectTab(tabs[(i + step + tabs.length) % tabs.length], { focus: true });
    });
  });

  try {
    const last = $(localStorage.getItem("aba") || "");
    if (tabs.includes(last)) selectTab(last);
  } catch { /* começa na primeira aba */ }

  /* ================================================================
   * Geral e por site (item 5)
   * ================================================================ */
  const btnGeral = $("btn-geral");
  const btnSite = $("btn-site");

  btnGeral.addEventListener("click", () => {
    save({ enabled: !settings.enabled });
    render();
  });

  btnSite.addEventListener("click", () => {
    const list = new Set(settings.disabledSites);
    if (list.has(site)) list.delete(site);
    else list.add(site);
    save({ disabledSites: [...list] });
    render();
  });

  function renderGeral() {
    btnGeral.setAttribute("aria-pressed", String(settings.enabled));
    btnGeral.textContent = settings.enabled ? "Ajustes: LIGADOS" : "Ajustes: DESLIGADOS";

    btnSite.hidden = !site;
    $("site-atual").hidden = !site;
    const off = LA.isSiteDisabled(settings, site);
    btnSite.setAttribute("aria-pressed", String(off));
    btnSite.textContent = off ? "Religar neste site" : "Desligar neste site";
    $("site-atual").textContent = off
      ? `Site atual: ${site} (ajustes desligados aqui)`
      : `Site atual: ${site}`;
  }

  /* ================================================================
   * Fonte (item 1)
   * ================================================================ */
  const btnFonte = $("btn-fonte");

  btnFonte.addEventListener("click", () => {
    save({ useFont: !settings.useFont });
    render();
  });

  function renderFonte() {
    btnFonte.setAttribute("aria-pressed", String(settings.useFont));
    btnFonte.textContent = settings.useFont
      ? "OpenDyslexic: LIGADA"
      : "OpenDyslexic: DESLIGADA";
  }

  /* ================================================================
   * Sliders (item 2 e velocidade da voz)
   * Cada entrada: id do <input> = nome da configuração, e uma função
   * que transforma o número em texto legível.
   * ================================================================ */
  const num = (n, digits = 1) => n.toFixed(digits).replace(".", ",");
  const SLIDERS = {
    fontSize:      (v) => `${v}%`,
    lineHeight:    (v) => num(v),
    letterSpacing: (v) => (v === 0 ? "original" : `+${num(v, 2)}`),
    wordSpacing:   (v) => (v === 0 ? "original" : `+${num(v, 2)}`),
    ttsRate:       (v) => `${num(v)}×`,
  };

  for (const [key, format] of Object.entries(SLIDERS)) {
    const input = $(key);
    input.addEventListener("input", () => {
      const value = Number(input.value);
      $(`${key}-valor`).textContent = format(value);
      save({ [key]: value });
    });
  }

  function renderSliders() {
    for (const [key, format] of Object.entries(SLIDERS)) {
      $(key).value = settings[key];
      $(`${key}-valor`).textContent = format(settings[key]);
    }
  }

  $("btn-wcag").addEventListener("click", () => {
    save({ ...LA.WCAG_SPACING });
    render();
  });

  /* ================================================================
   * Cores (item 3)
   * Gera um botão para cada esquema, pintado com as próprias cores,
   * mais "Sem mudança" e "Personalizado".
   * ================================================================ */
  const grade = $("cores");
  const opcoes = [
    { id: "nenhum", label: "Sem mudança" },
    ...Object.entries(LA.COLOR_SCHEMES).map(([id, c]) => ({ id, ...c })),
    { id: "personalizado", label: "Personalizado" },
  ];

  for (const op of opcoes) {
    const b = document.createElement("button");
    b.type = "button";
    b.dataset.scheme = op.id;
    b.textContent = op.label;
    if (op.bg) {
      b.style.background = op.bg;
      b.style.color = op.fg;
    }
    b.addEventListener("click", () => {
      save({ colorScheme: op.id });
      render();
    });
    grade.append(b);
  }

  for (const key of ["customBg", "customFg"]) {
    $(key).addEventListener("input", (e) => save({ [key]: e.target.value }));
  }

  function renderCores() {
    for (const b of grade.children) {
      b.setAttribute("aria-pressed", String(b.dataset.scheme === settings.colorScheme));
    }
    $("cores-personalizadas").hidden = settings.colorScheme !== "personalizado";
    $("customBg").value = settings.customBg;
    $("customFg").value = settings.customFg;
  }

  /* ================================================================
   * Apoios de leitura (aba "Mais")
   * Caixas de seleção: o id de cada uma é o nome da configuração.
   * ================================================================ */
  const APOIOS = ["readingRuler", "alignLeft", "shortLines", "plainText"];

  for (const key of APOIOS) {
    $(key).addEventListener("change", (e) => save({ [key]: e.target.checked }));
  }

  function renderApoios() {
    for (const key of APOIOS) $(key).checked = settings[key];
  }

  /* ================================================================
   * Leitura em voz alta (item 4)
   * ================================================================ */
  const btnPausar = $("btn-pausar");
  const btnParar = $("btn-parar");
  const vozEstado = $("voz-estado");
  let ttsState = "parado";

  /* Manda um comando para a página principal da aba (frameId 0). */
  async function ttsCommand(action) {
    if (!tab || !site || !hasPermission) return null;
    try {
      return await api.tabs.sendMessage(tab.id, { type: "tts", action }, { frameId: 0 });
    } catch {
      // Acontece em abas abertas ANTES de instalar a extensão.
      showWarning("Recarregue a página (F5) para a extensão funcionar nesta aba.");
      return null;
    }
  }

  function renderVoz(st) {
    if (!st) return;
    ttsState = st.state;
    const lendo = st.state === "lendo";
    const pausado = st.state === "pausado";
    btnPausar.disabled = !(lendo || pausado);
    btnParar.disabled = !(lendo || pausado);
    btnPausar.toggleAttribute("data-pausado", pausado);
    $("btn-pausar-texto").textContent = pausado ? "Continuar" : "Pausar";

    if (st.error) vozEstado.textContent = `Erro na fala: ${st.error}`;
    else if (lendo) vozEstado.textContent = `Lendo… frase ${st.current} de ${st.total}`;
    else if (pausado) vozEstado.textContent = `Pausado na frase ${st.current} de ${st.total}`;
    else vozEstado.textContent = "Parado.";
  }

  $("btn-ler-selecao").addEventListener("click", async () => {
    const resp = await ttsCommand("ler-selecao");
    if (resp && !resp.ok) {
      vozEstado.textContent = "Selecione um trecho na página primeiro (arraste o mouse sobre o texto).";
      return;
    }
    renderVoz(resp);
  });

  $("btn-ler-pagina").addEventListener("click", async () => {
    const resp = await ttsCommand("ler-pagina");
    if (resp && !resp.ok) {
      vozEstado.textContent = "Não encontrei texto nesta página.";
      return;
    }
    renderVoz(resp);
  });

  btnPausar.addEventListener("click", async () => {
    renderVoz(await ttsCommand(ttsState === "pausado" ? "continuar" : "pausar"));
  });

  btnParar.addEventListener("click", async () => {
    renderVoz(await ttsCommand("parar"));
  });

  // A página avisa quando muda de frase ou termina.
  api.runtime.onMessage.addListener((msg, sender) => {
    if (msg?.type === "tts-estado" && sender.tab?.id === tab?.id) renderVoz(msg);
  });

  /* Lista de vozes em português instaladas no sistema. */
  function loadVoices() {
    const select = $("ttsVoice");
    const voices = speechSynthesis
      .getVoices()
      .filter((v) => v.lang.toLowerCase().startsWith("pt"));

    select.length = 1; // mantém só "Automática"
    for (const v of voices) {
      select.add(new Option(`${v.name} (${v.lang})`, v.name));
    }
    select.value = voices.some((v) => v.name === settings.ttsVoice) ? settings.ttsVoice : "";

    const aviso = $("voz-aviso");
    aviso.hidden = voices.length > 0;
    aviso.textContent =
      "Nenhuma voz em português instalada no sistema. Veja o README.";
  }

  $("ttsVoice").addEventListener("change", (e) => save({ ttsVoice: e.target.value }));
  if ("speechSynthesis" in window) {
    speechSynthesis.addEventListener("voiceschanged", loadVoices);
    loadVoices();
  }

  /* ================================================================
   * Restaurar padrão (item 5)
   * ================================================================ */
  $("btn-restaurar").addEventListener("click", async () => {
    clearTimeout(timer);
    pending = {};
    await LA.resetSettings();
    settings = await LA.loadSettings();
    render();
    loadVoices();
  });

  /* ================================================================
   * Painel fixado (o "alfinete")
   * O popup comum fecha sempre que a pessoa clica fora dele; é uma
   * regra do navegador. Para deixar os controles sempre à mão, o
   * alfinete abre esta MESMA página na barra lateral do navegador:
   *   - Firefox: "sidebar_action" (API sidebarAction);
   *   - Chrome/Edge: "side_panel" (API sidePanel).
   * O manifest abre a página com "?painel=1" no endereço, e é assim
   * que sabemos em qual dos dois modos estamos.
   * ================================================================ */
  const isPanel = new URLSearchParams(location.search).has("painel");
  const btnFixar = $("btn-fixar");
  document.documentElement.classList.toggle("painel", isPanel);

  btnFixar.hidden = !(api.sidebarAction || api.sidePanel);
  $("btn-fixar-texto").textContent = isPanel ? "Desafixar" : "Fixar";
  btnFixar.title = isPanel
    ? "Fechar o painel lateral"
    : "Manter este painel aberto ao lado da página";

  btnFixar.addEventListener("click", () => {
    if (isPanel) {
      // Desafixar = fechar a barra lateral.
      if (api.sidebarAction) api.sidebarAction.close();
      else window.close();
      return;
    }
    // Importante: abrir SEM "await" antes. O navegador só deixa abrir a
    // barra lateral como resposta direta a um clique do usuário.
    const opening = api.sidebarAction
      ? api.sidebarAction.open()
      : api.sidePanel.open({ windowId: tab.windowId });
    Promise.resolve(opening)
      .then(() => window.close()) // fecha o popup; o painel assume
      .catch(() => showWarning("Não consegui abrir o painel lateral neste navegador."));
  });

  if (isPanel) {
    // A pessoa trocou de aba ou a página mudou: relê o site atual e o
    // estado da leitura em voz alta.
    const onTabChange = async () => {
      await readCurrentTab();
      renderGeral();
      renderVoz((await ttsCommand("estado")) || { state: "parado" });
    };
    api.tabs.onActivated.addListener(onTabChange);
    api.tabs.onUpdated.addListener((tabId, change) => {
      if (tabId === tab?.id && (change.url || change.status === "complete")) onTabChange();
    });
  }

  /* Se as configurações mudarem por outro caminho (ex.: o popup aberto
   * junto com o painel), atualiza os controles. Ignoramos o "eco" das
   * nossas próprias gravações para o slider não pular durante o arraste. */
  api.storage.onChanged.addListener(async (_changes, area) => {
    if (area !== "local" || Date.now() - lastSave < 400) return;
    settings = { ...(await LA.loadSettings()), ...pending };
    render();
  });

  /* ================================================================ */
  function render() {
    renderGeral();
    renderFonte();
    renderSliders();
    renderCores();
    renderApoios();
  }

  render();
  renderVoz(await ttsCommand("estado"));
})();
