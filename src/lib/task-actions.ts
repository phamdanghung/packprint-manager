'use server';

import { db } from './db';
import { getCurrentUser } from './auth';

import { syncSystemTasks as _syncSystemTasks } from './task-sync';

export async function checkTaskAuth(allowedRoles: string[]) {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: 'Unauthorized' };
  if (!allowedRoles.includes(user.role) && !allowedRoles.includes('ALL')) {
    return { ok: false, error: 'Permission denied' };
  }
  return { ok: true, user };
}

// Hàm hỗ trợ log
function buildTaskLog(taskId: string, actorId: string, actionType: string, fromStatus?: string | null, toStatus?: string | null, note?: string | null) {
  return {
    taskId,
    actorId,
    actionType,
    fromStatus,
    toStatus,
    note
  };
}

// Lấy danh sách nhiệm vụ theo Role
export async function getTasks(filters?: any) {
  try {
    const auth = await checkTaskAuth(['ALL']);
    if (!auth.ok) return { success: false, error: auth.error };

    const { role, id: userId } = auth.user!;
    let where: any = {};

    // 1. Phân quyền lọc Role
    if (role === 'SALES') {
      where.OR = [
        { assignedSalesId: userId },
        { assignedToId: userId }
      ];
    } else if (role === 'ACCOUNTANT') {
      where.OR = [
        { assignedRole: 'ACCOUNTANT' },
        { assignedToId: userId }
      ];
    } else if (role === 'PRODUCTION') {
      where.OR = [
        { assignedRole: 'PRODUCTION' },
        { assignedToId: userId }
      ];
    } else if (role === 'DELIVERY') {
      where.OR = [
        { assignedRole: 'DELIVERY' },
        { assignedToId: userId }
      ];
    } else if (role === 'DESIGNER') {
      where.OR = [
        { assignedRole: 'DESIGNER' },
        { assignedToId: userId }
      ];
    }

    if (filters?.status) {
      if (filters.status === 'ACTIVE') {
        where.status = { in: ['OPEN', 'IN_PROGRESS'] };
      } else {
        where.status = filters.status;
      }
    } else {
      where.status = { in: ['OPEN', 'IN_PROGRESS'] }; // Mặc định
    }

    if (filters?.priority) where.priority = filters.priority;
    if (filters?.type) where.type = filters.type;

    const tasks = await db.taskItem.findMany({
      where,
      include: {
        customer: { select: { name: true, customerCode: true } },
        order: { select: { orderCode: true } },
        assignedTo: { select: { name: true } },
      },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'desc' }
      ]
    });

    return { success: true, data: tasks };
  } catch (error: any) {
    console.error('getTasks err:', error);
    return { success: false, error: error.message };
  }
}

// Đếm task
export async function getTaskCountsByRole() {
  try {
    const auth = await checkTaskAuth(['ALL']);
    if (!auth.ok) return 0;

    const { role, id: userId } = auth.user!;
    let where: any = { status: { in: ['OPEN', 'IN_PROGRESS'] } };

    if (role === 'SALES') {
      where.OR = [{ assignedSalesId: userId }, { assignedToId: userId }];
    } else if (role === 'ACCOUNTANT') {
      where.OR = [{ assignedRole: 'ACCOUNTANT' }, { assignedToId: userId }];
    } else if (role === 'PRODUCTION') {
      where.OR = [{ assignedRole: 'PRODUCTION' }, { assignedToId: userId }];
    } else if (role === 'DELIVERY') {
      where.OR = [{ assignedRole: 'DELIVERY' }, { assignedToId: userId }];
    } else if (role === 'DESIGNER') {
      where.OR = [{ assignedRole: 'DESIGNER' }, { assignedToId: userId }];
    }

    const count = await db.taskItem.count({ where });
    return count;
  } catch (error) {
    console.error(error);
    return 0;
  }
}

