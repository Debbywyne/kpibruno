let currentCluster = 'BOD-2';

document.addEventListener('DOMContentLoaded', () => {
  changeCluster();
  
  // Jika kontainer kosong, tambahkan akar L1
  const treeContainer = document.getElementById('treeContainer');
  if (treeContainer && treeContainer.querySelectorAll(':scope > [data-level="L1"]').length === 0) {
    addL1Root();
  }

  // Cek apakah ada draft saat halaman pertama kali dimuat
  try {
    if (localStorage.getItem('kpi_app_draft')) {
      setTimeout(() => {
        if (confirm('Ditemukan draft pengisian KPI tersimpan. Apakah Anda ingin memuat draft tersebut?')) {
          loadDraft();
        }
      }, 500);
    }
  } catch (e) {
    console.warn('LocalStorage tidak diizinkan atau tidak didukung di environment ini:', e);
  }
});

// ==========================================
// 1. FUNGSI UNDUH TEMPLATE EXCEL BERSAMA CONTOH DATA
// ==========================================
function downloadExcelTemplate() {
  if (typeof XLSX === 'undefined') {
    alert('Library SheetJS belum dimuat!');
    return;
  }

  const sampleData = [
    { "ID": "NODE-1", "Level": "L1", "Unit Owner": "ADHI", "Nama KPI": "Meningkatkan Ebitda Korporasi", "Parent ID": "" },
    { "ID": "NODE-2", "Level": "L2", "Unit Owner": "DIREKTORAT HC DAN LEGAL", "Nama KPI": "Optimalisasi Human Capital & HC Tech", "Parent ID": "NODE-1" },
    { "ID": "NODE-3", "Level": "L2", "Unit Owner": "DIREKTORAT KEUANGAN", "Nama KPI": "Pengendalian Efisiensi Biaya Operasional", "Parent ID": "NODE-1" },
    { "ID": "NODE-4", "Level": "L3", "Unit Owner": "DEPARTEMEN HC", "Nama KPI": "Implementasi Talent Management System", "Parent ID": "NODE-2" },
    { "ID": "NODE-5", "Level": "L4", "Unit Owner": "BOPH", "Nama KPI": "Penyusunan Framework Competency & Leadership", "Parent ID": "NODE-4" },
    { "ID": "NODE-6", "Level": "L3", "Unit Owner": "DEPARTEMEN KEUANGAN", "Nama KPI": "Penataan Liquidity Management & Cashflow", "Parent ID": "NODE-3" }
  ];

  const worksheet = XLSX.utils.json_to_sheet(sampleData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Template Tree KPI");
  XLSX.writeFile(workbook, "Template_Import_Tree_KPI.xlsx");
}

// ==========================================
// 2. FUNGSI UNTUK MEMBACA DAN IMPORT FILE EXCEL
// ==========================================
function handleExcelImport(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();

  reader.onload = function(e) {
    try {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });

      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];

      const rows = XLSX.utils.sheet_to_json(worksheet);

      if (rows.length === 0) {
        alert('File Excel kosong atau format kolom tidak sesuai!');
        return;
      }

      buildTreeFromExcelData(rows);

      event.target.value = ''; // Reset input
      showDraftNotice('Tree KPI berhasil di-import dari Excel!');

    } catch (err) {
      console.error('Gagal import file Excel:', err);
      alert('Gagal memproses file Excel. Pastikan menggunakan format template yang benar.');
    }
  };

  reader.readAsArrayBuffer(file);
}

// ==========================================
// 3. LOGIKA MEMBANGUN STRUKTUR TREE BERDASARKAN PARENT ID
// ==========================================
function buildTreeFromExcelData(rows) {
  const container = document.getElementById('treeContainer');
  if (!container) return;

  container.innerHTML = '';

  if (!rows || rows.length === 0) {
    alert("Data Excel kosong!");
    return;
  }

  const nodeDOMMap = {};

  rows.forEach((row, index) => {
    const id = row['ID'] ? String(row['ID']).trim() : ('node-' + Date.now() + '-' + index);
    const level = row['Level'] ? String(row['Level']).toUpperCase().trim() : 'L1';
    const owner = row['Unit Owner'] || '';
    const title = row['Nama KPI'] || '';
    const parentId = row['Parent ID'] ? String(row['Parent ID']).trim() : null;

    const nodeData = { id, level, owner, title, parentId, children: [] };
    const nodeElement = deserializeNode(nodeData);
    
    nodeDOMMap[id] = { element: nodeElement, parentId };
  });

  Object.keys(nodeDOMMap).forEach(id => {
    const item = nodeDOMMap[id];
    const parentId = item.parentId;

    if (!parentId || !nodeDOMMap[parentId]) {
      container.appendChild(item.element);
    } else {
      const parentElement = nodeDOMMap[parentId].element;
      let childrenContainer = parentElement.querySelector('.children-container') || parentElement;
      childrenContainer.appendChild(item.element);
    }
  });

  // Beri jeda agar DOM ter-render sempurna sebelum mengisi dropdown Halaman 2
  setTimeout(() => {
    populateParentDropdowns();
    if (typeof runValidation === 'function') runValidation();
  }, 100);
}

