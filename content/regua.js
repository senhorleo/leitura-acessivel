/*
 * content/regua.js
 * ------------------------------------------------------------------
 * Régua de leitura: uma faixa horizontal que segue o mouse e escurece
 * o resto da tela. Ajuda a não "perder a linha" durante a leitura.
 *
 * Como funciona: criamos UM elemento (<la-regua-leitura>) preso à
 * janela. A faixa clara é o próprio elemento; o escurecimento em volta
 * é a "sombra" gigante dele (box-shadow, definida em estilos.css). A
 * cada movimento do mouse, só mudamos a posição vertical do elemento.
 *
 * O elemento tem "pointer-events: none": os cliques passam direto por
 * ele, então a página continua funcionando normalmente.
 *
 * Este arquivo só expõe LA.setRuler(ligar); quem decide ligar ou
 * desligar é o content/content.js, de acordo com as configurações.
 */
(() => {
  // Só a página principal tem régua (um iframe criaria uma segunda).
  if (window !== window.top) {
    LA.setRuler = () => {};
    return;
  }

  let ruler = null;

  function onMouseMove(e) {
    // Alguns sites reconstroem a página; se a régua sumiu, recoloca.
    if (!ruler.isConnected) document.documentElement.append(ruler);
    // O CSS centraliza a faixa nesta altura. O "important" é preciso
    // porque o estilos.css zera todas as propriedades do elemento com
    // "!important", para o site não conseguir interferir nele.
    ruler.style.setProperty("transform", `translateY(${e.clientY}px)`, "important");
    ruler.toggleAttribute("data-visivel", true);
  }

  // Mouse saiu da janela (ou entrou num iframe): esconde a régua.
  function onMouseLeave() {
    ruler.removeAttribute("data-visivel");
  }

  LA.setRuler = function (on) {
    if (on && !ruler) {
      ruler = document.createElement("la-regua-leitura");
      ruler.setAttribute("aria-hidden", "true"); // leitores de tela ignoram
      document.documentElement.append(ruler);
      window.addEventListener("mousemove", onMouseMove, { passive: true });
      document.documentElement.addEventListener("mouseleave", onMouseLeave);
    } else if (!on && ruler) {
      window.removeEventListener("mousemove", onMouseMove);
      document.documentElement.removeEventListener("mouseleave", onMouseLeave);
      ruler.remove();
      ruler = null;
    }
  };
})();
