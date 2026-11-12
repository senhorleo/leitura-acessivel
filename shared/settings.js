/*
 * shared/settings.js
 * ------------------------------------------------------------------
 * Código compartilhado entre o content script (que roda dentro das
 * páginas) e o popup (a janelinha que abre ao clicar no ícone).
 *
 * Aqui ficam:
 *   - o "api": um apelido para a API de extensões que funciona tanto
 *     no Firefox (browser.*) quanto no Chrome (chrome.*);
 *   - DEFAULTS: os valores padrão de todas as configurações;
 *   - funções para ler e salvar as configurações no storage.
 *
 * Tudo fica dentro do objeto global "LA" (de Leitura Acessível) para
 * não misturar com as variáveis da página.
 */

// eslint-disable-next-line no-var
var LA = (globalThis.LA = globalThis.LA || {});

/* Firefox expõe "browser" (com Promises); o Chrome expõe "chrome"
 * (que no Manifest V3 também aceita Promises). Usamos o que existir. */
LA.api = globalThis.browser ?? globalThis.chrome;

/* Valores padrão. Também são usados pelo botão "Restaurar padrão". */
LA.DEFAULTS = Object.freeze({
  enabled: true,     // chave geral: liga/desliga todos os ajustes
  useFont: true,     // usar a fonte OpenDyslexic

  // Tamanho e espaçamentos (item 2)
  fontSize: 100,      // % do tamanho original do texto (100 = sem mudança)
  lineHeight: 1.5,    // altura da linha, em múltiplos do tamanho da fonte
  letterSpacing: 0,   // espaço extra entre letras, em "em" (0 = original do site)
  wordSpacing: 0,     // espaço extra entre palavras, em "em" (0 = original do site)

  // Cores (item 3)
  colorScheme: "nenhum", // "nenhum" | "creme" | "bege" | "azul" | "escuro" | "personalizado"
  customBg: "#fdf6e3",
  customFg: "#222222",

  // Leitura em voz alta (item 4)
  ttsRate: 1,         // velocidade da fala (1 = normal)
  ttsVoice: "",       // nome da voz escolhida ("" = escolher pt-BR automaticamente)

  disabledSites: [], // lista de domínios onde a extensão fica desligada
});

/* Valores sugeridos pela WCAG 2.1 (critério 1.4.12 – Espaçamento de
 * texto). Usados pelo botão "Espaçamento recomendado". */
LA.WCAG_SPACING = Object.freeze({
  lineHeight: 1.5,
  letterSpacing: 0.12,
  wordSpacing: 0.16,
});

/* Esquemas de cores prontos. "link" é a cor dos links, escolhida para
 * manter bom contraste com o fundo. */
LA.COLOR_SCHEMES = Object.freeze({
  creme:  { label: "Creme",        bg: "#fdf6e3", fg: "#222222", link: "#1a5fb4" },
  bege:   { label: "Bege",         bg: "#f3e4c4", fg: "#2b2b2b", link: "#0b4f9c" },
  azul:   { label: "Azul claro",   bg: "#dcebf7", fg: "#1b1b1b", link: "#0b4f9c" },
  escuro: { label: "Cinza escuro", bg: "#2b2b2b", fg: "#f0ead6", link: "#9cc3ff" },
});

/* Devolve { bg, fg, link } para as configurações atuais, ou null se o
 * usuário não quer mudar as cores. */
LA.resolveColors = function (s) {
  if (s.colorScheme === "personalizado") {
    return { bg: s.customBg, fg: s.customFg, link: s.customFg };
  }
  return LA.COLOR_SCHEMES[s.colorScheme] ?? null;
};

/* Lê as configurações salvas, completando com os padrões o que faltar. */
LA.loadSettings = async function () {
  const saved = await LA.api.storage.local.get(Object.keys(LA.DEFAULTS));
  return { ...LA.DEFAULTS, ...saved };
};

/* Salva só os campos alterados, ex.: LA.saveSettings({ useFont: false }).
 * Ao salvar, o navegador dispara "storage.onChanged" em todas as abas,
 * e é assim que as páginas abertas se atualizam em tempo real. */
LA.saveSettings = function (partial) {
  return LA.api.storage.local.set(partial);
};

/* Volta tudo ao padrão, mas mantém a lista de sites desativados. */
LA.resetSettings = async function () {
  const { disabledSites, ...rest } = LA.DEFAULTS;
  return LA.api.storage.local.set(structuredClone(rest));
};

/* Nome usado para identificar um site na lista de desativados: o
 * domínio (ex.: "www.ufabc.edu.br") ou, para arquivos abertos do
 * computador (file://), o texto fixo "arquivos locais". Recebe um
 * objeto URL ou o "location" da página. */
LA.siteKey = function (url) {
  if (url.protocol === "file:") return "arquivos locais";
  if (url.protocol === "http:" || url.protocol === "https:") return url.hostname;
  return "";
};

/* Seletor CSS dos elementos que usam fontes de ícones. A leitura em
 * voz alta pula esses elementos (senão leria "menu", "search"...).
 * É a mesma lista de content/estilos.css. */
LA.ICONS = [
  ".material-icons", '[class*="material-icons"]', '[class*="material-symbols"]',
  ".fa", ".fas", ".far", ".fab", ".fal", ".fad", '[class^="fa-"]', '[class*=" fa-"]',
  '[class*="glyphicon"]', '[class^="bi-"]', '[class*=" bi-"]',
  '[class*="icon" i]', "[data-icon]",
].join(", ");

/* Verifica se um site está na lista de desativados. */
LA.isSiteDisabled = function (settings, site) {
  return Boolean(site) && settings.disabledSites.includes(site);
};
