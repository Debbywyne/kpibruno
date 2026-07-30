let currentCluster = 'BOD-2';

document.addEventListener('DOMContentLoaded', () => {
  changeCluster();
  if (document.querySelectorAll('#treeContainer > [data-level="L1"]').length === 0) {
    addL1Root();
  }

  // Otomatis tawarkan muat draft jika ditemukan data tersimpan
  if (localStorage.getItem('kpi_app_draft')) {
    setTimeout(() => {
      if (confirm('Ditemukan draft pengisian KPI tersimpan. Apakah Anda ingin memuat draft tersebut?')) {
        loadDraft();
      }
    }, 400);
  }
});

// ==========================================
// FITUR SAVE & LOAD DRAFT GLOBAL (PAGE 1 & 2)
// ==========================================

function saveDraft() {
  const draftData = {
    cluster: currentCluster,
    treeData: serializeTree(document.getElementById('treeContainer')),
    formData: serializeForm()
  };

  localStorage.setItem('kpi_app_draft', JSON.stringify(draftData));
  showDraftNotice('Draft Pemetaan (Page 1) & Form Detail (Page 2) berhasil disimpan!');
}

function loadDraft() {
  const saved = localStorage.getItem('kpi_app_draft');
  if (!saved) {
    alert('Tidak ditemukan draft tersimpan di browser ini!');
    return;
  }

  try {
    const draftData = JSON.parse(saved);

    // Restore Kluster
    if (draftData.cluster) {
      document.getElementById('clusterSelect').value = draftData.cluster;
      currentCluster = draftData.cluster;
    }

    // Restore Page 1 (Pohon Pemetaan)
    if (draftData.treeData && draftData.treeData.length > 0) {
      const container = document.getElementById('treeContainer');
      container.innerHTML = '';
      draftData.treeData.forEach(nodeData => {
        container.appendChild(deserializeNode(nodeData));
      });
    }

    // Restore Page 2 (Form Tabel Detail)
    if (draftData.formData) {
      const tbody = document.getElementById('kpiTableBody');
      tbody.innerHTML = '';

      draftData.formData.forEach(item => {
        addKPIRow();
        const tr = tbody.lastElementChild;

        tr.querySelector('.kpi-level').value = item.level;
        onLevelSelectChange(tr.querySelector('.kpi-level'));

        if (item.parent) tr.querySelector('.kpi-parent-select').value = item.parent;
        onParentSelectChange(tr.querySelector('.kpi-parent-select'));

        if (item.owner) tr.querySelector('.kpi-owner-select').value = item.owner;
        onOwnerSelectChange(tr.querySelector('.kpi-owner-select'));

        if (item.child) tr.querySelector('.kpi-child-select').value = item.child;
        tr.querySelector('.kpi-target').value = item.target || '';
        tr.querySelector('.kpi-bobot').value = item.bobot || 0;
      });
    }

    runValidation();
    showDraftNotice('Draft Page 1 & Page 2 berhasil dimuat kembali!');
  } catch (err) {
    console.error(err);
    alert('Gagal membaca data draft.');
  }
}

function showDraftNotice(msg) {
  const notice = document.getElementById('draftNotice');
  const noticeText = document.getElementById('draftNoticeText');
  if (notice && noticeText) {
    noticeText.innerHTML = `<i class="fa-solid fa-circle-check text-emerald-600 me-1"></i> ${msg}`;
    notice.classList.remove('hidden');
    setTimeout(() => { notice.classList.add('hidden'); }, 4000);
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
    <button onclick="addChildNode('${data.id}', '${nextLevel}')" class="btn-teal text-xs px-2.5 py-1 rounded-lg font-bold shrink-0 shadow-sm flex items-center gap-1">
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
        <button onclick="removeTreeNode('${data.id}')" class="text-rose-600 hover:text-rose-800 px-2 transition-colors"><i class="fa-solid fa-trash"></i></button>
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
      level: tr.querySelector('.kpi-level').value,
      parent: tr.querySelector('.kpi-parent-select').value,
      owner: tr.querySelector('.kpi-owner-select').value,
      child: tr.querySelector('.kpi-child-select').value,
      target: tr.querySelector('.kpi-target').value,
      bobot: tr.querySelector('.kpi-bobot').value
    });
  });

  return items;
}

// ==========================================
// NAVIGASI & ATURAN
// ==========================================

