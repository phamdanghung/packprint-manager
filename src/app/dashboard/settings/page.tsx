import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import SettingsClient from './settings-client';
import { getUsers, getCompanySettings, getSystemAuditLogs } from '@/lib/settings-actions';

export const metadata = {
  title: 'Cài đặt hệ thống - PackPrint',
};

export default async function SettingsPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser || (currentUser.role !== 'ADMIN' && currentUser.role !== 'MANAGER')) {
    redirect('/dashboard');
  }

  const [users, companySettings, auditLogs] = await Promise.all([
    getUsers(),
    getCompanySettings(),
    getSystemAuditLogs()
  ]);

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Cài đặt hệ thống</h1>
        <p className="text-slate-500 mt-1">Quản lý người dùng, phân quyền, công ty và nhật ký hoạt động.</p>
      </div>

      <SettingsClient 
        initialUsers={users}
        companySettings={companySettings}
        auditLogs={auditLogs}
        currentUser={currentUser}
      />
    </div>
  );
}