// Lấy chi tiết task
export async function getTaskById(taskId: string) {
  try {
    const auth = await checkTaskAuth(['ALL']);
    if (!auth.ok) return { success: false, error: auth.error };

    const task = await db.taskItem.findUnique({
      where: { id: taskId },
      include: {
        customer: { select: { name: true, customerCode: true } },
        order: { select: { orderCode: true } },
        assignedTo: { select: { name: true } },
        createdBy: { select: { name: true } },
        logs: {
          include: { actor: { select: { name: true } } },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!task) return { success: false, error: 'Không tìm thấy task' };
    
    // Check permission logic here (similar to getTasks)
    
    return { success: true, data: task };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// Cập nhật trạng thái
export async function updateTaskStatus(taskId: string, status: string, note?: string) {
  try {
    const auth = await checkTaskAuth(['ALL']);
    if (!auth.ok) return { success: false, error: auth.error };

    const task = await db.taskItem.findUnique({ where: { id: taskId } });
    if (!task) return { success: false, error: 'Không tìm thấy task' };

    // Phân quyền update
    const { role, id: userId } = auth.user!;
    const isMgmt = ['ADMIN', 'MANAGER'].includes(role);
    const isAssignedTo = task.assignedToId === userId;
    const isSalesOwner = role === 'SALES' && task.assignedSalesId === userId;
    const isRoleOwner = role === task.assignedRole;

    if (!isMgmt && !isAssignedTo && !isSalesOwner && !isRoleOwner) {
      return { success: false, error: 'Bạn không có quyền thao tác task này' };
    }

    await db.$transaction(async (tx) => {
      await tx.taskItem.update({
        where: { id: taskId },
        data: {
          status,
          resolvedAt: ['DONE', 'DISMISSED', 'CANCELLED'].includes(status) ? new Date() : null,
          resolvedById: ['DONE', 'DISMISSED', 'CANCELLED'].includes(status) ? userId : null
        }
      });

      await tx.taskLog.create({
        data: buildTaskLog(taskId, userId, 'STATUS_CHANGED', task.status, status, note || 'Cập nhật trạng thái')
      });
    });

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function dismissTask(taskId: string, note?: string) {
  return updateTaskStatus(taskId, 'DISMISSED', note || 'Đã bỏ qua');
}

export async function addTaskComment(taskId: string, note: string) {
  try {
    const auth = await checkTaskAuth(['ALL']);
    if (!auth.ok) return { success: false, error: auth.error };

    const task = await db.taskItem.findUnique({ where: { id: taskId } });
    if (!task) return { success: false, error: 'Task không tồn tại' };

    await db.taskLog.create({
      data: buildTaskLog(taskId, auth.user!.id, 'COMMENT_ADDED', task.status, task.status, note)
    });

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function assignTask(taskId: string, userId: string) {
  try {
    const auth = await checkTaskAuth(['ADMIN', 'MANAGER']);
    if (!auth.ok) return { success: false, error: auth.error };

    const task = await db.taskItem.findUnique({ where: { id: taskId } });
    if (!task) return { success: false, error: 'Task không tồn tại' };

    await db.$transaction(async (tx) => {
      await tx.taskItem.update({
        where: { id: taskId },
        data: { assignedToId: userId }
      });
      await tx.taskLog.create({
        data: buildTaskLog(taskId, auth.user!.id, 'ASSIGNED', task.status, task.status, 'Gán người xử lý')
      });
    });

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function syncSystemTasks() {
  try {
    const auth = await checkTaskAuth(['ALL']);
    if (!auth.ok) return { success: false, error: auth.error };

    const result = await _syncSystemTasks(auth.user!.id);
    return { success: true, data: result };
  } catch (error: any) {
    console.error('syncSystemTasks err:', error);
    return { success: false, error: error.message };
  }
}

export async function getTaskCenterData() {
  try {
    const auth = await checkTaskAuth(['ALL']);
    if (!auth.ok) return { success: false, error: auth.error };

    const { role, id: userId } = auth.user!;
    let where: any = {};
    if (role === 'SALES') {
      where.OR = [{ assignedSalesId: userId }, { assignedToId: userId }];
    } else if (role === 'ACCOUNTANT') {
      where.OR = [{ assignedRole: 'ACCOUNTANT' }, { assignedToId: userId }];
    } else if (role === 'PRODUCTION') {
      where.OR = [{ assignedRole: 'PRODUCTION' }, { assignedToId: userId }];
    } else if (role === 'DELIVERY') {
      where.OR = [{ assignedRole: 'DELIVERY' }, { assignedToId: userId }];
    } else if (role === 'DESIGNER') {
      where.OR = [{ assignedRole: 'DESIGNER' }, { assignedToId: userId }];
    }

    const tasks = await db.taskItem.findMany({
      where,
      include: {
        customer: { select: { name: true, customerCode: true } },
        order: { select: { orderCode: true } },
        assignedTo: { select: { name: true } },
        createdBy: { select: { name: true } },
        logs: {
          include: { actor: { select: { name: true } } },
          orderBy: { createdAt: 'desc' }
        }
      },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'desc' }
      ]
    });

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const stats = {
      openCount: 0,
      urgentCount: 0,
      inProgressCount: 0,
      doneTodayCount: 0,
      overdueCount: 0,
    };

    for (const t of tasks) {
      const isOpen = t.status === 'OPEN' || t.status === 'IN_PROGRESS';
      if (isOpen) {
        stats.openCount++;
        if (t.priority === 'URGENT' || t.priority === 'HIGH') stats.urgentCount++;
        if (t.status === 'IN_PROGRESS') stats.inProgressCount++;
        if (t.dueAt && new Date(t.dueAt) < now) stats.overdueCount++;
      } else if (t.status === 'DONE' && t.resolvedAt && new Date(t.resolvedAt) >= todayStart) {
        stats.doneTodayCount++;
      }
    }

    return { success: true, data: { tasks, stats, currentUser: auth.user } };
  } catch (error: any) {
    console.error('getTaskCenterData err:', error);
    return { success: false, error: error.message };
  }
}