// ==========================================
// 4. LOGIKA SINKRONISASI DROPDOWN HALAMAN 2
// ==========================================
function populateParentDropdowns() {
  const rows = document.querySelectorAll('#kpiTableBody tr');
  rows.forEach(tr => populateParentDropdown(tr));
}

function populateParentDropdown(tr) {
  const levelSelect = tr.querySelector('.kpi-level');
  const parentSelect = tr.querySelector('.kpi-parent') || tr.querySelector('.kpi-parent-select');
  if (!levelSelect || !parentSelect) return;

  const selectedLevel = levelSelect.value;
  const parentLevelMap = { 'L1': null, 'L2': 'L1', 'L3': 'L2', 'L4': 'L3', 'L5': 'L4' };
  const parentLevel = parentLevelMap[selectedLevel];

  const currentVal = parentSelect.value;
  parentSelect.innerHTML = '';

  if (!parentLevel) {
    parentSelect.innerHTML = `<option value="">-- Tanpa Induk (L1) --</option>`;
    parentSelect.disabled = true;
  } else {
    parentSelect.disabled = false;
    parentSelect.innerHTML = `<option value="">-- Pilih Induk ${parentLevel} --</option>`;

    const parentNodes = document.querySelectorAll(`#treeContainer [data-level="${parentLevel}"]`);
    parentNodes.forEach(node => {
      const titleInput = node.querySelector('.node-title');
      const titleVal = titleInput ? titleInput.value.trim() : '';
      if (titleVal) {
        const opt = document.createElement('option');
        opt.value = node.id;
        opt.textContent = `[${parentLevel}] ${titleVal}`;
        parentSelect.appendChild(opt);
      }
    });
  }

  if (currentVal && Array.from(parentSelect.options).some(o => o.value === currentVal)) {
    parentSelect.value = currentVal;
  }

  onParentChange(parentSelect);
}

function onParentChange(parentElem) {
  const tr = parentElem.closest('tr');
  if (!tr) return;

  const levelSelect = tr.querySelector('.kpi-level');
  const ownerSelect = tr.querySelector('.kpi-owner') || tr.querySelector('.kpi-owner-select');
  if (!levelSelect || !ownerSelect) return;

  const selectedLevel = levelSelect.value;
  const parentId = parentElem.value;
  const currentOwnerVal = ownerSelect.value;

  ownerSelect.innerHTML = `<option value="">-- Pilih Owner --</option>`;

  let eligibleNodes = [];
  if (selectedLevel === 'L1') {
    eligibleNodes = Array.from(document.querySelectorAll('#treeContainer > [data-level="L1"]'));
  } else if (parentId) {
    const parentNode = document.getElementById(parentId);
    if (parentNode) {
      eligibleNodes = Array.from(parentNode.querySelectorAll(`:scope > .children-container > [data-level="${selectedLevel}"]`));
    }
  }

  const uniqueOwners = new Set();
  eligibleNodes.forEach(node => {
    const ownerElem = node.querySelector('.node-owner');
    const ownerVal = ownerElem ? ownerElem.value.trim() : '';
    if (ownerVal) uniqueOwners.add(ownerVal);
  });

  uniqueOwners.forEach(ownerName => {
    const opt = document.createElement('option');
    opt.value = ownerName;
    opt.textContent = ownerName;
    ownerSelect.appendChild(opt);
  });

  if (currentOwnerVal && Array.from(ownerSelect.options).some(o => o.value === currentOwnerVal)) {
    ownerSelect.value = currentOwnerVal;
  }

  onOwnerChange(ownerSelect);
}

function onOwnerChange(ownerElem) {
  const tr = ownerElem.closest('tr');
  if (!tr) return;

  const levelSelect = tr.querySelector('.kpi-level');
  const parentSelect = tr.querySelector('.kpi-parent') || tr.querySelector('.kpi-parent-select');
  const responSelect = tr.querySelector('.kpi-respon') || tr.querySelector('.kpi-child-select');

  if (!levelSelect || !responSelect) return;

  const selectedLevel = levelSelect.value;
  const parentId = parentSelect ? parentSelect.value : '';
  const selectedOwner = ownerElem.value;
  const currentResponVal = responSelect.value;

  responSelect.innerHTML = `<option value="">-- Pilih Respon KPI ${selectedLevel} --</option>`;

  if (!selectedOwner) {
    responSelect.disabled = true;
    return;
  }

  let eligibleNodes = [];
  if (selectedLevel === 'L1') {
    eligibleNodes = Array.from(document.querySelectorAll('#treeContainer > [data-level="L1"]'));
  } else if (parentId) {
    const parentNode = document.getElementById(parentId);
    if (parentNode) {
      eligibleNodes = Array.from(parentNode.querySelectorAll(`:scope > .children-container > [data-level="${selectedLevel}"]`));
    }
  }

  let countKPI = 0;
  eligibleNodes.forEach(node => {
    const nodeOwnerElem = node.querySelector('.node-owner');
    const nodeTitleElem = node.querySelector('.node-title');
    const nodeOwner = nodeOwnerElem ? nodeOwnerElem.value.trim() : '';
    const nodeTitle = nodeTitleElem ? nodeTitleElem.value.trim() : '';

    if (nodeOwner === selectedOwner && nodeTitle) {
      const opt = document.createElement('option');
      opt.value = node.id;
      opt.textContent = nodeTitle;
      responSelect.appendChild(opt);
      countKPI++;
    }
  });

  responSelect.disabled = countKPI === 0;

  if (currentResponVal && Array.from(responSelect.options).some(o => o.value === currentResponVal)) {
    responSelect.value = currentResponVal;
  }
}

