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

  // Sample Data mencakup kasus: 1 L1 direspon oleh 2 L2
  const sampleData = [
    {
      "ID": "NODE-1",
      "Level": "L1",
      "Unit Owner": "ADHI",
      "Nama KPI": "Meningkatkan Ebitda Korporasi",
      "Parent ID": ""
    },
    {
      "ID": "NODE-2",
      "Level": "L2",
      "Unit Owner": "DIREKTORAT HC DAN LEGAL",
      "Nama KPI": "Optimalisasi Human Capital & HC Tech",
      "Parent ID": "NODE-1" // Respon L2 Pertama ke NODE-1
    },
    {
      "ID": "NODE-3",
      "Level": "L2",
      "Unit Owner": "DIREKTORAT KEUANGAN",
      "Nama KPI": "Pengendalian Efisiensi Biaya Operasional",
      "Parent ID": "NODE-1" // Respon L2 Kedua ke NODE-1
    },
    {
      "ID": "NODE-4",
      "Level": "L3",
      "Unit Owner": "DEPARTEMEN HC",
      "Nama KPI": "Implementasi Talent Management System",
      "Parent ID": "NODE-2" // Anak dari Respon L2 Pertama
    },
    {
      "ID": "NODE-5",
      "Level": "L4",
      "Unit Owner": "BOPH",
      "Nama KPI": "Penyusunan Framework Competency & Leadership",
      "Parent ID": "NODE-4"
    },
    {
      "ID": "NODE-6",
      "Level": "L3",
      "Unit Owner": "DEPARTEMEN KEUANGAN",
      "Nama KPI": "Penataan Liquidity Management & Cashflow",
      "Parent ID": "NODE-3" // Anak dari Respon L2 Kedua
    }
  ];

  const worksheet = XLSX.utils.json_to_sheet(sampleData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Template Tree KPI");

  // Download File
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

  const nodeDOMMap = {};

  rows.forEach(row => {
    // ... (kode pembacaan baris excel kamu) ...
  });

  // ==========================================
  // TAMBAHKAN SINKRONISASI INI DI PALING BAWAH
  // ==========================================
  if (typeof changeCluster === 'function') {
    changeCluster(); // Memaksa pembaruan seluruh dropdown level & validasi sesuai kluster aktif
  } else {
    runValidation();
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

    // Restore Kluster
    if (draftData.cluster) {
      const clusterSelect = document.getElementById('clusterSelect');
      if (clusterSelect) {
        clusterSelect.value = draftData.cluster;
        currentCluster = draftData.cluster;
      }
    }

    // Restore Page 1 (Tree Builder)
    if (draftData.treeData && draftData.treeData.length > 0) {
      const container = document.getElementById('treeContainer');
      if (container) {
        container.innerHTML = '';
        draftData.treeData.forEach(nodeData => {
          container.appendChild(deserializeNode(nodeData));
        });
      }
    }

    // Restore Page 2 (Form Detail Tabel)
    if (draftData.formData) {
      const tbody = document.getElementById('kpiTableBody');
      if (tbody) {
        tbody.innerHTML = '';
        draftData.formData.forEach(item => {
          addKPIRow();
          const tr = tbody.lastElementChild;

          if (tr) {
            const levelSelect = tr.querySelector('.kpi-level');
            if (levelSelect) {
              levelSelect.value = item.level;
              onLevelSelectChange(levelSelect);
            }

            const parentSelect = tr.querySelector('.kpi-parent-select');
            if (parentSelect && item.parent) {
              parentSelect.value = item.parent;
              onParentSelectChange(parentSelect);
            }

            const ownerSelect = tr.querySelector('.kpi-owner-select');
            if (ownerSelect && item.owner) {
              ownerSelect.value = item.owner;
              onOwnerSelectChange(ownerSelect);
            }

            const childSelect = tr.querySelector('.kpi-child-select');
            if (childSelect && item.child) {
              childSelect.value = item.child;
            }

            const targetInput = tr.querySelector('.kpi-target');
            if (targetInput) targetInput.value = item.target || '';

            const bobotInput = tr.querySelector('.kpi-bobot');
            if (bobotInput) bobotInput.value = item.bobot || 0;
          }
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

// SERIALISASI POHON & FORM
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
        <input type="text" class="flex-1 glass-input rounded-lg px-3 py-1.5 text-sm font-semibold node-title" placeholder="Nama KPI ${data.level}..." value="${data.title || ''}">
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
    items.push({
      level: tr.querySelector('.kpi-level') ? tr.querySelector('.kpi-level').value : '',
      parent: tr.querySelector('.kpi-parent-select') ? tr.querySelector('.kpi-parent-select').value : '',
      owner: tr.querySelector('.kpi-owner-select') ? tr.querySelector('.kpi-owner-select').value : '',
      child: tr.querySelector('.kpi-child-select') ? tr.querySelector('.kpi-child-select').value : '',
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
    runValidation();
  } else if (tabIndex === 3) {
    renderInteractiveTree();
  }
}

function changeCluster() {
  // Update isi dropdown level di seluruh baris tabel yang ada
  const levelSelects = document.querySelectorAll('#kpiTableBody .kpi-level');
  levelSelects.forEach(select => {
    const currentVal = select.value;
    select.innerHTML = generateLevelOptions();

    // Jika nilai sebelumnya masih valid (tidak disabled), pertahankan. Jika disabled, pilih nilai enabled pertama.
    const currentOpt = Array.from(select.options).find(opt => opt.value === currentVal);
    if (currentOpt && !currentOpt.disabled) {
      select.value = currentVal;
    } else {
      const firstEnabled = Array.from(select.options).find(opt => !opt.disabled);
      if (firstEnabled) select.value = firstEnabled.value;
    }
  });

  // Jalankan validasi ulang
  runValidation();
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
      <select class="node-owner border rounded-lg px-2.5 py-1 text-xs font-bold glass-input text-teal-900">
        <option value="BOSH">BOSH</option>
        <option value="BPHC">BPHC</option>
        <option value="BMT">BMT</option>
        <option value="BPHI">BPHI</option>
      </select>
    `;
  } else if (level === 'L5') {
    return `<input type="text" placeholder="Fungsi Biro..." class="node-owner w-36 glass-input text-gray-800 rounded-lg px-2.5 py-1 text-xs font-semibold">`;
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
    <div class="glass-card rounded-2xl p-4 border-l-4 border-palette-teal relative node-block shadow-md" id="${rootId}" data-level="L1">
      <div class="flex items-center gap-3">
        <span class="bg-palette-teal text-white font-black px-2.5 py-1 rounded-lg text-xs shrink-0 shadow-sm">L1</span>
        ${renderOwnerField('L1')}
        <input type="text" class="flex-1 glass-input rounded-lg px-3 py-1.5 text-sm font-semibold node-title" placeholder="Nama KPI Level 1 (Korporasi)...">
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
    <div class="glass-card rounded-xl p-3 border-l-4 ${borderColorMap[childLevel]} relative node-block shadow-sm" id="${childId}" data-level="${childLevel}">
      <div class="flex items-center gap-3">
        <span class="${badgeColorMap[childLevel]} font-bold px-2 py-0.5 rounded-lg text-[11px] shrink-0 shadow-sm">${childLevel}</span>
        ${renderOwnerField(childLevel)}
        <input type="text" class="flex-1 glass-input rounded-lg px-3 py-1 text-sm font-medium node-title" placeholder="Nama Respon KPI ${childLevel}...">
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
  if (node) node.remove();
}

// ==========================================
// FORM TABEL DETAIL (HALAMAN 2)
// ==========================================

function addKPIRow(data = {}) {
  const tbody = document.getElementById('kpiTableBody');
  if (!tbody) return;

  const tr = document.createElement('tr');
  tr.className = "border-b border-gray-100 hover:bg-slate-50/50 transition";

  // Gunakan generateLevelOptions() agar selalu sinkron dengan kluster aktif
  tr.innerHTML = `
    <td class="p-2">
      <select class="kpi-level glass-input text-xs font-semibold text-slate-700 rounded-lg p-1.5 w-full" onchange="runValidation()">
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

  // Set nilai level jika ada data (misal saat import/load)
  if (data.level) {
    const levelSelect = tr.querySelector('.kpi-level');
    if (levelSelect) levelSelect.value = data.level;
  }

  // Panggil validasi dan pemutakhiran dropdown parent
  runValidation();
  if (typeof populateParentDropdowns === 'function') {
    populateParentDropdowns();
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

function populateParentDropdown(tr) {
  const selectedLevel = tr.querySelector('.kpi-level').value;
  const parentSelect = tr.querySelector('.kpi-parent-select');
  if (!parentSelect) return;

  const parentLevelMap = { 'L1': null, 'L2': 'L1', 'L3': 'L2', 'L4': 'L3', 'L5': 'L4' };
  const parentLevel = parentLevelMap[selectedLevel];

  parentSelect.innerHTML = '';

  if (!parentLevel) {
    parentSelect.innerHTML = `<option value="">-- Tanpa Induk (L1) --</option>`;
    parentSelect.disabled = true;
    populateOwnerDropdown(tr);
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

    populateOwnerDropdown(tr);
  }
}

function onParentSelectChange(selectElem) {
  const tr = selectElem.closest('tr');
  if (tr) populateOwnerDropdown(tr);
}

function populateOwnerDropdown(tr) {
  const selectedLevel = tr.querySelector('.kpi-level').value;
  const parentId = tr.querySelector('.kpi-parent-select').value;
  const ownerSelect = tr.querySelector('.kpi-owner-select');
  if (!ownerSelect) return;

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

  if (uniqueOwners.size === 1) {
    ownerSelect.selectedIndex = 1;
  }

  populateChildDropdown(tr);
}

function onOwnerSelectChange(selectElem) {
  const tr = selectElem.closest('tr');
  if (tr) populateChildDropdown(tr);
}

function populateChildDropdown(tr) {
  const selectedLevel = tr.querySelector('.kpi-level').value;
  const parentId = tr.querySelector('.kpi-parent-select').value;
  const selectedOwner = tr.querySelector('.kpi-owner-select').value;
  const childSelect = tr.querySelector('.kpi-child-select');
  if (!childSelect) return;

  childSelect.innerHTML = `<option value="">-- Pilih Respon KPI ${selectedLevel} --</option>`;

  if (!selectedOwner) {
    childSelect.disabled = true;
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
      childSelect.appendChild(opt);
      countKPI++;
    }
  });

  childSelect.disabled = countKPI === 0;
}

function removeRow(id) {
  const row = document.getElementById(id);
  if (row) row.remove();
}

function runValidation() {
  const clusterSelect = document.getElementById('clusterSelect');
  const activeCluster = clusterSelect ? clusterSelect.value : 'BOD-3';

  // 1. Ambil data dari tabel Halaman 2
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

  // 2. Jalankan fungsi validasi langsung (akan langsung mengecek batas % min & max walau items masih kosong)
  const result = typeof validateKPI === 'function' ? validateKPI(activeCluster, items) : { isValid: false, errors: [] };

  // 3. Hitung Item Non-L1/L2 & Total Bobot untuk Counter
  const itemsNonL1L2 = items.filter(item => ['L3', 'L4', 'L5'].includes(item.jenis));
  const totalBobot = items.reduce((sum, item) => sum + (parseFloat(item.bobot) || 0), 0);

  // 4. Update Angka di UI Counter Sidebar
  const itemCounter = document.getElementById('itemCounter');
  if (itemCounter) {
    itemCounter.textContent = `${itemsNonL1L2.length} / Max 15 Item (L3-L5)`;
  }

  const bobotCounter = document.getElementById('bobotCounter');
  if (bobotCounter) {
    bobotCounter.textContent = `${totalBobot}% / 100%`;
  }

  // 5. Render Catatan Kepatuhan Langsung di HTML
  const validationBox = document.getElementById('validationBox');
  const pdfBtn = document.getElementById('pdfBtn');

  if (!validationBox) return;

  validationBox.innerHTML = ''; // Kosongkan wadah sebelum diisi ulang

  if (result.isValid) {
    validationBox.innerHTML = `
      <li class="text-emerald-700 flex items-center gap-1.5 font-semibold">
        <i class="fa-solid fa-circle-check"></i> Semua kriteria KPI kluster ${activeCluster} terpenuhi!
      </li>`;
  } else {
    // Tampilkan seluruh daftar error/peringatan dari validateKPI
    result.errors.forEach(err => {
      validationBox.innerHTML += `
        <li class="text-rose-600 flex items-start gap-1.5 font-semibold">
          <i class="fa-solid fa-triangle-exclamation mt-0.5"></i>
          <span>${err}</span>
        </li>`;
    });
  }

  // 6. Update status tombol PDF
  if (pdfBtn) {
    pdfBtn.disabled = !result.isValid;
  }
}

// Panggil langsung saat pertama kali web dimuat
document.addEventListener('DOMContentLoaded', () => {
  runValidation();
});

function updateSidebarUI(result, items) {
  let totalBobot = items.reduce((acc, curr) => acc + curr.bobot, 0);
  let countL35 = items.filter(i => ['L3','L4','L5'].includes(i.jenis)).length;

  const itemCounter = document.getElementById('itemCounter');
  const bobotCounter = document.getElementById('bobotCounter');
  if (itemCounter) itemCounter.textContent = `${countL35} / (8 - 15 Item)`;
  if (bobotCounter) bobotCounter.textContent = `${totalBobot}% / 100%`;

  const pdfBtn = document.getElementById('pdfBtn');
  const valBox = document.getElementById('validationBox');

  if (!valBox) return;
  valBox.innerHTML = '';

  if (result.isValid) {
    if (pdfBtn) pdfBtn.disabled = false;
    valBox.innerHTML = `<li class="p-3 rounded-xl bg-teal-500/20 text-teal-900 border border-teal-500/30 font-bold flex items-center gap-2 shadow-sm"><i class="fa-solid fa-circle-check text-palette-teal"></i> Form valid & siap di-download!</li>`;
  } else {
    if (pdfBtn) pdfBtn.disabled = true;
    result.errors.forEach(err => {
      valBox.innerHTML += `<li class="p-2.5 rounded-xl bg-coral-500/20 text-rose-900 border border-coral-500/30 flex items-start gap-2 shadow-sm"><i class="fa-solid fa-circle-xmark text-palette-coral mt-0.5"></i> <span>${err}</span></li>`;
    });
  }
}

// ==========================================
// EXPORT EXCEL & PDF
// ==========================================

function exportToExcel() {
  const rows = document.querySelectorAll('#kpiTableBody tr');
  let excelData = [];

  rows.forEach(tr => {
    const parentSelect = tr.querySelector('.kpi-parent-select');
    const childSelect = tr.querySelector('.kpi-child-select');
    const ownerSelect = tr.querySelector('.kpi-owner-select');
    const targetInput = tr.querySelector('.kpi-target');
    const bobotInput = tr.querySelector('.kpi-bobot');

    const parentText = (!parentSelect || parentSelect.disabled) ? '-' : (parentSelect.options[parentSelect.selectedIndex]?.text || '-');
    const ownerText = ownerSelect ? (ownerSelect.value || '-') : '-';
    const childText = childSelect ? (childSelect.options[childSelect.selectedIndex]?.text || '-') : '-';

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
    const parentSelect = tr.querySelector('.kpi-parent-select');
    const childSelect = tr.querySelector('.kpi-child-select');
    const ownerSelect = tr.querySelector('.kpi-owner-select');
    const targetInput = tr.querySelector('.kpi-target');
    const bobotInput = tr.querySelector('.kpi-bobot');

    const parentText = (!parentSelect || parentSelect.disabled) ? '-' : (parentSelect.options[parentSelect.selectedIndex]?.text || '-');
    const ownerText = ownerSelect ? (ownerSelect.value || '-') : '-';
    const childText = childSelect ? (childSelect.options[childSelect.selectedIndex]?.text || '-') : '-';

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
// Fungsi untuk merender opsi dropdown Level berdasarkan Kluster Aktif
function generateLevelOptions() {
  const clusterSelect = document.getElementById('clusterSelect');
  const activeCluster = clusterSelect ? clusterSelect.value : 'BOD-3';
  const rules = KPI_RULES[activeCluster];

  if (!rules) return '';

  const levels = ['L1', 'L2', 'L3', 'L4', 'L5'];
  let optionsHTML = '';

  levels.forEach(level => {
    const rule = rules[level];
    if (rule.min === 0 && rule.max === 0) {
      // Jika diblokir (0%), beri label (Disabled) dan atur atribut disabled
      optionsHTML += `<option value="${level}" disabled>${level} (Disabled)</option>`;
    } else {
      // Tampilkan rentang min - max yang sesuai matriks
      optionsHTML += `<option value="${level}">${level} (${rule.min}% - ${rule.max}%)</option>`;
    }
  });

  return optionsHTML;
}