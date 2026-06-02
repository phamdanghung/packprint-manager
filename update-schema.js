const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, 'prisma', 'schema.prisma');
let schema = fs.readFileSync(schemaPath, 'utf8');

// Insert relations if not exists
if (!schema.includes('printQueueItems PrintQueueItem[]')) {
  schema = schema.replace(
    /model Order \{[\s\S]*?(?=\n\})/,
    (match) => match + '\n  printQueueItems        PrintQueueItem[]'
  );
  
  schema = schema.replace(
    /model ProductionJob \{[\s\S]*?(?=\n\})/,
    (match) => match + '\n  printQueueItems        PrintQueueItem[]'
  );

  schema = schema.replace(
    /model DesignFile \{[\s\S]*?(?=\n\})/,
    (match) => match + '\n  printQueueItems        PrintQueueItem[]'
  );

  schema = schema.replace(
    /model InventoryItem \{[\s\S]*?(?=\n\})/,
    (match) => match + '\n  printQueueItems        PrintQueueItem[]'
  );

  schema = schema.replace(
    /model User \{[\s\S]*?(?=\n\})/,
    (match) => match + '\n  assignedPrintJobs      PrintQueueItem[] @relation("PrintJobAssignedTo")\n  printQueueLogs         PrintQueueLog[]  @relation("PrintQueueLogActor")'
  );
  
  schema = schema.replace(
    /model InventoryReservation \{[\s\S]*?(?=\n\})/,
    (match) => match + '\n  printQueueItems        PrintQueueItem[]'
  );
}

const newModels = `
model ProductionMachine {
  id                        String   @id @default(uuid())
  machineCode               String   @unique
  machineName               String
  machineType               String   
  status                    String   @default("ACTIVE") 
  defaultSpeedSheetsPerHour Int?
  setupTimeMinutes          Int?
  maintenanceNote           String?
  createdAt                 DateTime @default(now())
  updatedAt                 DateTime @updatedAt
  
  printQueueItems           PrintQueueItem[]
}

model PrintQueueItem {
  id               String    @id @default(uuid())
  productionJobId  String
  orderId          String
  machineId        String?
  assignedToId     String?
  printFileId      String?
  materialId       String?
  inventoryReservationId String?
  
  sheetSize        String?
  labelsPerSheet   Int?
  finishedQuantity Int?
  estimatedSheets  Int?
  totalSheets      Int
  wasteSheets      Int?
  printedSheets    Int       @default(0)
  sheetCalculationNote String?

  numberOfSides    Int       @default(1)
  colorMode        String?
  printMode        String?
  
  status           String    @default("WAITING_ASSIGNMENT") 
  fileStatus       String    @default("NOT_CHECKED") 
  materialStatus   String    @default("NOT_CHECKED") 
  isMaterialReserved Boolean @default(false)
  reservedQuantity   Int     @default(0)
  
  priority         String    @default("NORMAL")
  queuePosition    Int       @default(0)
  scheduledDate    DateTime?
  deadline         DateTime?
  startAt          DateTime?
  endAt            DateTime?
  actualStartAt    DateTime?
  actualEndAt      DateTime?
  
  printNote        String?
  waitingReason    String?
  pauseReason      String?
  errorReason      String?
  blockReason      String?
  
  createdAt        DateTime  @default(now())
  updatedAt        DateTime  @updatedAt

  productionJob    ProductionJob     @relation(fields: [productionJobId], references: [id], onDelete: Cascade)
  order            Order             @relation(fields: [orderId], references: [id], onDelete: Cascade)
  machine          ProductionMachine? @relation(fields: [machineId], references: [id])
  assignedTo       User?             @relation("PrintJobAssignedTo", fields: [assignedToId], references: [id])
  printFile        DesignFile?       @relation(fields: [printFileId], references: [id])
  material         InventoryItem?    @relation(fields: [materialId], references: [id])
  inventoryReservation InventoryReservation? @relation(fields: [inventoryReservationId], references: [id])
  
  logs             PrintQueueLog[]

  @@index([machineId])
  @@index([status])
  @@index([productionJobId])
  @@index([orderId])
  @@index([scheduledDate])
}

model PrintQueueLog {
  id                  String   @id @default(uuid())
  printQueueItemId    String
  actorId             String
  action              String
  fromStatus          String?
  toStatus            String?
  printedSheetsBefore Int?
  printedSheetsAfter  Int?
  note                String?
  createdAt           DateTime @default(now())
  
  printQueueItem      PrintQueueItem @relation(fields: [printQueueItemId], references: [id], onDelete: Cascade)
  actor               User           @relation("PrintQueueLogActor", fields: [actorId], references: [id])
  
  @@index([printQueueItemId])
  @@index([actorId])
  @@index([createdAt])
}
`;

if (!schema.includes('model PrintQueueItem')) {
  schema += '\n' + newModels;
}

fs.writeFileSync(schemaPath, schema);
console.log('Schema updated successfully');