// ==========================================
// FITUR SAVE & LOAD DRAFT GLOBAL
// ==========================================

function saveDraft() {
  try {
    const treeContainer = document.getElementById('treeContainer');
    const draftData = {
      cluster: currentCluster,
      treeData: treeContainer ? serializeTree(treeContainer) : [],
      formData: serializeForm()
    };

    localStorage.setItem('kpi_app_draft', JSON.stringify(draftData));
    showDraftNotice('Draft Pemetaan & Form Detail berhasil disimpan!');
  } catch (err) {
    console.error('Gagal menyimpan draft:', err);
    alert('Gagal menyimpan draft! Pastikan browser Anda mengizinkan penyimpanan lokal (LocalStorage).');
  }
}

function loadDraft() {
  try {
    const saved = localStorage.getItem('kpi_app_draft');
    if (!saved) {
      alert('Tidak ditemukan draft tersimpan di browser ini!');
      return;
    }

    const draftData = JSON.parse(saved);

    if (draftData.cluster) {
      const clusterSelect = document.getElementById('clusterSelect');
      if (clusterSelect) {
        clusterSelect.value = draftData.cluster;
        currentCluster = draftData.cluster;
      }
    }

    if (draftData.treeData && draftData.treeData.length > 0) {
      const container = document.getElementById('treeContainer');
      if (container) {
        container.innerHTML = '';
        draftData.treeData.forEach(nodeData => {
          container.appendChild(deserializeNode(nodeData));
        });
      }
    }

    if (draftData.formData) {
      const tbody = document.getElementById('kpiTableBody');
      if (tbody) {
        tbody.innerHTML = '';
        draftData.formData.forEach(item => {
          addKPIRow(item);
        });
      }
    }

    runValidation();
    showDraftNotice('Draft berhasil dimuat kembali!');
  } catch (err) {
    console.error('Gagal memuat draft:', err);
    alert('Gagal membaca data draft.');
  }
}

function showDraftNotice(msg) {
  const notice = document.getElementById('draftNotice');
  const noticeText = document.getElementById('draftNoticeText');
  if (notice && noticeText) {
    noticeText.innerHTML = `<i class="fa-solid fa-circle-check text-emerald-600 me-1"></i> ${msg}`;
    notice.classList.remove('hidden');
    setTimeout(() => { 
      notice.classList.add('hidden'); 
    }, 4000);
  } else {
    alert(msg);
  }
}

function serializeTree(containerElem) {
  const nodes = [];
  const childNodes = containerElem.querySelectorAll(':scope > .node-block');

  childNodes.forEach(node => {
    const level = node.getAttribute('data-level');
    const ownerElem = node.querySelector('.node-owner');
    const titleElem = node.querySelector('.node-title');
    const childrenContainer = node.querySelector(':scope > .children-container');

    nodes.push({
      id: node.id,
      level: level,
      owner: ownerElem ? ownerElem.value : '',
      title: titleElem ? titleElem.value : '',
      children: childrenContainer ? serializeTree(childrenContainer) : []
    });
  });

  return nodes;
}

