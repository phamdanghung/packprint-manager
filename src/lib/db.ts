import { PrismaClient } from '@prisma/client';
import path from 'path';

// Xác định đường dẫn tuyệt đối chính xác 100% đến file SQLite database
// process.cwd() trả về thư mục gốc của project (trên Vercel là /var/task)
const dbPath = path.join(process.cwd(), 'prisma', 'dev.db');
const databaseUrl = `file:${dbPath}`;

// Thiết lập vào môi trường để Prisma CLI hoặc các thành phần khác có thể đọc (phòng hờ)
process.env.DATABASE_URL = databaseUrl;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Khởi tạo Prisma Client và truyền động URL kết nối tuyệt đối
export const db = globalForPrisma.prisma ?? new PrismaClient({
  datasources: {
    db: {
      url: databaseUrl,
    },
  },
});

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;
