'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { getRoleName } from '@/lib/utils';
import { createUser, updateUser, deactivateUser, reactivateUser, resetUserPassword, updateCompanySettings } from '@/lib/settings-actions';
import { Plus, Edit2, Key, ShieldOff, Shield, Eye, Save } from 'lucide-react';

export default function SettingsClient({ initialUsers, companySettings, auditLogs, currentUser }: any) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [activeTab, setActiveTab] = useState('users');
  
  // Modals state
  const [userModal, setUserModal] = useState<{ isOpen: boolean, user: any }>({ isOpen: false, user: null });
  const [resetModal, setResetModal] = useState<{ isOpen: boolean, user: any }>({ isOpen: false, user: null });
  const [logModal, setLogModal] = useState<{ isOpen: boolean, log: any }>({ isOpen: false, log: null });

  // Filter state for Audit Log
  const [logFilter, setLogFilter] = useState('');

  // Handle Tab Switch
  const TABS = [
    { id: 'users', label: 'Người dùng' },
    { id: 'company', label: 'Thông tin công ty' },
    { id: 'audit', label: 'Nhật ký hệ thống' },
    { id: 'system', label: 'Cài đặt hệ thống' },
  ];

  // =====================
  // USER TAB RENDER
  // =====================
  const renderUsersTab = () => {
    const totalUsers = initialUsers.length;
    const activeUsers = initialUsers.filter((u: any) => u.status === 'ACTIVE').length;
    const adminManagers = initialUsers.filter((u: any) => u.role === 'ADMIN' || u.role === 'MANAGER').length;

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="text-slate-500 text-xs mb-1">Tổng người dùng</div>
            <div className="text-2xl font-bold text-slate-800 dark:text-white">{totalUsers}</div>
          </div>
          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="text-slate-500 text-xs mb-1">Đang hoạt động</div>
            <div className="text-2xl font-bold text-emerald-600">{activeUsers}</div>
          </div>
          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="text-slate-500 text-xs mb-1">Đã khóa</div>
            <div className="text-2xl font-bold text-rose-600">{totalUsers - activeUsers}</div>
          </div>
          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="text-slate-500 text-xs mb-1">Quản trị viên (Admin/Manager)</div>
            <div className="text-2xl font-bold text-indigo-600">{adminManagers}</div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
            <h3 className="font-bold text-slate-800 dark:text-white">Danh sách người dùng</h3>
            <button 
              onClick={() => setUserModal({ isOpen: true, user: null })}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Thêm người dùng
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-slate-600 dark:text-slate-300">
              <thead className="text-xs uppercase bg-slate-50 dark:bg-slate-800/50 text-slate-500">
                <tr>
                  <th className="px-6 py-4">Họ tên</th>
                  <th className="px-6 py-4">Email</th>
                  <th className="px-6 py-4">Vai trò</th>
                  <th className="px-6 py-4">Trạng thái</th>
                  <th className="px-6 py-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {initialUsers.map((user: any) => (
                  <tr key={user.id} className="border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">{user.name}</td>
                    <td className="px-6 py-4">{user.email}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${user.role === 'ADMIN' ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'}`}>
                        {getRoleName(user.role)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {user.status === 'ACTIVE' ? (
                        <span className="text-emerald-600 bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 px-2 py-1 rounded-full text-xs font-semibold">Đang hoạt động</span>
                      ) : (
                        <span className="text-rose-600 bg-rose-100 dark:bg-rose-500/10 dark:text-rose-400 px-2 py-1 rounded-full text-xs font-semibold">Đã khóa</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right flex items-center justify-end gap-2">
                      <button onClick={() => setUserModal({ isOpen: true, user })} className="p-1.5 text-slate-400 hover:text-indigo-600 rounded bg-slate-100 hover:bg-indigo-50 dark:bg-slate-800" title="Sửa">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => setResetModal({ isOpen: true, user })} className="p-1.5 text-slate-400 hover:text-amber-600 rounded bg-slate-100 hover:bg-amber-50 dark:bg-slate-800" title="Reset mật khẩu">
                        <Key className="w-4 h-4" />
                      </button>
                      {user.status === 'ACTIVE' ? (
                        <button onClick={() => handleDeactivate(user.id)} className="p-1.5 text-slate-400 hover:text-rose-600 rounded bg-slate-100 hover:bg-rose-50 dark:bg-slate-800" title="Khóa tài khoản">
                          <ShieldOff className="w-4 h-4" />
                        </button>
                      ) : (
                        <button onClick={() => handleReactivate(user.id)} className="p-1.5 text-slate-400 hover:text-emerald-600 rounded bg-slate-100 hover:bg-emerald-50 dark:bg-slate-800" title="Mở khóa tài khoản">
                          <Shield className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const handleDeactivate = (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn khóa tài khoản này? Người dùng sẽ bị đăng xuất ngay lập tức.')) return;
    startTransition(async () => {
      try {
        await deactivateUser(id);
        router.refresh();
      } catch (err: any) {
        alert(err.message);
      }
    });
  };

  const handleReactivate = (id: string) => {
    if (!confirm('Xác nhận khôi phục tài khoản này?')) return;
    startTransition(async () => {
      try {
        await reactivateUser(id);
        router.refresh();
      } catch (err: any) {
        alert(err.message);
      }
    });
  };

  // =====================
  // COMPANY TAB RENDER
  // =====================
  const renderCompanyTab = () => {
    return (
      <form action={async (formData) => {
        const input = Object.fromEntries(formData.entries());
        try {
          await updateCompanySettings(input);
          alert('Lưu thông tin công ty thành công!');
          router.refresh();
        } catch (err: any) {
          alert(err.message);
        }
      }} className="space-y-6 max-w-4xl">
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 space-y-6">
          <h3 className="font-bold text-lg border-b border-slate-100 dark:border-slate-800 pb-4">Thông tin cơ bản</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Tên công ty (Pháp nhân)</label>
              <input name="companyName" defaultValue={companySettings?.companyName} required className="w-full p-2 border rounded dark:bg-slate-800 dark:border-slate-700" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Tên thương hiệu</label>
              <input name="brandName" defaultValue={companySettings?.brandName} className="w-full p-2 border rounded dark:bg-slate-800 dark:border-slate-700" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Mã số thuế</label>
              <input name="taxCode" defaultValue={companySettings?.taxCode} className="w-full p-2 border rounded dark:bg-slate-800 dark:border-slate-700" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Số điện thoại</label>
              <input name="phone" defaultValue={companySettings?.phone} className="w-full p-2 border rounded dark:bg-slate-800 dark:border-slate-700" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1">Địa chỉ</label>
              <input name="address" defaultValue={companySettings?.address} className="w-full p-2 border rounded dark:bg-slate-800 dark:border-slate-700" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <input name="email" defaultValue={companySettings?.email} className="w-full p-2 border rounded dark:bg-slate-800 dark:border-slate-700" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Website</label>
              <input name="website" defaultValue={companySettings?.website} className="w-full p-2 border rounded dark:bg-slate-800 dark:border-slate-700" />
            </div>
          </div>

          <h3 className="font-bold text-lg border-b border-slate-100 dark:border-slate-800 pb-4 mt-8">Thông tin ngân hàng</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Tên ngân hàng</label>
              <input name="bankName" defaultValue={companySettings?.bankName} className="w-full p-2 border rounded dark:bg-slate-800 dark:border-slate-700" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Chi nhánh</label>
              <input name="bankBranch" defaultValue={companySettings?.bankBranch} className="w-full p-2 border rounded dark:bg-slate-800 dark:border-slate-700" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Số tài khoản</label>
              <input name="bankAccountNumber" defaultValue={companySettings?.bankAccountNumber} className="w-full p-2 border rounded dark:bg-slate-800 dark:border-slate-700" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Chủ tài khoản</label>
              <input name="bankAccountHolder" defaultValue={companySettings?.bankAccountHolder} className="w-full p-2 border rounded dark:bg-slate-800 dark:border-slate-700" />
            </div>
          </div>
          
          <div className="flex justify-end pt-4">
            <button type="submit" disabled={isPending} className="px-6 py-2 bg-indigo-600 text-white rounded-lg flex items-center gap-2 font-semibold">
              <Save className="w-4 h-4" /> Lưu cấu hình
            </button>
          </div>
        </div>
      </form>
    );
  };

  // =====================
  // AUDIT TAB RENDER
  // =====================
  const renderAuditTab = () => {
    const filteredLogs = auditLogs.filter((log: any) => 
      log.action.toLowerCase().includes(logFilter.toLowerCase()) || 
      (log.description && log.description.toLowerCase().includes(logFilter.toLowerCase())) ||
      (log.actorName && log.actorName.toLowerCase().includes(logFilter.toLowerCase()))
    );

    return (
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
          <input 
            type="text" 
            placeholder="Tìm kiếm log..." 
            className="p-2 border rounded w-64 text-sm dark:bg-slate-800 dark:border-slate-700"
            value={logFilter}
            onChange={(e) => setLogFilter(e.target.value)}
          />
        </div>
        <div className="overflow-x-auto max-h-[600px]">
          <table className="w-full text-sm text-left text-slate-600 dark:text-slate-300">
            <thead className="text-xs uppercase bg-slate-50 dark:bg-slate-800/50 text-slate-500 sticky top-0">
              <tr>
                <th className="px-4 py-3">Thời gian</th>
                <th className="px-4 py-3">Người thao tác</th>
                <th className="px-4 py-3">Hành động</th>
                <th className="px-4 py-3">Mô tả</th>
                <th className="px-4 py-3">Chi tiết</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log: any) => (
                <tr key={log.id} className="border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="px-4 py-3 whitespace-nowrap">{new Date(log.createdAt).toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{log.actorName || 'System'}</div>
                    <div className="text-[10px] text-slate-400">{log.actorRole}</div>
                  </td>
                  <td className="px-4 py-3 font-mono text-[10px] bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded inline-block mt-2">{log.action}</td>
                  <td className="px-4 py-3">{log.description}</td>
                  <td className="px-4 py-3">
                    {(log.beforeJson || log.afterJson) && (
                      <button onClick={() => setLogModal({ isOpen: true, log })} className="text-indigo-500 hover:text-indigo-700 text-xs flex items-center gap-1">
                        <Eye className="w-3 h-3" /> Xem JSON
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderSystemTab = () => {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 max-w-4xl space-y-6">
        <h3 className="font-bold text-lg border-b border-slate-100 dark:border-slate-800 pb-4">Cài đặt Môi trường</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
            <div className="text-sm font-semibold mb-1">Môi trường Node</div>
            <code className="text-indigo-600 dark:text-indigo-400">{process.env.NODE_ENV || 'production'}</code>
          </div>
          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
            <div className="text-sm font-semibold mb-1">Role Switcher (Demo Mode)</div>
            <code className="text-indigo-600 dark:text-indigo-400">
              {process.env.NEXT_PUBLIC_ENABLE_DEMO_SWITCHER === 'true' ? 'Đã BẬT' : 'Đã TẮT'}
            </code>
          </div>
        </div>

        <h3 className="font-bold text-lg border-b border-slate-100 dark:border-slate-800 pb-4 mt-8">Bảng Phân quyền (Tham khảo)</h3>
        <table className="w-full text-sm text-left border">
          <thead className="bg-slate-100 dark:bg-slate-800">
            <tr><th className="p-2 border">Vai trò</th><th className="p-2 border">Mô tả quyền hạn</th></tr>
          </thead>
          <tbody>
            <tr><td className="p-2 border font-semibold">ADMIN</td><td className="p-2 border">Quản trị viên cấp cao, toàn quyền.</td></tr>
            <tr><td className="p-2 border font-semibold">MANAGER</td><td className="p-2 border">Quản lý cấp cao, toàn quyền trừ Settings bảo mật.</td></tr>
            <tr><td className="p-2 border font-semibold">SALES</td><td className="p-2 border">Kinh doanh: Tạo báo giá, đơn hàng, khách hàng, thu tiền.</td></tr>
            <tr><td className="p-2 border font-semibold">ACCOUNTANT</td><td className="p-2 border">Kế toán: Xác nhận thanh toán, theo dõi công nợ.</td></tr>
            <tr><td className="p-2 border font-semibold">DESIGNER</td><td className="p-2 border">Thiết kế: Upload, chỉnh sửa file thiết kế.</td></tr>
            <tr><td className="p-2 border font-semibold">PRODUCTION</td><td className="p-2 border">Sản xuất: Xem lệnh in, hoàn thành công đoạn.</td></tr>
            <tr><td className="p-2 border font-semibold">DELIVERY</td><td className="p-2 border">Giao hàng: Xem đơn vận chuyển, cập nhật trạng thái.</td></tr>
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <>
      <div className="flex gap-4 border-b border-slate-200 dark:border-slate-800 mb-6">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-3 font-semibold text-sm border-b-2 transition-colors ${activeTab === tab.id ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-white'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="min-h-[500px]">
        {activeTab === 'users' && renderUsersTab()}
        {activeTab === 'company' && renderCompanyTab()}
        {activeTab === 'audit' && renderAuditTab()}
        {activeTab === 'system' && renderSystemTab()}
      </div>

      {/* User Modal */}
      {userModal.isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-900 rounded-xl p-6 w-full max-w-lg shadow-xl border border-slate-200 dark:border-slate-800">
            <h2 className="text-xl font-bold mb-4">{userModal.user ? 'Sửa thông tin' : 'Thêm người dùng mới'}</h2>
            <form action={async (formData) => {
              const input = Object.fromEntries(formData.entries());
              try {
                if (userModal.user) {
                  await updateUser(userModal.user.id, input);
                } else {
                  await createUser(input);
                }
                router.refresh();
                setUserModal({ isOpen: false, user: null });
              } catch (err: any) {
                alert(err.message);
              }
            }} className="space-y-4">
              <input type="text" name="name" defaultValue={userModal.user?.name} placeholder="Họ tên" required className="w-full p-2 border rounded dark:bg-slate-800 dark:border-slate-700" />
              <input type="email" name="email" defaultValue={userModal.user?.email} disabled={!!userModal.user} placeholder="Email" required className="w-full p-2 border rounded dark:bg-slate-800 dark:border-slate-700 disabled:opacity-50" />
              <input type="text" name="phone" defaultValue={userModal.user?.phone} placeholder="Số điện thoại" className="w-full p-2 border rounded dark:bg-slate-800 dark:border-slate-700" />
              <input type="text" name="department" defaultValue={userModal.user?.department} placeholder="Phòng ban" className="w-full p-2 border rounded dark:bg-slate-800 dark:border-slate-700" />
              
              <select name="role" defaultValue={userModal.user?.role || 'SALES'} className="w-full p-2 border rounded dark:bg-slate-800 dark:border-slate-700">
                <option value="ADMIN">ADMIN</option>
                <option value="MANAGER">MANAGER</option>
                <option value="SALES">SALES</option>
                <option value="ACCOUNTANT">ACCOUNTANT</option>
                <option value="DESIGNER">DESIGNER</option>
                <option value="PRODUCTION">PRODUCTION</option>
                <option value="DELIVERY">DELIVERY</option>
              </select>

              {!userModal.user && (
                <input type="password" name="password" placeholder="Mật khẩu tạm (Tối thiểu 6 ký tự)" required minLength={6} className="w-full p-2 border rounded dark:bg-slate-800 dark:border-slate-700" />
              )}
              
              <div className="flex justify-end gap-2 mt-6">
                <button type="button" onClick={() => setUserModal({ isOpen: false, user: null })} className="px-4 py-2 border rounded">Hủy</button>
                <button type="submit" disabled={isPending} className="px-4 py-2 bg-indigo-600 text-white rounded">Lưu</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resetModal.isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-900 rounded-xl p-6 w-full max-w-sm shadow-xl border border-slate-200 dark:border-slate-800">
            <h2 className="text-xl font-bold mb-4">Reset mật khẩu</h2>
            <p className="text-sm text-slate-500 mb-4">Mật khẩu mới cho tài khoản: <strong>{resetModal.user?.email}</strong></p>
            <form action={async (formData) => {
              const newPassword = formData.get('password') as string;
              try {
                await resetUserPassword(resetModal.user?.id, newPassword);
                alert('Reset thành công!');
                setResetModal({ isOpen: false, user: null });
              } catch (err: any) {
                alert(err.message);
              }
            }} className="space-y-4">
              <input type="password" name="password" placeholder="Nhập mật khẩu mới" required minLength={6} className="w-full p-2 border rounded dark:bg-slate-800 dark:border-slate-700" />
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setResetModal({ isOpen: false, user: null })} className="px-4 py-2 border rounded">Hủy</button>
                <button type="submit" disabled={isPending} className="px-4 py-2 bg-amber-600 text-white rounded">Reset</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* JSON Viewer Modal */}
      {logModal.isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-900 rounded-xl p-6 w-full max-w-2xl max-h-[80vh] flex flex-col shadow-xl border border-slate-200 dark:border-slate-800">
            <h2 className="text-xl font-bold mb-4">Chi tiết dữ liệu</h2>
            <div className="flex-1 overflow-auto bg-slate-950 text-slate-300 p-4 rounded text-xs font-mono whitespace-pre-wrap">
              <div className="mb-4">
                <strong className="text-indigo-400">Before:</strong>
                <pre>{logModal.log?.beforeJson ? JSON.stringify(JSON.parse(logModal.log.beforeJson), null, 2) : 'null'}</pre>
              </div>
              <div>
                <strong className="text-emerald-400">After:</strong>
                <pre>{logModal.log?.afterJson ? JSON.stringify(JSON.parse(logModal.log.afterJson), null, 2) : 'null'}</pre>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setLogModal({ isOpen: false, log: null })} className="px-4 py-2 bg-slate-200 dark:bg-slate-800 rounded font-semibold">Đóng</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
