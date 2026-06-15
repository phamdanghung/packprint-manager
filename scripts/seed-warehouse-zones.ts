import { seedDefaultWarehouseZones } from '../src/lib/warehouse-zone-actions';

async function seed() {
  console.log('Bắt đầu khởi tạo các khu kho mặc định...');
  const result = await seedDefaultWarehouseZones(true);
  
  if (!result.success || !result.data) {
    console.error('Lỗi khởi tạo:', result.error || 'Unknown error');
    process.exit(1);
  }
  
  console.log(`Hoàn tất! Đã khởi tạo mới ${result.data.createdCount} khu kho.`);
}

seed().then(() => process.exit(0)).catch((e) => {
  console.error('Lỗi ngoại lệ:', e);
  process.exit(1);
});
