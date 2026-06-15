'use server';

import { db } from './db';
import { getCurrentUser } from './auth';

export async function getWarehouseZones(includeInactive: boolean = false) {
  try {
    const zones = await db.warehouseZone.findMany({
      where: includeInactive ? undefined : { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
    return { success: true, data: zones };
  } catch (error) {
    console.error('Lỗi khi lấy danh sách khu kho:', error);
    return { success: false, error: 'Không thể lấy danh sách khu kho' };
  }
}

export async function createWarehouseZone(data: {
  code: string;
  name: string;
  type: string;
  description?: string;
  isDefault?: boolean;
  isActive?: boolean;
  sortOrder?: number;
}) {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== 'ADMIN' && user.role !== 'MANAGER')) {
      return { success: false, error: 'Không có quyền tạo khu kho' };
    }

    if (!data.name || data.name.trim() === '') {
      return { success: false, error: 'Tên khu kho không được để trống' };
    }

    const validTypes = ['PAPER', 'DECAL', 'LAMINATION', 'INK', 'SUPPLY', 'FINISHED_GOODS', 'CUSTOMER_GOODS', 'WASTE', 'OTHER'];
    if (!validTypes.includes(data.type)) {
      return { success: false, error: 'Loại khu kho không hợp lệ' };
    }

    const sortOrder = typeof data.sortOrder === 'number' ? Math.floor(data.sortOrder) : 0;
    if (sortOrder < 0) {
      return { success: false, error: 'Thứ tự hiển thị phải là số nguyên >= 0' };
    }

    const CODE_REGEX = /^[A-Z0-9]+(-[A-Z0-9]+)*$/;
    if (!CODE_REGEX.test(data.code)) {
      return { success: false, error: 'Mã khu kho chỉ được chứa A-Z, 0-9 và dấu gạch ngang, không có 2 dấu gạch ngang liên tiếp.' };
    }
    if (!data.code.startsWith('KHO-')) {
      return { success: false, error: 'Mã khu kho phải bắt đầu bằng KHO-' };
    }

    if (data.type === 'PAPER' && !data.code.startsWith('KHO-GIAY')) return { success: false, error: 'Mã khu kho không khớp với loại khu kho. Loại Giấy nên dùng mã bắt đầu bằng KHO-GIAY.' };
    if (data.type === 'DECAL' && !data.code.startsWith('KHO-DECAL')) return { success: false, error: 'Mã khu kho không khớp với loại khu kho. Loại Decal nên dùng mã bắt đầu bằng KHO-DECAL.' };
    if (data.type === 'LAMINATION' && !data.code.startsWith('KHO-MANG')) return { success: false, error: 'Mã khu kho không khớp với loại khu kho. Loại Màng nên dùng mã bắt đầu bằng KHO-MANG.' };
    if (data.type === 'INK' && !data.code.startsWith('KHO-MUC')) return { success: false, error: 'Mã khu kho không khớp với loại khu kho. Loại Mực nên dùng mã bắt đầu bằng KHO-MUC.' };
    if (data.type === 'FINISHED_GOODS' && !data.code.startsWith('KHO-THANH-PHAM')) return { success: false, error: 'Mã khu kho không khớp với loại khu kho. Loại Thành phẩm nên dùng mã bắt đầu bằng KHO-THANH-PHAM.' };

    const existingCode = await db.warehouseZone.findUnique({ where: { code: data.code } });
    if (existingCode) {
      return { success: false, error: 'Mã khu kho đã tồn tại, vui lòng chọn mã khác' };
    }

    const newZone = await db.warehouseZone.create({
      data: {
        code: data.code,
        name: data.name.trim(),
        type: data.type,
        description: data.description || null,
        isDefault: data.isDefault ?? false,
        isActive: data.isActive ?? true,
        sortOrder: sortOrder,
      },
    });

    return { success: true, data: newZone };
  } catch (error: any) {
    console.error('Lỗi khi tạo khu kho:', error);
    return { success: false, error: 'Lỗi hệ thống: ' + (error?.message || 'Unknown error') };
  }
}

export async function updateWarehouseZone(id: string, data: {
  name?: string;
  description?: string;
  isActive?: boolean;
  sortOrder?: number;
}) {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== 'ADMIN' && user.role !== 'MANAGER')) {
      return { success: false, error: 'Không có quyền cập nhật khu kho' };
    }

    if (data.name !== undefined && data.name.trim() === '') {
      return { success: false, error: 'Tên khu kho không được để trống' };
    }

    let sortOrder = data.sortOrder;
    if (sortOrder !== undefined) {
      sortOrder = typeof sortOrder === 'number' ? Math.floor(sortOrder) : 0;
      if (sortOrder < 0) return { success: false, error: 'Thứ tự hiển thị phải là số nguyên >= 0' };
    }

    const updatedZone = await db.warehouseZone.update({
      where: { id },
      data: {
        name: data.name?.trim(),
        description: data.description,
        isActive: data.isActive,
        sortOrder: sortOrder,
      },
    });

    return { success: true, data: updatedZone };
  } catch (error) {
    console.error('Lỗi khi cập nhật khu kho:', error);
    return { success: false, error: 'Không thể cập nhật khu kho' };
  }
}

