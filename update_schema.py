import sys
import re

def main():
    file_path = 'prisma/schema.prisma'
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Insert into User
    if 'assignedOperations      ProductionOperation[]' not in content:
        content = re.sub(r'(model User \{.*?)(^\})', r'\1  assignedOperations      ProductionOperation[]  @relation("OperationAssignedUser")\n  operationLogs           ProductionOperationLog[] @relation("OperationLogActor")\n\2', content, flags=re.MULTILINE | re.DOTALL)

    # Insert into ProductionJob
    if 'operations              ProductionOperation[]' not in content and 'model ProductionJob {' in content:
        content = re.sub(r'(model ProductionJob \{.*?)(^\})', r'\1  operations              ProductionOperation[]\n\2', content, flags=re.MULTILINE | re.DOTALL)

    # Insert into PrintQueueItem
    if 'operations              ProductionOperation[]' not in content and 'model PrintQueueItem {' in content:
        content = re.sub(r'(model PrintQueueItem \{.*?)(^\})', r'\1  operations              ProductionOperation[]\n\2', content, flags=re.MULTILINE | re.DOTALL)

    # Insert into OrderItem
    if 'operations              ProductionOperation[]' not in content and 'model OrderItem {' in content:
        content = re.sub(r'(model OrderItem \{.*?)(^\})', r'\1  operations              ProductionOperation[]\n\2', content, flags=re.MULTILINE | re.DOTALL)

    # Insert into ProductionMachine
    if 'operations              ProductionOperation[]' not in content and 'model ProductionMachine {' in content:
        content = re.sub(r'(model ProductionMachine \{.*?)(^\})', r'\1  operations              ProductionOperation[]\n\2', content, flags=re.MULTILINE | re.DOTALL)

    # Append new models
    new_models = '''
model OperationDefinition {
  id              String   @id @default(uuid())
  code            String   @unique
  name            String
  defaultSequence Int
  isActive        Boolean  @default(true)
  requiresMachine Boolean  @default(false)
  allowOutsource  Boolean  @default(false)
  description     String?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

model ProductionOperation {
  id                  String   @id @default(uuid())
  productionJobId     String
  printQueueItemId    String?
  orderItemId         String?
  operationCode       String
  operationName       String
  sequence            Int
  status              String   @default("WAITING_PREVIOUS")
  machineId           String?
  assignedToId        String?
  
  inputSheets         Int
  plannedSheets       Int
  completedSheets     Int      @default(0)
  goodSheets          Int      @default(0)
  wasteSheets         Int      @default(0)
  
  errorReason         String?
  pauseReason         String?
  outsourceVendorName String?
  outsourceSentAt     DateTime?
  outsourceExpectedReturnAt DateTime?
  outsourceReceivedAt DateTime?
  
  startedAt           DateTime?
  completedAt         DateTime?
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt

  productionJob   ProductionJob     @relation(fields: [productionJobId], references: [id], onDelete: Cascade)
  printQueueItem  PrintQueueItem?   @relation(fields: [printQueueItemId], references: [id], onDelete: Cascade)
  orderItem       OrderItem?        @relation(fields: [orderItemId], references: [id], onDelete: Cascade)
  machine         ProductionMachine?@relation(fields: [machineId], references: [id])
  assignedTo      User?             @relation("OperationAssignedUser", fields: [assignedToId], references: [id])
  logs            ProductionOperationLog[]

  @@index([productionJobId])
  @@index([printQueueItemId])
  @@index([orderItemId])
  @@index([machineId])
  @@index([assignedToId])
  @@index([status])
}

model ProductionOperationLog {
  id                    String   @id @default(uuid())
  productionOperationId String
  actorId               String
  action                String
  fromStatus            String?
  toStatus              String?
  beforeData            String?
  afterData             String?
  note                  String?
  createdAt             DateTime @default(now())

  productionOperation ProductionOperation @relation(fields: [productionOperationId], references: [id], onDelete: Cascade)
  actor               User                @relation("OperationLogActor", fields: [actorId], references: [id])

  @@index([productionOperationId])
  @@index([actorId])
  @@index([createdAt])
}
'''
    if 'model OperationDefinition' not in content:
        content += new_models

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
        
    print("Prisma schema updated successfully.")

if __name__ == '__main__':
    main()
