'use server';

import { db } from './db';
import { getCurrentUser } from './auth';
import { createAuditLog } from './audit-log';

// ---------------------------------------------------------
// PERMISSIONS
// ---------------------------------------------------------

export async function checkCrmAccess(customerId: string) {
  const currentUser = await getCurrentUser();
  if (!currentUser) throw new Error('Unauthorized');

  const customer = await db.customer.findUnique({
    where: { id: customerId },
    select: { assignedSalesId: true, nextFollowUpAt: true, lastContactAt: true }
  });

  if (!customer) throw new Error('Không tìm thấy khách hàng');

  if (currentUser.role === 'SALES' && customer.assignedSalesId !== currentUser.id) {
    throw new Error('Bạn không có quyền truy cập CRM của khách hàng này');
  }

  if (currentUser.role === 'DESIGNER' || currentUser.role === 'PRODUCTION' || currentUser.role === 'DELIVERY') {
    throw new Error('Vai trò của bạn không được cấp quyền truy cập CRM nâng cao');
  }

  return { currentUser, customer };
}

// ---------------------------------------------------------
// CUSTOMER CRM PROFILE
// ---------------------------------------------------------

export async function getCustomerCrmData(customerId: string) {
  const { currentUser } = await checkCrmAccess(customerId);

  const customer = await db.customer.findUnique({
    where: { id: customerId },
    include: {
      assignedSales: { select: { id: true, name: true, email: true } },
      createdBy: { select: { id: true, name: true } },
    }
  });

  if (!customer) throw new Error('Không tìm thấy khách hàng');

  // Thống kê cơ bản
  const quotes = await db.quote.count({ where: { customerId } });
  const orders = await db.order.findMany({ 
    where: { customerId }, 
    select: { totalAmount: true, status: true, paymentStatus: true } 
  });
  
  const totalOrders = orders.length;
  const totalRevenue = orders.filter(o => o.status !== 'CANCELLED').reduce((sum, o) => sum + o.totalAmount, 0);

  return {
    customer,
    stats: {
      quotes,
      totalOrders,
      totalRevenue,
    }
  };
}

export async function updateCustomerCrmProfile(customerId: string, input: {
  source?: string;
  segment?: string;
  crmStatus?: string;
  priority?: string;
  tags?: string[];
  assignedSalesId?: string | null;
}) {
  const { currentUser, customer } = await checkCrmAccess(customerId);

  // Chỉ Admin/Manager mới được đổi Sales
  if (input.assignedSalesId !== undefined && input.assignedSalesId !== customer.assignedSalesId) {
    if (currentUser.role !== 'ADMIN' && currentUser.role !== 'MANAGER') {
      throw new Error('Chỉ Admin/Manager mới có quyền thay đổi người phụ trách');
    }
  }

  // Validate tags limit
  if (input.tags && input.tags.length > 20) {
    throw new Error('Tối đa 20 tags');
  }
  if (input.tags && input.tags.some(t => t.length > 30)) {
    throw new Error('Mỗi tag tối đa 30 ký tự');
  }

  const dataToUpdate: any = { ...input };
  if (input.tags) dataToUpdate.tags = JSON.stringify(input.tags);

  const updatedCustomer = await db.customer.update({
    where: { id: customerId },
    data: dataToUpdate
  });

  // Audit log cho các thay đổi quan trọng
  await createAuditLog({
    actorId: currentUser.id,
    actorName: currentUser.name,
    actorRole: currentUser.role,
    action: 'CUSTOMER_CRM_PROFILE_UPDATED',
    entityType: 'Customer',
    entityId: customerId,
    description: `Cập nhật hồ sơ CRM khách hàng`,
    beforeData: customer,
    afterData: updatedCustomer,
  });

  return updatedCustomer;
}

// ---------------------------------------------------------
// CUSTOMER NOTES
// ---------------------------------------------------------

export async function getCustomerNotes(customerId: string) {
  const { currentUser } = await checkCrmAccess(customerId);

  let notes = await db.customerNote.findMany({
    where: { customerId, deletedAt: null },
    include: { author: { select: { name: true, role: true } } },
    orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }]
  });

  // Security: Filter private notes
  notes = notes.filter(note => {
    if (!note.isPrivate) return true;
    if (currentUser.role === 'ADMIN' || currentUser.role === 'MANAGER') return true;
    if (note.authorId === currentUser.id) return true;
    return false;
  });

  return notes;
}

