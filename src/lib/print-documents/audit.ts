import { db } from '@/lib/db';
import { headers } from 'next/headers';

export async function logPrintAction(
  action: string,
  entityType: string,
  entityId: string,
  actorId?: string,
  actorRole?: string
) {
  try {
    const headersList = await headers();
    const userAgent = headersList.get('user-agent') || 'Unknown';
    const ipAddress = headersList.get('x-forwarded-for') || 'Unknown';

    await db.systemAuditLog.create({
      data: {
        action,
        entityType,
        entityId,
        actorId: actorId || 'SYSTEM',
        actorRole: actorRole || 'SYSTEM',
        userAgent,
        ipAddress,
        description: `Printed ${entityType} ${entityId}`
      }
    });
  } catch (error) {
    console.error('Failed to log print action:', error);
  }
}
