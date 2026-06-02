import { getMyProfile } from '@/lib/profile-actions';
import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import ProfileClient from './profile-client';

export const metadata = {
  title: 'Hồ sơ cá nhân - PackPrint',
};

export default async function ProfilePage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect('/login');
  }

  const profile = await getMyProfile();

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Hồ sơ cá nhân</h1>
        <p className="text-slate-500 mt-1">Quản lý thông tin tài khoản và bảo mật của bạn.</p>
      </div>

      <ProfileClient profile={profile} />
    </div>
  );
}
