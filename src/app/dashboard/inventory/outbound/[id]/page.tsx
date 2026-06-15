import { getOutboundReceiptDetail } from '@/lib/inventory-outbound-actions';
import { checkInventoryAccess } from '@/lib/inventory-actions';
import OutboundDetailClient from './outbound-detail-client';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Chi tiết Phiếu Xuất Kho | Quản lý Kho',
};

export default async function OutboundReceiptDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await checkInventoryAccess();
  const resolvedParams = await params;
  const receipt = await getOutboundReceiptDetail(resolvedParams.id);

  if (!receipt) {
    notFound();
  }

  return (
    <OutboundDetailClient receipt={receipt} userRole={user.role} />
  );
}
