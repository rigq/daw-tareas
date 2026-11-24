// Tema claro/oscuro. Script normal (no módulo) cargado en <head> para aplicar el tema antes de pintar
// y que no haya destello. Se guarda en localStorage porque chrome.storage es asíncrono.
// Sin elección guardada, sigue al sistema (y cambia con él).
(() => {
  const CLAVE = 'tema';
  const sistema = matchMedia('(prefers-color-scheme: dark)');
  const elegido = () => localStorage.getItem(CLAVE); // 'claro' | 'oscuro' | null
  const actual = () => elegido() || (sistema.matches ? 'oscuro' : 'claro');

  function aplicar() {
    const t = actual();
    document.documentElement.dataset.tema = t;
    const b = document.getElementById('cambiar-tema');
    if (b) {
      const otro = t === 'oscuro' ? 'claro' : 'oscuro';
      b.title = `Cambiar a modo ${otro} (T)`;
      b.setAttribute('aria-label', `Cambiar a modo ${otro}`);
    }
  }

  function alternar() {
    localStorage.setItem(CLAVE, actual() === 'oscuro' ? 'claro' : 'oscuro');
    // Fundido suave entre temas donde el navegador lo permite
    if (document.startViewTransition && !matchMedia('(prefers-reduced-motion: reduce)').matches && document.visibilityState === 'visible') document.startViewTransition(aplicar).ready.catch(() => {});
    else aplicar();
  }

  aplicar();
  // El modo (inicio / baos / grado) también se aplica antes de pintar; app.js lo mantiene al día.
  document.documentElement.dataset.modo = localStorage.getItem('modo') || 'inicio';
  sistema.addEventListener('change', () => { if (!elegido()) aplicar(); });
  document.addEventListener('DOMContentLoaded', () => {
    aplicar();
    document.getElementById('cambiar-tema')?.addEventListener('click', alternar);
    document.addEventListener('keydown', e => {
      if ((e.key === 't' || e.key === 'T') && !e.target.matches('input, textarea') && !e.ctrlKey && !e.metaKey && !e.altKey
        && !document.querySelector('dialog[open]') && document.getElementById('foco')?.hidden !== false) alternar();
    });
  });
})();
