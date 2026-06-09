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

  if (!customer) throw new Error('Kh├┤ng t├¼m thß║Ñy kh├ích h├áng');

  if (currentUser.role === 'SALES' && customer.assignedSalesId !== currentUser.id) {
    throw new Error('Bß║ín kh├┤ng c├│ quyß╗ün truy cß║¡p CRM cß╗ºa kh├ích h├áng n├áy');
  }

  if (currentUser.role === 'DESIGNER' || currentUser.role === 'PRODUCTION' || currentUser.role === 'DELIVERY') {
    throw new Error('Vai tr├▓ cß╗ºa bß║ín kh├┤ng ─æã░ß╗úc cß║Ñp quyß╗ün truy cß║¡p CRM n├óng cao');
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

  if (!customer) throw new Error('Kh├┤ng t├¼m thß║Ñy kh├ích h├áng');

  // Thß╗æng k├¬ cãí bß║ún
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

  // Chß╗ë Admin/Manager mß╗øi ─æã░ß╗úc ─æß╗òi Sales
  if (input.assignedSalesId !== undefined && input.assignedSalesId !== customer.assignedSalesId) {
    if (currentUser.role !== 'ADMIN' && currentUser.role !== 'MANAGER') {
      throw new Error('Chß╗ë Admin/Manager mß╗øi c├│ quyß╗ün thay ─æß╗òi ngã░ß╗Øi phß╗Ñ tr├ích');
    }
  }

  // Validate tags limit
  if (input.tags && input.tags.length > 20) {
    throw new Error('Tß╗æi ─æa 20 tags');
  }
  if (input.tags && input.tags.some(t => t.length > 30)) {
    throw new Error('Mß╗ùi tag tß╗æi ─æa 30 k├¢ tß╗▒');
  }

  const dataToUpdate: any = { ...input };
  if (input.tags) dataToUpdate.tags = JSON.stringify(input.tags);

  const updatedCustomer = await db.customer.update({
    where: { id: customerId },
    data: dataToUpdate
  });

  // Audit log cho c├íc thay ─æß╗òi quan trß╗ìng
  await createAuditLog({
    actorId: currentUser.id,
    actorName: currentUser.name,
    actorRole: currentUser.role,
    action: 'CUSTOMER_CRM_PROFILE_UPDATED',
    entityType: 'Customer',
    entityId: customerId,
    description: `Cß║¡p nhß║¡t hß╗ô sãí CRM kh├ích h├áng`,
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
    throw new Error('Kß║┐ to├ín chß╗ë ─æã░ß╗úc tß║ío ghi ch├║ loß║íi ACCOUNTING_NOTE');
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
    description: note.isPrivate ? '─É├ú tß║ío ghi ch├║ ri├¬ng tã░ cho kh├ích h├áng' : '─É├ú tß║ío ghi ch├║ kh├ích h├áng',
    afterData: note.isPrivate ? { id: note.id, type: note.type, content: '*** PRIVATE NOTE ***' } : note,
  });

  return note;
}

export async function updateCustomerNote(noteId: string, input: { content: string, type: string, isPrivate: boolean, isPinned: boolean }) {
  const note = await db.customerNote.findUnique({ where: { id: noteId } });
  if (!note) throw new Error('Ghi ch├║ kh├┤ng tß╗ôn tß║íi');

  const { currentUser } = await checkCrmAccess(note.customerId);

  if (note.authorId !== currentUser.id && currentUser.role !== 'ADMIN' && currentUser.role !== 'MANAGER') {
    throw new Error('Chß╗ë ngã░ß╗Øi tß║ío hoß║Àc Quß║ún l├¢ mß╗øi ─æã░ß╗úc sß╗¡a ghi ch├║ n├áy');
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
    description: updatedNote.isPrivate ? '─É├ú cß║¡p nhß║¡t ghi ch├║ ri├¬ng tã░' : '─É├ú cß║¡p nhß║¡t ghi ch├║',
    beforeData: note.isPrivate ? { content: '*** PRIVATE NOTE ***' } : note,
    afterData: updatedNote.isPrivate ? { content: '*** PRIVATE NOTE ***' } : updatedNote,
  });

  return updatedNote;
}

export async function deleteCustomerNote(noteId: string) {
  const note = await db.customerNote.findUnique({ where: { id: noteId } });
  if (!note) throw new Error('Ghi ch├║ kh├┤ng tß╗ôn tß║íi');

  const { currentUser } = await checkCrmAccess(note.customerId);

  if (note.authorId !== currentUser.id && currentUser.role !== 'ADMIN' && currentUser.role !== 'MANAGER') {
    throw new Error('Chß╗ë ngã░ß╗Øi tß║ío hoß║Àc Quß║ún l├¢ mß╗øi ─æã░ß╗úc x├│a ghi ch├║ n├áy');
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
    description: 'X├│a mß╗üm ghi ch├║',
  });

  return true;
}

