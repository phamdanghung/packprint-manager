import { getPostPrintOperations, getOperationDefinitions } from '@/lib/post-print-actions';
import { getProductionMachines } from '@/lib/production-schedule-actions';
import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import PostPrintClient from './post-print-client';
import { getUsers } from '@/lib/settings-actions';

export const metadata = {
  title: 'Gia Công Sau In | In Siêu Tốc',
};

export default async function PostPrintPage({
  searchParams,
}: {
  searchParams: Promise<{ machine?: string, opCode?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user || ['SALES', 'DESIGNER', 'ACCOUNTANT'].includes(user.role)) {
    redirect('/dashboard');
  }

  const resolvedParams = await searchParams;
  const { machine, opCode } = resolvedParams;
  
  const [operations, opDefs, machines, allUsers] = await Promise.all([
    getPostPrintOperations(machine, opCode),
    getOperationDefinitions(),
    getProductionMachines(),
    getUsers()
  ]);
  
  // Lọc users có role production, admin, manager
  const workers = allUsers.filter(u => ['ADMIN', 'MANAGER', 'PRODUCTION'].includes(u.role));

  return (
    <div className="flex flex-col h-full bg-slate-50 overflow-hidden">
      <div className="px-6 py-4 bg-white border-b shrink-0">
        <h1 className="text-2xl font-bold text-gray-800">Quản Lý Gia Công Sau In</h1>
        <p className="text-sm text-gray-500 mt-1">Điều phối và cập nhật trạng thái các công đoạn sau in.</p>
      </div>
      
      <div className="flex-1 overflow-hidden flex flex-col px-6 pt-4 pb-6">
        <PostPrintClient 
          operations={operations as any}
          opDefs={opDefs as any}
          machines={machines}
          currentUser={user}
          workers={workers}
        />
      </div>
    </div>
  );
}
