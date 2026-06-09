import React from 'react';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import MoldClient from './mold-client';

export default async function MoldsPage() {
  const user = await getCurrentUser();
  if (!user) return <div>Không có quyền truy cập</div>;

  const molds = await db.dieCutMold.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      customer: { select: { name: true } },
      usages: {
        where: { status: 'IN_USE' },
        include: { checkedOutBy: { select: { name: true } } }
      }
    }
  });

  return <MoldClient initialMolds={molds} userRole={user.role} />;
}
