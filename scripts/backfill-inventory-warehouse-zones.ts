import { backfillInventoryWarehouseZones } from '../src/lib/warehouse-zone-actions';

async function backfill() {
  console.log('Bắt đầu phân bổ vật tư vào khu kho...');
  const result = await backfillInventoryWarehouseZones(true);
  
  if (result.success) {
    const { assignedCount, skippedCount, unknownCount } = result.data || { assignedCount: 0, skippedCount: 0, unknownCount: 0 };
    console.log(`Hoàn tất phân bổ!`);
    console.log(`- Số lượng gán thành công: ${assignedCount}`);
    console.log(`- Số lượng bỏ qua (không thể map): ${skippedCount}`);
    console.log(`- Số lượng đưa vào KHO-KHAC: ${unknownCount}`);
  } else {
    console.error('Lỗi phân bổ:', result.error);
    process.exit(1);
  }
}

backfill().then(() => process.exit(0)).catch((e) => {
  console.error('Lỗi ngoại lệ:', e);
  process.exit(1);
});
