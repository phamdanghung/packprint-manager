import { getInboundReceiptDetail } from '@/lib/inventory-inbound-actions';
import { checkInventoryAccess } from '@/lib/inventory-actions';
import InboundDetailClient from './inbound-detail-client';
import { notFound } from 'next/navigation';

export const metadata = {
  title: 'Chi tiết Phiếu Nhập Kho | Quản lý Kho',
};

export default async function InboundReceiptDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await checkInventoryAccess();
  const resolvedParams = await params;
  const receipt = await getInboundReceiptDetail(resolvedParams.id);

  if (!receipt) {
    notFound();
  }

  return (
    <InboundDetailClient receipt={receipt} userRole={user.role} />
  );
}
