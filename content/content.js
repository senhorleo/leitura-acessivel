/*
 * content/content.js
 * ------------------------------------------------------------------
 * Content script: o navegador injeta este arquivo em TODAS as páginas
 * (e em todos os iframes, por causa do "all_frames": true no manifest).
 *
 * As regras de estilo ficam em content/estilos.css, mas "dormindo".
 * Este script é o interruptor. Em 3 passos:
 *   1. Lê as configurações salvas (shared/settings.js).
 *   2. Coloca no <html> da página os atributos data-la-* (que ligam
 *      cada grupo de regras) e as variáveis --la-* (os valores).
 *   3. Fica escutando "storage.onChanged": quando o usuário mexe no
 *      popup, repete o passo 2 na hora, sem recarregar a página.
 */
(() => {
  const { api } = LA;

  /* Descobre o site "principal". Dentro de um iframe tentamos usar o
   * endereço da página de cima; se o navegador não deixar (iframe de
   * outro site), usamos o endereço de quem abriu o iframe (referrer). */
  function topSite() {
    try {
      return LA.siteKey(window.top.location);
    } catch {
      try {
        return LA.siteKey(new URL(document.referrer));
      } catch {
        return LA.siteKey(location);
      }
    }
  }

  /* Aplica (ou remove) os ajustes conforme as configurações. */
  function apply(s) {
    const root = document.documentElement;
    if (!root) return;

    const active = s.enabled && !LA.isSiteDisabled(s, topSite());
    const colors = active ? LA.resolveColors(s) : null;

    // Liga/desliga um atributo: flag("fonte", true) -> <html data-la-fonte>
    const flag = (name, on) => root.toggleAttribute(`data-la-${name}`, Boolean(on));
    // Define ou apaga uma variável CSS: setVar("linha", 1.5) -> --la-linha: 1.5
    const setVar = (name, value) => {
      if (value == null) root.style.removeProperty(`--la-${name}`);
      else root.style.setProperty(`--la-${name}`, String(value));
    };

    // Item 1: fonte
    flag("fonte", active && s.useFont);

    // Item 2: espaçamentos. Em letras e palavras, 0 significa "deixar
    // como o site fez", então o atributo nem é ligado.
    flag("ativo", active);
    flag("letras", active && s.letterSpacing > 0);
    flag("palavras", active && s.wordSpacing > 0);
    flag("zoom", active && s.fontSize !== 100);
    setVar("linha", active ? s.lineHeight : null);
    setVar("letras", active ? `${s.letterSpacing}em` : null);
    setVar("palavras", active ? `${s.wordSpacing}em` : null);
    setVar("zoom", active ? s.fontSize / 100 : null);

    // Item 3: cores
    flag("cores", colors);
    setVar("fundo", colors?.bg);
    setVar("texto", colors?.fg);
    setVar("link", colors?.link);
  }

  /* Guarda a última versão das configurações para o leitor de voz. */
  let current = { ...LA.DEFAULTS };

  async function refresh() {
    current = await LA.loadSettings();
    apply(current);
  }

  // 1) Aplica assim que a página começa a carregar ("document_start").
  refresh();

  // 2) Reaplica sempre que alguma configuração mudar (popup, outra aba...).
  api.storage.onChanged.addListener((_changes, area) => {
    if (area === "local") refresh();
  });

  // Exposto para o leitor de voz (content/tts.js) consultar.
  LA.getCurrentSettings = () => current;
})();
