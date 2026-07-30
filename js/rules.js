/**
 * Konfigurasi Batas Bobot Akumulasi (%) dan Aturan Kluster KPI (BOD-1 s.d. BOD-5)
 * Sesuai dengan Tabel Matriks Ketentuan Kluster
 */

const KPI_RULES = {
  'BOD-1': {
    L1: { min: 10, max: 15 },
    L2: { min: 20, max: 35 },
    L3: { min: 50, max: 70 },
    L4: { min: 0,  max: 0  },
    L5: { min: 0,  max: 0  },
    maxItemsNonL1L2: 15
  },
  'BOD-2': {
    L1: { min: 5,  max: 10 },
    L2: { min: 10, max: 20 },
    L3: { min: 25, max: 40 },
    L4: { min: 40, max: 60 },
    L5: { min: 0,  max: 0  },
    maxItemsNonL1L2: 15
  },
  'BOD-3': {
    L1: { min: 0,  max: 0  },
    L2: { min: 5,  max: 10 },
    L3: { min: 15, max: 30 },
    L4: { min: 50, max: 70 },
    L5: { min: 0,  max: 0  },
    maxItemsNonL1L2: 15
  },
  'BOD-4': {
    L1: { min: 0,  max: 0  },
    L2: { min: 0,  max: 0  },
    L3: { min: 10, max: 15 },
    L4: { min: 20, max: 30 },
    L5: { min: 40, max: 60 },
    maxItemsNonL1L2: 15
  },
  'BOD-5': {
    L1: { min: 0,  max: 0  },
    L2: { min: 0,  max: 0  },
    L3: { min: 5,  max: 10 },
    L4: { min: 15, max: 25 },
    L5: { min: 50, max: 70 },
    maxItemsNonL1L2: 15
  }
};

/**
 * Fungsi Validasi Aturan KPI
 * @param {string} cluster - Jenis Kluster (BOD-1 s.d. BOD-5)
 * @param {Array} items - Daftar item KPI [{ jenis: 'L3', bobot: 15 }, ...]
 * @returns {Object} - { isValid: boolean, errors: Array<string> }
 */
function validateKPI(cluster, items) {
  const errors = [];
  const rules = KPI_RULES[cluster];

  if (!rules) {
    return { isValid: false, errors: ['Kluster tidak valid atau tidak ditemukan.'] };
  }

  // 1. Validasi Total Bobot Keseluruhan (Wajib Tepat 100%)
  const totalBobot = items.reduce((sum, item) => sum + (parseFloat(item.bobot) || 0), 0);
  if (totalBobot !== 100) {
    errors.push(`Total akumulasi seluruh bobot saat ini ${totalBobot}%. Wajib bernilai tepat 100%.`);
  }

  // 2. Validasi Maksimal 15 Item di Luar L1 & L2 (yaitu L3, L4, L5)
  const itemsNonL1L2 = items.filter(item => ['L3', 'L4', 'L5'].includes(item.jenis));
  if (itemsNonL1L2.length > rules.maxItemsNonL1L2) {
    errors.push(`Jumlah item KPI di luar L1 & L2 (${itemsNonL1L2.length} item) melebihi batas maksimal ${rules.maxItemsNonL1L2} item.`);
  }

  // 3. Hitung Akumulasi Bobot Per Jenis Level (L1 s.d. L5)
  const totalBobotPerLevel = { L1: 0, L2: 0, L3: 0, L4: 0, L5: 0 };
  items.forEach(item => {
    if (totalBobotPerLevel[item.jenis] !== undefined) {
      totalBobotPerLevel[item.jenis] += parseFloat(item.bobot) || 0;
    }
  });

  // 4. Validasi Akumulasi Bobot Per Jenis KPI Sesuai Batas % MIN & % MAX Matriks
  Object.keys(rules).forEach(level => {
    if (level === 'maxItemsNonL1L2') return;

    const levelRule = rules[level];
    const accumulatedBobot = totalBobotPerLevel[level] || 0;

    if (levelRule.min === 0 && levelRule.max === 0) {
      // Jika level diblokir (0%) untuk kluster ini
      if (accumulatedBobot > 0) {
        errors.push(`Jenis KPI ${level} tidak diperbolehkan untuk kluster ${cluster}.`);
      }
    } else {
      // Jika level diizinkan, cek apakah akumulasi bobot masuk dalam rentang MIN dan MAX
      if (accumulatedBobot < levelRule.min || accumulatedBobot > levelRule.max) {
        errors.push(`Total bobot untuk Jenis KPI ${level} (${accumulatedBobot}%) harus berada di rentang ${levelRule.min}% - ${levelRule.max}%.`);
      }
    }
  });

  return {
    isValid: errors.length === 0,
    errors: errors
  };
}