# Leitura Acessível

Extensão para o **Firefox** (também funciona no Chrome) que deixa qualquer
página web mais fácil de ler, pensada principalmente para **pessoas com
dislexia**.

> Protótipo do trabalho em grupo da disciplina **Desenho Universal e
> Tecnologia Assistiva** – UFABC.

## O que ela faz

| # | Funcionalidade | Como |
|---|----------------|------|
| 1 | Fonte **OpenDyslexic** em todas as páginas, inclusive em iframes | folha de estilo da extensão |
| 2 | Sliders de **tamanho do texto, espaço entre linhas, letras e palavras** | aplicados em tempo real |
| 3 | **Cores de fundo e texto**: creme, bege, azul claro, cinza escuro ou personalizada | |
| 4 | **Leitura em voz alta** da seleção ou da página, com play/pausa/parar e velocidade. A **frase que está sendo lida fica destacada** em amarelo e a página rola sozinha | Web Speech API, voz pt-BR |
| 5 | **Restaurar padrão** e **desligar só em um site** | |
| + | **Apoios de leitura**: régua que segue o mouse, alinhar à esquerda, linhas mais curtas, sem itálico e maiúsculas | aba **Mais** |
| + | **Fixar o painel** (alfinete): os controles ficam abertos na barra lateral enquanto você navega | barra lateral do navegador |

As configurações ficam salvas (`storage.local`) e valem para todas as abas,
inclusive depois de fechar o navegador.

---

## Instalação no Firefox (modo de teste)

Precisa do **Firefox 128 ou mais novo** (o destaque da frase lida precisa do
140 ou mais novo).

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

**Se a fonte não mudar em nenhum site:** abra o popup. Se aparecer o aviso
amarelo de permissão, clique em **Permitir em todos os sites** e recarregue
a página. Também dá para fazer por `about:addons` → **Leitura Acessível →
Permissões**.

### No Chrome / Edge

`chrome://extensions` → ative o **Modo do desenvolvedor** → **Carregar sem
compactação** → escolha a pasta do projeto.

---

## Como testar cada funcionalidade

Use a página **`demo/pagina-teste.html`**: arraste o arquivo para o Firefox.
Ela funciona sem internet e foi feita para a apresentação. Também vale
testar em sites reais, como Wikipédia, G1, o site da UFABC, o SIGAA ou o
GitHub.

O popup tem o botão geral no topo, quatro abas (**Texto**, **Cores**, **Voz**,
**Mais**) e, embaixo, os botões do site atual e de restaurar.

| Funcionalidade | Passo a passo | O que deve acontecer |
|---|---|---|
| **1. Fonte** | Aba **Texto** → **OpenDyslexic: LIGADA/DESLIGADA** | O texto muda na hora, inclusive o parágrafo de CSS "teimoso" e o iframe. O ícone "menu", o código e a fórmula **não** mudam. |
| **1. Ícones** | Abra um site com ícones (ex.: Gmail, GitHub, YouTube) | Os ícones continuam desenhos, sem virar palavras como "menu" ou "search". |
| **1. Site com segurança rígida** | Abra o GitHub | A fonte muda normalmente (o GitHub bloqueia fontes e estilos "de fora", mas não os da extensão). |
| **2. Sliders** | Aba **Texto** → arraste cada slider | A página muda enquanto você arrasta. "Espaço entre letras/palavras" no 0 = "original" (o do site). |
| **2. WCAG** | **Espaçamento recomendado** | Linhas 1,5, letras +0,12 e palavras +0,16 (critério 1.4.12 da WCAG 2.1). |
| **3. Cores** | Aba **Cores** → Creme, Bege, Azul claro ou Cinza escuro | Fundo e texto mudam. Os links ficam sublinhados e numa cor própria. Imagens não mudam. |
| **3. Personalizado** | **Personalizado** e escolha as cores | Aparecem dois seletores (fundo e texto). |
| **4. Ler seleção** | Selecione um trecho com o mouse → aba **Voz** → **Ler seleção** | Lê só o trecho. O popup mostra "Lendo… frase X de Y". |
| **4. Ler página** | **Ler página** | Lê o conteúdo principal, pulando menus, rodapé, ícones e texto escondido. |
| **4. Destaque** | Observe a página durante a leitura | A frase falada fica com fundo amarelo e a página rola para acompanhá-la. |
| **4. Pausa/Parar** | **Pausar** → **Continuar** → **Parar** | A fala pausa, continua de onde parou e para. A leitura **continua mesmo com o popup fechado**. |
| **4. Velocidade** | Mexa em **Velocidade** durante a leitura | A nova velocidade vale a partir da próxima frase. |
| **Régua de leitura** | Aba **Mais** → **Régua de leitura** e mova o mouse sobre a página | Uma faixa clara segue o mouse e o resto da tela escurece. Os cliques continuam funcionando. |
| **Alinhar à esquerda** | **Alinhar à esquerda** | O parágrafo justificado da página de teste fica alinhado à esquerda. Títulos centralizados não mudam. |
| **Linhas mais curtas** | **Linhas mais curtas** (use a janela bem larga) | Os parágrafos ficam com cerca de 70 letras por linha. |
| **Sem itálico e maiúsculas** | **Sem itálico e maiúsculas** | O trecho em itálico vira negrito e o título em maiúsculas volta ao normal. A fórmula e os ícones não mudam. |
| **5. Por site** | **Desligar neste site** (embaixo) | Aquele site volta ao normal e os outros continuam com os ajustes. Clique de novo para religar. |
| **5. Geral** | **Ajustes: LIGADOS/DESLIGADOS** (topo) | Liga e desliga tudo, em todos os sites. |
| **5. Restaurar** | **Restaurar padrão** | Volta aos valores iniciais. A lista de sites desligados é mantida. |
| **Fixar (alfinete)** | Clique em **Fixar**, no topo do popup | O popup fecha e o mesmo painel abre na barra lateral, onde continua aberto ao clicar na página e ao trocar de aba ("Site atual" acompanha). **Desafixar** fecha a barra. |
| Teclado | Tab percorre os controles; setas ← → trocam de aba | Dá para usar o popup inteiro sem mouse. |
| Persistência | Mude algo, feche e reabra o Firefox (e recarregue a extensão) | As configurações continuam lá. |

