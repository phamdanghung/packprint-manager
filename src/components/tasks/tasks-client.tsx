'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Bell, CheckCircle2, Clock, AlertCircle, XCircle, 
  ArrowRight, UserPlus, X, Filter, Search, SearchX, 
  ListTodo, TrendingUp, CheckSquare, CalendarClock, History, ArrowDownToLine
} from 'lucide-react';
import { updateTaskStatus, dismissTask, addTaskComment, assignTask } from '@/lib/task-actions';

interface TasksClientProps {
  initialTasks: any[];
  initialStats?: any;
  currentUser: any;
}

const TYPE_LABELS: Record<string, string> = {
  QUOTE_FOLLOW_UP: 'Theo dõi báo giá',
  CUSTOMER_APPROVAL_PENDING: 'Chờ khách duyệt file',
  DESIGN_FILE_REVIEW: 'Kiểm tra file',
  DESIGN_FILE_REVISION: 'Chỉnh sửa file',
  PRODUCTION_READY: 'Sẵn sàng in',
  PRODUCTION_ISSUE: 'Sản xuất có vấn đề',
  PRODUCTION_DELAYED: 'Sản xuất trễ hạn',
  DELIVERY_READY: 'Chờ giao hàng',
  DELIVERY_FAILED: 'Giao hàng thất bại',
  COD_PENDING: 'Xác nhận thu COD',
  PAYMENT_PENDING: 'Phiếu thu chờ xác nhận',
  ORDER_COMPLETED_UNPAID: 'Đơn hoàn thành còn nợ',
  DEBT_OVERDUE: 'Công nợ cần xử lý',
};

const STATUS_LABELS: Record<string, string> = {
  OPEN: 'Mới',
  IN_PROGRESS: 'Đang xử lý',
  DONE: 'Hoàn tất',
  DISMISSED: 'Bỏ qua',
  CANCELLED: 'Đã hủy',
};

const PRIORITY_LABELS: Record<string, string> = {
  URGENT: 'Khẩn cấp',
  HIGH: 'Cao',
  NORMAL: 'Bình thường',
  LOW: 'Thấp',
};

