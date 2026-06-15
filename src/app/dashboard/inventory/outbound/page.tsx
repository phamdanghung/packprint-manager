import { getOutboundReceipts } from '@/lib/inventory-outbound-actions';
import OutboundClient from './outbound-client';
import { checkInventoryAccess } from '@/lib/inventory-actions';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Phiếu Xuất Kho | Quản lý Kho',
};

export default async function OutboundReceiptsPage() {
  const user = await checkInventoryAccess();
  const receipts = await getOutboundReceipts();

  return (
    <OutboundClient initialData={receipts} userRole={user.role} />
  );
}
