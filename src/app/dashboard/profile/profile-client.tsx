'use client';

import React, { useTransition } from 'react';
import { updateMyProfile, updateMyPassword } from '@/lib/profile-actions';
import { getRoleName } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { Save, Key } from 'lucide-react';

export default function ProfileClient({ profile }: { profile: any }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleUpdateProfile = (formData: FormData) => {
    const input = {
      name: formData.get('name') as string,
      phone: formData.get('phone') as string,
    };

    startTransition(async () => {
      try {
        await updateMyProfile(input);
        alert('Cập nhật hồ sơ thành công!');
        router.refresh();
      } catch (err: any) {
        alert(err.message);
      }
    });
  };

  const handleUpdatePassword = (formData: FormData) => {
    const currentPassword = formData.get('currentPassword') as string;
    const newPassword = formData.get('newPassword') as string;
    const confirmPassword = formData.get('confirmPassword') as string;

    if (newPassword !== confirmPassword) {
      alert('Mật khẩu xác nhận không khớp.');
      return;
    }

    startTransition(async () => {
      try {
        await updateMyPassword(currentPassword, newPassword);
        alert('Đổi mật khẩu thành công! Bạn sẽ bị đăng xuất khỏi các thiết bị khác.');
        (document.getElementById('form-password') as HTMLFormElement).reset();
        router.refresh();
      } catch (err: any) {
        alert(err.message);
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Thông tin cá nhân */}
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
          <h3 className="font-bold text-slate-800 dark:text-white">Thông tin cá nhân</h3>
        </div>
        <div className="p-6">
          <form action={handleUpdateProfile} className="space-y-4 max-w-lg">
            <div>
              <label className="block text-sm font-medium mb-1">Email (Đăng nhập)</label>
              <input type="email" defaultValue={profile.email} disabled className="w-full p-2 border rounded dark:bg-slate-800 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-500 cursor-not-allowed" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Vai trò</label>
              <input type="text" defaultValue={getRoleName(profile.role)} disabled className="w-full p-2 border rounded dark:bg-slate-800 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-500 cursor-not-allowed" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Phòng ban</label>
              <input type="text" defaultValue={profile.department || ''} disabled className="w-full p-2 border rounded dark:bg-slate-800 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-500 cursor-not-allowed" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Họ tên *</label>
              <input type="text" name="name" defaultValue={profile.name} required className="w-full p-2 border rounded dark:bg-slate-800 dark:border-slate-700" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Số điện thoại</label>
              <input type="text" name="phone" defaultValue={profile.phone || ''} className="w-full p-2 border rounded dark:bg-slate-800 dark:border-slate-700" />
            </div>
            <div className="pt-2">
              <button type="submit" disabled={isPending} className="px-6 py-2 bg-indigo-600 text-white rounded-lg flex items-center gap-2 font-semibold">
                <Save className="w-4 h-4" /> Lưu thay đổi
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Đổi mật khẩu */}
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
          <h3 className="font-bold text-slate-800 dark:text-white">Đổi mật khẩu</h3>
        </div>
        <div className="p-6">
          <form id="form-password" action={handleUpdatePassword} className="space-y-4 max-w-lg">
            <div>
              <label className="block text-sm font-medium mb-1">Mật khẩu hiện tại *</label>
              <input type="password" name="currentPassword" required className="w-full p-2 border rounded dark:bg-slate-800 dark:border-slate-700" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Mật khẩu mới *</label>
              <input type="password" name="newPassword" required minLength={6} className="w-full p-2 border rounded dark:bg-slate-800 dark:border-slate-700" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Xác nhận mật khẩu mới *</label>
              <input type="password" name="confirmPassword" required minLength={6} className="w-full p-2 border rounded dark:bg-slate-800 dark:border-slate-700" />
            </div>
            <div className="pt-2">
              <button type="submit" disabled={isPending} className="px-6 py-2 bg-slate-800 dark:bg-slate-700 text-white rounded-lg flex items-center gap-2 font-semibold hover:bg-slate-900 dark:hover:bg-slate-600 transition-colors">
                <Key className="w-4 h-4" /> Cập nhật mật khẩu
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
