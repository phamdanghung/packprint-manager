import { getInventoryItems } from '@/lib/inventory-actions';
import InboundNewClient from './inbound-new-client';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Tạo Phiếu Nhập Kho | Quản lý Kho',
};

export default async function NewInboundReceiptPage() {
  const items = await getInventoryItems();

  return (
    <InboundNewClient items={items} />
  );
}
