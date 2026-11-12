# Leitura Acessível

Extensão para o **Firefox** (também funciona no Chrome) que deixa qualquer
página web mais fácil de ler, pensada principalmente para **pessoas com
dislexia**.

> Protótipo do trabalho em grupo da disciplina **Desenho Universal e
> Tecnologia Assistiva** – UFABC.

## O que ela faz

| # | Funcionalidade | Como |
|---|----------------|------|
| 1 | Fonte **OpenDyslexic** em todas as páginas, inclusive em iframes | CSS injetado por um *content script* |
| 2 | Sliders de **tamanho do texto, espaço entre linhas, letras e palavras** | aplicados em tempo real |
| 3 | **Cores de fundo e texto**: creme, bege, azul claro, cinza escuro ou personalizada | |
| 4 | **Leitura em voz alta** da seleção ou da página, com play/pausa/parar e velocidade | Web Speech API, voz pt-BR |
| 5 | **Restaurar padrão** e **desligar só em um site** | |

As configurações ficam salvas (`storage.local`) e valem para todas as abas,
inclusive depois de fechar o navegador.

---

## Instalação no Firefox (modo de teste)

1. Baixe o projeto: botão verde **Code → Download ZIP** no GitHub e
   descompacte. Outra opção é usar `git clone`.
2. No Firefox, digite na barra de endereços: `about:debugging`
3. Clique em **Este Firefox** (*This Firefox*), no menu da esquerda.
4. Clique em **Carregar extensão temporária…** (*Load Temporary Add-on…*).
5. Abra a pasta do projeto e selecione o arquivo **`manifest.json`**.
6. O ícone **Aa** aparece na barra de ferramentas. Se não aparecer, clique
   no ícone de quebra-cabeça 🧩 e fixe a extensão.
7. **Recarregue (F5) as abas que já estavam abertas.** A extensão só entra
   nas páginas carregadas depois da instalação.

> ⚠️ Uma extensão **temporária some quando o Firefox fecha**. Antes de cada
> teste ou apresentação, repita os passos 2 a 5.

**Se a fonte não mudar em nenhum site:** abra `about:addons`, clique em
**Leitura Acessível → Permissões** e ative **"Acessar seus dados em todos
os sites"**.

### No Chrome / Edge

`chrome://extensions` → ative o **Modo do desenvolvedor** → **Carregar sem
compactação** → escolha a pasta do projeto.

---

## Como testar cada funcionalidade

Use a página **`demo/pagina-teste.html`**: arraste o arquivo para o Firefox.
Ela funciona sem internet e foi feita para a apresentação. Também vale
testar em sites reais, como Wikipédia, G1, o site da UFABC ou o Google.

| Funcionalidade | Passo a passo | O que deve acontecer |
|---|---|---|
| **1. Fonte** | Clique em **OpenDyslexic: LIGADA/DESLIGADA** | O texto muda na hora, inclusive o parágrafo de CSS "teimoso" e o iframe. O ícone "menu", o código e a fórmula **não** mudam. |
| **1. Ícones** | Abra um site com ícones (ex.: Gmail, GitHub, YouTube) | Os ícones continuam desenhos, sem virar palavras como "menu" ou "search". |
| **2. Sliders** | Arraste cada slider | A página muda enquanto você arrasta. "Espaço entre letras/palavras" no 0 = "original" (o do site). |
| **2. WCAG** | Clique em **Usar espaçamento recomendado (WCAG)** | Linhas 1,5, letras +0,12 e palavras +0,16 (critério 1.4.12 da WCAG 2.1). |
| **3. Cores** | Clique em Creme, Bege, Azul claro ou Cinza escuro | Fundo e texto mudam. Os links ficam sublinhados e numa cor própria. Imagens não mudam. |
| **3. Personalizado** | Clique em **Personalizado** e escolha as cores | Aparecem dois seletores (fundo e texto). |
| **4. Ler seleção** | Selecione um trecho com o mouse → **▶ Ler seleção** | Lê só o trecho. O popup mostra "Lendo… trecho X de Y". |
| **4. Ler página** | **▶ Ler página** | Lê o conteúdo principal (`<article>`/`<main>`, ou a página toda). |
| **4. Pausa/Parar** | **⏸ Pausar** → **▶ Continuar** → **⏹ Parar** | A fala pausa, continua de onde parou e para. A leitura **continua mesmo com o popup fechado**. |
| **4. Velocidade** | Mexa em **Velocidade** durante a leitura | A nova velocidade vale a partir da próxima frase. |
| **5. Por site** | Clique em **Desligar só em (site)** | Aquele site volta ao normal e os outros continuam com os ajustes. Clique de novo para religar. |
| **5. Geral** | **Ajustes: LIGADOS/DESLIGADOS** | Liga e desliga tudo, em todos os sites. |
| **5. Restaurar** | **↺ Restaurar padrão** | Volta aos valores iniciais. A lista de sites desligados é mantida. |
| Persistência | Mude algo, feche e reabra o Firefox (e recarregue a extensão) | As configurações continuam lá. |

### Voz em português (pt-BR)

A leitura usa as **vozes instaladas no sistema operacional**:

