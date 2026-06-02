import { db } from './db';
import { headers } from 'next/headers';

type AuditLogInput = {
  actorId?: string;
  actorName?: string;
  actorRole?: string;
  action: string;
  entityType: string;
  entityId?: string;
  entityCode?: string;
  description?: string;
  beforeData?: any;
  afterData?: any;
};

const SENSITIVE_FIELDS = [
  'password',
  'passwordHash',
  'oldPassword',
  'newPassword',
  'confirmPassword',
  'token',
  'refreshToken',
  'session',
  'secret',
  'apiKey',
];

export function maskSensitiveFields(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    return obj.map(item => maskSensitiveFields(item));
  }

  const maskedObj: any = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      if (SENSITIVE_FIELDS.includes(key) || key.toLowerCase().includes('password')) {
        maskedObj[key] = '*** MASKED ***';
      } else {
        maskedObj[key] = maskSensitiveFields(obj[key]);
      }
    }
  }
  return maskedObj;
}

export function diffBeforeAfter(before: any, after: any) {
  return {
    before: maskSensitiveFields(before),
    after: maskSensitiveFields(after),
  };
}

export async function createAuditLog(input: AuditLogInput) {
  try {
    let userAgent = undefined;
    let ipAddress = undefined;

    try {
      const headersList = await headers();
      userAgent = headersList.get('user-agent') || undefined;
      ipAddress = headersList.get('x-forwarded-for') || headersList.get('x-real-ip') || undefined;
    } catch (e) {
      // Ignore if headers are not available
    }

    const beforeJson = input.beforeData ? JSON.stringify(maskSensitiveFields(input.beforeData)) : undefined;
    const afterJson = input.afterData ? JSON.stringify(maskSensitiveFields(input.afterData)) : undefined;

    await db.systemAuditLog.create({
      data: {
        actorId: input.actorId,
        actorName: input.actorName,
        actorRole: input.actorRole,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        entityCode: input.entityCode,
        description: input.description,
        beforeJson,
        afterJson,
        ipAddress,
        userAgent,
      },
    });
  } catch (error) {
    console.error('Lỗi khi ghi Audit Log:', error);
  }
}