function deserializeNode(data) {
  const tempContainer = document.createElement('div');
  const nextLevelMap = { 'L1': 'L2', 'L2': 'L3', 'L3': 'L4', 'L4': 'L5' };
  const badgeColorMap = { 'L1': 'bg-palette-teal text-white', 'L2': 'bg-palette-coral text-white', 'L3': 'bg-palette-teal text-white', 'L4': 'bg-palette-gold text-teal-900', 'L5': 'bg-purple-600 text-white' };
  const borderColorMap = { 'L1': 'border-palette-teal', 'L2': 'border-palette-coral', 'L3': 'border-palette-teal', 'L4': 'border-palette-gold', 'L5': 'border-purple-600' };

  const nextLevel = nextLevelMap[data.level];
  const addButtonHTML = nextLevel ? `
    <button type="button" onclick="addChildNode('${data.id}', '${nextLevel}')" class="btn-teal text-xs px-2.5 py-1 rounded-lg font-bold shrink-0 shadow-sm flex items-center gap-1">
      <i class="fa-solid fa-plus"></i> Respon ${nextLevel}
    </button>
  ` : '';

  const nodeHTML = `
    <div class="glass-card rounded-2xl p-4 border-l-4 ${borderColorMap[data.level]} relative node-block shadow-md my-2" id="${data.id}" data-level="${data.level}">
      <div class="flex items-center gap-3">
        <span class="${badgeColorMap[data.level]} font-black px-2.5 py-1 rounded-lg text-xs shrink-0 shadow-sm">${data.level}</span>
        ${renderOwnerField(data.level)}
        <input type="text" class="flex-1 glass-input rounded-lg px-3 py-1.5 text-sm font-semibold node-title" placeholder="Nama KPI ${data.level}..." value="${data.title || ''}" onkeyup="populateParentDropdowns()">
        ${addButtonHTML}
        <button type="button" onclick="removeTreeNode('${data.id}')" class="text-rose-600 hover:text-rose-800 px-2 transition-colors"><i class="fa-solid fa-trash"></i></button>
      </div>
      <div class="children-container pl-6 border-l-2 border-teal-600/30 space-y-3 mt-3"></div>
    </div>
  `;

  tempContainer.innerHTML = nodeHTML.trim();
  const nodeElem = tempContainer.firstChild;

  const ownerInput = nodeElem.querySelector('.node-owner');
  if (ownerInput && data.owner) ownerInput.value = data.owner;

  if (data.children && data.children.length > 0) {
    const childrenContainer = nodeElem.querySelector('.children-container');
    data.children.forEach(childData => {
      childrenContainer.appendChild(deserializeNode(childData));
    });
  }

  return nodeElem;
}

function serializeForm() {
  const rows = document.querySelectorAll('#kpiTableBody tr');
  let items = [];

  rows.forEach(tr => {
    const parentSelect = tr.querySelector('.kpi-parent') || tr.querySelector('.kpi-parent-select');
    const ownerSelect = tr.querySelector('.kpi-owner') || tr.querySelector('.kpi-owner-select');
    const responSelect = tr.querySelector('.kpi-respon') || tr.querySelector('.kpi-child-select');

    items.push({
      level: tr.querySelector('.kpi-level') ? tr.querySelector('.kpi-level').value : '',
      parent: parentSelect ? parentSelect.value : '',
      owner: ownerSelect ? ownerSelect.value : '',
      child: responSelect ? responSelect.value : '',
      target: tr.querySelector('.kpi-target') ? tr.querySelector('.kpi-target').value : '',
      bobot: tr.querySelector('.kpi-bobot') ? tr.querySelector('.kpi-bobot').value : 0
    });
  });

  return items;
}

// ==========================================
// NAVIGASI TAB & ATURAN
// ==========================================

function switchTab(tabIndex) {
  [1, 2, 3].forEach(i => {
    const btn = document.getElementById(`tabBtn${i}`);
    const page = document.getElementById(`page${i}`);
    if (i === tabIndex) {
      if (btn) {
        btn.className = "py-3 px-6 font-bold rounded-xl text-teal-900 bg-white/90 shadow-md flex items-center gap-2 whitespace-nowrap transition-all border border-white";
        const badge = btn.querySelector('span');
        if (badge) badge.className = "bg-palette-teal text-white rounded-lg w-6 h-6 text-xs flex items-center justify-center font-black";
      }
      if (page) page.classList.remove('hidden');
    } else {
      if (btn) {
        btn.className = "py-3 px-6 font-semibold rounded-xl text-teal-900/70 hover:bg-white/40 flex items-center gap-2 whitespace-nowrap transition-all";
        const badge = btn.querySelector('span');
        if (badge) badge.className = "bg-teal-900/20 text-teal-900 rounded-lg w-6 h-6 text-xs flex items-center justify-center font-bold";
      }
      if (page) page.classList.add('hidden');
    }
  });

  if (tabIndex === 2) {
    updateAllKPIRowsRules();
    populateParentDropdowns();
    runValidation();
  } else if (tabIndex === 3) {
    renderInteractiveTree();
  }
}

function changeCluster() {
  const clusterSelect = document.getElementById('clusterSelect');
  if (!clusterSelect) return;

  currentCluster = clusterSelect.value;

  const levelSelects = document.querySelectorAll('#kpiTableBody .kpi-level');
  levelSelects.forEach(select => {
    if (typeof generateLevelOptions === 'function') {
      const currentVal = select.value;
      select.innerHTML = generateLevelOptions();
      
      const hasOption = Array.from(select.options).some(opt => opt.value === currentVal && !opt.disabled);
      if (hasOption) select.value = currentVal;
    }
  });

  if (typeof runValidation === 'function') {
    runValidation();
  }
}