- **Windows 10/11:** já costuma ter "Microsoft Maria" e "Microsoft Daniel".
  Se não tiver: *Configurações → Hora e idioma → Fala → Adicionar vozes →
  Português (Brasil)*.
- **macOS:** *Ajustes do Sistema → Acessibilidade → Conteúdo Falado → Voz do
  Sistema → Gerenciar vozes* → baixe "Luciana" (pt-BR).
- **Linux:** o Firefox usa o `speech-dispatcher`. Instale, por exemplo,
  `sudo apt install speech-dispatcher espeak-ng`. A voz é bem robótica.

Se houver mais de uma voz em português, dá para escolher no campo **Voz**.

---

## Como funciona (para a apresentação)

```
manifest.json            "RG" da extensão: nome, permissões, quais scripts rodam onde
fonts/                   OpenDyslexic (.woff2) + licença OFL
shared/settings.js       valores padrão, esquemas de cor e funções de salvar/ler
content/content.js       roda DENTRO de cada página: monta o CSS e aplica
content/tts.js           roda DENTRO da página: leitura em voz alta
popup/popup.html|css|js  a janelinha com os botões
demo/pagina-teste.html   página para demonstrar
```

**Fluxo dos ajustes visuais:**

```
 Popup  ──salva──▶  storage.local  ──evento onChanged──▶  content.js (em cada aba e iframe)
                                                         └─▶ reescreve a <style> da página
```

O popup não "conversa" com a página. Ele só salva a configuração, e cada
página percebe a mudança sozinha. Por isso todas as abas abertas mudam
juntas.

**Fluxo da voz:**

```
 Popup ──mensagem "ler-pagina"──▶ tts.js (página) ──▶ speechSynthesis (voz do sistema)
       ◀──mensagem "tts-estado"──  (trecho X de Y)
```

A fala roda na página, e não no popup, porque o popup é destruído quando
fecha.

**Detalhes técnicos que valem uma menção:**

- **`@layer` + `!important`:** muitos sites usam `!important` com seletores
  específicos. Pela regra de cascata do CSS, entre declarações
  `!important`, a camada (`@layer`) declarada primeiro vence. Como o script
  roda em `document_start`, a nossa é sempre a primeira.
- **Ícones preservados:** o CSS usa `:not(...)` com os padrões do Material
  Icons, Font Awesome, Bootstrap Icons etc., além de `code`, `pre`,
  MathJax e KaTeX.
- **Tamanho do texto:** usa `zoom` só nos blocos de texto (parágrafos,
  listas, títulos, tabelas). Diferente do Ctrl + "+", imagens e menus não
  são ampliados.
- **Texto em trechos:** a fala é dividida em frases de até ~200
  caracteres, porque falas longas travam em alguns navegadores.

---

## Limitações conhecidas

- **Extensão temporária:** no Firefox comum ela some ao fechar o navegador.
  Para uso permanente, é preciso assinar a extensão no addons.mozilla.org,
  mesmo sem publicá-la.
- **Páginas protegidas:** extensões não funcionam em `about:*`, na loja de
  extensões (addons.mozilla.org / Chrome Web Store), no leitor de PDF
  embutido e em páginas internas do navegador.
- **Abas abertas antes da instalação** precisam ser recarregadas (F5).
- **Alfabeto:** a fonte empacotada cobre o alfabeto latino (português,
  inglês, espanhol…). Textos em grego, cirílico etc. usam a fonte padrão.
- **Ícones:** a exclusão usa nomes de classe comuns. Um site com uma fonte
  de ícones própria e nomes diferentes pode ter ícones trocados por letras.
- **Layouts apertados:** tamanho e espaçamentos grandes podem fazer o texto
  vazar de botões ou caixas de altura fixa. Isso é esperado, porque o site
  não foi feito para aquele tamanho.
- **Cores:** pintar o fundo de todos os elementos pode esconder imagens de
  fundo decorativas. Imagens normais (`<img>`) e vídeos não são afetados.
- **Voz:** depende das vozes do sistema. Sem voz pt-BR instalada, a
  pronúncia fica errada (ver acima). No Linux a qualidade é baixa. No Chrome,
  algumas versões só deixam falar depois que a pessoa clica na página.
- **Leitura da página:** quando o site não usa `<article>`/`<main>`, a
  extensão lê a página inteira, incluindo menus e rodapé.
- **Seleção dentro de iframes** não é lida: só a página principal fala.
- **Iframes de outros sites:** o "desligar neste site" usa o domínio da
  página principal sempre que o navegador permite descobrir.

## Ideias futuras (fora do escopo deste protótipo)

- Destacar a frase ou palavra sendo lida (acompanhar a leitura com os olhos).
- Régua de leitura (faixa que segue o mouse e escurece o resto da tela).
- Perfis salvos ("estudar", "ler notícias"…) e atalhos de teclado.
- Aplicativo para celular e ajustes na fonte do sistema operacional.
- Integração com o SIGAA e outros sistemas da UFABC.
- Testes com usuários: medir tempo de leitura e conforto com e sem a extensão.

## Licenças

- Código: MIT (veja `LICENSE`).
- Fonte OpenDyslexic: © Abbie Gonzalez, **SIL Open Font License 1.1** (veja
  `fonts/OFL.txt`). A licença permite redistribuir a fonte junto com
  software.
