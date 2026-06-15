import { getWarehouseZones } from '@/lib/warehouse-zone-actions';
import WarehouseZoneClient from './warehouse-zone-client';
import { getCurrentUser } from '@/lib/auth';

export default async function WarehouseZonesPage() {
  const user = await getCurrentUser();
  const isAdminOrManager = user?.role === 'ADMIN' || user?.role === 'MANAGER';
  
  // Lấy cả inactive zone
  const response = await getWarehouseZones(true);
  const zones = response.success && response.data ? response.data : [];

  return (
    <div className="p-6">
      <WarehouseZoneClient initialZones={zones} isAdminOrManager={isAdminOrManager} />
    </div>
  );
}
