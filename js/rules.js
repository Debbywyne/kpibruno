// ATURAN DAN BOBOT KPI LENGKAP (BOD-1 S.D. BOD-5)
const KPI_RULES = {
  'BOD-1': {
    minItemsL35: 8,
    maxItemsL35: 15,
    totalBobot: 100,
    'L1': { min: 10, max: 15 },
    'L2': { min: 20, max: 35 },
    'L3': { min: 50, max: 70 },
    'L4': { min: 0,  max: 0  },
    'L5': { min: 0,  max: 0  }
  },
  'BOD-2': {
    minItemsL35: 8,
    maxItemsL35: 15,
    totalBobot: 100,
    'L1': { min: 5,  max: 10 },
    'L2': { min: 10, max: 20 },
    'L3': { min: 25, max: 40 },
    'L4': { min: 40, max: 60 },
    'L5': { min: 0,  max: 0  }
  },
  'BOD-3': {
    minItemsL35: 8,
    maxItemsL35: 15,
    totalBobot: 100,
    'L1': { min: 0,  max: 0  },
    'L2': { min: 5,  max: 10 },
    'L3': { min: 15, max: 30 },
    'L4': { min: 50, max: 70 },
    'L5': { min: 0,  max: 0  }
  },
  'BOD-4': {
    minItemsL35: 8,
    maxItemsL35: 15,
    totalBobot: 100,
    'L1': { min: 0,  max: 0  },
    'L2': { min: 0,  max: 0  },
    'L3': { min: 10, max: 15 },
    'L4': { min: 20, max: 30 },
    'L5': { min: 40, max: 60 }
  },
  'BOD-5': {
    minItemsL35: 8,
    maxItemsL35: 15,
    totalBobot: 100,
    'L1': { min: 0,  max: 0  },
    'L2': { min: 0,  max: 0  },
    'L3': { min: 5,  max: 10 },
    'L4': { min: 15, max: 25 },
    'L5': { min: 50, max: 70 }
  }
};

// FUNGSIONALITAS VALIDASI DENGAN CHECK L3-L5 ITEM & RANGE BOBOT
function validateKPI(clusterName, items) {
  const rules = KPI_RULES[clusterName];
  let errors = [];

  // 1. Hitung Penjumlahan Item Khusus Level 3, 4, dan 5
  const filteredItemsL35 = items.filter(item => ['L3', 'L4', 'L5'].includes(item.jenis));
  const countL35 = filteredItemsL35.length;

  if (countL35 < rules.minItemsL35 || countL35 > rules.maxItemsL35) {
    errors.push(`Jumlah item KPI (L3 + L4 + L5) saat ini ${countL35}. Wajib di antara ${rules.minItemsL35} - ${rules.maxItemsL35} item.`);
  }

  // 2. Hitung Total Bobot Keseluruhan (Wajib 100%)
  const sumBobot = items.reduce((acc, curr) => acc + (parseFloat(curr.bobot) || 0), 0);
  if (Math.abs(sumBobot - rules.totalBobot) > 0.01) {
    errors.push(`Total bobot saat ini ${sumBobot}%. Wajib bernilai ${rules.totalBobot}%.`);
  }

  // 3. Akumulasi Bobot Per Level (L1 - L5)
  const bobotPerLevel = { 'L1': 0, 'L2': 0, 'L3': 0, 'L4': 0, 'L5': 0 };
  items.forEach(item => {
    if (bobotPerLevel.hasOwnProperty(item.jenis)) {
      bobotPerLevel[item.jenis] += parseFloat(item.bobot) || 0;
    }
  });

  // 4. Validasi Sesuai Rentang Minimum & Maksimum Matriks
  ['L1', 'L2', 'L3', 'L4', 'L5'].forEach(lvl => {
    const minAllowed = rules[lvl].min;
    const maxAllowed = rules[lvl].max;
    const currentBobot = bobotPerLevel[lvl];

    if (minAllowed === 0 && maxAllowed === 0) {
      if (currentBobot > 0) {
        errors.push(`Level ${lvl} diarsir/disabled untuk kluster ${clusterName}, tidak boleh diisi bobot.`);
      }
    } else {
      if (currentBobot < minAllowed || currentBobot > maxAllowed) {
        errors.push(`Total bobot ${lvl} saat ini ${currentBobot}%. Harus di antara ${minAllowed}% - ${maxAllowed}%.`);
      }
    }
  });

  return {
    isValid: errors.length === 0,
    errors: errors
  };
}