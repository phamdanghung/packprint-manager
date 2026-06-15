import { getInventoryItems } from '@/lib/inventory-actions';
import OutboundNewClient from './outbound-new-client';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Tạo Phiếu Xuất Kho | Quản lý Kho',
};

export default async function NewOutboundReceiptPage() {
  const items = await getInventoryItems();

  return (
    <OutboundNewClient items={items} />
  );
}