export default function TasksClient({ initialTasks, initialStats, currentUser }: TasksClientProps) {
  const router = useRouter();
  
  // States
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('ALL'); // ALL, MINE, URGENT, OVERDUE, RESOLVED
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('DEFAULT'); // DEFAULT, NEWEST, OLDEST, DEADLINE

  const isAdmin = ['ADMIN', 'MANAGER'].includes(currentUser.role);

  // Computed Filtering
  const filteredTasks = useMemo(() => {
    let result = [...initialTasks];

    // 1. Tab Filter
    if (activeTab === 'MINE') {
      result = result.filter(t => t.assignedToId === currentUser.id);
    } else if (activeTab === 'URGENT') {
      result = result.filter(t => t.priority === 'URGENT' || t.priority === 'HIGH');
    } else if (activeTab === 'OVERDUE') {
      const now = new Date();
      result = result.filter(t => t.dueAt && new Date(t.dueAt) < now && ['OPEN', 'IN_PROGRESS'].includes(t.status));
    } else if (activeTab === 'RESOLVED') {
      result = result.filter(t => t.status === 'DONE');
    } else {
      // Mặc định ALL: chỉ hiện OPEN/IN_PROGRESS trừ khi có filter status cứng
      if (statusFilter === 'ALL') {
        result = result.filter(t => ['OPEN', 'IN_PROGRESS'].includes(t.status));
      }
    }

    // 2. Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(t => 
        (t.title && t.title.toLowerCase().includes(q)) ||
        (t.taskCode && t.taskCode.toLowerCase().includes(q)) ||
        (t.customer?.name && t.customer.name.toLowerCase().includes(q)) ||
        (t.order?.orderCode && t.order.orderCode.toLowerCase().includes(q)) ||
        (t.sourceId && t.sourceId.toLowerCase().includes(q))
      );
    }

    // 3. Dropdown Filters
    if (statusFilter !== 'ALL') {
      result = result.filter(t => t.status === statusFilter);
    }
    if (priorityFilter !== 'ALL') {
      result = result.filter(t => t.priority === priorityFilter);
    }
    if (typeFilter !== 'ALL') {
      result = result.filter(t => t.type === typeFilter);
    }
    if (roleFilter !== 'ALL' && isAdmin) {
      result = result.filter(t => t.assignedRole === roleFilter);
    }

    // 4. Sort
    result.sort((a, b) => {
      if (sortBy === 'NEWEST') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      } else if (sortBy === 'OLDEST') {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      } else if (sortBy === 'DEADLINE') {
        const da = a.dueAt ? new Date(a.dueAt).getTime() : Infinity;
        const db = b.dueAt ? new Date(b.dueAt).getTime() : Infinity;
        return da - db;
      } else {
        // DEFAULT: URGENT > STATUS(OPEN) > DEADLINE > NEWEST
        const pMap: Record<string, number> = { URGENT: 4, HIGH: 3, NORMAL: 2, LOW: 1 };
        if (pMap[a.priority] !== pMap[b.priority]) return pMap[b.priority] - pMap[a.priority];
        
        const sMap: Record<string, number> = { IN_PROGRESS: 2, OPEN: 1, DONE: 0, DISMISSED: 0, CANCELLED: 0 };
        if (sMap[a.status] !== sMap[b.status]) return sMap[b.status] - sMap[a.status];
        
        const da = a.dueAt ? new Date(a.dueAt).getTime() : Infinity;
        const db = b.dueAt ? new Date(b.dueAt).getTime() : Infinity;
        if (da !== db) return da - db;

        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });

    return result;
  }, [initialTasks, activeTab, searchQuery, statusFilter, priorityFilter, typeFilter, roleFilter, sortBy, isAdmin, currentUser.id]);


  // Actions
  const openTaskModal = (task: any) => {
    setSelectedTask(task);
    setCommentText('');
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedTask(null);
  };

  const refreshAction = () => {
    router.refresh();
  };

  const handleUpdateStatus = async (taskId: string, status: string) => {
    setIsSubmitting(true);
    try {
      const res = await updateTaskStatus(taskId, status);
      if (res.success) {
        refreshAction();
        closeModal();
      } else {
        alert(`Lỗi: ${res.error}`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDismiss = async (taskId: string) => {
    if (!confirm('Bạn có chắc chắn muốn bỏ qua nhiệm vụ này?')) return;
    setIsSubmitting(true);
    try {
      const res = await dismissTask(taskId);
      if (res.success) {
        refreshAction();
        closeModal();
      } else {
        alert(`Lỗi: ${res.error}`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddComment = async (taskId: string) => {
    if (!commentText.trim()) return;
    setIsSubmitting(true);
    try {
      const res = await addTaskComment(taskId, commentText);
      if (res.success) {
        setCommentText('');
        refreshAction();
        closeModal(); // Could keep open, but closing is simple MVP
      } else {
        alert(`Lỗi: ${res.error}`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAssignToMe = async (taskId: string) => {
    setIsSubmitting(true);
    try {
      const res = await assignTask(taskId, currentUser.id);
      if (res.success) {
        refreshAction();
        closeModal();
      } else {
        alert(`Lỗi: ${res.error}`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const getSourceLink = (task: any) => {
    const { sourceType, sourceId, orderId } = task;
    switch (sourceType) {
      case 'QUOTE': return `/dashboard/quotes/${sourceId}`;
      case 'ORDER': return `/dashboard/orders/${sourceId}`;
      case 'CUSTOMER': return `/dashboard/customers/${sourceId}`;
      case 'PRODUCTION_JOB': return `/dashboard/production/${sourceId}`;
      case 'DELIVERY_JOB': return `/dashboard/delivery/${sourceId}`;
      case 'PAYMENT': return orderId ? `/dashboard/orders/${orderId}` : '/dashboard/payments';
      case 'DESIGN_FILE': return orderId ? `/dashboard/orders/${orderId}` : '#';
      default: return orderId ? `/dashboard/orders/${orderId}` : '#';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT': return 'bg-rose-100 text-rose-700 border-rose-200';
      case 'HIGH': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'LOW': return 'bg-slate-100 text-slate-700 border-slate-200';
      default: return 'bg-blue-100 text-blue-700 border-blue-200';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'OPEN': return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-slate-100 text-slate-700">{STATUS_LABELS[status]}</span>;
      case 'IN_PROGRESS': return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-700">{STATUS_LABELS[status]}</span>;
      case 'DONE': return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-700">{STATUS_LABELS[status]}</span>;
      case 'DISMISSED': return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-slate-200 text-slate-500">{STATUS_LABELS[status]}</span>;
      default: return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-slate-100 text-slate-700">{STATUS_LABELS[status] || status}</span>;
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Bell className="h-6 w-6 text-teal-500" />
            Việc cần xử lý
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Danh sách công việc và cảnh báo được cá nhân hoá theo bộ phận.
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      {initialStats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center gap-4">
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-500 rounded-xl">
              <ListTodo className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-slate-500 font-medium">Tổng việc mở</p>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{initialStats.openCount}</h3>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center gap-4">
            <div className="p-3 bg-rose-50 dark:bg-rose-900/20 text-rose-500 rounded-xl">
              <AlertCircle className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-slate-500 font-medium">Khẩn cấp / Cao</p>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{initialStats.urgentCount}</h3>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center gap-4">
            <div className="p-3 bg-amber-50 dark:bg-amber-900/20 text-amber-500 rounded-xl">
              <TrendingUp className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-slate-500 font-medium">Đang xử lý</p>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{initialStats.inProgressCount}</h3>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center gap-4">
            <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-500 rounded-xl">
              <CheckSquare className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-slate-500 font-medium">Đã xong hôm nay</p>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{initialStats.doneTodayCount}</h3>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 dark:border-slate-800">
        {[
          { id: 'ALL', label: 'Tất cả' },
          { id: 'MINE', label: 'Của tôi' },
          { id: 'URGENT', label: 'Khẩn cấp' },
          { id: 'OVERDUE', label: 'Trễ hạn' },
          { id: 'RESOLVED', label: 'Đã xử lý' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === tab.id 
                ? 'border-teal-500 text-teal-600 dark:text-teal-400' 
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filter Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Tìm theo tiêu đề, mã KH, mã ĐH..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/50"
          />
        </div>
        
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/50">
          <option value="ALL">Mọi trạng thái</option>
          <option value="OPEN">Mới</option>
          <option value="IN_PROGRESS">Đang xử lý</option>
          <option value="DONE">Hoàn tất</option>
          <option value="DISMISSED">Đã bỏ qua</option>
        </select>

        <select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)} className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/50">
          <option value="ALL">Mọi ưu tiên</option>
          <option value="URGENT">Khẩn cấp</option>
          <option value="HIGH">Cao</option>
          <option value="NORMAL">Bình thường</option>
          <option value="LOW">Thấp</option>
        </select>

        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/50 max-w-[200px]">
          <option value="ALL">Mọi loại việc</option>
          {Object.entries(TYPE_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>

        {isAdmin && (
          <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/50">
            <option value="ALL">Tất cả bộ phận</option>
            <option value="SALES">Sales</option>
            <option value="ACCOUNTANT">Kế toán</option>
            <option value="DESIGNER">Thiết kế</option>
            <option value="PRODUCTION">Sản xuất</option>
            <option value="DELIVERY">Giao hàng</option>
          </select>
        )}

        <div className="w-px h-8 bg-slate-200 dark:bg-slate-800 mx-1"></div>

        <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/50 text-indigo-600 font-medium">
          <option value="DEFAULT">Sắp xếp: Mặc định</option>
          <option value="NEWEST">Mới nhất</option>
          <option value="OLDEST">Cũ nhất</option>
          <option value="DEADLINE">Hạn gần nhất</option>
        </select>
      </div>

      {/* Task List */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        {filteredTasks.length === 0 ? (
          <div className="p-16 text-center flex flex-col items-center justify-center">
            <SearchX className="h-16 w-16 text-slate-300 dark:text-slate-600 mb-4" />
            <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300">Không tìm thấy nhiệm vụ nào</h3>
            <p className="text-slate-500 text-sm mt-1">Hãy thử thay đổi điều kiện lọc hoặc tìm kiếm.</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800/50">
            {filteredTasks.map(task => {
              const isOverdue = task.dueAt && new Date(task.dueAt) < new Date() && ['OPEN', 'IN_PROGRESS'].includes(task.status);
              
              return (
                <li key={task.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-colors relative">
                  {isOverdue && <div className="absolute left-0 top-0 bottom-0 w-1 bg-rose-500"></div>}
                  <button 
                    onClick={() => openTaskModal(task)}
                    className="w-full text-left p-5 flex flex-col sm:flex-row gap-4 items-start sm:items-center pl-6"
                  >
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md border bg-slate-100 text-slate-600 border-slate-200">
                          {TYPE_LABELS[task.type] || task.type}
                        </span>
                        <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md border ${getPriorityColor(task.priority)}`}>
                          {PRIORITY_LABELS[task.priority] || task.priority}
                        </span>
                        {getStatusBadge(task.status)}
                        {isOverdue && (
                          <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md border bg-rose-500 text-white border-rose-600 flex items-center gap-1">
                            <Clock className="h-3 w-3" /> Quá hạn
                          </span>
                        )}
                      </div>
                      
                      <h3 className="text-base font-bold text-slate-900 dark:text-white truncate">
                        {task.taskCode ? `[${task.taskCode}] ` : ''}{task.title}
                      </h3>
                      
                      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                        {task.customer && <span className="flex items-center gap-1"><UserPlus className="h-3.5 w-3.5" /> KH: <strong className="text-slate-700 dark:text-slate-300">{task.customer.name}</strong></span>}
                        {task.order && <span className="flex items-center gap-1"><ArrowDownToLine className="h-3.5 w-3.5" /> ĐH: <strong className="text-slate-700 dark:text-slate-300">{task.order.orderCode}</strong></span>}
                        <span className="flex items-center gap-1"><CalendarClock className="h-3.5 w-3.5" /> {new Date(task.createdAt).toLocaleString('vi-VN')}</span>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2 shrink-0">
                      {task.assignedTo ? (
                        <div className="text-xs text-slate-500">
                          Phụ trách: <span className="px-2 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 rounded-md font-semibold">{task.assignedTo.name}</span>
                        </div>
                      ) : task.assignedRole ? (
                        <div className="text-xs text-slate-500">
                          Bộ phận: <span className="px-2 py-1 border border-dashed border-slate-300 dark:border-slate-700 rounded-md">{task.assignedRole}</span>
                        </div>
                      ) : null}
                      
                      {task.dueAt && (
                        <div className={`text-xs ${isOverdue ? 'text-rose-500 font-semibold' : 'text-slate-500'}`}>
                          Hạn: {new Date(task.dueAt).toLocaleDateString('vi-VN')}
                        </div>
                      )}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Detail Modal */}
      {isModalOpen && selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between bg-slate-50 dark:bg-slate-900/50 rounded-t-2xl shrink-0">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md border ${getPriorityColor(selectedTask.priority)}`}>
                    {PRIORITY_LABELS[selectedTask.priority] || selectedTask.priority}
                  </span>
                  {getStatusBadge(selectedTask.status)}
                  <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md border bg-slate-100 text-slate-600 border-slate-200">
                    {TYPE_LABELS[selectedTask.type] || selectedTask.type}
                  </span>
                </div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  {selectedTask.taskCode ? `[${selectedTask.taskCode}] ` : ''}{selectedTask.title}
                </h2>
              </div>
              <button 
                onClick={closeModal}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body - Scrollable */}
            <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-6">
              
              {/* Description */}
              {selectedTask.description && (
                <div className="p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 rounded-xl text-amber-900 dark:text-amber-200 text-sm leading-relaxed">
                  {selectedTask.description}
                </div>
              )}

              {/* Info grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-700/50">
                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Thông tin nguồn</h4>
                  <ul className="space-y-2 text-sm">
                    {selectedTask.customer && (
                      <li className="flex justify-between">
                        <span className="text-slate-500">Khách hàng:</span>
                        <span className="font-medium text-slate-700 dark:text-slate-300">{selectedTask.customer.name}</span>
                      </li>
                    )}
                    {selectedTask.order && (
                      <li className="flex justify-between">
                        <span className="text-slate-500">Đơn hàng:</span>
                        <span className="font-medium text-slate-700 dark:text-slate-300">{selectedTask.order.orderCode}</span>
                      </li>
                    )}
                    <li className="flex justify-between">
                      <span className="text-slate-500">Ngày tạo:</span>
                      <span className="text-slate-700 dark:text-slate-300">{new Date(selectedTask.createdAt).toLocaleString('vi-VN')}</span>
                    </li>
                    {selectedTask.dueAt && (
                      <li className="flex justify-between">
                        <span className="text-slate-500">Hạn chót:</span>
                        <span className="text-slate-700 dark:text-slate-300">{new Date(selectedTask.dueAt).toLocaleString('vi-VN')}</span>
                      </li>
                    )}
                  </ul>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-700/50">
                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Phân công</h4>
                  <ul className="space-y-2 text-sm">
                    <li className="flex justify-between">
                      <span className="text-slate-500">Bộ phận:</span>
                      <span className="font-medium text-slate-700 dark:text-slate-300">{selectedTask.assignedRole || 'Chung'}</span>
                    </li>
                    <li className="flex justify-between items-center">
                      <span className="text-slate-500">Cá nhân:</span>
                      {selectedTask.assignedTo ? (
                        <span className="font-medium text-slate-700 dark:text-slate-300">{selectedTask.assignedTo.name}</span>
                      ) : (
                        <span className="text-slate-400 italic">Chưa phân công</span>
                      )}
                    </li>
                  </ul>
                  {!selectedTask.assignedTo && ['ADMIN', 'MANAGER'].includes(currentUser.role) && (
                    <button 
                      onClick={() => handleAssignToMe(selectedTask.id)}
                      disabled={isSubmitting}
                      className="mt-3 w-full flex items-center justify-center gap-2 py-1.5 px-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors shadow-sm"
                    >
                      <UserPlus className="h-3.5 w-3.5" /> Gán cho tôi
                    </button>
                  )}
                </div>
              </div>

              <hr className="border-slate-100 dark:border-slate-800" />

              {/* Task Logs Timeline */}
              <div>
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <History className="h-4 w-4" /> Lịch sử hoạt động
                </h4>
                {(!selectedTask.logs || selectedTask.logs.length === 0) ? (
                  <p className="text-sm text-slate-400 italic">Chưa có lịch sử hoạt động.</p>
                ) : (
                  <div className="space-y-4 relative before:absolute before:inset-0 before:ml-2.5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 dark:before:via-slate-700 before:to-transparent">
                    {selectedTask.logs.map((log: any, idx: number) => (
                      <div key={log.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                        <div className="flex items-center justify-center w-5 h-5 rounded-full border-2 border-white dark:border-slate-900 bg-teal-500 text-slate-500 shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow"></div>
                        <div className="w-[calc(100%-2.5rem)] md:w-[calc(50%-1.5rem)] bg-white dark:bg-slate-800 p-3 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700/50">
                          <div className="flex justify-between items-center mb-1">
                            <span className="font-semibold text-xs text-slate-700 dark:text-slate-300">{log.actor?.name || 'Hệ thống'}</span>
                            <span className="text-[10px] text-slate-400">{new Date(log.createdAt).toLocaleString('vi-VN')}</span>
                          </div>
                          <div className="text-xs text-slate-600 dark:text-slate-400">
                            {log.actionType === 'STATUS_CHANGED' ? (
                              <span>Đổi từ <strong>{STATUS_LABELS[log.fromStatus] || log.fromStatus}</strong> sang <strong>{STATUS_LABELS[log.toStatus] || log.toStatus}</strong></span>
                            ) : (
                              <span>Thêm bình luận mới</span>
                            )}
                          </div>
                          {log.note && (
                            <div className="mt-2 text-xs bg-slate-50 dark:bg-slate-900 p-2 rounded-lg text-slate-600 dark:text-slate-300 border border-slate-100 dark:border-slate-800">
                              "{log.note}"
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>

            {/* Modal Actions / Footer */}
            <div className="p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 shrink-0">
              <div className="flex flex-col gap-3">
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Nhập tiến độ hoặc ghi chú xử lý..."
                    className="flex-1 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/50 shadow-sm"
                  />
                  <button 
                    onClick={() => handleAddComment(selectedTask.id)}
                    disabled={isSubmitting || !commentText.trim()}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white font-semibold text-sm rounded-xl transition-colors disabled:opacity-50 shadow-sm"
                  >
                    Ghi lại
                  </button>
                </div>
                
                <div className="flex flex-wrap gap-2 justify-end mt-2">
                  <Link 
                    href={getSourceLink(selectedTask)}
                    className="mr-auto px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-indigo-600 font-semibold text-sm rounded-xl transition-colors flex items-center gap-2 shadow-sm"
                  >
                    <ArrowRight className="h-4 w-4" /> Dữ liệu gốc
                  </Link>

                  {['OPEN'].includes(selectedTask.status) && (
                    <button
                      onClick={() => handleUpdateStatus(selectedTask.id, 'IN_PROGRESS')}
                      disabled={isSubmitting}
                      className="px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 font-semibold text-sm rounded-xl transition-colors flex items-center gap-2"
                    >
                      <Clock className="h-4 w-4" /> Đang xử lý
                    </button>
                  )}
                  {['OPEN', 'IN_PROGRESS'].includes(selectedTask.status) && (
                    <>
                      <button
                        onClick={() => handleUpdateStatus(selectedTask.id, 'DONE')}
                        disabled={isSubmitting}
                        className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-sm rounded-xl transition-colors shadow-sm flex items-center gap-2"
                      >
                        <CheckCircle2 className="h-4 w-4" /> Xong
                      </button>
                      <button
                        onClick={() => handleDismiss(selectedTask.id)}
                        disabled={isSubmitting}
                        className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold text-sm rounded-xl transition-colors flex items-center gap-2"
                      >
                        <XCircle className="h-4 w-4" /> Bỏ qua
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
