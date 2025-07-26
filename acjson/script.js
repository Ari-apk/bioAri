// --- Animal Company JSON Maker ---

let items = [];
let itemsById = {};
let filteredItems = [];

// Load items.json dynamically
fetch('items.json')
  .then(res => res.json())
  .then(data => {
    items = data;
    itemsById = Object.fromEntries(items.map(i => [i.id, i]));
    filteredItems = items;
    renderSlots();
    renderJSON();
  });

const statusEl = document.getElementById('actools-status');
const loadoutBtn = document.getElementById('loadout-btn');
const stashBtn = document.getElementById('stash-btn');
const slotsEl = document.getElementById('slots');
const jsonOutputEl = document.getElementById('json-output');
const copyBtn = document.getElementById('copy-json');
const downloadBtn = document.getElementById('download-json');
const importBtn = document.getElementById('import-json');
const generateBtn = document.getElementById('generate-json');
const jsonFileInput = document.getElementById('jsonFileInput');
const searchInput = document.getElementById('searchItemID');
const modeToggleBtn = document.getElementById('modeToggle');

let mode = 'loadout';
let loadout = {
  version: 1,
  leftHand: {},
  rightHand: {},
  leftHip: {},
  rightHip: {},
  back: {}
};
let stash = {
  itemID: ''
};

// Light/Dark mode
modeToggleBtn.onclick = () => {
  document.body.classList.toggle('light-mode');
  modeToggleBtn.textContent = document.body.classList.contains('light-mode') ? '🌞' : '🌙';
};

// ACTools status
async function fetchStatus() {
  try {
    const res = await fetch('https://ac.xmodding.org/api/proxy-status');
    const data = await res.json();
    if (data.online) {
      statusEl.innerHTML = '🟢 Online';
      statusEl.style.color = '#4f8cff';
    } else {
      statusEl.innerHTML = '🔴 Offline';
      statusEl.style.color = '#ff4f8c';
    }
  } catch (e) {
    statusEl.innerHTML = '🔴 Error';
    statusEl.style.color = '#ff4f8c';
  }
}
fetchStatus();

loadoutBtn.onclick = () => {
  mode = 'loadout';
  loadoutBtn.classList.add('active');
  stashBtn.classList.remove('active');
  renderSlots();
  renderJSON();
};
stashBtn.onclick = () => {
  mode = 'stash';
  stashBtn.classList.add('active');
  loadoutBtn.classList.remove('active');
  renderSlots();
  renderJSON();
};

searchInput.oninput = () => {
  const term = searchInput.value.toLowerCase();
  filteredItems = items.filter(i =>
    i.id.toLowerCase().includes(term) ||
    i.name.toLowerCase().includes(term) ||
    (i.category && i.category.toLowerCase().includes(term))
  );
  renderSlots();
};

function getItemFields(itemId) {
  const item = itemsById[itemId];
  if (!item) return [];
  const fields = [];
  if (item.category === 'Weapons' || item.category === 'Ammo') fields.push('ammo');
  if (item.id === 'item_rpg' || item.id === 'item_shredder') fields.push('state');
  if (item.id.startsWith('item_')) fields.push('colorHue', 'colorSaturation', 'scaleModifier');
  return [...new Set(fields)];
}

function renderSlots() {
  slotsEl.innerHTML = '';
  if (mode === 'loadout') {
    const slotDefs = [
      { key: 'leftHand', label: 'Left Hand' },
      { key: 'rightHand', label: 'Right Hand' },
      { key: 'leftHip', label: 'Left Hip' },
      { key: 'rightHip', label: 'Right Hip' },
      { key: 'back', label: 'Back' }
    ];
    slotDefs.forEach(slot => {
      slotsEl.appendChild(renderItemEditor(loadout[slot.key] || {}, val => {
        loadout[slot.key] = val;
        renderJSON();
      }, slot.label));
    });
  } else {
    slotsEl.appendChild(renderItemEditor(stash, val => {
      stash = val;
      renderJSON();
    }, 'Stash Item'));
  }
}

