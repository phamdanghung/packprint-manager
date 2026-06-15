export const MaterialGroup = {
  GIAY: 'GIAY',
  DECAL: 'DECAL',
  MANG: 'MANG',
  MUC: 'MUC',
  KEO: 'KEO',
  KHAC: 'KHAC'
};

export const PaperType = {
  COUCHE: 'COUCHE',
  KRAFT: 'KRAFT',
  IVORY: 'IVORY',
  BRISTOL: 'BRISTOL',
  FORD: 'FORD',
  DUPLEX: 'DUPLEX'
};

export const PaperGsm = [120, 150, 200, 250, 300, 350];

export const SheetSize = {
  '79X109': { width: 79, height: 109, defaultRole: 'PARENT' },
  '65X86': { width: 65, height: 86, defaultRole: 'PARENT' },
  '32X43': { width: 32, height: 43, defaultRole: 'CHILD' },
  '32X35': { width: 32, height: 35, defaultRole: 'CHILD' }
};

export const SheetRole = {
  PARENT: 'PARENT',
  CHILD: 'CHILD',
  BOTH: 'BOTH'
};

export const DecalType = {
  GIAY: 'GIAY',
  'NHUA-SUA': 'NHUA-SUA',
  'NHUA-TRONG': 'NHUA-TRONG',
  'XI-BAC': 'XI-BAC',
  'BAY-MAU': 'BAY-MAU',
  KRAFT: 'KRAFT',
  BE: 'BE'
};

export const LaminateType = {
  BONG: 'BONG',
  MO: 'MO'
};

export const LaminateMethod = {
  NHIET: 'NHIET',
  KEO: 'KEO'
};

function normalizeString(str: string) {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/\s+/g, '-');
}

export function generateMaterialCode(input: any): string {
  const getRoleSuffix = (role: string) => {
    if (role === 'PARENT') return 'ME';
    if (role === 'CHILD') return 'CON';
    if (role === 'BOTH') return 'CHUNG';
    return role;
  };

  if (input.category === MaterialGroup.GIAY) {
    if (!input.materialType || !input.gsm || !input.sheetSize || !input.sheetRole) throw new Error('Thiếu thông tin bắt buộc cho Giấy');
    return `GIAY-${input.materialType}-${input.gsm}-${input.sheetSize}-${getRoleSuffix(input.sheetRole)}`;
  }
  
  if (input.category === MaterialGroup.DECAL) {
    if (!input.materialType) throw new Error('Thiếu loại Decal');
    if (input.isRoll) {
      if (!input.rollWidthMm || !input.rollLengthM) throw new Error('Thiếu kích thước cuộn Decal');
      return `DECAL-${input.materialType}-CUON-${input.rollWidthMm}MM-${input.rollLengthM}M`;
    } else {
      if (!input.sheetSize || !input.sheetRole) throw new Error('Thiếu kích thước tờ Decal');
      return `DECAL-${input.materialType}-${input.sheetSize}-${getRoleSuffix(input.sheetRole)}`;
    }
  }

  if (input.category === MaterialGroup.MANG) {
    if (!input.laminateType || !input.laminateMethod || !input.rollWidthMm || !input.rollLengthM) throw new Error('Thiếu thông tin bắt buộc cho Màng');
    return `MANG-${input.laminateType}-${input.laminateMethod}-${input.rollWidthMm}MM-${input.rollLengthM}M`;
  }

  throw new Error('Chưa hỗ trợ sinh mã tự động cho nhóm này');
}

export function generateMaterialName(input: any): string {
  if (input.category === MaterialGroup.GIAY) {
    const roleStr = input.sheetRole === 'PARENT' ? 'Giấy mẹ' : (input.sheetRole === 'CHILD' ? 'Giấy con' : 'Dùng chung');
    const matType = input.materialType.charAt(0) + input.materialType.slice(1).toLowerCase();
    const sizeStr = input.sheetSize.toLowerCase();
    return `Giấy ${matType} ${input.gsm}gsm - Khổ ${sizeStr} - ${roleStr}`;
  }
  
  if (input.category === MaterialGroup.DECAL) {
    if (input.isRoll) {
      const typeStr = input.materialType.split('-').map((s: string) => s.charAt(0) + s.slice(1).toLowerCase()).join(' ');
      return `Decal ${typeStr} Cuộn ${input.rollWidthMm}mm x ${input.rollLengthM}m`;
    } else {
      const roleStr = input.sheetRole === 'PARENT' ? 'Mẹ' : (input.sheetRole === 'CHILD' ? 'Con' : 'Dùng chung');
      const sizeStr = input.sheetSize.toLowerCase();
      const typeLower = input.materialType.split('-').join(' ').toLowerCase();
      return `Decal ${typeLower} - Khổ ${sizeStr} - ${roleStr}`;
    }
  }

  if (input.category === MaterialGroup.MANG) {
    const typeStr = input.laminateType === 'BONG' ? 'Bóng' : 'Mờ';
    const methodStr = input.laminateMethod === 'NHIET' ? 'Nhiệt' : 'Keo';
    return `Màng ${typeStr} ${methodStr} ${input.rollWidthMm}mm x ${input.rollLengthM}m`;
  }

  return 'Vật tư chưa phân loại';
}

export function suggestFamilyKey(input: any): string | null {
  if (input.category === MaterialGroup.GIAY) {
    return `${input.materialType}_${input.gsm}`;
  }
  if (input.category === MaterialGroup.DECAL) {
    return `DECAL_${input.materialType}`;
  }
  return null;
}

export function deriveInventoryFieldsFromCodeOrInput(input: any) {
  const code = generateMaterialCode(input);
  const name = generateMaterialName(input);
  const familyKey = suggestFamilyKey(input);
  const familyName = familyKey ? familyKey.replace('_', ' ') : null;
  
  let sheetWidthCm = null;
  let sheetHeightCm = null;
  let sheetRole = null;
  let gsm = null;
  let stockBaseUnit = 'SHEET';
  let materialType = input.materialType || null;

  if (input.category === MaterialGroup.GIAY || (input.category === MaterialGroup.DECAL && !input.isRoll)) {
    const dims = input.sheetSize.split('X');
    sheetWidthCm = Number(dims[0]);
    sheetHeightCm = Number(dims[1]);
    sheetRole = input.sheetRole;
    stockBaseUnit = 'SHEET';
    gsm = input.gsm ? Number(input.gsm) : null;
  } else if (input.category === MaterialGroup.MANG || (input.category === MaterialGroup.DECAL && input.isRoll)) {
    stockBaseUnit = 'MILLIMETER'; // Assuming cuộn uses MM
    // Cuộn không có sheetRole
  }

  return {
    itemCode: code,
    name,
    familyKey,
    familyName,
    gsm,
    sheetWidthCm,
    sheetHeightCm,
    sheetRole,
    stockBaseUnit,
    materialType,
    category: input.category
  };
}

export function validateGeneratedCode(code: string): boolean {
  return /^[A-Z0-9\-]+$/.test(code);
}