### SIGAA da UFABC

Testado na **tela de login** (`sig.ufabc.edu.br/sigaa/verTelaLogin.do`):
todos os textos recebem a fonte, os ajustes e as cores, sem barra de rolagem
horizontal. As telas de dentro do sistema (depois do login) usam o mesmo
tipo de página, mas **ainda não foram testadas**: vale conferir os menus e
as tabelas de notas com tamanho de texto grande.

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
manifest.json            "RG" da extensão: nome, permissões, quais arquivos entram nas páginas
fonts/                   OpenDyslexic (.woff2) + licença OFL
shared/settings.js       valores padrão, esquemas de cor e funções de salvar/ler
content/estilos.css      TODAS as regras visuais, "dormindo" até serem ligadas
content/content.js       roda DENTRO de cada página: liga/desliga as regras
content/regua.js         roda DENTRO da página: a régua de leitura
content/tts.js           roda DENTRO da página: leitura em voz alta e destaque
popup/popup.html|css|js  a janelinha com os botões
demo/pagina-teste.html   página para demonstrar
```

**Fluxo dos ajustes visuais:**

```
 Popup ──salva──▶ storage.local ──evento onChanged──▶ content.js (em cada aba e iframe)
                                                      └─▶ <html data-la-fonte style="--la-linha: 1.5">
                                                           └─▶ as regras de estilos.css passam a valer
```

O popup não "conversa" com a página. Ele só salva a configuração, e cada
página percebe a mudança sozinha. Por isso todas as abas abertas mudam
juntas.

O arquivo `estilos.css` é fixo. Cada regra só vale quando o `<html>` da
página tem o atributo certo (`data-la-fonte`, `data-la-cores`…), e os
valores vêm de variáveis CSS (`--la-linha`, `--la-fundo`…). O `content.js`
só coloca e tira esses atributos e variáveis.

**Fluxo da voz:**

```
 Popup ──mensagem "ler-pagina"──▶ tts.js (página) ──▶ speechSynthesis (voz do sistema)
       ◀──mensagem "tts-estado"──  (frase X de Y)   └─▶ destaca a frase na página
