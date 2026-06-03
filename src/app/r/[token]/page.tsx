import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { ShieldAlert, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { headers } from 'next/headers';
import { resolveSmartQR } from '@/lib/smart-qr';

export default async function SmartResolverPage({ params }: { params: { token: string } }) {
  const { token } = await params;
  
  // 1. Check Auth
  const user = await getCurrentUser();
  if (!user) {
    redirect(`/login?callbackUrl=/r/${token}`);
  }

  const headersList = await headers();
  const userAgent = headersList.get('user-agent') || 'Unknown';
  const ipAddress = headersList.get('x-forwarded-for') || 'Unknown';

  const { result, targetUrl, reason, job } = await resolveSmartQR(token, user, userAgent, ipAddress);

  if (result === 'REDIRECT' && targetUrl) {
    redirect(targetUrl);
  }

  if (result === 'NO_TARGET') {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center space-y-4">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h1 className="text-xl font-bold text-slate-800">Hoàn Tất Công Việc</h1>
          <p className="text-slate-500 text-sm">
            Lệnh sản xuất <strong>{job?.jobCode}</strong> không còn công việc nào đang chờ xử lý cho bộ phận <strong>{user.role}</strong>.
          </p>
          <div className="pt-4">
            <Link href="/dashboard" className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium inline-block transition-colors">
              Về Trang Chủ
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return <ErrorUI title="Không thể xử lý QR" message={reason} />;
}

function ErrorUI({ title, message }: { title: string, message: string }) {
  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-rose-200 p-8 text-center space-y-4">
        <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-4 text-rose-500">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h1 className="text-xl font-bold text-rose-800">{title}</h1>
        <p className="text-rose-600/80 text-sm">{message}</p>
        <div className="pt-4">
          <Link href="/dashboard" className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-medium inline-block transition-colors">
            Quay Lại Dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