function renderItemEditor(obj, onChange, label) {
  const div = document.createElement('div');
  div.className = 'slot';
  div.style.display = 'flex';
  div.style.flexDirection = 'column';
  div.style.marginBottom = '0.7rem';

  if (label) {
    const l = document.createElement('div');
    l.textContent = label;
    l.style.fontWeight = 'bold';
    l.style.marginBottom = '0.2rem';
    div.appendChild(l);
  }

  // Item select + search
  const itemSelect = document.createElement('select');
  itemSelect.innerHTML = '<option value="">(none)</option>' +
    (filteredItems.length ? filteredItems : items).map(i => `<option value="${i.id}">${i.name} (${i.id})</option>`).join('');
  itemSelect.value = obj.itemID || '';
  itemSelect.onchange = e => {
    const newObj = { itemID: e.target.value };
    onChange(newObj);
    renderSlots();
  };
  div.appendChild(itemSelect);

  // Item info
  if (obj.itemID && itemsById[obj.itemID]) {
    const info = document.createElement('div');
    info.style.fontSize = '0.92em';
    info.style.color = '#b8e1ff';
    info.style.margin = '0.1em 0 0.2em 0';
    info.textContent = `${itemsById[obj.itemID].name} (${itemsById[obj.itemID].category}): ${itemsById[obj.itemID].description}`;
    div.appendChild(info);
  }

  // Dynamic fields
  const fields = getItemFields(obj.itemID);
  fields.forEach(field => {
    const wrap = document.createElement('div');
    wrap.style.display = 'flex';
    wrap.style.alignItems = 'center';
    wrap.style.marginBottom = '0.2rem';
    const input = document.createElement('input');
    input.type = 'number';
    input.placeholder = field;
    input.value = obj[field] !== undefined ? obj[field] : '';
    input.title = getFieldTooltip(field, obj.itemID);
    input.min = getFieldMin(field);
    input.max = getFieldMax(field);
    input.oninput = e => {
      const newObj = { ...obj, [field]: e.target.value === '' ? undefined : Number(e.target.value) };
      onChange(newObj);
      if (field === 'colorHue' || field === 'colorSaturation') updateColorPreview(div, newObj);
    };
    wrap.appendChild(input);
    // Color preview
    if (field === 'colorSaturation') {
      const colorBox = document.createElement('span');
      colorBox.className = 'color-preview';
      colorBox.style.marginLeft = '10px';
      colorBox.style.backgroundColor = getColorPreview(obj);
      colorBox.title = 'Live color preview';
      wrap.appendChild(colorBox);
    }
    div.appendChild(wrap);
  });

  // Children
  if (obj.itemID && (itemsById[obj.itemID]?.category === 'Bags' || Array.isArray(obj.children))) {
    const childrenArr = Array.isArray(obj.children) ? obj.children : [];
    const childrenDiv = document.createElement('div');
    childrenDiv.style.display = 'flex';
    childrenDiv.style.flexDirection = 'column';
    childrenDiv.style.gap = '0.2rem';
    childrenArr.forEach((child, idx) => {
      childrenDiv.appendChild(renderItemEditor(child, val => {
        const newChildren = [...childrenArr];
        if (val === null) newChildren.splice(idx, 1);
        else newChildren[idx] = val;
        onChange({ ...obj, children: newChildren });
      }));
    });
    // Add child button
    const addChildBtn = document.createElement('button');
    addChildBtn.innerHTML = '+';
    addChildBtn.className = 'add-child';
    addChildBtn.title = 'Add Child';
    addChildBtn.onclick = () => {
      onChange({ ...obj, children: [...childrenArr, {}] });
    };
    childrenDiv.appendChild(addChildBtn);
    div.appendChild(childrenDiv);
  }
  // Remove button (for children only)
  if (typeof label === 'undefined') {
    const removeBtn = document.createElement('button');
    removeBtn.innerHTML = '✕';
    removeBtn.className = 'remove-child';
    removeBtn.title = 'Remove Child';
    removeBtn.onclick = () => onChange(null);
    div.appendChild(removeBtn);
  }
  // Color preview update
  updateColorPreview(div, obj);
  return div;
}

function getColorPreview(obj) {
  const h = obj.colorHue || 0;
  const s = obj.colorSaturation || 0;
  return `hsl(${h}, ${s}%, 50%)`;
}
function updateColorPreview(div, obj) {
  const colorBox = div.querySelector('.color-preview');
  if (colorBox) colorBox.style.backgroundColor = getColorPreview(obj);
}

function getFieldTooltip(field, itemID) {
  switch (field) {
    case 'ammo': return 'Ammo count (for weapons)';
    case 'state':
      if (itemID === 'item_rpg') return 'RPG state: 1=Normal, 2=Egg, 3=Spearhead';
      if (itemID === 'item_shredder') return 'Shredder state (0-8000)';
      return 'State (see item docs)';
    case 'colorHue': return 'Color hue (0–210)';
    case 'colorSaturation': return 'Color saturation (0–120)';
    case 'scaleModifier': return 'Scale: -118 (tiny), 0 (normal), 117 (massive)';
    default: return '';
  }
}
function getFieldMin(field) {
  switch (field) {
    case 'colorHue': return 0;
    case 'colorSaturation': return 0;
    case 'scaleModifier': return -118;
    case 'state': return 0;
    default: return undefined;
  }
}
function getFieldMax(field) {
  switch (field) {
    case 'colorHue': return 210;
    case 'colorSaturation': return 120;
    case 'scaleModifier': return 117;
    case 'state': return 10000;
    default: return undefined;
  }
}

function renderJSON() {
  let obj = mode === 'loadout' ? loadout : stash;
  function clean(o) {
    if (Array.isArray(o)) {
      return o.map(clean).filter(x => x && Object.keys(x).length > 0);
    } else if (typeof o === 'object' && o !== null) {
      let out = {};
      for (let k in o) {
        if (o[k] !== undefined && o[k] !== null && !(typeof o[k] === 'object' && Object.keys(clean(o[k])).length === 0)) {
          out[k] = clean(o[k]);
        }
      }
      return out;
    } else {
      return o;
    }
  }
  jsonOutputEl.value = JSON.stringify(clean(obj), null, 2);
}

copyBtn.onclick = () => {
  navigator.clipboard.writeText(jsonOutputEl.value);
  copyBtn.textContent = 'Copied!';
  setTimeout(() => copyBtn.textContent = 'Copy JSON', 1200);
};
downloadBtn.onclick = () => {
  const blob = new Blob([jsonOutputEl.value], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = mode + '.json';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
};

// Import JSON
importBtn.onclick = () => jsonFileInput.click();
jsonFileInput.onchange = e => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = evt => {
    try {
      const data = JSON.parse(evt.target.result);
      if (mode === 'loadout') loadout = data;
      else stash = data;
      renderSlots();
      renderJSON();
    } catch (err) {
      alert('Invalid JSON');
    }
  };
  reader.readAsText(file);
};

generateBtn.onclick = () => renderJSON(); 