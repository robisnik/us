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
      <div class="panel-prod"></div>
      <div class="panel-rooms"></div>
      <div class="panel-plots"></div>
      <div class="panel-builds"></div>
    </div>`;
  document.body.append(el);
  el.querySelector('.panel-close').addEventListener('click', close);
  el.addEventListener('pointerdown', e => { if (e.target === el) close(); });
  addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
}

/* What was just built, said properly rather than as a toast — she made this,
 * and he wrote her a line about it. */
function said(title, note) {
  const box = document.createElement('div');
  box.className = 'built-said';
  box.innerHTML = `<p class="built-what">${title}</p><p class="built-note">${note}</p>`;
  document.body.append(box);
  requestAnimationFrame(() => box.classList.add('on'));
  setTimeout(() => { box.classList.remove('on'); setTimeout(() => box.remove(), 700); }, 4200);
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
    el.querySelector('.panel-prod').innerHTML = '';
    el.querySelector('.panel-rooms').innerHTML = '';
    el.querySelector('.panel-plots').innerHTML =
      '<p class="panel-empty">The homestead is at the far end, past everything. '
      + 'Bring these there and you can plant and build.</p>';
    el.querySelector('.panel-builds').innerHTML = '';
    return;
  }

  /* What has been made while she was elsewhere. Shown before the garden,
   * because it is the thing that changed since last time. */
  const prod = Object.keys(tend.PRODUCES)
    .filter(id => tend.built().includes(id))
    .map(id => ({id, n: tend.waiting(id), p: tend.PRODUCES[id]}));
  const anyReady = prod.some(x => x.n > 0);
  const pr = el.querySelector('.panel-prod');
  if (!prod.length) {
    pr.innerHTML = '';
  } else if (!anyReady) {
    /* One quiet line rather than a column of "nothing yet". A list that is
     * mostly empty trains her to stop reading it. */
    const next = prod
      .map(({p}) => `${tend.RESOURCES[p.gives].name} every ${p.every}h`)
      .join(', ');
    pr.innerHTML = `<p class="panel-label">making</p><p class="panel-empty">${next}</p>`;
  } else {
    const ready = prod.filter(x => x.n > 0);
    pr.innerHTML = '<p class="panel-label">waiting for you</p><ul>'
      + ready.map(({id, n, p}) =>
          `<li><span>${n} ${tend.RESOURCES[p.gives].name}</span>`
          + `<button data-take="${id}">take</button></li>`).join('')
      + '</ul>'
      + (ready.length > 1
          ? '<button class="panel-do" data-takeall="1">take everything</button>' : '');
  }

  /* Plots */
  const plots = tend.plots();
  const pl = el.querySelector('.panel-plots');
  let html = '<p class="panel-label">growing</p>';
  if (!plots.length) {
    html += '<p class="panel-empty">Nothing planted yet.</p>';
  } else {
    html += '<ul class="panel-plots-list">';
    plots.forEach((p, i) => {
      const s = tend.stageOf(p);
      const stage = tend.STAGES[s].name;
      const next = tend.nextChange(p);
      const canWater = (inv.water || 0) > 0 && s < tend.STAGES.length - 1;
      const ripe = tend.canHarvest(i);
      html += `<li><span>${stage}${next ? ` — ${next}` : ''}</span>`
            + (ripe ? `<button data-pick="${i}">pick</button>`
                    : canWater ? `<button data-water="${i}">water</button>` : '') + '</li>';
    });
    html += '</ul>';
  }
  html += (inv.seed || 0) > 0
    ? '<button class="panel-do" data-plant="1">plant a seed</button>'
    : '<p class="panel-empty">Find a seed in the parks to plant something.</p>';
  pl.innerHTML = html;

  /* The house: rooms as a thing she builds, and how many stand empty.
   *
   * Shown before the build list because furniture is gated on it — being told
   * "you need a room" after wanting a hearth is worse than knowing first. */
  const hr = el.querySelector('.panel-rooms');
  if (tend.built().includes('walls')) {
    const free = tend.freeRooms();
    const cost = Object.entries(tend.ROOM_COST)
      .map(([k, n]) => `${n} ${tend.RESOURCES[k]?.name ?? k}`).join(', ');
    hr.innerHTML = '<p class="panel-label">the house</p>'
      + `<p class="panel-empty">${tend.roomCount()} room${tend.roomCount() === 1 ? '' : 's'}, `
      + `${free} empty.</p>`
      + (tend.roomCount() >= tend.MAX_ROOMS
          ? '<p class="panel-empty">There is no more room to build into.</p>'
          : tend.canBuildRoom()
            ? '<button class="panel-do" data-room="1">add a room</button>'
            : `<p class="panel-empty">Another room needs ${cost}.</p>`);
  } else {
    hr.innerHTML = '';
  }

  /* Builds, grouped by tier.
   *
   * A locked tier is shown rather than hidden, with what it is waiting for.
   * Hiding it would make the homestead look finished when it is not, and the
   * next thing to want is most of the reason to come back. */
  const bl = el.querySelector('.panel-builds');
  let bh = '';
  for (const t of tend.TIERS) {
    const items = tend.BUILDS.filter(b => b.tier === t.id);
    if (!items.length) continue;
    const open = tend.tierOpen(t.id);
    const doneCount = items.filter(b => tend.built().includes(b.id)).length;

    bh += `<p class="panel-label">${t.name}`
        + (doneCount === items.length ? ' · done' : ` · ${doneCount}/${items.length}`)
        + '</p>';

    if (!open) {
      const prev = tend.TIERS.find(x => x.id === t.needs);
      bh += `<p class="panel-empty">After ${prev ? prev.name : 'the rest'}.</p>`;
      continue;
    }

    bh += '<ul class="panel-builds-list">';
    for (const b of items) {
      const done = tend.built().includes(b.id);
      const can = tend.has(b.cost);
      const cost = Object.entries(b.cost)
        .map(([k, n]) => `${n} ${tend.RESOURCES[k]?.name ?? k}`).join(', ');
      /* "needs an empty room" is a better sentence than a greyed-out button
       * with no explanation — she can act on the first one. */
      const needsRoom = tend.INDOOR.includes(b.id) && tend.freeRooms() < 1;
      const why = needsRoom ? 'needs an empty room' : cost;
      bh += `<li class="${done ? 'done' : (can && !needsRoom) ? 'can' : 'cant'}">
          <div><strong>${b.name}</strong>${done ? `<em>${b.note}</em>` : ''}</div>
          ${done ? '<span class="tick">built</span>'
                 : (can && !needsRoom) ? `<button data-build="${b.id}">build</button>`
                       : `<span class="cost">${why}</span>`}
        </li>`;
    }
    bh += '</ul>';
  }
  bl.innerHTML = bh;

  el.querySelectorAll('[data-take]').forEach(b =>
    b.addEventListener('click', () => { tend.collect(b.dataset.take); render(); onChange?.(); }));
  el.querySelectorAll('[data-takeall]').forEach(b =>
    b.addEventListener('click', () => { tend.collectAll(); render(); onChange?.(); }));
  el.querySelectorAll('[data-plant]').forEach(b =>
    b.addEventListener('click', () => { if (tend.plant()) { render(); onChange?.(); } }));
  el.querySelectorAll('[data-water]').forEach(b =>
    b.addEventListener('click', () => { if (tend.water(+b.dataset.water)) { render(); onChange?.(); } }));
  el.querySelectorAll('[data-room]').forEach(b =>
    b.addEventListener('click', () => { if (tend.buildRoom()) { render(); onChange?.(); } }));
  el.querySelectorAll('[data-pick]').forEach(b =>
    b.addEventListener('click', () => { if (tend.harvest(+b.dataset.pick)) { render(); onChange?.(); } }));
  el.querySelectorAll('[data-build]').forEach(b =>
    b.addEventListener('click', () => {
      const info = tend.BUILDS.find(x => x.id === b.dataset.build);
      if (tend.build(b.dataset.build)) {
        render();
        onChange?.();
        /* His line, the moment it is finished. The building is the delivery
         * mechanism for the writing — that is the point of the mechanic. */
        if (info?.note) said(info.name, info.note);
      }
    }));
}
