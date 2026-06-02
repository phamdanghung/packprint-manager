import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function main() {
  console.log('Seeding Production Machines...');

  const machines = [
    {
      machineCode: 'KONICA_C12000',
      machineName: 'Máy in màu Konica Minolta C12000',
      machineType: 'PRINTER',
      defaultSpeedSheetsPerHour: 7200,
      setupTimeMinutes: 5,
    },
    {
      machineCode: 'KONICA_C7100',
      machineName: 'Máy in màu Konica Minolta C7100',
      machineType: 'PRINTER',
      defaultSpeedSheetsPerHour: 4200,
      setupTimeMinutes: 5,
    },
    {
      machineCode: 'FUJIFILM_REVORIA',
      machineName: 'Máy in Fujifilm Revoria PC1120',
      machineType: 'PRINTER',
      defaultSpeedSheetsPerHour: 7200,
      setupTimeMinutes: 10,
    },
    {
      machineCode: 'LAMINATOR_01',
      machineName: 'Máy cán màng nhiệt tự động',
      machineType: 'LAMINATOR',
      defaultSpeedSheetsPerHour: 3000,
      setupTimeMinutes: 15,
    },
    {
      machineCode: 'DIECUT_01',
      machineName: 'Máy bế decal kỹ thuật số',
      machineType: 'DIECUT',
      defaultSpeedSheetsPerHour: 1000,
      setupTimeMinutes: 5,
    },
    {
      machineCode: 'CUTTER_01',
      machineName: 'Máy xén giấy',
      machineType: 'CUTTER',
      defaultSpeedSheetsPerHour: 10000,
      setupTimeMinutes: 2,
    }
  ];

  for (const m of machines) {
    await db.productionMachine.upsert({
      where: { machineCode: m.machineCode },
      update: m,
      create: m
    });
  }

  console.log('✅ Seeding complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
