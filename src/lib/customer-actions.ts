'use server';

import { db } from './db';
import { getCurrentUser } from './auth';

export interface CustomerFilter {
  search?: string;
  customerType?: string;
  source?: string;
  status?: string;
  assignedSalesId?: string;
}

// Map phân quyền nhanh cho module khách hàng
const ALLOWED_ROLES_VIEW = ['ADMIN', 'MANAGER', 'SALES', 'ACCOUNTANT'];
const ALLOWED_ROLES_MUTATE = ['ADMIN', 'MANAGER', 'SALES'];
const ALLOWED_ROLES_STATUS = ['ADMIN', 'MANAGER'];

/**
 * Lấy danh sách khách hàng kèm bộ lọc và tìm kiếm server-side
 */
export async function getCustomers(filters: CustomerFilter = {}) {
  const user = await getCurrentUser();
  if (!user || !ALLOWED_ROLES_VIEW.includes(user.role)) {
    throw new Error('Bạn không có quyền truy cập dữ liệu này.');
  }

  const { search, customerType, source, status } = filters;

  // Build where clause
  const where: any = {};

  if (customerType && customerType !== 'ALL') {
    where.customerType = customerType;
  }

  if (source && source !== 'ALL') {
    where.source = source;
  }

  if (status && status !== 'ALL') {
    where.status = status;
  }

  if (filters.assignedSalesId) {
    where.assignedSalesId = filters.assignedSalesId;
  }

  if (search) {
    where.OR = [
      { customerCode: { contains: search } },
      { name: { contains: search } },
      { companyName: { contains: search } },
      { phone: { contains: search } },
      { email: { contains: search } },
      { zalo: { contains: search } },
    ];
  }

  try {
    const customers = await db.customer.findMany({
      where,
      orderBy: {
        customerCode: 'desc', // Mã mới nhất lên đầu
      },
      include: {
        createdBy: {
          select: { name: true, role: true }
        },
        assignedSales: {
          select: { name: true }
        }
      }
    });
    return { success: true, data: customers };
  } catch (error: any) {
    console.error('Lỗi lấy danh sách khách hàng:', error);
    return { success: false, error: 'Không thể kết nối cơ sở dữ liệu.' };
  }
}

/**
 * Lấy chi tiết khách hàng theo ID
 */
export async function getCustomerById(id: string) {
  const user = await getCurrentUser();
  if (!user || !ALLOWED_ROLES_VIEW.includes(user.role)) {
    throw new Error('Bạn không có quyền truy cập dữ liệu này.');
  }

  try {
    const customer = await db.customer.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: { name: true, role: true }
        },
        assignedSales: {
          select: { name: true, role: true }
        },
        quotes: {
          orderBy: { createdAt: 'desc' },
          include: {
            createdBy: { select: { name: true } }
          }
        },
        orders: {
          orderBy: { createdAt: 'desc' },
          include: {
            designFiles: true,
            productionJob: { include: { steps: true } }
          }
        }
      }
    });

    if (!customer) {
      return { success: false, error: 'Không tìm thấy thông tin khách hàng.' };
    }

    return { success: true, data: customer };
  } catch (error) {
    console.error('Lỗi lấy chi tiết khách hàng:', error);
    return { success: false, error: 'Lỗi truy vấn cơ sở dữ liệu.' };
  }
}

/**
 * Sinh mã khách hàng tự động tăng dần KH-XXXXXX dạng an toàn chống trùng
 */
async function generateNextCustomerCode(): Promise<string> {
  // Tìm khách hàng có mã lớn nhất
  const lastCustomer = await db.customer.findFirst({
    orderBy: {
      customerCode: 'desc',
    },
    select: {
      customerCode: true,
    },
  });

  if (!lastCustomer || !lastCustomer.customerCode) {
    return 'KH-000001';
  }

  const match = lastCustomer.customerCode.match(/KH-(\d+)/);
  if (!match) {
    return 'KH-000001';
  }

  const nextNumber = parseInt(match[1], 10) + 1;
  const paddedNumber = String(nextNumber).padStart(6, '0');
  return `KH-${paddedNumber}`;
}

/**
 * Tạo mới một khách hàng (có chống trùng SĐT & tự sinh mã)
 */
