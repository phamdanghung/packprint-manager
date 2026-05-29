import { PrismaClient } from '@prisma/client';
import path from 'path';
import fs from 'fs';

// Dòng này cực kỳ quan trọng: Bắt buộc Next.js/Webpack compiler nhận diện 
// tệp database làm dependency tĩnh để tự động đóng gói (bundle) vào Serverless Lambda
try {
  const dummyPath = path.join(process.cwd(), 'prisma', 'dev.db');
  if (fs.existsSync(dummyPath)) {
    const size = fs.statSync(dummyPath).size;
    console.log('SQLite database found during compile, size:', size);
  }
} catch (e) {
  // Bỏ qua lỗi trong lúc build tĩnh
}

// Xác định đường dẫn tuyệt đối chính xác 100% đến file SQLite database tại runtime
const dbPath = path.join(process.cwd(), 'prisma', 'dev.db');
const databaseUrl = `file:${dbPath}`;

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