```

A fala roda na página, e não no popup, porque o popup é destruído quando
fecha.

**Detalhes técnicos que valem uma menção:**

- **Por que um CSS fixo no manifest:** sites com política de segurança
  rígida (CSP) bloqueiam estilos e fontes inseridos por script. Folhas
  declaradas no manifest são carregadas pelo próprio navegador e não passam
  por esse bloqueio.
- **`@layer` + `!important`:** muitos sites usam `!important` com seletores
  específicos. Pela regra de cascata do CSS, uma declaração `!important`
  dentro de uma camada (`@layer`) vence as `!important` comuns do site.
- **Ícones preservados:** o CSS usa `:not(...)` com os padrões do Material
  Icons, Font Awesome, Bootstrap Icons etc., além de `code`, `pre`,
  MathML, MathJax e KaTeX.
- **Tamanho do texto:** usa `zoom` só nos blocos de texto (parágrafos,
  listas, títulos, tabelas). Diferente do Ctrl + "+", imagens e menus não
  são ampliados.
- **Leitura em frases:** o `tts.js` percorre o texto visível da página,
  anota de onde veio cada trecho, divide em frases e fala uma por vez.
  Assim ele sabe exatamente qual pedaço da página destacar.
- **Destaque sem mexer na página:** usa a *CSS Custom Highlight API*
  (`::highlight`), que pinta por cima do texto sem alterar o HTML do site.
- **Régua de leitura:** é um único elemento preso à janela, com
  `pointer-events: none` (os cliques passam por ele). O escurecimento em
  volta é a sombra (`box-shadow`) gigante desse elemento.
- **Apoios baseados em recomendações:** o guia de estilo da British
  Dyslexia Association recomenda texto alinhado à esquerda (sem
  justificar), linhas de 60 a 70 caracteres, e evitar itálico e texto todo
  em maiúsculas, usando negrito para dar ênfase.
- **Painel fixado:** o navegador sempre fecha o popup quando se clica fora
  dele. O alfinete abre a mesma página (`popup.html?painel=1`) na barra
  lateral: `sidebar_action` no Firefox e `side_panel` no Chrome. O manifest
  declara os dois, e cada navegador usa o seu.
- **Popup acessível:** botões de 44 px ou mais, abas no padrão WAI-ARIA
  (setas do teclado), foco sempre visível, estado nunca indicado só por cor.

---

## Limitações conhecidas

- **Testes feitos até agora:** os testes automáticos rodaram no Chromium
  (estilos, CSP rígido, iframes, por site, abas do popup, painel fixado,
  régua e apoios, lógica da leitura com voz simulada) e o validador da Mozilla (`web-ext lint`) não aponta
  erros. **Falta o teste manual no Firefox e com voz de verdade.**
- **Avisos ao carregar:** como o mesmo manifest serve aos dois navegadores,
  o Firefox avisa que não conhece a permissão `sidePanel`, e o Chrome avisa
  que não conhece `sidebar_action` e `browser_specific_settings`. São só
  avisos; a extensão funciona normalmente.
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
- **Régua de leitura:** segue só o mouse (não funciona por teclado nem em
  tela de toque) e some quando o mouse entra num iframe.
- **Maiúsculas:** a opção só desfaz maiúsculas aplicadas pelo CSS do site.
  Texto que já foi digitado em maiúsculas continua igual.
- **Alinhar à esquerda:** vale para parágrafos e listas. Texto justificado
  solto dentro de outros tipos de elemento pode continuar justificado.
- **Divisão em frases:** abreviações com ponto ("Dr. Silva", "p. ex.") são
  tratadas como fim de frase, o que gera uma pausa a mais.
- **Destaque da frase:** precisa do Firefox 140+ (ou Chrome 105+). Em
  versões mais antigas a leitura funciona, só sem o destaque.
- **Seleção dentro de iframes** não é lida: só a página principal fala.
- **Iframes de outros sites:** o "desligar neste site" usa o domínio da
  página principal sempre que o navegador permite descobrir.

## Ideias futuras (fora do escopo deste protótipo)

- Destacar palavra por palavra, e não só a frase.
- Botões de "frase anterior" e "repetir frase", e atalhos de teclado.
- Modo foco (esconder menus e anúncios) e pausar animações e GIFs.
- Perfis salvos ("estudar", "ler notícias"…).
- Aplicativo para celular e ajustes na fonte do sistema operacional.
- Integração própria com o SIGAA (por exemplo, um botão dentro do sistema).
- Testes com usuários: medir tempo de leitura e conforto com e sem a extensão.

## Licenças

- Código: MIT (veja `LICENSE`).
- Fonte OpenDyslexic: © Abbie Gonzalez, **SIL Open Font License 1.1** (veja
  `fonts/OFL.txt`). A licença permite redistribuir a fonte junto com
  software.
