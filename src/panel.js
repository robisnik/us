/* The homestead panel.
 *
 * Opens when she is standing at the place she is making. DOM rather than
 * canvas for the same reason the reading card is: this has buttons and
 * numbers, and text drawn into a canvas cannot be tapped reliably, scaled by
 * the OS, or read aloud.
 *
 * Everything here is additive. There is nothing to lose, no button that
 * destroys anything, and nothing that says no without saying what would make
 * it yes.
 */

import * as tend from './tend.js';

let el, onChange = null, home = true;

function build() {
  el = document.createElement('div');
  el.className = 'panel';
  el.innerHTML = `
    <div class="panel-sheet" role="dialog" aria-modal="true">
      <button class="panel-close" type="button" aria-label="Close"></button>
      <h2></h2>
      <div class="panel-carry"></div>
      <div class="panel-plots"></div>
      <div class="panel-builds"></div>
    </div>`;
  document.body.append(el);
  el.querySelector('.panel-close').addEventListener('click', close);
  el.addEventListener('pointerdown', e => { if (e.target === el) close(); });
  addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
}

export function open(changed, atHome = true) {
  if (!el) build();
  onChange = changed || null;
  home = atHome;
  render();
  el.classList.add('open');
  document.body.classList.add('reading');
}

export function close() {
  if (!el || !el.classList.contains('open')) return;
  /* Let it wobble out rather than vanish. */
  el.classList.add('closing');
  el.classList.remove('open');
  document.body.classList.remove('reading');
  setTimeout(() => el.classList.remove('closing'), 280);
}

export const isOpen = () => !!el && el.classList.contains('open');

function render() {
  const inv = tend.inv();
  el.querySelector('h2').textContent = home ? 'the homestead' : 'what you are carrying';

  const carry = el.querySelector('.panel-carry');
  const held = Object.entries(inv).filter(([, n]) => n > 0);
  carry.innerHTML = held.length
    ? '<p class="panel-label">carrying</p><ul>' + held.map(([k, n]) =>
        `<li><i style="background:${tend.RESOURCES[k].colour}"></i>${n} ${tend.RESOURCES[k].name}</li>`).join('') + '</ul>'
    : '<p class="panel-empty">Nothing yet. There is water and wood by the lake, '
      + 'seeds in the parks, and stone in the dunes.</p>';

  /* Away from the homestead this is just a pouch: what she has, and a line
   * saying where the rest of it is. Planting and building need the place. */
  if (!home) {
    el.querySelector('.panel-plots').innerHTML =
      '<p class="panel-empty">The homestead is at the far end, past everything. '
      + 'Bring these there and you can plant and build.</p>';
    el.querySelector('.panel-builds').innerHTML = '';
    return;
  }

  /* Plots */
  const plots = tend.plots();
  const pl = el.querySelector('.panel-plots');
  let html = '<p class="panel-label">the garden</p>';
  if (!plots.length) {
    html += '<p class="panel-empty">Nothing planted yet.</p>';
  } else {
    html += '<ul class="panel-plots-list">';
    plots.forEach((p, i) => {
      const s = tend.stageOf(p);
      const stage = tend.STAGES[s].name;
      const next = tend.nextChange(p);
      const canWater = (inv.water || 0) > 0 && s < tend.STAGES.length - 1;
      html += `<li><span>${stage}${next ? ` — ${next}` : ''}</span>`
            + (canWater ? `<button data-water="${i}">water</button>` : '') + '</li>';
    });
    html += '</ul>';
  }
  html += (inv.seed || 0) > 0
    ? '<button class="panel-do" data-plant="1">plant a seed</button>'
    : '<p class="panel-empty">Find a seed in the parks to plant something.</p>';
  pl.innerHTML = html;

  /* Builds */
  const bl = el.querySelector('.panel-builds');
  let bh = '<p class="panel-label">building</p><ul class="panel-builds-list">';
  for (const b of tend.BUILDS) {
    const done = tend.built().includes(b.id);
    const can = tend.has(b.cost);
    const cost = Object.entries(b.cost)
      .map(([k, n]) => `${n} ${tend.RESOURCES[k].name}`).join(', ');
    bh += `<li class="${done ? 'done' : can ? 'can' : 'cant'}">
        <div><strong>${b.name}</strong><em>${b.note}</em></div>
        ${done ? '<span class="tick">built</span>'
               : can ? `<button data-build="${b.id}">build</button>`
                     : `<span class="cost">${cost}</span>`}
      </li>`;
  }
  bl.innerHTML = bh + '</ul>';

  el.querySelectorAll('[data-plant]').forEach(b =>
    b.addEventListener('click', () => { if (tend.plant()) { render(); onChange?.(); } }));
  el.querySelectorAll('[data-water]').forEach(b =>
    b.addEventListener('click', () => { if (tend.water(+b.dataset.water)) { render(); onChange?.(); } }));
  el.querySelectorAll('[data-build]').forEach(b =>
    b.addEventListener('click', () => { if (tend.build(b.dataset.build)) { render(); onChange?.(); } }));
}