export async function createCustomerNote(customerId: string, input: {
  type: string;
  content: string;
  isPrivate: boolean;
  isPinned: boolean;
}) {
  const { currentUser } = await checkCrmAccess(customerId);

  if (currentUser.role === 'ACCOUNTANT' && input.type !== 'ACCOUNTING_NOTE') {
    throw new Error('Kế toán chỉ được tạo ghi chú loại ACCOUNTING_NOTE');
  }

  const note = await db.customerNote.create({
    data: {
      customerId,
      authorId: currentUser.id,
      type: input.type,
      content: input.content,
      isPrivate: input.isPrivate,
      isPinned: input.isPinned
    }
  });

  await createAuditLog({
    actorId: currentUser.id,
    actorName: currentUser.name,
    actorRole: currentUser.role,
    action: 'CUSTOMER_NOTE_CREATED',
    entityType: 'CustomerNote',
    entityId: note.id,
    description: note.isPrivate ? 'Đã tạo ghi chú riêng tư cho khách hàng' : 'Đã tạo ghi chú khách hàng',
    afterData: note.isPrivate ? { id: note.id, type: note.type, content: '*** PRIVATE NOTE ***' } : note,
  });

  return note;
}

export async function updateCustomerNote(noteId: string, input: { content: string, type: string, isPrivate: boolean, isPinned: boolean }) {
  const note = await db.customerNote.findUnique({ where: { id: noteId } });
  if (!note) throw new Error('Ghi chú không tồn tại');

  const { currentUser } = await checkCrmAccess(note.customerId);

  if (note.authorId !== currentUser.id && currentUser.role !== 'ADMIN' && currentUser.role !== 'MANAGER') {
    throw new Error('Chỉ người tạo hoặc Quản lý mới được sửa ghi chú này');
  }

  const updatedNote = await db.customerNote.update({
    where: { id: noteId },
    data: input
  });

  await createAuditLog({
    actorId: currentUser.id,
    actorName: currentUser.name,
    actorRole: currentUser.role,
    action: 'CUSTOMER_NOTE_UPDATED',
    entityType: 'CustomerNote',
    entityId: note.id,
    description: updatedNote.isPrivate ? 'Đã cập nhật ghi chú riêng tư' : 'Đã cập nhật ghi chú',
    beforeData: note.isPrivate ? { content: '*** PRIVATE NOTE ***' } : note,
    afterData: updatedNote.isPrivate ? { content: '*** PRIVATE NOTE ***' } : updatedNote,
  });

  return updatedNote;
}

export async function deleteCustomerNote(noteId: string) {
  const note = await db.customerNote.findUnique({ where: { id: noteId } });
  if (!note) throw new Error('Ghi chú không tồn tại');

  const { currentUser } = await checkCrmAccess(note.customerId);

  if (note.authorId !== currentUser.id && currentUser.role !== 'ADMIN' && currentUser.role !== 'MANAGER') {
    throw new Error('Chỉ người tạo hoặc Quản lý mới được xóa ghi chú này');
  }

  await db.customerNote.update({
    where: { id: noteId },
    data: { deletedAt: new Date() }
  });

  await createAuditLog({
    actorId: currentUser.id,
    actorName: currentUser.name,
    actorRole: currentUser.role,
    action: 'CUSTOMER_NOTE_DELETED',
    entityType: 'CustomerNote',
    entityId: note.id,
    description: 'Xóa mềm ghi chú',
  });

  return true;
}

export async function pinCustomerNote(noteId: string, isPinned: boolean) {
  const note = await db.customerNote.findUnique({ where: { id: noteId } });
  if (!note) throw new Error('Ghi chú không tồn tại');

  const { currentUser } = await checkCrmAccess(note.customerId);

  await db.customerNote.update({
    where: { id: noteId },
    data: { isPinned }
  });

  await createAuditLog({
    actorId: currentUser.id,
    actorName: currentUser.name,
    actorRole: currentUser.role,
    action: 'CUSTOMER_NOTE_PINNED',
    entityType: 'CustomerNote',
    entityId: note.id,
    description: isPinned ? 'Ghim ghi chú' : 'Bỏ ghim ghi chú',
  });

  return true;
}

// ---------------------------------------------------------
// CUSTOMER INTERACTIONS
// ---------------------------------------------------------

export async function getCustomerInteractions(customerId: string) {
  const { currentUser } = await checkCrmAccess(customerId);
  return db.customerInteraction.findMany({
    where: { customerId },
    include: { actor: { select: { name: true } } },
    orderBy: { contactedAt: 'desc' }
  });
}

