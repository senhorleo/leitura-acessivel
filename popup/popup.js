/*
 * popup/popup.js
 * ------------------------------------------------------------------
 * Liga os controles do popup às configurações salvas.
 *
 * O popup NÃO mexe na página diretamente: ele só salva no storage.
 * Cada página aberta (content/content.js) percebe a mudança pelo
 * evento "storage.onChanged" e se atualiza sozinha.
 */
(async () => {
  const { api } = LA;
  const $ = (id) => document.getElementById(id);

  let settings = await LA.loadSettings();

  /* --------------------------- Fonte ------------------------------ */
  const btnFonte = $("btn-fonte");

  function renderFonte() {
    btnFonte.setAttribute("aria-pressed", String(settings.useFont));
    btnFonte.textContent = settings.useFont
      ? "OpenDyslexic: LIGADA"
      : "OpenDyslexic: DESLIGADA";
  }

  btnFonte.addEventListener("click", () => {
    settings.useFont = !settings.useFont;
    LA.saveSettings({ useFont: settings.useFont });
    renderFonte();
  });

  renderFonte();
})();
