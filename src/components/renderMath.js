import katex from 'katex';

export function renderMath(container) {
  container.querySelectorAll('.math-block').forEach((el) => {
    const src = decodeURIComponent(el.getAttribute('data-math') || '');
    if (!src) return;
    el.innerHTML = katex.renderToString(src, { displayMode: true, throwOnError: false });
  });

  container.querySelectorAll('.math-inline').forEach((el) => {
    const src = decodeURIComponent(el.getAttribute('data-math') || '');
    if (!src) return;
    el.innerHTML = katex.renderToString(src, { displayMode: false, throwOnError: false });
  });
}