export async function createCustomerInteraction(customerId: string, input: {
  channel: string;
  direction: string;
  title: string;
  content?: string;
  outcome?: string;
  contactedAt: Date;
  createFollowUp?: boolean;
  followUpDueAt?: Date;
}) {
  const { currentUser, customer } = await checkCrmAccess(customerId);

  const interaction = await db.customerInteraction.create({
    data: {
      customerId,
      actorId: currentUser.id,
      channel: input.channel,
      direction: input.direction,
      title: input.title,
      content: input.content,
      outcome: input.outcome,
      contactedAt: input.contactedAt,
      nextFollowUpAt: input.followUpDueAt || null,
    }
  });

  let nextFollowUpAt = customer.nextFollowUpAt;

  if (input.createFollowUp && input.followUpDueAt) {
    await db.customerFollowUp.create({
      data: {
        customerId,
        assignedToId: currentUser.id,
        createdById: currentUser.id,
        title: `Follow-up từ tương tác: ${input.title}`,
        dueAt: input.followUpDueAt,
        status: 'OPEN',
        priority: 'NORMAL',
      }
    });
    if (!nextFollowUpAt || input.followUpDueAt < nextFollowUpAt) {
      nextFollowUpAt = input.followUpDueAt;
    }
  }

  // Update lastContactAt
  let lastContactAt = customer.lastContactAt;
  if (!lastContactAt || input.contactedAt > lastContactAt) {
    lastContactAt = input.contactedAt;
  }

  await db.customer.update({
    where: { id: customerId },
    data: { lastContactAt, nextFollowUpAt }
  });

  await createAuditLog({
    actorId: currentUser.id,
    actorName: currentUser.name,
    actorRole: currentUser.role,
    action: 'CUSTOMER_INTERACTION_CREATED',
    entityType: 'CustomerInteraction',
    entityId: interaction.id,
    description: `Ghi nhận tương tác qua ${input.channel}`,
    afterData: interaction,
  });

  return interaction;
}

// ---------------------------------------------------------
// CUSTOMER FOLLOW-UPS
// ---------------------------------------------------------

export async function getCustomerFollowUps(customerId: string) {
  const { currentUser } = await checkCrmAccess(customerId);
  return db.customerFollowUp.findMany({
    where: { customerId },
    include: {
      assignedTo: { select: { name: true } },
      completedBy: { select: { name: true } },
      createdBy: { select: { name: true } }
    },
    orderBy: [{ dueAt: 'asc' }]
  });
}

async function recalculateCustomerNextFollowUp(customerId: string) {
  const nextFollowUp = await db.customerFollowUp.findFirst({
    where: { customerId, status: { in: ['OPEN', 'IN_PROGRESS'] } },
    orderBy: { dueAt: 'asc' }
  });
  await db.customer.update({
    where: { id: customerId },
    data: { nextFollowUpAt: nextFollowUp ? nextFollowUp.dueAt : null }
  });
}

export async function createCustomerFollowUp(customerId: string, input: {
  title: string;
  note?: string;
  dueAt: Date;
  priority: string;
  assignedToId?: string;
}) {
  const { currentUser } = await checkCrmAccess(customerId);

  const followUp = await db.customerFollowUp.create({
    data: {
      customerId,
      assignedToId: input.assignedToId || currentUser.id,
      createdById: currentUser.id,
      title: input.title,
      note: input.note,
      dueAt: input.dueAt,
      status: 'OPEN',
      priority: input.priority,
    }
  });

  await recalculateCustomerNextFollowUp(customerId);

  await createAuditLog({
    actorId: currentUser.id,
    actorName: currentUser.name,
    actorRole: currentUser.role,
    action: 'CUSTOMER_FOLLOWUP_CREATED',
    entityType: 'CustomerFollowUp',
    entityId: followUp.id,
    description: `Tạo lịch nhắc follow-up mới`,
    afterData: followUp,
  });

  return followUp;
}