export async function createCustomer(formData: {
  name: string;
  phone: string;
  zalo?: string;
  email?: string;
  address?: string;
  customerType: string;
  source: string;
  taxCode?: string;
  companyName?: string;
  note?: string;
  tags?: string;
  assignedSalesId?: string;
}) {
  const user = await getCurrentUser();
  if (!user || !ALLOWED_ROLES_MUTATE.includes(user.role)) {
    return { success: false, error: 'Bạn không có quyền tạo khách hàng mới.' };
  }

  let finalAssignedSalesId = formData.assignedSalesId || null;
  if (user.role === 'SALES') {
    finalAssignedSalesId = user.id;
  }

  if (!formData.name || !formData.phone) {
    return { success: false, error: 'Tên khách hàng và số điện thoại là bắt buộc.' };
  }

  try {
    // 1. Kiểm tra trùng số điện thoại
    const existingPhone = await db.customer.findUnique({
      where: { phone: formData.phone },
      select: { customerCode: true }
    });

    if (existingPhone) {
      return {
        success: false,
        error: `Số điện thoại này đã thuộc khách hàng ${existingPhone.customerCode}. Vui lòng kiểm tra lại hồ sơ khách cũ.`
      };
    }

    // 2. Chạy transaction sinh mã và ghi để tuyệt đối chống trùng mã khi ghi song song
    const newCustomer = await db.$transaction(async (tx) => {
      const customerCode = await generateNextCustomerCode();
      
      return tx.customer.create({
        data: {
          customerCode,
          name: formData.name,
          phone: formData.phone,
          zalo: formData.zalo || null,
          email: formData.email || null,
          address: formData.address || null,
          customerType: formData.customerType,
          source: formData.source,
          taxCode: formData.taxCode || null,
          companyName: formData.companyName || null,
          note: formData.note || null,
          tags: formData.tags || null,
          status: 'ACTIVE',
          createdById: user.id,
          assignedSalesId: finalAssignedSalesId,
        }
      });
    });

    return { success: true, data: newCustomer };
  } catch (error: any) {
    console.error('Lỗi tạo khách hàng:', error);
    const errMsg = error instanceof Error ? error.message : String(error);
    return { success: false, error: `Lỗi ghi cơ sở dữ liệu: ${errMsg}` };
  }
}

/**
 * Chỉnh sửa thông tin khách hàng (chặn sửa customerCode)
 */
export async function updateCustomer(
  id: string,
  formData: {
    name: string;
    phone: string;
    zalo?: string;
    email?: string;
    address?: string;
    customerType: string;
    source: string;
    taxCode?: string;
    companyName?: string;
    note?: string;
    tags?: string;
    assignedSalesId?: string;
  }
) {
  const user = await getCurrentUser();
  if (!user || !ALLOWED_ROLES_MUTATE.includes(user.role)) {
    return { success: false, error: 'Bạn không có quyền chỉnh sửa thông tin khách hàng.' };
  }

  let finalAssignedSalesId = formData.assignedSalesId || null;
  if (user.role === 'SALES') {
    finalAssignedSalesId = user.id; // Force own ID
  }

  if (!formData.name || !formData.phone) {
    return { success: false, error: 'Tên khách hàng và số điện thoại là bắt buộc.' };
  }

  try {
    // Kiểm tra trùng SĐT nếu thay đổi
    const existingCustomer = await db.customer.findUnique({
      where: { id },
      select: { phone: true }
    });

    if (!existingCustomer) {
      return { success: false, error: 'Khách hàng không tồn tại trong hệ thống.' };
    }

    if (existingCustomer.phone !== formData.phone) {
      const duplicatePhone = await db.customer.findUnique({
        where: { phone: formData.phone },
        select: { customerCode: true }
      });

      if (duplicatePhone) {
        return {
          success: false,
          error: `Số điện thoại này đã thuộc khách hàng ${duplicatePhone.customerCode}. Vui lòng kiểm tra lại hồ sơ khách cũ.`
        };
      }
    }

    const updated = await db.customer.update({
      where: { id },
      data: {
        name: formData.name,
        phone: formData.phone,
        zalo: formData.zalo || null,
        email: formData.email || null,
        address: formData.address || null,
        customerType: formData.customerType,
        source: formData.source,
        taxCode: formData.taxCode || null,
        companyName: formData.companyName || null,
        note: formData.note || null,
        tags: formData.tags || null,
        ...(user.role !== 'SALES' || finalAssignedSalesId ? { assignedSalesId: finalAssignedSalesId } : {})
      }
    });

    return { success: true, data: updated };
  } catch (error: any) {
    console.error('Lỗi cập nhật khách hàng:', error);
    const errMsg = error instanceof Error ? error.message : String(error);
    return { success: false, error: `Lỗi cập nhật dữ liệu: ${errMsg}` };
  }
}

/**
 * Khóa hoặc mở lại hoạt động của khách hàng (ACTIVE / INACTIVE)
 * Chỉ ADMIN và MANAGER được phép thực hiện
 */
export async function toggleCustomerStatus(id: string) {
  const user = await getCurrentUser();
  if (!user || !ALLOWED_ROLES_STATUS.includes(user.role)) {
    return { success: false, error: 'Chỉ có Chủ doanh nghiệp hoặc Quản lý được phép khóa/mở khóa khách hàng.' };
  }

  try {
    const customer = await db.customer.findUnique({
      where: { id },
      select: { status: true, customerCode: true }
    });

    if (!customer) {
      return { success: false, error: 'Khách hàng không tồn tại trong hệ thống.' };
    }

    const newStatus = customer.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    
    await db.customer.update({
      where: { id },
      data: { status: newStatus }
    });

    return { 
      success: true, 
      status: newStatus,
      message: `Đã ${newStatus === 'ACTIVE' ? 'mở khóa hoạt động' : 'khóa ngưng hoạt động'} khách hàng ${customer.customerCode} thành công.`
    };
  } catch (error: any) {
    console.error('Lỗi thay đổi trạng thái khách hàng:', error);
    return { success: false, error: 'Không thể cập nhật trạng thái cơ sở dữ liệu.' };
  }
}