function renderOwnerField(level) {
  if (level === 'L1') {
    return `<input type="text" readonly value="ADHI" class="node-owner w-32 glass-input text-gray-700 rounded-lg px-2.5 py-1 text-xs font-bold">`;
  } else if (level === 'L2') {
    return `<input type="text" readonly value="DIREKTORAT HC DAN LEGAL" class="node-owner w-52 glass-input text-gray-700 rounded-lg px-2.5 py-1 text-xs font-bold">`;
  } else if (level === 'L3') {
    return `<input type="text" readonly value="DEPARTEMEN HC" class="node-owner w-40 glass-input text-gray-700 rounded-lg px-2.5 py-1 text-xs font-bold">`;
  } else if (level === 'L4') {
    return `
      <select class="node-owner border rounded-lg px-2.5 py-1 text-xs font-bold glass-input text-teal-900" onchange="populateParentDropdowns()">
        <option value="BOSH">BOSH</option>
        <option value="BPHC">BPHC</option>
        <option value="BMT">BMT</option>
        <option value="BPHI">BPHI</option>
      </select>
    `;
  } else if (level === 'L5') {
    return `<input type="text" placeholder="Fungsi Biro..." class="node-owner w-36 glass-input text-gray-800 rounded-lg px-2.5 py-1 text-xs font-semibold" onkeyup="populateParentDropdowns()">`;
  }
}

// ==========================================
// TREE BUILDER (HALAMAN 1)
// ==========================================

function addL1Root() {
  const container = document.getElementById('treeContainer');
  if (!container) return;
  
  const rootId = 'node-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4);

  const rootHTML = `
    <div class="glass-card rounded-2xl p-4 border-l-4 border-palette-teal relative node-block shadow-md my-2" id="${rootId}" data-level="L1">
      <div class="flex items-center gap-3">
        <span class="bg-palette-teal text-white font-black px-2.5 py-1 rounded-lg text-xs shrink-0 shadow-sm">L1</span>
        ${renderOwnerField('L1')}
        <input type="text" class="flex-1 glass-input rounded-lg px-3 py-1.5 text-sm font-semibold node-title" placeholder="Nama KPI Level 1 (Korporasi)..." onkeyup="populateParentDropdowns()">
        <button type="button" onclick="addChildNode('${rootId}', 'L2')" class="btn-coral text-white text-xs px-3 py-1.5 rounded-lg font-bold shrink-0 shadow-sm flex items-center gap-1">
          <i class="fa-solid fa-plus"></i> Respon L2
        </button>
        <button type="button" onclick="removeTreeNode('${rootId}')" class="text-rose-600 hover:text-rose-800 px-2 transition-colors"><i class="fa-solid fa-trash"></i></button>
      </div>
      <div class="children-container pl-6 border-l-2 border-teal-600/30 space-y-3 mt-3"></div>
    </div>
  `;
  container.insertAdjacentHTML('beforeend', rootHTML);
}

function addChildNode(parentId, childLevel) {
  const parentNode = document.getElementById(parentId);
  if (!parentNode) return;

  const childrenContainer = parentNode.querySelector(':scope > .children-container');
  const childId = 'node-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4);

  const nextLevelMap = { 'L2': 'L3', 'L3': 'L4', 'L4': 'L5' };
  const nextLevel = nextLevelMap[childLevel];

  const badgeColorMap = { 'L2': 'bg-palette-coral text-white', 'L3': 'bg-palette-teal text-white', 'L4': 'bg-palette-gold text-teal-900', 'L5': 'bg-purple-600 text-white' };
  const borderColorMap = { 'L2': 'border-palette-coral', 'L3': 'border-palette-teal', 'L4': 'border-palette-gold', 'L5': 'border-purple-600' };

  const addButtonHTML = nextLevel ? `
    <button type="button" onclick="addChildNode('${childId}', '${nextLevel}')" class="btn-teal text-xs px-2.5 py-1 rounded-lg font-bold shrink-0 shadow-sm flex items-center gap-1">
      <i class="fa-solid fa-plus"></i> Respon ${nextLevel}
    </button>
  ` : '';

  const childHTML = `
    <div class="glass-card rounded-xl p-3 border-l-4 ${borderColorMap[childLevel]} relative node-block shadow-sm my-2" id="${childId}" data-level="${childLevel}">
      <div class="flex items-center gap-3">
        <span class="${badgeColorMap[childLevel]} font-bold px-2 py-0.5 rounded-lg text-[11px] shrink-0 shadow-sm">${childLevel}</span>
        ${renderOwnerField(childLevel)}
        <input type="text" class="flex-1 glass-input rounded-lg px-3 py-1 text-sm font-medium node-title" placeholder="Nama Respon KPI ${childLevel}..." onkeyup="populateParentDropdowns()">
        ${addButtonHTML}
        <button type="button" onclick="removeTreeNode('${childId}')" class="text-rose-600 hover:text-rose-800 px-2 text-xs transition-colors"><i class="fa-solid fa-trash"></i></button>
      </div>
      <div class="children-container pl-6 border-l-2 border-teal-600/30 space-y-3 mt-3"></div>
    </div>
  `;

  childrenContainer.insertAdjacentHTML('beforeend', childHTML);
}

function removeTreeNode(nodeId) {
  const node = document.getElementById(nodeId);
  if (node) {
    node.remove();
    populateParentDropdowns();
  }
}

// ==========================================
// FORM TABEL DETAIL (HALAMAN 2)
// ==========================================

