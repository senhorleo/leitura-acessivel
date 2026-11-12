/*
 * content/content.js
 * ------------------------------------------------------------------
 * Content script: o navegador injeta este arquivo em TODAS as páginas
 * (e em todos os iframes, por causa do "all_frames": true no manifest).
 *
 * Como funciona, em 3 passos:
 *   1. Lê as configurações salvas (shared/settings.js).
 *   2. Monta um texto CSS com os ajustes e coloca numa tag <style>
 *      dentro da página.
 *   3. Fica escutando "storage.onChanged": quando o usuário mexe no
 *      popup, o CSS é remontado na hora, sem recarregar a página.
 */
(() => {
  const { api } = LA;
  const STYLE_ID = "leitura-acessivel-estilo";

  /* ----------------------------------------------------------------
   * Elementos que NÃO devem receber a OpenDyslexic.
   * Fontes de ícones (Material Icons, Font Awesome...) desenham cada
   * ícone como uma "letra" especial. Se trocarmos a fonte, o ícone
   * vira um texto sem sentido (ex.: "menu", "search"). Também
   * mantemos código-fonte em fonte monoespaçada e fórmulas matemáticas.
   * ---------------------------------------------------------------- */
  const ICONS = [
    // Material Icons / Material Symbols (Google)
    ".material-icons", '[class*="material-icons"]', '[class*="material-symbols"]',
    // Font Awesome ("fa", "fas", "fa-solid", "fa-github"...)
    ".fa", '[class^="fa-"]', '[class*=" fa-"]', ".fas", ".far", ".fab", ".fal", ".fad",
    // Bootstrap Glyphicons, Bootstrap Icons, Ionicons, Remix, Codicons etc.
    '[class*="glyphicon"]', '[class^="bi-"]', '[class*=" bi-"]',
    '[class*="icon" i]', '[data-icon]',
  ].join(", ");

  const EXCLUDED = [
    ICONS,
    // Código e fórmulas (MathJax, KaTeX, MathML)
    "code", "pre", "kbd", "samp", "math",
    "mjx-container", "mjx-container *", ".MathJax", ".MathJax *", ".katex", ".katex *",
  ].join(", ");

  /* ----------------------------------------------------------------
   * @font-face: diz ao navegador onde estão os arquivos da fonte.
   * runtime.getURL transforma "fonts/x.woff2" num endereço do tipo
   * moz-extension://<id>/fonts/x.woff2 (ou chrome-extension://...).
   * ---------------------------------------------------------------- */
  function fontFaceCss() {
    const variants = [
      ["OpenDyslexic-Regular", "normal", "normal"],
      ["OpenDyslexic-Bold", "bold", "normal"],
      ["OpenDyslexic-Italic", "normal", "italic"],
      ["OpenDyslexic-BoldItalic", "bold", "italic"],
    ];
    return variants
      .map(([file, weight, style]) => `
        @font-face {
          font-family: "OpenDyslexic LA";
          src: url("${api.runtime.getURL(`fonts/${file}.woff2`)}") format("woff2");
          font-weight: ${weight};
          font-style: ${style};
          font-display: swap;
        }`)
      .join("\n");
  }

  /* ----------------------------------------------------------------
   * Monta todo o CSS a partir das configurações.
   *
   * Truque importante: as regras ficam dentro de "@layer". Pela regra
   * de cascata do CSS, entre declarações "!important", a camada
   * (layer) declarada PRIMEIRO vence as regras normais do site, mesmo
   * que o site use seletores mais específicos. Como este script roda
   * em "document_start", nossa <style> é a primeira da página.
   * ---------------------------------------------------------------- */
  function buildCss(s) {
    const rules = [];

    /* --- Item 1: fonte ------------------------------------------- */
    if (s.useFont) {
      rules.push(`
        :not(${EXCLUDED}) {
          font-family: "OpenDyslexic LA", sans-serif !important;
        }`);
    }

    /* --- Item 2: espaçamentos ------------------------------------
     * Aplicados em todos os elementos (menos ícones), porque muitos
     * sites definem esses valores elemento por elemento. Valores 0
     * significam "deixar como o site fez", então nem geramos a regra. */
    const spacing = [`line-height: ${s.lineHeight} !important;`];
    if (s.letterSpacing > 0) spacing.push(`letter-spacing: ${s.letterSpacing}em !important;`);
    if (s.wordSpacing > 0) spacing.push(`word-spacing: ${s.wordSpacing}em !important;`);
    rules.push(`
      body :not(${EXCLUDED}) {
        ${spacing.join("\n        ")}
      }
      /* Ícones herdariam o espaçamento do elemento pai, e espaçamento
       * entre letras desliga as "ligaduras" que o Material Icons usa
       * para transformar a palavra "menu" no desenho do ícone. */
      :is(${ICONS}) {
        letter-spacing: normal !important;
        word-spacing: normal !important;
      }`);

    /* --- Item 2: tamanho do texto --------------------------------
     * Usamos a propriedade "zoom" nos blocos de texto mais externos
     * (parágrafos, itens de lista, títulos, células...). O ":not(... *)"
     * evita aplicar duas vezes num bloco que está dentro de outro (ex.:
     * um <p> dentro de um <li>), o que multiplicaria o aumento.
     * Diferente do Ctrl + "+", imagens e menus não são ampliados. */
    if (s.fontSize !== 100) {
      const blocks = `p, li, dt, dd, blockquote, figcaption, td, th, caption,
        label, summary, legend, h1, h2, h3, h4, h5, h6, div:not(:has(*))`;
      rules.push(`
        :is(${blocks}):not(:is(${blocks}) *) {
          zoom: ${s.fontSize / 100} !important;
        }`);
    }

    /* --- Item 3: cores -------------------------------------------
     * Pintamos o fundo e o texto de todos os elementos, menos mídias
     * (imagens, vídeos, gráficos), para não esconder conteúdo visual. */
    const colors = LA.resolveColors(s);
    if (colors) {
      rules.push(`
        html, body,
        body *:not(img, picture, video, canvas, svg, svg *, iframe, embed, object) {
          background-color: ${colors.bg} !important;
          color: ${colors.fg} !important;
          border-color: color-mix(in srgb, ${colors.fg} 35%, transparent) !important;
        }
        /* ":root" aumenta a especificidade para vencer a regra acima. */
        :root a, :root a * {
          color: ${colors.link} !important;
        }
        :root a {
          text-decoration: underline !important;
        }`);
    }

    return `${s.useFont ? fontFaceCss() : ""}\n@layer leitura-acessivel {\n${rules.join("\n")}\n}`;
  }

  /* Cria (uma vez) e devolve a tag <style> da extensão. */
  function getStyleElement() {
    let el = document.getElementById(STYLE_ID);
    if (!el) {
      el = document.createElement("style");
      el.id = STYLE_ID;
      // Em document_start o <head> ainda pode não existir; por isso
      // colocamos direto no <html> (document.documentElement).
      (document.head || document.documentElement).prepend(el);
    }
    return el;
  }

  /* Descobre o domínio "principal". Dentro de um iframe tentamos usar
   * o domínio da página de cima; se o navegador não deixar (iframe de
   * outro site), usamos o endereço de quem abriu o iframe (referrer). */
  function topHostname() {
    try {
      return window.top.location.hostname;
    } catch {
      try {
        return new URL(document.referrer).hostname;
      } catch {
        return location.hostname;
      }
    }
  }

  /* Aplica (ou remove) os ajustes conforme as configurações. */
  function apply(settings) {
    const active = settings.enabled && !LA.isSiteDisabled(settings, topHostname());
    const css = active ? buildCss(settings) : "";
    if (css) {
      getStyleElement().textContent = css;
    } else {
      document.getElementById(STYLE_ID)?.remove();
    }
  }

  /* Guarda a última versão das configurações para o leitor de voz. */
  let current = { ...LA.DEFAULTS };

  async function refresh() {
    current = await LA.loadSettings();
    apply(current);
  }

  // 1) Aplica assim que a página começa a carregar.
  refresh();

  // 2) Reaplica sempre que alguma configuração mudar (popup, outra aba...).
  api.storage.onChanged.addListener((_changes, area) => {
    if (area === "local") refresh();
  });

  // Exposto para o leitor de voz (content/tts.js) consultar.
  LA.getCurrentSettings = () => current;
})();