export async function pinCustomerNote(noteId: string, isPinned: boolean) {
  const note = await db.customerNote.findUnique({ where: { id: noteId } });
  if (!note) throw new Error('Ghi ch├║ kh├┤ng tß╗ôn tß║íi');

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
    description: isPinned ? 'Ghim ghi ch├║' : 'Bß╗Å ghim ghi ch├║',
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
        title: `Follow-up tß╗½ tã░ãíng t├íc: ${input.title}`,
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
    description: `Ghi nhß║¡n tã░ãíng t├íc qua ${input.channel}`,
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
    description: `Tß║ío lß╗ïch nhß║»c follow-up mß╗øi`,
    afterData: followUp,
  });

  return followUp;
}

export async function updateCustomerFollowUpStatus(followUpId: string, status: string, resultNote?: string) {
  const followUp = await db.customerFollowUp.findUnique({ where: { id: followUpId } });
  if (!followUp) throw new Error('Follow-up kh├┤ng tß╗ôn tß║íi');

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
    description: `Cß║¡p nhß║¡t trß║íng th├íi follow-up th├ánh ${status}`,
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

  // Sß║»p xß║┐p theo thß╗Øi gian giß║úm dß║ºn
  timelineItems.sort((a, b) => b.date.getTime() - a.date.getTime());

  // Giß╗øi hß║ín 50 mß╗Ñc gß║ºn nhß║Ñt
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
import { getCustomerReactivationStatus } from './crm/crm-config';

// 6. REACTIVATION
export async function getReactivationCustomers(filters: any = {}) {
  const currentUser = await getCurrentUser();
  if (!currentUser) throw new Error('Unauthorized');

  let where: any = {};
  if (currentUser.role === 'SALES') {
    where.assignedSalesId = currentUser.id;
  }

  try {
    const customers = await db.customer.findMany({
      where,
      include: {
        assignedSales: { select: { name: true } }
      }
    });

    const reactivationList = customers.map(c => {
      return { ...c, reactivation: getCustomerReactivationStatus(c as any) };
    }).filter(c => c.reactivation.level !== 'NONE');

    return { success: true, data: reactivationList };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function dismissCustomerReactivation(customerId: string, reason: string) {
  const currentUser = await getCurrentUser();
  if (!currentUser) throw new Error('Unauthorized');

  if (!reason.trim()) return { success: false, error: 'Phải nhập lý do' };

  try {
    await db.$transaction(async (tx) => {
      const customer = await tx.customer.findUnique({ where: { id: customerId } });
      if (!customer) throw new Error('Không tìm thấy khách hàng');

      if (currentUser.role === 'SALES' && customer.assignedSalesId !== currentUser.id) {
        throw new Error('Chỉ có thể dismiss cảnh báo khách của mình');
      }

      await tx.customer.update({
        where: { id: customerId },
        data: {
          reactivationDismissedAt: new Date(),
          reactivationDismissedById: currentUser.id,
          reactivationDismissReason: reason
        }
      });

      const activeTasks = await tx.taskItem.findMany({
        where: { customerId, type: { startsWith: 'CUSTOMER_NO_ORDER_' }, status: { in: ['OPEN', 'IN_PROGRESS'] } }
      });

      for (const t of activeTasks) {
        await tx.taskItem.update({
          where: { id: t.id },
          data: { status: 'RESOLVED', resolvedAt: new Date(), resolvedById: currentUser.id }
        });
      }
    });

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// 7. ORDER SYNC HELPER
export async function syncCustomerAfterOrder(customerId: string, orderTotal: number) {
  try {
    await db.$transaction(async (tx) => {
      const customer = await tx.customer.findUnique({ where: { id: customerId }});
      if (!customer) return;

      await tx.customer.update({
        where: { id: customerId },
        data: {
          lastOrderAt: new Date(),
          totalRevenue: { increment: orderTotal },
          reactivationLevel: 'NONE'
        }
      });

      const activeTasks = await tx.taskItem.findMany({
        where: { customerId, type: { startsWith: 'CUSTOMER_NO_ORDER_' }, status: { in: ['OPEN', 'IN_PROGRESS'] } }
      });

      for (const t of activeTasks) {
        await tx.taskItem.update({
          where: { id: t.id },
          data: { status: 'RESOLVED', resolvedAt: new Date() }
        });
      }
    });
  } catch (error) {
    console.error('Error syncing customer after order:', error);
  }
}
