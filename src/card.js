/* What opens when she reaches something.
 *
 * DOM rather than canvas. The game is drawn; the writing is read — and text in
 * a canvas cannot be selected, cannot be scrolled by the OS, cannot be zoomed,
 * and is invisible to a screen reader. His sentences are the point of the
 * whole app, so they get real markup.
 */

import {P} from './theme.js';

let el, photo, img, when, title, body, closeBtn, onClosed = null;

function build() {
  el = document.createElement('div');
  el.className = 'card';
  el.innerHTML = `
    <div class="card-sheet" role="dialog" aria-modal="true">
      <button class="card-close" type="button" aria-label="Close"></button>
      <figure class="card-photo"><img alt=""></figure>
      <p class="card-when"></p>
      <h2 class="card-title"></h2>
      <div class="card-body"></div>
    </div>`;
  document.body.append(el);

  photo = el.querySelector('.card-photo');
  img = el.querySelector('img');
  when = el.querySelector('.card-when');
  title = el.querySelector('.card-title');
  body = el.querySelector('.card-body');
  closeBtn = el.querySelector('.card-close');

  closeBtn.addEventListener('click', close);
  el.addEventListener('pointerdown', e => { if (e.target === el) close(); });
  addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
}

export function open(moment, whenClosed) {
  if (!el) build();
  onClosed = whenClosed || null;

  when.textContent = moment.when || '';
  when.style.display = moment.when ? '' : 'none';

  const showTitle = moment.title && !moment.auto_title;
  title.textContent = showTitle ? moment.title : '';
  title.style.display = showTitle ? '' : 'none';

  body.innerHTML = '';
  for (const para of String(moment.body || '').split(/\n{2,}/)) {
    if (!para.trim()) continue;
    const lines = para.split('\n').filter(l => l.trim());
    if (lines.length > 1) {
      /* A paragraph that kept its line breaks is a list — eighteen things,
       * not one very long sentence. */
      const ul = document.createElement('div');
      ul.className = 'card-list';
      for (const line of lines) {
        const li = document.createElement('p');
        li.textContent = line.trim();
        ul.append(li);
      }
      body.append(ul);
    } else {
      const p = document.createElement('p');
      p.textContent = lines[0].trim();
      body.append(p);
    }
  }

  const src = moment.photo;
  photo.style.display = src ? '' : 'none';
  if (src) {
    /* Re-run the develop even if the same photograph is opened again. */
    img.classList.remove('developed');
    img.src = src;
    img.onerror = () => { photo.style.display = 'none'; };
    requestAnimationFrame(() => requestAnimationFrame(() => img.classList.add('developed')));
  }

  el.classList.add('open');
  document.body.classList.add('reading');
  el.querySelector('.card-sheet').scrollTop = 0;
}

export function close() {
  if (!el || !el.classList.contains('open')) return;
  /* Let it wobble out rather than vanish. */
  el.classList.add('closing');
  el.classList.remove('open');
  document.body.classList.remove('reading');
  setTimeout(() => el.classList.remove('closing'), 280);
  const f = onClosed; onClosed = null;
  if (f) setTimeout(f, 260);
}

export function isOpen() {
  return !!el && el.classList.contains('open');
}
