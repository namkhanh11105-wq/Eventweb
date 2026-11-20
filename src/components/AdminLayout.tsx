import { useMemo, useState, type FormEvent } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Calendar,
  Check,
  Database,
  Edit3,
  ExternalLink,
  Image as ImageIcon,
  LayoutDashboard,
  LogOut,
  Menu,
  Plus,
  Search,
  Trash2,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import { DEFAULT_EVENT_BANNERS } from '../data/seedData';
import {
  createEvent,
  deleteEvent,
  seedSampleData,
  updateEvent,
  updateRegistrationStatus,
} from '../services/dataService';
import { EventBanner } from './EventBanner';
import {
  EVENT_STATUS_META,
  formatDateTimeVN,
  formatShortDateVN,
  REGISTRATION_STATUS_META,
  toDatetimeLocalValue,
} from '../utils/formatters';
import type {
  AppUser,
  EventFormInput,
  EventItem,
  EventStatus,
  RegistrationItem,
  RegistrationStatus,
} from '../types';

type AdminSection = 'overview' | 'events' | 'registrations' | 'users';

interface AdminLayoutProps {
  currentUser: AppUser;
  events: EventItem[];
  registrations: RegistrationItem[];
  users: AppUser[];
  onSwitchToUser: () => void;
  onLogout: () => void;
  onNotify: (message: string, type?: 'success' | 'error') => void;
}

const SECTION_TITLES: Record<AdminSection, string> = {
  overview: 'Tổng quan hệ thống',
  events: 'Quản lý sự kiện',
  registrations: 'Danh sách lượt đăng ký',
  users: 'Tài khoản người dùng',
};

const EMPTY_FORM: EventFormInput = {
  title: '',
  description: '',
  bannerUrl: DEFAULT_EVENT_BANNERS[0].url,
  location: '',
  startTime: '',
  endTime: '',
  maxSlots: 80,
  status: 'upcoming',
};