export async function deleteWarehouseZone(id: string) {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== 'ADMIN' && user.role !== 'MANAGER')) {
      return { success: false, error: 'Không có quyền xóa khu kho' };
    }

    const itemsCount = await db.inventoryItem.count({
      where: { warehouseZoneId: id }
    });

    if (itemsCount > 0) {
      await db.warehouseZone.update({
        where: { id },
        data: { isActive: false }
      });
      return { 
        success: true, 
        status: "DEACTIVATED_INSTEAD", 
        message: "Khu kho đã có dữ liệu, hệ thống đã ngưng sử dụng thay vì xóa để giữ lịch sử." 
      };
    }

    await db.warehouseZone.delete({
      where: { id }
    });

    return { success: true, status: "DELETED", message: "Đã xóa khu kho thành công." };
  } catch (error) {
    console.error('Lỗi khi xóa khu kho:', error);
    return { success: false, error: 'Không thể xóa khu kho' };
  }
}

export async function seedDefaultWarehouseZones(bypassAuth: boolean = false) {
  try {
    if (!bypassAuth) {
      const user = await getCurrentUser();
      if (!user || (user.role !== 'ADMIN' && user.role !== 'MANAGER')) {
        return { success: false, error: 'Không có quyền thực hiện hành động này' };
      }
    }

    const defaultZones = [
      { code: 'KHO-GIAY', name: 'Kho giấy', type: 'PAPER', description: 'Lưu trữ các loại giấy', sortOrder: 10, isDefault: true, isActive: true },
      { code: 'KHO-DECAL', name: 'Kho decal', type: 'DECAL', description: 'Lưu trữ các loại decal', sortOrder: 20, isDefault: true, isActive: true },
      { code: 'KHO-MANG', name: 'Kho màng', type: 'LAMINATION', description: 'Lưu trữ các loại màng cán', sortOrder: 30, isDefault: true, isActive: true },
      { code: 'KHO-MUC', name: 'Kho mực', type: 'INK', description: 'Lưu trữ mực in', sortOrder: 40, isDefault: true, isActive: true },
      { code: 'KHO-PHU-LIEU', name: 'Phụ liệu', type: 'SUPPLY', description: 'Lưu trữ phụ liệu sản xuất', sortOrder: 50, isDefault: true, isActive: true },
      { code: 'KHO-KHAC', name: 'Khác', type: 'OTHER', description: 'Khu kho khác', sortOrder: 90, isDefault: true, isActive: true },
    ];

    const existingZones = await db.warehouseZone.findMany({
      where: { code: { in: defaultZones.map(z => z.code) } }
    });
    
    const existingCodes = new Set(existingZones.map(z => z.code));
    let createdCount = 0;

    for (const zone of defaultZones) {
      if (!existingCodes.has(zone.code)) {
        await db.warehouseZone.create({ data: zone });
        createdCount++;
      }
    }

    return { success: true, data: { createdCount } };
  } catch (error: any) {
    console.error('Lỗi khi seed khu kho:', error);
    return { success: false, error: 'Lỗi hệ thống: ' + (error?.message || 'Unknown error') };
  }
}

export async function backfillInventoryWarehouseZones(bypassAuth: boolean = false) {
  try {
    if (!bypassAuth) {
      const user = await getCurrentUser();
      if (!user || (user.role !== 'ADMIN' && user.role !== 'MANAGER')) {
        return { success: false, error: 'Không có quyền thực hiện hành động này' };
      }
    }

    const items = await db.inventoryItem.findMany({
      where: { warehouseZoneId: null }
    });

    const zones = await db.warehouseZone.findMany();
    const zoneMap = new Map(zones.map(z => [z.code, z.id]));

    let assignedCount = 0;
    let skippedCount = 0;
    let unknownCount = 0;

    for (const item of items) {
      let targetCode = null;
      
      const code = item.itemCode.toUpperCase();
      const rawCat = item.category || '';
      // Remove accents for easier matching
      const cat = rawCat.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();

      const isPaper = code.startsWith('GIAY-') || code.includes('-C300') || code.startsWith('C300') || code.includes('MAT-CHILD') || code.includes('MAT-PARENT') || cat === 'GIAY' || cat === 'PAPER';
      const isDecal = code.startsWith('DECAL-') || cat === 'DECAL';
      const isMang = code.startsWith('MANG-') || code.startsWith('ROLL_') || cat === 'MANG' || cat === 'FILM' || cat === 'LAMINATION';
      const isMuc = code.startsWith('MUC-') || cat === 'MUC' || cat === 'INK';
      const isPhuLieu = code.startsWith('KEO-') || cat === 'KEO' || code.startsWith('VAT-TU-PHU-') || code.startsWith('PHU-LIEU-') || cat === 'VAT_TU_PHU' || cat === 'SUPPLY' || cat === 'PHU LIEU' || cat === 'PHU_LIEU';

      if (isPaper) targetCode = 'KHO-GIAY';
      else if (isDecal) targetCode = 'KHO-DECAL';
      else if (isMang) targetCode = 'KHO-MANG';
      else if (isMuc) targetCode = 'KHO-MUC';
      else if (isPhuLieu) targetCode = 'KHO-PHU-LIEU';
      else targetCode = 'KHO-KHAC';

      const zoneId = targetCode ? zoneMap.get(targetCode) : null;

      if (zoneId) {
        await db.inventoryItem.update({
          where: { id: item.id },
          data: { warehouseZoneId: zoneId }
        });
        assignedCount++;
      } else {
        if (targetCode === 'KHO-KHAC') {
          unknownCount++;
        } else {
          skippedCount++;
        }
      }
    }

    return { success: true, data: { assignedCount, skippedCount, unknownCount } };
  } catch (error: any) {
    console.error('Lỗi khi backfill khu kho:', error);
    return { success: false, error: 'Lỗi hệ thống: ' + (error?.message || 'Unknown error') };
  }
}