function addKPIRow(data = {}) {
  const tbody = document.getElementById('kpiTableBody');
  if (!tbody) return;

  const tr = document.createElement('tr');
  tr.className = "border-b border-gray-100 hover:bg-slate-50/50 transition";

  tr.innerHTML = `
    <td class="p-2">
      <select class="kpi-level glass-input text-xs font-semibold text-slate-700 rounded-lg p-1.5 w-full" onchange="onLevelSelectChange(this)">
        ${generateLevelOptions()}
      </select>
    </td>
    <td class="p-2">
      <select class="kpi-parent glass-input text-xs text-slate-700 rounded-lg p-1.5 w-full" onchange="onParentChange(this)">
        <option value="">-- Pilih Induk --</option>
      </select>
    </td>
    <td class="p-2">
      <select class="kpi-owner glass-input text-xs text-slate-700 rounded-lg p-1.5 w-full" onchange="onOwnerChange(this)">
        <option value="">-- Pilih Owner --</option>
      </select>
    </td>
    <td class="p-2">
      <select class="kpi-respon glass-input text-xs text-slate-700 rounded-lg p-1.5 w-full">
        <option value="">-- Pilih Respon KPI --</option>
      </select>
    </td>
    <td class="p-2">
      <input type="text" class="kpi-target glass-input text-xs text-slate-700 rounded-lg p-1.5 w-full" placeholder="Target..." value="${data.target || ''}">
    </td>
    <td class="p-2">
      <input type="number" class="kpi-bobot glass-input text-xs font-bold text-teal-900 rounded-lg p-1.5 w-20 text-center" value="${data.bobot || 0}" min="0" max="100" onchange="runValidation()" onkeyup="runValidation()">
    </td>
    <td class="p-2 text-center">
      <button onclick="deleteRow(this)" class="text-rose-500 hover:text-rose-700 p-1">
        <i class="fa-solid fa-trash"></i>
      </button>
    </td>
  `;

  tbody.appendChild(tr);

  if (data.level) {
    const levelSelect = tr.querySelector('.kpi-level');
    if (levelSelect) levelSelect.value = data.level;
  }

  populateParentDropdown(tr);

  if (data.parent) {
    const parentSelect = tr.querySelector('.kpi-parent');
    if (parentSelect) {
      parentSelect.value = data.parent;
      onParentChange(parentSelect);
    }
  }

  if (data.owner) {
    const ownerSelect = tr.querySelector('.kpi-owner');
    if (ownerSelect) {
      ownerSelect.value = data.owner;
      onOwnerChange(ownerSelect);
    }
  }

  if (data.child) {
    const responSelect = tr.querySelector('.kpi-respon');
    if (responSelect) responSelect.value = data.child;
  }

  runValidation();
}

function deleteRow(btn) {
  const tr = btn.closest('tr');
  if (tr) {
    tr.remove();
    runValidation();
  }
}

function updateAllKPIRowsRules() {
  const rows = document.querySelectorAll('#kpiTableBody tr');
  rows.forEach(tr => updateKPIRowRules(tr));
}

function updateKPIRowRules(tr) {
  const levelSelect = tr.querySelector('.kpi-level');
  if (!levelSelect || typeof KPI_RULES === 'undefined' || !KPI_RULES[currentCluster]) return;
  const clusterRules = KPI_RULES[currentCluster];

  Array.from(levelSelect.options).forEach(opt => {
    const lvlRule = clusterRules[opt.value];
    if (lvlRule && lvlRule.min === 0 && lvlRule.max === 0) {
      opt.disabled = true;
      opt.textContent = `${opt.value} (Disabled)`;
    } else if (lvlRule) {
      opt.disabled = false;
      opt.textContent = `${opt.value} (${lvlRule.min}% - ${lvlRule.max}%)`;
    }
  });

  if (levelSelect.selectedOptions[0] && levelSelect.selectedOptions[0].disabled) {
    const validOpt = Array.from(levelSelect.options).find(o => !o.disabled);
    if (validOpt) levelSelect.value = validOpt.value;
  }

  populateParentDropdown(tr);
}

function onLevelSelectChange(selectElem) {
  const tr = selectElem.closest('tr');
  if (tr) populateParentDropdown(tr);
  runValidation();
}

