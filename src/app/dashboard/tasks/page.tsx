import React from 'react';
import { getTaskCenterData, syncSystemTasks } from '@/lib/task-actions';
import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import TasksClient from '@/components/tasks/tasks-client';

export const dynamic = 'force-dynamic';

export default async function TasksPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  // Trigger sync before fetching tasks to ensure data is up to date.
  // The backend already handles deduping, reopening, and transactions.
  await syncSystemTasks();

  const res = await getTaskCenterData();
  if (!res.success || !res.data) {
    return (
      <div className="p-6">
        <div className="bg-rose-50 text-rose-600 p-4 rounded-xl">
          Lỗi khi tải danh sách nhiệm vụ: {res.error}
        </div>
      </div>
    );
  }

  const { tasks, stats } = res.data;

  return <TasksClient initialTasks={tasks} initialStats={stats} currentUser={user} />;
}
