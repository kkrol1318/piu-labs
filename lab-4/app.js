const COLUMNS = [
    { key: 'todo', title: 'Do zrobienia' },
    { key: 'doing', title: 'W trakcie' },
    { key: 'done', title: 'Zrobione' },
];

const STORAGE_KEY = 'piu-kanban-v1';

function randomPastel() {
    const h = Math.floor(Math.random() * 360);
    return `hsl(${h}deg 80% 90%)`;
}

function loadState() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
        try {
            return JSON.parse(raw);
        } catch {}
    }
    return {
        nextId: 1,
        columns: {
            todo: [],
            doing: [],
            done: [],
        },
    };
}

function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

let state = loadState();

const root = document.getElementById('kanban');

function render() {
    root.innerHTML = '';

    const colsWrap = document.createElement('section');
    colsWrap.className = 'kanban__cols';

    COLUMNS.forEach((col) => {
        const list = state.columns[col.key];

        const colEl = document.createElement('section');
        colEl.className = 'kanban__col';
        colEl.dataset.col = col.key;

        const head = document.createElement('header');
        head.className = 'kanban__head';
        head.innerHTML = `
      <span class="kanban__title">${col.title}</span>
      <span class="kanban__count" data-role="count">${list.length}</span>
    `;

        const actions = document.createElement('div');
        actions.className = 'kanban__actions';
        actions.innerHTML = `
      <button class="btn btn--accent" data-action="add">+ Dodaj kartę</button>
      <button class="btn" data-action="colorize">Koloruj kolumnę</button>
      <button class="btn" data-action="sort">Sortuj</button>
    `;

        const ul = document.createElement('div');
        ul.className = 'kanban__list';
        ul.dataset.role = 'list';

        if (list.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'empty';
            empty.textContent = 'Brak kart';
            ul.appendChild(empty);
        } else {
            list.forEach((card) => {
                ul.appendChild(renderCard(card, col.key));
            });
        }

        colEl.append(head, actions, ul);
        colsWrap.appendChild(colEl);
    });

    root.appendChild(colsWrap);
}

function renderCard(card, colKey) {
    const el = document.createElement('div');
    el.className = 'card';
    el.dataset.id = String(card.id);
    if (card.color) el.dataset.color = card.color;
    if (card.color) el.style.background = card.color;

    const title = document.createElement('div');
    title.className = 'card__title';
    title.contentEditable = 'true';
    title.spellcheck = false;
    title.textContent = card.title || 'Nowa karta';
    title.dataset.role = 'title';

    const ctrls = document.createElement('div');
    ctrls.className = 'card__controls';
    ctrls.innerHTML = `
    <button class="iconbtn iconbtn--go" title="W lewo" data-action="move-left">←</button>
    <button class="iconbtn iconbtn--go" title="W prawo" data-action="move-right">→</button>
    <button class="iconbtn" title="Kolor karty" data-action="color-one">🎨</button>
    <button class="iconbtn" title="Usuń kartę" data-action="remove">x</button>
  `;

    el.append(title, ctrls);
    return el;
}

function addCard(colKey) {
    const id = state.nextId++;
    const card = {
        id,
        title: 'Nowa karta',
        color: randomPastel(),
        createdAt: Date.now(),
    };
    state.columns[colKey].push(card);
    saveState();
    render();
}

function removeCard(id) {
    for (const col of COLUMNS) {
        const arr = state.columns[col.key];
        const i = arr.findIndex((c) => c.id === id);
        if (i >= 0) {
            arr.splice(i, 1);
            break;
        }
    }
    saveState();
    render();
}

function moveCard(id, dir) {
    let fromKey = null,
        idx = -1;
    for (const col of COLUMNS) {
        const i = state.columns[col.key].findIndex((c) => c.id === id);
        if (i >= 0) {
            fromKey = col.key;
            idx = i;
            break;
        }
    }
    if (!fromKey) return;

    const fromIdx = COLUMNS.findIndex((c) => c.key === fromKey);
    const toIdx = fromIdx + (dir === 'left' ? -1 : 1);
    if (toIdx < 0 || toIdx >= COLUMNS.length) return;

    const [card] = state.columns[fromKey].splice(idx, 1);
    state.columns[COLUMNS[toIdx].key].push(card);
    saveState();
    render();
}

function colorizeColumn(colKey) {
    const arr = state.columns[colKey];
    arr.forEach((c) => (c.color = randomPastel()));
    saveState();
    render();
}

function colorizeOne(id) {
    for (const col of COLUMNS) {
        const card = state.columns[col.key].find((c) => c.id === id);
        if (card) {
            card.color = randomPastel();
            break;
        }
    }
    saveState();
    render();
}

function sortColumn(colKey) {
    const arr = state.columns[colKey];
    arr.sort(
        (a, b) =>
            (a.title || '').localeCompare(b.title || '', 'pl', {
                sensitivity: 'base',
            }) || a.createdAt - b.createdAt
    );
    saveState();
    render();
}

root.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;

    const colEl = btn.closest('.kanban__col');
    const colKey = colEl?.dataset.col;

    const cardEl = btn.closest('.card');
    const id = cardEl ? Number(cardEl.dataset.id) : null;

    switch (btn.dataset.action) {
        case 'add':
            addCard(colKey);
            break;
        case 'colorize':
            colorizeColumn(colKey);
            break;
        case 'sort':
            sortColumn(colKey);
            break;

        case 'remove':
            if (id) removeCard(id);
            break;
        case 'move-left':
            if (id) moveCard(id, 'left');
            break;
        case 'move-right':
            if (id) moveCard(id, 'right');
            break;
        case 'color-one':
            if (id) colorizeOne(id);
            break;
    }
});

root.addEventListener('input', (e) => {
    const title = e.target.closest('[data-role="title"]');
    if (!title) return;
    const cardEl = title.closest('.card');
    const id = Number(cardEl.dataset.id);
    for (const col of COLUMNS) {
        const card = state.columns[col.key].find((c) => c.id === id);
        if (card) {
            card.title = title.textContent.trim();
            break;
        }
    }
    saveState();
});

render();