export function AdminLayout({
  currentUser,
  events,
  registrations,
  users,
  onSwitchToUser,
  onLogout,
  onNotify,
}: AdminLayoutProps) {
  const [section, setSection] = useState<AdminSection>('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [seeding, setSeeding] = useState(false);

  const [eventSearch, setEventSearch] = useState('');
  const [regStatusFilter, setRegStatusFilter] = useState<'all' | RegistrationStatus>('all');
  const [regSearch, setRegSearch] = useState('');

  const [eventModalOpen, setEventModalOpen] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [formState, setFormState] = useState<EventFormInput>(EMPTY_FORM);
  const [savingEvent, setSavingEvent] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const stats = useMemo(() => {
    const totalEvents = events.length;
    const activeEvents = events.filter(
      (e) => e.status === 'upcoming' || e.status === 'ongoing'
    ).length;
    const totalCapacity = events.reduce((acc, e) => acc + (e.maxSlots || 0), 0);
    const activeRegistrations = registrations.filter((r) => r.status !== 'cancelled').length;
    const fillRate =
      totalCapacity > 0 ? Math.round((activeRegistrations / totalCapacity) * 100) : 0;

    return {
      totalEvents,
      activeEvents,
      totalRegistrations: registrations.length,
      activeRegistrations,
      fillRate,
    };
  }, [events, registrations]);

  const capacityChartData = useMemo(() => {
    return events.slice(0, 6).map((ev) => ({
      name: ev.title.length > 18 ? `${ev.title.slice(0, 18)}…` : ev.title,
      registered: ev.registeredCount,
      maxSlots: ev.maxSlots,
    }));
  }, [events]);

  const statusChartData = useMemo(() => {
    const counts: Record<RegistrationStatus, number> = {
      confirmed: 0,
      attended: 0,
      pending: 0,
      cancelled: 0,
    };
    for (const r of registrations) {
      counts[r.status] = (counts[r.status] || 0) + 1;
    }
    return [
      { key: 'confirmed', label: 'Đã xác nhận', value: counts.confirmed, color: '#4F46E5' },
      { key: 'attended', label: 'Đã tham dự', value: counts.attended, color: '#16A34A' },
      { key: 'pending', label: 'Chờ duyệt', value: counts.pending, color: '#D97706' },
      { key: 'cancelled', label: 'Đã hủy', value: counts.cancelled, color: '#E11D48' },
    ];
  }, [registrations]);

  const filteredEvents = useMemo(() => {
    const q = eventSearch.trim().toLowerCase();
    if (!q) return events;
    return events.filter(
      (ev) =>
        ev.title.toLowerCase().includes(q) || ev.location.toLowerCase().includes(q)
    );
  }, [events, eventSearch]);

  const filteredRegistrations = useMemo(() => {
    const q = regSearch.trim().toLowerCase();
    return registrations.filter((r) => {
      if (regStatusFilter !== 'all' && r.status !== regStatusFilter) return false;
      if (!q) return true;
      return (
        r.guestName.toLowerCase().includes(q) ||
        r.guestEmail.toLowerCase().includes(q) ||
        r.eventTitle.toLowerCase().includes(q)
      );
    });
  }, [registrations, regStatusFilter, regSearch]);

  async function handleSeedData() {
    setSeeding(true);
    try {
      const result = await seedSampleData();
      onNotify(
        `Đã khởi tạo thành công ${result.eventsCount} sự kiện mẫu và ${result.registrationsCount} lượt đăng ký mẫu.`
      );
    } catch (err) {
      onNotify(
        err instanceof Error ? err.message : 'Không thể tạo dữ liệu mẫu.',
        'error'
      );
    } finally {
      setSeeding(false);
    }
  }

  function openCreateModal() {
    const start = new Date();
    start.setDate(start.getDate() + 5);
    start.setHours(9, 0, 0, 0);
    const end = new Date(start);
    end.setHours(17, 0, 0, 0);

    setEditingEventId(null);
    setFormState({
      ...EMPTY_FORM,
      startTime: toDatetimeLocalValue(start.toISOString()),
      endTime: toDatetimeLocalValue(end.toISOString()),
    });
    setEventModalOpen(true);
  }

  function openEditModal(ev: EventItem) {
    setEditingEventId(ev.id);
    setFormState({
      title: ev.title,
      description: ev.description,
      bannerUrl: ev.bannerUrl,
      location: ev.location,
      startTime: toDatetimeLocalValue(ev.startTime),
      endTime: toDatetimeLocalValue(ev.endTime),
      maxSlots: ev.maxSlots,
      status: ev.status,
    });
    setEventModalOpen(true);
  }

  async function handleSaveEvent(e: FormEvent) {
    e.preventDefault();
    setSavingEvent(true);
    try {
      if (editingEventId) {
        await updateEvent(editingEventId, formState);
        onNotify('Đã cập nhật thông tin sự kiện.');
      } else {
        await createEvent(formState);
        onNotify('Đã tạo sự kiện mới thành công.');
      }
      setEventModalOpen(false);
    } catch (err) {
      onNotify(
        err instanceof Error ? err.message : 'Không thể lưu sự kiện.',
        'error'
      );
    } finally {
      setSavingEvent(false);
    }
  }

  async function handleConfirmDelete(id: string) {
    try {
      await deleteEvent(id);
      setDeleteTargetId(null);
      onNotify('Đã xóa sự kiện khỏi hệ thống.');
    } catch (err) {
      onNotify(
        err instanceof Error ? err.message : 'Không thể xóa sự kiện.',
        'error'
      );
    }
  }

  async function handleStatusChange(reg: RegistrationItem, nextStatus: RegistrationStatus) {
    try {
      await updateRegistrationStatus(reg, nextStatus);
      onNotify(`Đã cập nhật trạng thái sang "${REGISTRATION_STATUS_META[nextStatus].label}".`);
    } catch (err) {
      onNotify(
        err instanceof Error ? err.message : 'Không thể cập nhật trạng thái.',
        'error'
      );
    }
  }

  const navItems: { key: AdminSection; label: string; icon: typeof LayoutDashboard }[] = [
    { key: 'overview', label: 'Tổng quan', icon: LayoutDashboard },
    { key: 'events', label: 'Quản lý sự kiện', icon: Calendar },
    { key: 'registrations', label: 'Lượt đăng ký', icon: UserCheck },
    { key: 'users', label: 'Người dùng', icon: Users },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Mobile Sidebar Backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 flex flex-col justify-between transition-transform duration-200 lg:static lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div>
          <div className="h-16 px-6 border-b border-slate-200 flex items-center justify-between">
            <span className="text-lg font-bold tracking-tight text-slate-900">
              EventFlow Admin
            </span>
            <button
              type="button"
              aria-label="Đóng thanh bên"
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-1.5 rounded-lg text-slate-500 hover:bg-slate-100"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <nav className="p-4 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = section === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => {
                    setSection(item.key);
                    setSidebarOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer whitespace-nowrap ${
                    active
                      ? 'bg-indigo-50 text-indigo-700 font-semibold'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-4 border-t border-slate-200 space-y-2">
          <div className="px-3 py-2 rounded-lg bg-slate-50">
            <div className="text-xs font-semibold text-slate-900 truncate">
              {currentUser.fullName}
            </div>
            <div className="text-xs text-slate-500 truncate">{currentUser.email}</div>
          </div>

          <button
            type="button"
            onClick={onSwitchToUser}
            className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
          >
            <ExternalLink className="w-3.5 h-3.5 shrink-0" />
            <span>Xem trang người dùng</span>
          </button>

          <button
            type="button"
            onClick={onLogout}
            className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 hover:text-rose-700 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
          >
            <LogOut className="w-3.5 h-3.5 shrink-0" />
            <span>Đăng xuất</span>
          </button>
        </div>
      </aside>

      {/* Main Content Shell */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top Header */}
        <header className="sticky top-0 z-30 h-16 bg-white border-b border-slate-200 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              aria-label="Mở menu quản trị"
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100 cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <div className="text-xs text-slate-500 hidden sm:block">
                Quản trị viên / {SECTION_TITLES[section]}
              </div>
              <h1 className="text-base sm:text-lg font-bold text-slate-900 truncate">
                {SECTION_TITLES[section]}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              disabled={seeding}
              onClick={handleSeedData}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors cursor-pointer disabled:opacity-60 whitespace-nowrap shrink-0"
            >
              <Database className="w-3.5 h-3.5" />
              <span>{seeding ? 'Đang tạo...' : 'Tạo dữ liệu mẫu (Seed Data)'}</span>
            </button>

            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Tạo sự kiện</span>
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
          {section === 'overview' && (
            <>
              {/* 4 KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <div className="bg-white border border-slate-200 rounded-xl p-5">
                  <p className="text-xs font-medium text-slate-500">Tổng số sự kiện</p>
                  <p className="mt-2 text-3xl font-bold text-slate-900 tabular-nums">
                    {stats.totalEvents}
                  </p>
                  <p className="mt-1 text-xs text-slate-500 tabular-nums">
                    {stats.activeEvents} sự kiện sắp &amp; đang diễn ra
                  </p>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-5">
                  <p className="text-xs font-medium text-slate-500">Tổng lượt đăng ký</p>
                  <p className="mt-2 text-3xl font-bold text-slate-900 tabular-nums">
                    {stats.totalRegistrations}
                  </p>
                  <p className="mt-1 text-xs text-slate-500 tabular-nums">
                    {stats.activeRegistrations} lượt hợp lệ
                  </p>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-5">
                  <p className="text-xs font-medium text-slate-500">Tỷ lệ lấp đầy</p>
                  <p className="mt-2 text-3xl font-bold text-indigo-600 tabular-nums">
                    {stats.fillRate}%
                  </p>
                  <p className="mt-1 text-xs text-slate-500">Tính trên tổng sức chứa</p>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-5">
                  <p className="text-xs font-medium text-slate-500">Tài khoản hệ thống</p>
                  <p className="mt-2 text-3xl font-bold text-slate-900 tabular-nums">
                    {users.length}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">Quản trị viên &amp; thành viên</p>
                </div>
              </div>

              {events.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
                  <Database className="w-10 h-10 text-indigo-300 mx-auto" />
                  <h2 className="mt-4 text-base font-bold text-slate-900">
                    Chưa có dữ liệu sự kiện để thống kê
                  </h2>
                  <p className="mt-1.5 text-sm text-slate-500 max-w-md mx-auto">
                    Nhấn nút &ldquo;Tạo dữ liệu mẫu (Seed Data)&rdquo; ở thanh tiêu đề hoặc bên
                    dưới để tự động thêm 6 sự kiện mẫu và 15 lượt đăng ký vào hệ thống.
                  </p>
                  <button
                    type="button"
                    disabled={seeding}
                    onClick={handleSeedData}
                    className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg cursor-pointer"
                  >
                    <Database className="w-4 h-4" />
                    <span>{seeding ? 'Đang tạo dữ liệu...' : 'Tạo dữ liệu mẫu (Seed Data)'}</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Capacity vs Registrations Bar Chart */}
                  <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6">
                    <div className="mb-4">
                      <h2 className="text-sm font-bold text-slate-900">
                        Lượt đăng ký so với Sức chứa tối đa
                      </h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Thống kê theo từng sự kiện mới nhất
                      </p>
                    </div>
                    <div className="h-72 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={capacityChartData} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                          <XAxis
                            dataKey="name"
                            tick={{ fontSize: 11, fill: '#64748B' }}
                            axisLine={{ stroke: '#E2E8F0' }}
                            tickLine={false}
                          />
                          <YAxis
                            tick={{ fontSize: 11, fill: '#64748B' }}
                            axisLine={false}
                            tickLine={false}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: '#FFFFFF',
                              borderColor: '#E2E8F0',
                              borderRadius: '8px',
                              fontSize: '12px',
                            }}
                          />
                          <Bar
                            dataKey="registered"
                            name="Đã đăng ký"
                            fill="#4F46E5"
                            radius={[4, 4, 0, 0]}
                          />
                          <Bar
                            dataKey="maxSlots"
                            name="Sức chứa"
                            fill="#CBD5E1"
                            radius={[4, 4, 0, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Registration Status Breakdown */}
                  <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6">
                    <div className="mb-4">
                      <h2 className="text-sm font-bold text-slate-900">
                        Phân bố trạng thái đăng ký
                      </h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Tổng hợp toàn bộ {registrations.length} lượt đăng ký
                      </p>
                    </div>
                    <div className="h-72 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={statusChartData}
                          layout="vertical"
                          margin={{ top: 8, right: 20, left: 10, bottom: 0 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" horizontal={false} />
                          <XAxis
                            type="number"
                            tick={{ fontSize: 11, fill: '#64748B' }}
                            axisLine={false}
                            tickLine={false}
                          />
                          <YAxis
                            type="category"
                            dataKey="label"
                            width={90}
                            tick={{ fontSize: 12, fill: '#334155' }}
                            axisLine={false}
                            tickLine={false}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: '#FFFFFF',
                              borderColor: '#E2E8F0',
                              borderRadius: '8px',
                              fontSize: '12px',
                            }}
                          />
                          <Bar dataKey="value" name="Số lượng" radius={[0, 4, 4, 0]}>
                            {statusChartData.map((entry) => (
                              <Cell key={entry.key} fill={entry.color} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {section === 'events' && (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="relative w-full sm:w-80">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="search"
                    value={eventSearch}
                    onChange={(e) => setEventSearch(e.target.value)}
                    placeholder="Tìm tên sự kiện hoặc địa điểm..."
                    className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-600"
                  />
                </div>
                <span className="text-xs text-slate-500 tabular-nums">
                  Hiển thị {filteredEvents.length} sự kiện
                </span>
              </div>

              {filteredEvents.length === 0 ? (
                <div className="p-10 text-center text-sm text-slate-500">
                  Chưa có sự kiện nào. Hãy bấm &ldquo;Tạo sự kiện&rdquo; hoặc &ldquo;Tạo dữ liệu mẫu (Seed Data)&rdquo;.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                        <th className="py-3 px-4">Sự kiện</th>
                        <th className="py-3 px-4">Địa điểm</th>
                        <th className="py-3 px-4">Bắt đầu</th>
                        <th className="py-3 px-4 text-right">Đăng ký / Tối đa</th>
                        <th className="py-3 px-4">Trạng thái</th>
                        <th className="py-3 px-4 text-right">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      {filteredEvents.map((ev) => {
                        const statusMeta = EVENT_STATUS_META[ev.status];
                        return (
                          <tr key={ev.id} className="hover:bg-slate-50/70">
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-3 min-w-[220px]">
                                <EventBanner
                                  src={ev.bannerUrl}
                                  alt={ev.title}
                                  className="w-14 h-9 rounded-md shrink-0"
                                />
                                <span className="font-semibold text-slate-900 line-clamp-1">
                                  {ev.title}
                                </span>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-slate-600 max-w-[200px] truncate">
                              {ev.location}
                            </td>
                            <td className="py-3 px-4 text-slate-600 tabular-nums whitespace-nowrap">
                              {formatShortDateVN(ev.startTime)}
                            </td>
                            <td className="py-3 px-4 text-right font-mono text-xs font-semibold text-slate-800 tabular-nums">
                              {ev.registeredCount}/{ev.maxSlots}
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap">
                              <span className={`text-xs font-semibold ${statusMeta.textClass}`}>
                                {statusMeta.label}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right whitespace-nowrap">
                              <div className="inline-flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => openEditModal(ev)}
                                  className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-md cursor-pointer"
                                  title="Chỉnh sửa"
                                >
                                  <Edit3 className="w-4 h-4" />
                                </button>
                                {deleteTargetId === ev.id ? (
                                  <div className="inline-flex items-center gap-1">
                                    <button
                                      type="button"
                                      onClick={() => handleConfirmDelete(ev.id)}
                                      className="px-2 py-1 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded cursor-pointer"
                                    >
                                      Xóa
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setDeleteTargetId(null)}
                                      className="px-2 py-1 text-xs font-medium text-slate-600 bg-slate-100 rounded cursor-pointer"
                                    >
                                      Hủy
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => setDeleteTargetId(ev.id)}
                                    className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-md cursor-pointer"
                                    title="Xóa sự kiện"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {section === 'registrations' && (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg overflow-x-auto">
                  {(
                    [
                      { key: 'all', label: 'Tất cả' },
                      { key: 'pending', label: 'Chờ duyệt' },
                      { key: 'confirmed', label: 'Đã xác nhận' },
                      { key: 'attended', label: 'Đã tham dự' },
                      { key: 'cancelled', label: 'Đã hủy' },
                    ] as const
                  ).map((tab) => (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setRegStatusFilter(tab.key)}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                        regStatusFilter === tab.key
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                <div className="relative w-full md:w-72">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="search"
                    value={regSearch}
                    onChange={(e) => setRegSearch(e.target.value)}
                    placeholder="Tìm khách, email, sự kiện..."
                    className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-600"
                  />
                </div>
              </div>

              {filteredRegistrations.length === 0 ? (
                <div className="p-10 text-center text-sm text-slate-500">
                  Không tìm thấy lượt đăng ký phù hợp.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                        <th className="py-3 px-4">Khách tham dự</th>
                        <th className="py-3 px-4">Sự kiện</th>
                        <th className="py-3 px-4">Thời gian ĐK</th>
                        <th className="py-3 px-4">Trạng thái</th>
                        <th className="py-3 px-4 text-right">Cập nhật</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      {filteredRegistrations.map((reg) => {
                        const statusMeta = REGISTRATION_STATUS_META[reg.status];
                        return (
                          <tr key={reg.id} className="hover:bg-slate-50/70">
                            <td className="py-3 px-4">
                              <div className="font-semibold text-slate-900">{reg.guestName}</div>
                              <div className="text-xs text-slate-500">
                                {reg.guestEmail} · {reg.guestPhone}
                              </div>
                            </td>
                            <td className="py-3 px-4 text-slate-700 max-w-[240px] truncate">
                              {reg.eventTitle}
                            </td>
                            <td className="py-3 px-4 text-slate-500 tabular-nums whitespace-nowrap">
                              {formatDateTimeVN(reg.registeredAt)}
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap">
                              <span className={`text-xs font-semibold ${statusMeta.textClass}`}>
                                {statusMeta.label}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right whitespace-nowrap">
                              <select
                                aria-label={`Trạng thái đăng ký của ${reg.guestName}`}
                                value={reg.status}
                                onChange={(e) =>
                                  handleStatusChange(reg, e.target.value as RegistrationStatus)
                                }
                                className="px-2.5 py-1.5 text-xs font-medium bg-white border border-slate-200 rounded-md focus:outline-none focus:border-indigo-600 cursor-pointer"
                              >
                                <option value="pending">Chờ duyệt</option>
                                <option value="confirmed">Đã xác nhận</option>
                                <option value="attended">Đã tham dự</option>
                                <option value="cancelled">Đã hủy</option>
                              </select>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {section === 'users' && (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-900">
                  Danh sách tài khoản đã đăng ký
                </h2>
                <span className="text-xs text-slate-500 tabular-nums">
                  {users.length} tài khoản
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                      <th className="py-3 px-4">Họ tên</th>
                      <th className="py-3 px-4">Email</th>
                      <th className="py-3 px-4">Số điện thoại</th>
                      <th className="py-3 px-4">Vai trò</th>
                      <th className="py-3 px-4">Ngày tạo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {users.map((u) => (
                      <tr key={u.uid} className="hover:bg-slate-50/70">
                        <td className="py-3 px-4 font-semibold text-slate-900">{u.fullName}</td>
                        <td className="py-3 px-4 text-slate-600">{u.email}</td>
                        <td className="py-3 px-4 text-slate-600 tabular-nums">
                          {u.phone || '—'}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`text-xs font-semibold ${
                              u.role === 'admin' ? 'text-indigo-700' : 'text-slate-600'
                            }`}
                          >
                            {u.role === 'admin' ? 'Quản trị viên (Admin)' : 'Người dùng (User)'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-500 tabular-nums whitespace-nowrap">
                          {formatShortDateVN(u.createdAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Create / Edit Event Modal (No Firebase Storage, uses URL + 5 preset banners) */}
      {eventModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="admin-event-modal-title"
        >
          <div className="bg-white border border-slate-200 rounded-2xl max-w-2xl w-full max-h-[92vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h2 id="admin-event-modal-title" className="text-lg font-bold text-slate-900">
                {editingEventId ? 'Chỉnh sửa sự kiện' : 'Tạo sự kiện mới'}
              </h2>
              <button
                type="button"
                onClick={() => setEventModalOpen(false)}
                className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEvent} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Tên sự kiện
                </label>
                <input
                  type="text"
                  required
                  value={formState.title}
                  onChange={(e) => setFormState((s) => ({ ...s, title: e.target.value }))}
                  placeholder="Ví dụ: Hội thảo AI & Cloud 2026"
                  className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Mô tả chi tiết
                </label>
                <textarea
                  rows={3}
                  required
                  value={formState.description}
                  onChange={(e) => setFormState((s) => ({ ...s, description: e.target.value }))}
                  placeholder="Nội dung chính, đối tượng tham dự, diễn giả..."
                  className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-600"
                />
              </div>

              {/* Banner URL + 5 Preset Picker */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Ảnh bìa sự kiện (URL hoặc chọn nhanh mẫu có sẵn)
                </label>
                <div className="relative">
                  <ImageIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={formState.bannerUrl}
                    onChange={(e) => setFormState((s) => ({ ...s, bannerUrl: e.target.value }))}
                    placeholder="https://..."
                    className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-600"
                  />
                </div>

                <div className="mt-2.5 grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {DEFAULT_EVENT_BANNERS.map((preset) => {
                    const selected = formState.bannerUrl === preset.url;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => setFormState((s) => ({ ...s, bannerUrl: preset.url }))}
                        className={`group relative rounded-lg overflow-hidden border text-left cursor-pointer transition-all ${
                          selected
                            ? 'border-indigo-600 ring-2 ring-indigo-600/20'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <img
                          src={preset.url}
                          alt={preset.label}
                          className="w-full h-12 object-cover"
                        />
                        <div className="px-1.5 py-1 text-[10px] font-medium text-slate-700 truncate bg-white">
                          {preset.label}
                        </div>
                        {selected && (
                          <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center">
                            <Check className="w-2.5 h-2.5" />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Địa điểm tổ chức
                </label>
                <input
                  type="text"
                  required
                  value={formState.location}
                  onChange={(e) => setFormState((s) => ({ ...s, location: e.target.value }))}
                  placeholder="Địa chỉ hội trường hoặc link trực tuyến"
                  className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-600"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Thời gian bắt đầu
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={formState.startTime}
                    onChange={(e) => setFormState((s) => ({ ...s, startTime: e.target.value }))}
                    className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Thời gian kết thúc
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={formState.endTime}
                    onChange={(e) => setFormState((s) => ({ ...s, endTime: e.target.value }))}
                    className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Số lượng chỗ tối đa
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={10000}
                    required
                    value={formState.maxSlots}
                    onChange={(e) =>
                      setFormState((s) => ({ ...s, maxSlots: Number(e.target.value) || 1 }))
                    }
                    className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-600 tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Trạng thái
                  </label>
                  <select
                    value={formState.status}
                    onChange={(e) =>
                      setFormState((s) => ({ ...s, status: e.target.value as EventStatus }))
                    }
                    className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-600"
                  >
                    <option value="upcoming">Sắp diễn ra</option>
                    <option value="ongoing">Đang diễn ra</option>
                    <option value="completed">Đã kết thúc</option>
                    <option value="cancelled">Đã hủy</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEventModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={savingEvent}
                  className="px-5 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg cursor-pointer disabled:opacity-60"
                >
                  {savingEvent ? 'Đang lưu...' : editingEventId ? 'Lưu thay đổi' : 'Tạo sự kiện'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
