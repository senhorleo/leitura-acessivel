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
  disabledSites: [], // lista de domínios onde a extensão fica desligada
});

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

/* Verifica se um domínio (ex.: "www.ufabc.edu.br") está desativado. */
LA.isSiteDisabled = function (settings, hostname) {
  return Boolean(hostname) && settings.disabledSites.includes(hostname);
};
