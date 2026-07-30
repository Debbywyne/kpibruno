/**
 * Konfigurasi Batas Bobot dan Aturan Kluster KPI
 * Mengatur batasan minimum/maksimum bobot (%) untuk tiap Level (L1 - L5)
 * serta batas item validasi untuk tiap Jabatan/Kluster.
 */

const KPI_RULES = {
  'BOD-2': {
    L1: { min: 0, max: 0 },    // Disabled / Tidak boleh diisi langsung di Form BOD-2
    L2: { min: 0, max: 0 },    // Disabled
    L3: { min: 5, max: 25 },   // Batas bobot per item L3
    L4: { min: 5, max: 20 },   // Batas bobot per item L4
    L5: { min: 0, max: 0 },    // Disabled
    itemMin: 8,
    itemMax: 15
  },
  'BOD-3': {
    L1: { min: 0, max: 0 },
    L2: { min: 0, max: 0 },
    L3: { min: 0, max: 0 },
    L4: { min: 5, max: 25 },   // Batas bobot per item L4
    L5: { min: 5, max: 20 },   // Batas bobot per item L5
    itemMin: 8,
    itemMax: 15
  },
  'BOD-4': {
    L1: { min: 0, max: 0 },
    L2: { min: 0, max: 0 },
    L3: { min: 0, max: 0 },
    L4: { min: 0, max: 0 },
    L5: { min: 5, max: 25 },   // Batas bobot per item L5
    itemMin: 5,
    itemMax: 12
  }
};

/**
 * Fungsi Validasi Aturan KPI
 * @param {string} cluster - Jenis Kluster (BOD-2, BOD-3, BOD-4)
 * @param {Array} items - Daftar item KPI [{ jenis: 'L3', bobot: 15 }, ...]
 * @returns {Object} - { isValid: boolean, errors: Array<string> }
 */
function validateKPI(cluster, items) {
  const errors = [];
  const rules = KPI_RULES[cluster];

  if (!rules) {
    return { isValid: false, errors: ['Kluster tidak valid atau tidak ditemukan.'] };
  }

  // 1. Validasi Total Bobot (Harus Tepat 100%)
  const totalBobot = items.reduce((sum, item) => sum + (parseFloat(item.bobot) || 0), 0);
  if (totalBobot !== 100) {
    errors.push(`Total akumulasi bobot saat ini ${totalBobot}%. Wajib bernilai tepat 100%.`);
  }

  // 2. Validasi Jumlah Item KPI yang Diizinkan
  const validLevelItems = items.filter(item => ['L3', 'L4', 'L5'].includes(item.jenis));
  if (validLevelItems.length < rules.itemMin || validLevelItems.length > rules.itemMax) {
    errors.push(`Jumlah item KPI (${validLevelItems.length}) harus berada di rentang ${rules.itemMin} - ${rules.itemMax} item.`);
  }

  // 3. Validasi Rentang Bobot Per Item Sesuai Level & Kluster
  items.forEach((item, index) => {
    const levelRule = rules[item.jenis];
    const itemBobot = parseFloat(item.bobot) || 0;

    if (!levelRule || (levelRule.min === 0 && levelRule.max === 0)) {
      errors.push(`Baris ${index + 1}: Level KPI (${item.jenis}) tidak diperbolehkan untuk kluster ${cluster}.`);
    } else if (itemBobot < levelRule.min || itemBobot > levelRule.max) {
      errors.push(`Baris ${index + 1}: Bobot Level ${item.jenis} (${itemBobot}%) harus berada di rentang ${levelRule.min}% - ${levelRule.max}%.`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors: errors
  };
}