function switchTab(tabIndex) {
  [1, 2, 3].forEach(i => {
    const btn = document.getElementById(`tabBtn${i}`);
    const page = document.getElementById(`page${i}`);
    if (i === tabIndex) {
      btn.className = "py-3 px-6 font-bold rounded-xl text-teal-900 bg-white/90 shadow-md flex items-center gap-2 whitespace-nowrap transition-all border border-white";
      btn.querySelector('span').className = "bg-palette-teal text-white rounded-lg w-6 h-6 text-xs flex items-center justify-center font-black";
      page.classList.remove('hidden');
    } else {
      btn.className = "py-3 px-6 font-semibold rounded-xl text-teal-900/70 hover:bg-white/40 flex items-center gap-2 whitespace-nowrap transition-all";
      btn.querySelector('span').className = "bg-teal-900/20 text-teal-900 rounded-lg w-6 h-6 text-xs flex items-center justify-center font-bold";
      page.classList.add('hidden');
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
  currentCluster = document.getElementById('clusterSelect').value;
  updateAllKPIRowsRules();
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
  const rootId = 'node-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4);

  const rootHTML = `
    <div class="glass-card rounded-2xl p-4 border-l-4 border-palette-teal relative node-block shadow-md" id="${rootId}" data-level="L1">
      <div class="flex items-center gap-3">
        <span class="bg-palette-teal text-white font-black px-2.5 py-1 rounded-lg text-xs shrink-0 shadow-sm">L1</span>
        ${renderOwnerField('L1')}
        <input type="text" class="flex-1 glass-input rounded-lg px-3 py-1.5 text-sm font-semibold node-title" placeholder="Nama KPI Level 1 (Korporasi)...">
        <button onclick="addChildNode('${rootId}', 'L2')" class="btn-coral text-white text-xs px-3 py-1.5 rounded-lg font-bold shrink-0 shadow-sm flex items-center gap-1">
          <i class="fa-solid fa-plus"></i> Respon L2
        </button>
        <button onclick="removeTreeNode('${rootId}')" class="text-rose-600 hover:text-rose-800 px-2 transition-colors"><i class="fa-solid fa-trash"></i></button>
      </div>
      <div class="children-container pl-6 border-l-2 border-teal-600/30 space-y-3 mt-3"></div>
    </div>
  `;
  container.insertAdjacentHTML('beforeend', rootHTML);
}

function addChildNode(parentId, childLevel) {
  const parentNode = document.getElementById(parentId);
  const childrenContainer = parentNode.querySelector(':scope > .children-container');
  const childId = 'node-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4);

  const nextLevelMap = { 'L2': 'L3', 'L3': 'L4', 'L4': 'L5' };
  const nextLevel = nextLevelMap[childLevel];

  const badgeColorMap = { 'L2': 'bg-palette-coral text-white', 'L3': 'bg-palette-teal text-white', 'L4': 'bg-palette-gold text-teal-900', 'L5': 'bg-purple-600 text-white' };
  const borderColorMap = { 'L2': 'border-palette-coral', 'L3': 'border-palette-teal', 'L4': 'border-palette-gold', 'L5': 'border-purple-600' };

  const addButtonHTML = nextLevel ? `
    <button onclick="addChildNode('${childId}', '${nextLevel}')" class="btn-teal text-xs px-2.5 py-1 rounded-lg font-bold shrink-0 shadow-sm flex items-center gap-1">
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
        <button onclick="removeTreeNode('${childId}')" class="text-rose-600 hover:text-rose-800 px-2 text-xs transition-colors"><i class="fa-solid fa-trash"></i></button>
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

function addKPIRow() {
  const tbody = document.getElementById('kpiTableBody');
  const rowId = 'kpi-' + Date.now();
  const tr = document.createElement('tr');
  tr.id = rowId;
  tr.className = "hover:bg-white/40 transition-colors";

  tr.innerHTML = `
    <td class="p-2 border-b border-white/40">
      <select class="w-full glass-input rounded-lg p-1.5 text-xs font-bold kpi-level" onchange="onLevelSelectChange(this)">
        <option value="L1">L1</option>
        <option value="L2">L2</option>
        <option value="L3">L3</option>
        <option value="L4">L4</option>
        <option value="L5">L5</option>
      </select>
    </td>
    <td class="p-2 border-b border-white/40">
      <select class="w-full glass-input rounded-lg p-1.5 text-xs font-medium kpi-parent-select" onchange="onParentSelectChange(this)">
        <option value="">-- Tanpa Induk --</option>
      </select>
    </td>
    <td class="p-2 border-b border-white/40">
      <select class="w-full glass-input rounded-lg p-1.5 text-xs font-bold text-teal-900 kpi-owner-select" onchange="onOwnerSelectChange(this)">
        <option value="">-- Pilih Owner --</option>
      </select>
    </td>
    <td class="p-2 border-b border-white/40">
      <select class="w-full glass-input rounded-lg p-1.5 text-xs font-medium kpi-child-select" disabled>
        <option value="">-- Pilih Respon KPI --</option>
      </select>
    </td>
    <td class="p-2 border-b border-white/40">
      <input type="text" class="w-full glass-input rounded-lg p-1.5 text-xs font-medium kpi-target" placeholder="Target...">
    </td>
    <td class="p-2 border-b border-white/40">
      <input type="number" min="0" max="100" class="w-full glass-input rounded-lg p-1.5 text-xs font-bold text-center kpi-bobot" value="0" oninput="runValidation()">
    </td>
    <td class="p-2 border-b border-white/40 text-center">
      <button onclick="removeRow('${rowId}'); runValidation();" class="text-rose-600 hover:text-rose-800 transition-colors"><i class="fa-solid fa-trash"></i></button>
    </td>
  `;
  tbody.appendChild(tr);
  updateKPIRowRules(tr);
  runValidation();
}

function updateAllKPIRowsRules() {
  const rows = document.querySelectorAll('#kpiTableBody tr');
  rows.forEach(tr => updateKPIRowRules(tr));
}

function updateKPIRowRules(tr) {
  const levelSelect = tr.querySelector('.kpi-level');
  if (typeof KPI_RULES === 'undefined' || !KPI_RULES[currentCluster]) return;
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
  populateParentDropdown(tr);
  runValidation();
}

function populateParentDropdown(tr) {
  const selectedLevel = tr.querySelector('.kpi-level').value;
  const parentSelect = tr.querySelector('.kpi-parent-select');

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
      const titleVal = node.querySelector('.node-title').value.trim();
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
  populateOwnerDropdown(tr);
}

function populateOwnerDropdown(tr) {
  const selectedLevel = tr.querySelector('.kpi-level').value;
  const parentId = tr.querySelector('.kpi-parent-select').value;
  const ownerSelect = tr.querySelector('.kpi-owner-select');

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
    const ownerVal = node.querySelector('.node-owner').value.trim();
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
  populateChildDropdown(tr);
}

function populateChildDropdown(tr) {
  const selectedLevel = tr.querySelector('.kpi-level').value;
  const parentId = tr.querySelector('.kpi-parent-select').value;
  const selectedOwner = tr.querySelector('.kpi-owner-select').value;
  const childSelect = tr.querySelector('.kpi-child-select');

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
    const nodeOwner = node.querySelector('.node-owner').value.trim();
    const nodeTitle = node.querySelector('.node-title').value.trim();

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
  const rows = document.querySelectorAll('#kpiTableBody tr');
  let items = [];

  rows.forEach(tr => {
    const jenis = tr.querySelector('.kpi-level').value;
    const bobot = parseFloat(tr.querySelector('.kpi-bobot').value) || 0;
    items.push({ jenis, bobot });
  });

  const result = typeof validateKPI !== 'undefined' ? validateKPI(currentCluster, items) : { isValid: true, errors: [] };
  updateSidebarUI(result, items);
}

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
// EXPORT EXCEL DAN PDF
// ==========================================

function exportToExcel() {
  const rows = document.querySelectorAll('#kpiTableBody tr');
  let excelData = [];

  rows.forEach(tr => {
    const parentSelect = tr.querySelector('.kpi-parent-select');
    const childSelect = tr.querySelector('.kpi-child-select');
    const ownerSelect = tr.querySelector('.kpi-owner-select');

    const parentText = parentSelect.disabled ? '-' : (parentSelect.options[parentSelect.selectedIndex]?.text || '-');
    const ownerText = ownerSelect.value || '-';
    const childText = childSelect.options[childSelect.selectedIndex]?.text || '-';

    excelData.push({
      "Level": tr.querySelector('.kpi-level').value,
      "KPI Induk (Parent)": parentText,
      "Unit Owner": ownerText,
      "Respon KPI": childText,
      "Target": tr.querySelector('.kpi-target').value,
      "Bobot (%)": tr.querySelector('.kpi-bobot').value + "%"
    });
  });

  const worksheet = XLSX.utils.json_to_sheet(excelData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Form KPI Org");
  XLSX.writeFile(workbook, `KPI_Report_${currentCluster}.xlsx`);
}

function exportToPDF() {
  const element = document.createElement('div');
  element.className = 'p-6 bg-white';

  let tableRowsHTML = '';
  document.querySelectorAll('#kpiTableBody tr').forEach(tr => {
    const parentSelect = tr.querySelector('.kpi-parent-select');
    const childSelect = tr.querySelector('.kpi-child-select');
    const ownerSelect = tr.querySelector('.kpi-owner-select');

    const parentText = parentSelect.disabled ? '-' : (parentSelect.options[parentSelect.selectedIndex]?.text || '-');
    const ownerText = ownerSelect.value || '-';
    const childText = childSelect.options[childSelect.selectedIndex]?.text || '-';

    tableRowsHTML += `
      <tr>
        <td style="border: 1px solid #ccc; padding: 6px;">${tr.querySelector('.kpi-level').value}</td>
        <td style="border: 1px solid #ccc; padding: 6px;">${parentText}</td>
        <td style="border: 1px solid #ccc; padding: 6px;">${ownerText}</td>
        <td style="border: 1px solid #ccc; padding: 6px;">${childText}</td>
        <td style="border: 1px solid #ccc; padding: 6px;">${tr.querySelector('.kpi-target').value}</td>
        <td style="border: 1px solid #ccc; padding: 6px;">${tr.querySelector('.kpi-bobot').value}%</td>
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

  html2pdf().from(element).save(`Form_KPI_${currentCluster}.pdf`);
}

// ==========================================
// VISUALISASI HIERARKI (HALAMAN 3)
// ==========================================

function renderInteractiveTree() {
  const container = document.getElementById('tree_chart_container');
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
  const title = node.querySelector('.node-title').value.trim() || `(Tanpa Nama ${level})`;
  const owner = node.querySelector('.node-owner').value.trim() || '-';

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