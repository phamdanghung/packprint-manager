import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getManagementMarginAlerts } from '@/lib/margin-alert-actions';
import MarginReviewClient from './margin-review-client';

export const metadata = {
  title: 'Cảnh báo biên lợi nhuận - PackPrint Manager',
};

export default async function MarginReviewPage({
  searchParams
}: {
  searchParams: Promise<{ periodType?: string; statusFilter?: string }>
}) {
  const user = await getCurrentUser();
  if (!user || !['ADMIN', 'MANAGER', 'ACCOUNTANT'].includes(user.role)) {
    redirect('/dashboard');
  }

  const resolvedSearchParams = await searchParams;
  const periodType = (resolvedSearchParams.periodType as any) || 'MONTH';
  const statusFilter = (resolvedSearchParams.statusFilter as any) || 'ALL';

  const alertsResponse = await getManagementMarginAlerts({ periodType, statusFilter });
  const alertsData = (alertsResponse.success && alertsResponse.data) ? alertsResponse.data : [];

  return (
    <div className="p-6">
      <MarginReviewClient initialData={alertsData} currentUserId={user.id} />
    </div>
  );
}
