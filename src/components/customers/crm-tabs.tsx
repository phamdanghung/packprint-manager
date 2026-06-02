'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { 
  User as UserIcon, Phone, Mail, MapPin, Edit, Clock,
  Calendar, MessageSquare, PhoneCall, Link as LinkIcon, Lock, Pin, CheckCircle, Plus
} from 'lucide-react';
import { 
  updateCustomerCrmProfile, 
  createCustomerNote, updateCustomerNote, deleteCustomerNote, pinCustomerNote,
  createCustomerInteraction,
  createCustomerFollowUp, updateCustomerFollowUpStatus
} from '@/lib/crm-actions';

export default function CustomerCrmTabs({ 
  crmData, timeline, notes, interactions, followUps, quotes, orders, payments,
  userRole, currentUserId, salesUsers 
}: any) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [activeTab, setActiveTab] = useState('overview');

  const { customer, stats } = crmData;

  const TABS = [
    { id: 'overview', label: 'Tổng quan' },
    { id: 'timeline', label: 'Timeline' },
    { id: 'notes', label: 'Ghi chú' },
    { id: 'interactions', label: 'Lịch sử liên hệ' },
    { id: 'followups', label: 'Follow-ups' },
  ];

  // OVERVIEW TAB
  const renderOverview = () => {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
            <div className="text-xs text-slate-500 mb-1">Doanh thu</div>
            <div className="text-xl font-bold text-teal-600">{stats.totalRevenue.toLocaleString()} đ</div>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
            <div className="text-xs text-slate-500 mb-1">Đã thu</div>
            <div className="text-xl font-bold text-emerald-600">{(stats.totalRevenue - customer.debtBalance).toLocaleString()} đ</div>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
            <div className="text-xs text-slate-500 mb-1">Công nợ</div>
            <div className="text-xl font-bold text-rose-600">{customer.debtBalance.toLocaleString()} đ</div>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
            <div className="text-xs text-slate-500 mb-1">Tổng đơn hàng</div>
            <div className="text-xl font-bold text-slate-800 dark:text-white">{stats.totalOrders}</div>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
            <div className="text-xs text-slate-500 mb-1">Báo giá</div>
            <div className="text-xl font-bold text-slate-800 dark:text-white">{stats.quotes}</div>
          </div>
        </div>

        <form action={async (formData) => {
          const input = {
            source: formData.get('source') as string,
            segment: formData.get('segment') as string,
            crmStatus: formData.get('crmStatus') as string,
            priority: formData.get('priority') as string,
            tags: (formData.get('tags') as string).split(',').map(t => t.trim()).filter(Boolean),
            assignedSalesId: formData.get('assignedSalesId') as string
          };
          startTransition(async () => {
            try {
              await updateCustomerCrmProfile(customer.id, input);
              alert('Cập nhật CRM profile thành công');
              router.refresh();
            } catch(e:any) {
              alert(e.message);
            }
          });
        }} className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4">
          <h3 className="font-bold text-lg border-b pb-2">Thông tin CRM</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold mb-1">Trạng thái CRM</label>
              <select name="crmStatus" defaultValue={customer.crmStatus} className="w-full p-2 border rounded">
                <option value="LEAD">Lead</option>
                <option value="PROSPECT">Tiềm năng</option>
                <option value="CUSTOMER">Khách hàng</option>
                <option value="LOST">Đã mất</option>
                <option value="BLACKLISTED">Danh sách đen</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold mb-1">Phân khúc</label>
              <select name="segment" defaultValue={customer.segment || ''} className="w-full p-2 border rounded">
                <option value="">-- Trống --</option>
                <option value="NEW">Khách mới</option>
                <option value="ACTIVE">Đang mua</option>
                <option value="VIP">VIP</option>
                <option value="WHOLESALE">Sỉ/Đại lý</option>
                <option value="ONE_TIME">Mua 1 lần</option>
                <option value="AT_RISK">Có nguy cơ rời bỏ</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold mb-1">Mức ưu tiên</label>
              <select name="priority" defaultValue={customer.priority} className="w-full p-2 border rounded">
                <option value="LOW">Thấp</option>
                <option value="NORMAL">Bình thường</option>
                <option value="HIGH">Cao</option>
                <option value="URGENT">Khẩn cấp</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold mb-1">Nguồn khách</label>
              <select name="source" defaultValue={customer.source} className="w-full p-2 border rounded">
                <option value="FACEBOOK">Facebook</option>
                <option value="ZALO">Zalo</option>
                <option value="WEBSITE">Website</option>
                <option value="SHOPEE">Shopee</option>
                <option value="REFERRAL">Giới thiệu</option>
                <option value="WALK_IN">Khách đến trực tiếp</option>
                <option value="RETURNING">Khách cũ</option>
                <option value="OTHER">Khác</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-bold mb-1">Tags (cách bằng dấu phẩy, tối đa 20)</label>
              <input name="tags" defaultValue={(() => {
                if (!customer.tags) return '';
                try { return JSON.parse(customer.tags).join(', '); }
                catch (e) { return customer.tags; }
              })()} className="w-full p-2 border rounded" />
            </div>
            {['ADMIN', 'MANAGER'].includes(userRole) && (
              <div className="col-span-2">
                <label className="block text-xs font-bold mb-1">Sales Phụ Trách</label>
                <select name="assignedSalesId" defaultValue={customer.assignedSalesId || ''} className="w-full p-2 border rounded">
                  <option value="">-- Trống --</option>
                  {salesUsers.map((su:any) => <option key={su.id} value={su.id}>{su.name}</option>)}
                </select>
              </div>
            )}
          </div>
          <button type="submit" disabled={isPending} className="bg-indigo-600 text-white px-4 py-2 rounded font-bold text-sm">Lưu cập nhật</button>
        </form>
      </div>
    );
  };

  // TIMELINE TAB
  const renderTimeline = () => {
    return (
      <div className="space-y-4 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-300 before:to-transparent">
        {timeline.map((item: any, idx: number) => {
          let icon = <Clock className="w-4 h-4" />;
          let color = "bg-slate-100 text-slate-500";
          let title = "";
          let desc = "";

          if (item.type === 'NOTE') {
            icon = <MessageSquare className="w-4 h-4" />; color = "bg-blue-100 text-blue-600";
            title = "Ghi chú"; desc = item.data.content;
          } else if (item.type === 'INTERACTION') {
            icon = <PhoneCall className="w-4 h-4" />; color = "bg-purple-100 text-purple-600";
            title = `Tương tác qua ${item.data.channel}`; desc = item.data.title;
          } else if (item.type === 'FOLLOW_UP_CREATED') {
            icon = <Calendar className="w-4 h-4" />; color = "bg-amber-100 text-amber-600";
            title = "Tạo lịch hẹn"; desc = item.data.title;
          } else if (item.type === 'FOLLOW_UP_COMPLETED') {
            icon = <CheckCircle className="w-4 h-4" />; color = "bg-emerald-100 text-emerald-600";
            title = "Hoàn thành lịch hẹn"; desc = item.data.title;
          } else if (item.type === 'ORDER') {
            icon = <LinkIcon className="w-4 h-4" />; color = "bg-indigo-100 text-indigo-600";
            title = `Tạo đơn hàng ${item.data.orderCode}`; desc = `${item.data.totalAmount.toLocaleString()} đ`;
          }

          return (
            <div key={idx} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
              <div className={`flex items-center justify-center w-10 h-10 rounded-full border-4 border-white dark:border-slate-900 shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-sm ${color}`}>
                {icon}
              </div>
              <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-sm text-slate-800 dark:text-white">{title}</span>
                  <time className="text-xs text-slate-500 font-mono">{new Date(item.date).toLocaleString('vi-VN')}</time>
                </div>
                <div className="text-sm text-slate-600 dark:text-slate-400">{desc}</div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // NOTES TAB
  const renderNotes = () => {
    return (
      <div className="space-y-6">
        <form action={async (formData) => {
          startTransition(async () => {
            try {
              await createCustomerNote(customer.id, {
                type: formData.get('type') as string,
                content: formData.get('content') as string,
                isPrivate: formData.get('isPrivate') === 'on',
                isPinned: formData.get('isPinned') === 'on',
              });
              router.refresh();
              (document.getElementById('note-form') as HTMLFormElement).reset();
            } catch(e:any) { alert(e.message); }
          });
        }} id="note-form" className="bg-white p-4 rounded-xl border space-y-3">
          <textarea name="content" required placeholder="Nội dung ghi chú..." className="w-full p-2 border rounded text-sm min-h-[80px]" />
          <div className="flex gap-4 items-center">
            <select name="type" className="p-2 border rounded text-sm">
              <option value="GENERAL">Chung</option>
              <option value="SALES_NOTE">Sales</option>
              {userRole === 'ACCOUNTANT' && <option value="ACCOUNTING_NOTE">Kế toán</option>}
            </select>
            <label className="flex items-center gap-1 text-sm"><input type="checkbox" name="isPrivate" /> Riêng tư <Lock className="w-3 h-3 text-slate-400"/></label>
            <label className="flex items-center gap-1 text-sm"><input type="checkbox" name="isPinned" /> Ghim <Pin className="w-3 h-3 text-slate-400"/></label>
            <div className="flex-1 text-right">
              <button type="submit" disabled={isPending} className="bg-indigo-600 text-white px-4 py-2 rounded font-bold text-sm">Thêm ghi chú</button>
            </div>
          </div>
        </form>

        <div className="grid gap-4">
          {notes.map((n:any) => (
            <div key={n.id} className={`p-4 rounded-xl border ${n.isPinned ? 'border-amber-300 bg-amber-50' : 'border-slate-200 bg-white'}`}>
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm">{n.author.name}</span>
                  <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded">{n.type}</span>
                  {n.isPrivate && <span className="text-[10px] bg-rose-100 text-rose-600 px-2 py-0.5 rounded flex items-center gap-1"><Lock className="w-3 h-3"/> Private</span>}
                </div>
                <div className="text-xs text-slate-500">
                  {new Date(n.createdAt).toLocaleString('vi-VN')}
                  {n.isPinned && <Pin className="w-3 h-3 inline ml-2 text-amber-500"/>}
                </div>
              </div>
              <p className="text-sm whitespace-pre-wrap">{n.content}</p>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // INTERACTIONS TAB
  const renderInteractions = () => {
    return (
      <div className="space-y-6">
        <form action={async (formData) => {
          startTransition(async () => {
            try {
              await createCustomerInteraction(customer.id, {
                channel: formData.get('channel') as string,
                direction: formData.get('direction') as string,
                title: formData.get('title') as string,
                content: formData.get('content') as string,
                outcome: formData.get('outcome') as string,
                contactedAt: new Date(formData.get('contactedAt') as string),
              });
              router.refresh();
            } catch(e:any) { alert(e.message); }
          });
        }} className="bg-white p-4 rounded-xl border space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <input name="title" required placeholder="Tiêu đề tương tác (VD: Gọi điện tư vấn giá)" className="col-span-2 p-2 border rounded text-sm" />
            <select name="channel" className="p-2 border rounded text-sm">
              <option value="PHONE">Điện thoại</option>
              <option value="ZALO">Zalo</option>
              <option value="MEETING">Gặp trực tiếp</option>
            </select>
            <select name="direction" className="p-2 border rounded text-sm">
              <option value="OUTBOUND">Khách gọi đến</option>
              <option value="INBOUND">Chủ động gọi đi</option>
            </select>
            <input type="datetime-local" name="contactedAt" required defaultValue={new Date().toISOString().slice(0,16)} className="p-2 border rounded text-sm" />
            <input name="outcome" placeholder="Kết quả (VD: Khách chốt giá)" className="p-2 border rounded text-sm" />
          </div>
          <textarea name="content" placeholder="Chi tiết tương tác..." className="w-full p-2 border rounded text-sm" />
          <button type="submit" disabled={isPending} className="bg-indigo-600 text-white px-4 py-2 rounded font-bold text-sm">Lưu tương tác</button>
        </form>

        <div className="grid gap-3">
          {interactions.map((i:any) => (
            <div key={i.id} className="p-3 border rounded-xl bg-white flex justify-between items-center">
              <div>
                <div className="font-bold text-sm text-indigo-700">{i.title}</div>
                <div className="text-xs text-slate-500 mt-1">{i.actor.name} - {new Date(i.contactedAt).toLocaleString()} - {i.channel} ({i.direction})</div>
              </div>
              <div className="text-xs font-semibold px-2 py-1 bg-slate-100 rounded">{i.outcome || 'N/A'}</div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // FOLLOWUPS TAB
  const renderFollowUps = () => {
    return (
      <div className="space-y-6">
        <form action={async (formData) => {
          startTransition(async () => {
            try {
              await createCustomerFollowUp(customer.id, {
                title: formData.get('title') as string,
                note: formData.get('note') as string,
                priority: formData.get('priority') as string,
                dueAt: new Date(formData.get('dueAt') as string),
              });
              router.refresh();
            } catch(e:any) { alert(e.message); }
          });
        }} className="bg-white p-4 rounded-xl border space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <input name="title" required placeholder="Tiêu đề follow-up" className="col-span-2 p-2 border rounded text-sm" />
            <input type="datetime-local" name="dueAt" required className="p-2 border rounded text-sm" />
            <select name="priority" className="p-2 border rounded text-sm">
              <option value="NORMAL">Bình thường</option>
              <option value="HIGH">Cao</option>
              <option value="URGENT">Khẩn cấp</option>
            </select>
          </div>
          <textarea name="note" placeholder="Ghi chú thêm..." className="w-full p-2 border rounded text-sm" />
          <button type="submit" disabled={isPending} className="bg-amber-500 text-white px-4 py-2 rounded font-bold text-sm">Tạo lịch nhắc</button>
        </form>

        <div className="grid gap-3">
          {followUps.map((f:any) => (
            <div key={f.id} className={`p-4 border rounded-xl ${f.status === 'DONE' ? 'bg-slate-50 opacity-70' : f.dueAt < new Date() ? 'bg-rose-50 border-rose-200' : 'bg-white'}`}>
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-bold text-sm">{f.title}</div>
                  <div className="text-xs text-slate-500 mt-1">Hạn: {new Date(f.dueAt).toLocaleString()}</div>
                </div>
                {f.status === 'OPEN' && (
                  <button onClick={() => {
                    startTransition(async () => {
                      await updateCustomerFollowUpStatus(f.id, 'DONE', 'Đã hoàn tất');
                      router.refresh();
                    });
                  }} className="text-xs bg-emerald-100 text-emerald-700 px-3 py-1 rounded font-bold hover:bg-emerald-200">Hoàn tất</button>
                )}
                {f.status !== 'OPEN' && (
                  <span className="text-[10px] font-bold px-2 py-1 rounded bg-slate-200">{f.status}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto flex flex-col h-full space-y-6">
      <div className="flex items-center gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
        <div className="w-16 h-16 rounded-full bg-teal-100 flex items-center justify-center text-teal-600 text-2xl font-bold">
          {customer.name.charAt(0)}
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{customer.name}</h1>
          <div className="flex gap-4 mt-2 text-sm text-slate-500">
            <span className="flex items-center gap-1"><Phone className="w-4 h-4"/> {customer.phone}</span>
            <span className="flex items-center gap-1"><MapPin className="w-4 h-4"/> {customer.address || 'Chưa cập nhật địa chỉ'}</span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs text-slate-500">Sales phụ trách</div>
          <div className="font-bold text-indigo-600">{customer.assignedSales?.name || 'Chưa có'}</div>
        </div>
      </div>

      <div className="flex gap-2 border-b border-slate-200 dark:border-slate-800">
        {TABS.map(t => (
          <button 
            key={t.id} 
            onClick={() => setActiveTab(t.id)}
            className={`px-4 py-2 text-sm font-bold border-b-2 transition-colors ${activeTab === t.id ? 'border-teal-500 text-teal-600' : 'border-transparent text-slate-500'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto pb-10">
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'timeline' && renderTimeline()}
        {activeTab === 'notes' && renderNotes()}
        {activeTab === 'interactions' && renderInteractions()}
        {activeTab === 'followups' && renderFollowUps()}
      </div>
    </div>
  );
}