export async function updateCustomerFollowUpStatus(followUpId: string, status: string, resultNote?: string) {
  const followUp = await db.customerFollowUp.findUnique({ where: { id: followUpId } });
  if (!followUp) throw new Error('Follow-up không tồn tại');

  const { currentUser } = await checkCrmAccess(followUp.customerId);

  const data: any = { status };
  if (status === 'DONE' || status === 'CANCELLED') {
    data.completedAt = new Date();
    data.completedById = currentUser.id;
    if (resultNote) data.resultNote = resultNote;
  }

  const updated = await db.customerFollowUp.update({
    where: { id: followUpId },
    data
  });

  await recalculateCustomerNextFollowUp(followUp.customerId);

  await createAuditLog({
    actorId: currentUser.id,
    actorName: currentUser.name,
    actorRole: currentUser.role,
    action: status === 'DONE' ? 'CUSTOMER_FOLLOWUP_DONE' : status === 'CANCELLED' ? 'CUSTOMER_FOLLOWUP_CANCELLED' : 'CUSTOMER_FOLLOWUP_UPDATED',
    entityType: 'CustomerFollowUp',
    entityId: followUp.id,
    description: `Cập nhật trạng thái follow-up thành ${status}`,
    beforeData: followUp,
    afterData: updated,
  });

  return updated;
}

// ---------------------------------------------------------
// TIMELINE & LIST
// ---------------------------------------------------------

export async function getCustomerTimeline(customerId: string) {
  const { currentUser } = await checkCrmAccess(customerId);

  const [notes, interactions, followUps, quotes, orders, payments] = await Promise.all([
    getCustomerNotes(customerId),
    getCustomerInteractions(customerId),
    getCustomerFollowUps(customerId),
    db.quote.findMany({ where: { customerId }, select: { id: true, quoteNumber: true, status: true, totalAmount: true, createdAt: true } }),
    db.order.findMany({ where: { customerId }, select: { id: true, orderCode: true, status: true, totalAmount: true, createdAt: true } }),
    db.payment.findMany({ where: { customerId }, select: { id: true, paymentCode: true, paymentStatus: true, amount: true, createdAt: true } })
  ]);

  let timelineItems = [];

  for (const n of notes) {
    timelineItems.push({ type: 'NOTE', date: n.createdAt, data: n });
  }
  for (const i of interactions) {
    timelineItems.push({ type: 'INTERACTION', date: i.contactedAt, data: i });
  }
  for (const f of followUps) {
    timelineItems.push({ type: 'FOLLOW_UP_CREATED', date: f.createdAt, data: f });
    if (f.completedAt) {
      timelineItems.push({ type: 'FOLLOW_UP_COMPLETED', date: f.completedAt, data: f });
    }
  }
  for (const q of quotes) {
    timelineItems.push({ type: 'QUOTE', date: q.createdAt, data: q });
  }
  for (const o of orders) {
    timelineItems.push({ type: 'ORDER', date: o.createdAt, data: o });
  }
  for (const p of payments) {
    timelineItems.push({ type: 'PAYMENT', date: p.createdAt, data: p });
  }

  // Sắp xếp theo thời gian giảm dần
  timelineItems.sort((a, b) => b.date.getTime() - a.date.getTime());

  // Giới hạn 50 mục gần nhất
  return timelineItems.slice(0, 50);
}

export async function getCustomersWithCrmFilters(filters: any) {
  const currentUser = await getCurrentUser();
  if (!currentUser) throw new Error('Unauthorized');

  const where: any = {};

  if (currentUser.role === 'SALES') {
    where.assignedSalesId = currentUser.id;
  } else if (filters.assignedSalesId) {
    where.assignedSalesId = filters.assignedSalesId;
  }

  if (filters.search) {
    where.OR = [
      { name: { contains: filters.search } },
      { phone: { contains: filters.search } },
      { customerCode: { contains: filters.search } }
    ];
  }

  if (filters.source) where.source = filters.source;
  if (filters.segment) where.segment = filters.segment;
  if (filters.crmStatus) where.crmStatus = filters.crmStatus;
  if (filters.hasDebt) where.debtBalance = { gt: 0 };

  const now = new Date();
  if (filters.overdueFollowUp) {
    where.followUps = {
      some: {
        status: { in: ['OPEN', 'IN_PROGRESS'] },
        dueAt: { lt: now }
      }
    };
  }

  if (filters.noContactDays) {
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - parseInt(filters.noContactDays));
    where.OR = [
      { lastContactAt: { lt: thresholdDate } },
      { lastContactAt: null }
    ];
  }

  let orderBy: any = { createdAt: 'desc' };
  if (filters.sortBy === 'debtBalance') orderBy = { debtBalance: 'desc' };
  if (filters.sortBy === 'nextFollowUp') orderBy = { nextFollowUpAt: 'asc' };
  if (filters.sortBy === 'lastContact') orderBy = { lastContactAt: 'asc' };

  const customers = await db.customer.findMany({
    where,
    include: {
      assignedSales: { select: { name: true } },
    },
    orderBy,
    take: 100 // MVP Limit
  });

  return customers;
}