function runValidation() {
  const clusterSelect = document.getElementById('clusterSelect');
  const activeCluster = clusterSelect ? clusterSelect.value : currentCluster;

  const rows = document.querySelectorAll('#kpiTableBody tr');
  const items = [];

  rows.forEach(row => {
    const levelSelect = row.querySelector('.kpi-level');
    const bobotInput = row.querySelector('.kpi-bobot');

    if (levelSelect && bobotInput) {
      items.push({
        jenis: levelSelect.value,
        bobot: parseFloat(bobotInput.value) || 0
      });
    }
  });

  const result = typeof validateKPI === 'function' ? validateKPI(activeCluster, items) : { isValid: false, errors: [] };

  const itemsNonL1L2 = items.filter(item => ['L3', 'L4', 'L5'].includes(item.jenis));
  const totalBobot = items.reduce((sum, item) => sum + (parseFloat(item.bobot) || 0), 0);

  const itemCounter = document.getElementById('itemCounter');
  if (itemCounter) {
    itemCounter.textContent = `${itemsNonL1L2.length} / Max 15 Item (L3-L5)`;
  }

  const bobotCounter = document.getElementById('bobotCounter');
  if (bobotCounter) {
    bobotCounter.textContent = `${totalBobot}% / 100%`;
  }

  const validationBox = document.getElementById('validationBox');
  const pdfBtn = document.getElementById('pdfBtn');

  if (!validationBox) return;

  validationBox.innerHTML = '';

  if (result.isValid) {
    validationBox.innerHTML = `
      <li class="text-emerald-700 flex items-center gap-1.5 font-semibold">
        <i class="fa-solid fa-circle-check"></i> Semua kriteria KPI kluster ${activeCluster} terpenuhi!
      </li>`;
  } else {
    result.errors.forEach(err => {
      validationBox.innerHTML += `
        <li class="text-rose-600 flex items-start gap-1.5 font-semibold">
          <i class="fa-solid fa-triangle-exclamation mt-0.5"></i>
          <span>${err}</span>
        </li>`;
    });
  }

  if (pdfBtn) {
    pdfBtn.disabled = !result.isValid;
  }
}

// ==========================================
// EXPORT EXCEL & PDF
// ==========================================

function exportToExcel() {
  const rows = document.querySelectorAll('#kpiTableBody tr');
  let excelData = [];

  rows.forEach(tr => {
    const parentSelect = tr.querySelector('.kpi-parent') || tr.querySelector('.kpi-parent-select');
    const responSelect = tr.querySelector('.kpi-respon') || tr.querySelector('.kpi-child-select');
    const ownerSelect = tr.querySelector('.kpi-owner') || tr.querySelector('.kpi-owner-select');
    const targetInput = tr.querySelector('.kpi-target');
    const bobotInput = tr.querySelector('.kpi-bobot');

    const parentText = (!parentSelect || parentSelect.disabled) ? '-' : (parentSelect.options[parentSelect.selectedIndex]?.text || '-');
    const ownerText = ownerSelect ? (ownerSelect.value || '-') : '-';
    const childText = responSelect ? (responSelect.options[responSelect.selectedIndex]?.text || '-') : '-';

    excelData.push({
      "Level": tr.querySelector('.kpi-level') ? tr.querySelector('.kpi-level').value : '-',
      "KPI Induk (Parent)": parentText,
      "Unit Owner": ownerText,
      "Respon KPI": childText,
      "Target": targetInput ? targetInput.value : '',
      "Bobot (%)": bobotInput ? bobotInput.value + "%" : '0%'
    });
  });

  if (typeof XLSX !== 'undefined') {
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Form KPI Org");
    XLSX.writeFile(workbook, `KPI_Report_${currentCluster}.xlsx`);
  } else {
    alert('Library SheetJS (XLSX) belum terisi dengan benar.');
  }
}

function exportToPDF() {
  const element = document.createElement('div');
  element.className = 'p-6 bg-white';

  let tableRowsHTML = '';
  document.querySelectorAll('#kpiTableBody tr').forEach(tr => {
    const parentSelect = tr.querySelector('.kpi-parent') || tr.querySelector('.kpi-parent-select');
    const responSelect = tr.querySelector('.kpi-respon') || tr.querySelector('.kpi-child-select');
    const ownerSelect = tr.querySelector('.kpi-owner') || tr.querySelector('.kpi-owner-select');
    const targetInput = tr.querySelector('.kpi-target');
    const bobotInput = tr.querySelector('.kpi-bobot');

    const parentText = (!parentSelect || parentSelect.disabled) ? '-' : (parentSelect.options[parentSelect.selectedIndex]?.text || '-');
    const ownerText = ownerSelect ? (ownerSelect.value || '-') : '-';
    const childText = responSelect ? (responSelect.options[responSelect.selectedIndex]?.text || '-') : '-';

    tableRowsHTML += `
      <tr>
        <td style="border: 1px solid #ccc; padding: 6px;">${tr.querySelector('.kpi-level')?.value || '-'}</td>
        <td style="border: 1px solid #ccc; padding: 6px;">${parentText}</td>
        <td style="border: 1px solid #ccc; padding: 6px;">${ownerText}</td>
        <td style="border: 1px solid #ccc; padding: 6px;">${childText}</td>
        <td style="border: 1px solid #ccc; padding: 6px;">${targetInput?.value || ''}</td>
        <td style="border: 1px solid #ccc; padding: 6px;">${bobotInput?.value || 0}%</td>
      </tr>
    `;
  });

  element.innerHTML = `
    <h2 style="text-align: center; font-weight: bold; margin-bottom: 5px; color: #249d8f;">FORM PENILAIAN KEY PERFORMANCE INDICATOR (KPI)</h2>
    <p style="text-align: center; font-size: 12px; margin-bottom: 20px;">Kluster: <strong>${currentCluster}</strong></p>

    <table style="width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 30px;">
      <thead>
        <tr style="background-color: #fdf0d5;">
          <th style="border: 1px solid #ccc; padding: 6px;">Level</th>
          <th style="border: 1px solid #ccc; padding: 6px;">KPI Induk</th>
          <th style="border: 1px solid #ccc; padding: 6px;">Unit Owner</th>
          <th style="border: 1px solid #ccc; padding: 6px;">Respon KPI</th>
          <th style="border: 1px solid #ccc; padding: 6px;">Target</th>
          <th style="border: 1px solid #ccc; padding: 6px;">Bobot (%)</th>
        </tr>
      </thead>
      <tbody>${tableRowsHTML}</tbody>
    </table>

    <br><br>
    <div style="display: flex; justify-content: space-between; font-size: 12px; margin-top: 40px; padding: 0 20px;">
      <div style="text-align: center;">
        <p>Pembuat (Karyawan),</p><br><br><br><p>_______________________</p>
      </div>
      <div style="text-align: center;">
        <p>Mengetahui (Atasan),</p><br><br><br><p>_______________________</p>
      </div>
    </div>
  `;

  if (typeof html2pdf !== 'undefined') {
    html2pdf().from(element).save(`Form_KPI_${currentCluster}.pdf`);
  } else {
    alert('Library html2pdf belum dimuat.');
  }
}

// ==========================================
// VISUALISASI TREE CHART (HALAMAN 3)
// ==========================================

function renderInteractiveTree() {
  const container = document.getElementById('tree_chart_container');
  if (!container) return;

  const rootNodes = document.querySelectorAll('#treeContainer > [data-level="L1"]');

  if (rootNodes.length === 0) {
    container.innerHTML = `<div class="flex items-center justify-center h-48 text-teal-900/60 font-medium">Belum ada data KPI di Halaman 1.</div>`;
    return;
  }

  let html = `<div class="flex flex-col gap-8 min-w-max p-2">`;
  rootNodes.forEach(root => { html += buildNodeTreeHTML(root); });
  html += `</div>`;
  container.innerHTML = html;
}

function buildNodeTreeHTML(node) {
  const level = node.getAttribute('data-level');
  const titleElem = node.querySelector('.node-title');
  const ownerElem = node.querySelector('.node-owner');

  const title = (titleElem && titleElem.value.trim()) ? titleElem.value.trim() : `(Tanpa Nama ${level})`;
  const owner = (ownerElem && ownerElem.value.trim()) ? ownerElem.value.trim() : '-';

  const badgeColors = { 'L1': 'bg-palette-teal text-white', 'L2': 'bg-palette-coral text-white', 'L3': 'bg-palette-teal text-white', 'L4': 'bg-palette-gold text-teal-900', 'L5': 'bg-purple-600 text-white' };
  const borderLeftColors = { 'L1': 'border-l-palette-teal', 'L2': 'border-l-palette-coral', 'L3': 'border-l-palette-teal', 'L4': 'border-l-palette-gold', 'L5': 'border-l-purple-600' };

  const children = node.querySelectorAll(':scope > .children-container > .node-block');

  let childrenHTML = '';
  if (children.length > 0) {
    childrenHTML = `<div class="flex flex-col gap-3 pl-8 border-l-2 border-teal-600/30 ml-4 my-2 relative">`;
    children.forEach(child => { childrenHTML += buildNodeTreeHTML(child); });
    childrenHTML += `</div>`;
  }

  return `
    <div class="tree-branch flex flex-col group">
      <div class="tree-card glass-card rounded-xl p-3 shadow-md flex flex-col gap-1.5 w-fit min-w-[320px] max-w-[650px] border-l-4 ${borderLeftColors[level]}">
        <div class="flex items-center gap-2">
          <span class="${badgeColors[level]} font-black text-[10px] px-2 py-0.5 rounded-md uppercase shadow-sm">${level}</span>
          <span class="bg-white/80 text-teal-900 font-bold text-[11px] px-2 py-0.5 rounded-md border border-white/90">
            <i class="fa-solid fa-building me-1 text-teal-600"></i>${owner}
          </span>
        </div>
        <span class="text-sm font-bold text-gray-800 group-hover:text-teal-800 transition-colors leading-snug">${title}</span>
      </div>
      ${childrenHTML}
    </div>
  `;
}

function generateLevelOptions() {
  const clusterSelect = document.getElementById('clusterSelect');
  const activeCluster = clusterSelect ? clusterSelect.value : currentCluster;
  const rules = (typeof KPI_RULES !== 'undefined') ? KPI_RULES[activeCluster] : null;

  const levels = ['L1', 'L2', 'L3', 'L4', 'L5'];
  let optionsHTML = '';

  levels.forEach(level => {
    if (rules && rules[level]) {
      const rule = rules[level];
      if (rule.min === 0 && rule.max === 0) {
        optionsHTML += `<option value="${level}" disabled>${level} (Disabled)</option>`;
      } else {
        optionsHTML += `<option value="${level}">${level} (${rule.min}% - ${rule.max}%)</option>`;
      }
    } else {
      optionsHTML += `<option value="${level}">${level}</option>`;
    }
  });

  return optionsHTML;
}