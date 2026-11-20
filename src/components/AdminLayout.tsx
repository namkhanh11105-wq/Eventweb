import { useMemo, useState, type FormEvent } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  BadgeCheck,
  Calendar,
  Check,
  CheckCircle2,
  Copy,
  Database,
  Download,
  Edit3,
  ExternalLink,
  HelpCircle,
  Image as ImageIcon,
  LayoutDashboard,
  LogOut,
  Menu,
  Plus,
  QrCode,
  Search,
  Sparkles,
  Trash2,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import { DEFAULT_EVENT_BANNERS } from '../data/seedData';
import {
  checkInByTicketCode,
  createEvent,
  deleteEvent,
  duplicateEvent,
  seedSampleData,
  updateEvent,
  updateRegistrationStatus,
} from '../services/dataService';
import { EventBanner } from './EventBanner';
import {
  EVENT_CATEGORIES,
  EVENT_STATUS_META,
  exportRegistrationsToCSV,
  formatCurrencyVN,
  formatDateTimeVN,
  formatShortDateVN,
  REGISTRATION_STATUS_META,
  toDatetimeLocalValue,
} from '../utils/formatters';
import type {
  AppUser,
  EventCategory,
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
  permissionWarning?: string | null;
  onSwitchToUser: () => void;
  onLogout: () => void;
  onNotify: (message: string, type?: 'success' | 'error') => void;
}

const SECTION_TITLES: Record<AdminSection, string> = {
  overview: 'Tổng quan điều hành',
  events: 'Quản lý sự kiện',
  registrations: 'Khách tham dự & Check-in QR',
  users: 'Tài khoản người dùng',
};

const CATEGORY_COLORS: Record<string, string> = {
  'Hội nghị công nghệ': '#4F46E5',
  'Workshop chuyên đề': '#0EA5E9',
  'Đào tạo nội bộ': '#10B981',
  'Gala doanh nghiệp': '#EC4899',
  Seminar: '#F59E0B',
  'Công nghệ': '#4F46E5',
  Workshop: '#0EA5E9',
  'Âm nhạc': '#EC4899',
  'Hội thảo': '#F59E0B',
  'Thể thao': '#10B981',
};

const FALLBACK_PIE_COLORS = ['#6366F1', '#0EA5E9', '#10B981', '#F59E0B', '#EC4899'];

function createEmptyForm(): EventFormInput {
  return {
    title: '',
    description: '',
    bannerUrl: DEFAULT_EVENT_BANNERS[0].url,
    location: '',
    startTime: '',
    endTime: '',
    maxSlots: 120,
    status: 'ongoing',
    category: 'Hội nghị công nghệ',
    price: 0,
    vipPrice: 0,
    organizer: 'EventFlow Enterprise',
    organizerVerified: true,
    featured: false,
    speakers: [{ name: '', role: '', company: '' }],
    agenda: [
      { time: '08:30 - 09:00', title: 'Đón khách & Check-in QR', speaker: '' },
      { time: '09:00 - 11:00', title: 'Phiên nội dung chính', speaker: '' },
    ],
    faqs: [
      {
        question: 'Sự kiện có xuất hóa đơn VAT cho doanh nghiệp không?',
        answer: 'Có, ban tổ chức hỗ trợ xuất hóa đơn điện tử VAT trong vòng 3 ngày làm việc.',
      },
    ],
    rules: 'Vui lòng mang theo mã QR vé điện tử để check-in tại quầy lễ tân.',
  };
}

export function AdminLayout({
  currentUser,
  events,
  registrations,
  users,
  permissionWarning,
  onSwitchToUser,
  onLogout,
  onNotify,
}: AdminLayoutProps) {
  const [section, setSection] = useState<AdminSection>('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [seeding, setSeeding] = useState(false);

  // Events filter
  const [eventSearch, setEventSearch] = useState('');
  const [eventCategoryFilter, setEventCategoryFilter] = useState<'all' | EventCategory>('all');

  // Registrations & Check-in filter
  const [regEventFilter, setRegEventFilter] = useState<string>('all');
  const [regStatusFilter, setRegStatusFilter] = useState<'all' | RegistrationStatus>('all');
  const [regSearch, setRegSearch] = useState('');
  const [qrInput, setQrInput] = useState('');
  const [checkingInQr, setCheckingInQr] = useState(false);

  // Event modal
  const [eventModalOpen, setEventModalOpen] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [formState, setFormState] = useState<EventFormInput>(createEmptyForm);
  const [savingEvent, setSavingEvent] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const stats = useMemo(() => {
    const totalEvents = events.length;
    const activeRegistrations = registrations.filter((r) => r.status !== 'cancelled');
    const attendedCount = registrations.filter((r) => r.status === 'attended').length;

    const fillRates = events
      .filter((e) => e.maxSlots > 0 && e.status !== 'cancelled')
      .map((e) => Math.min(100, (e.registeredCount / e.maxSlots) * 100));
    const avgFillRate =
      fillRates.length > 0
        ? Math.round(fillRates.reduce((a, b) => a + b, 0) / fillRates.length)
        : 0;

    const checkInRate =
      activeRegistrations.length > 0
        ? Math.round((attendedCount / activeRegistrations.length) * 100)
        : 0;

    return {
      totalEvents,
      totalRegistrations: registrations.length,
      activeRegistrationsCount: activeRegistrations.length,
      attendedCount,
      avgFillRate,
      checkInRate,
    };
  }, [events, registrations]);

  const capacityChartData = useMemo(() => {
    return events.slice(0, 6).map((ev) => ({
      name: ev.title.length > 16 ? `${ev.title.slice(0, 16)}…` : ev.title,
      registered: ev.registeredCount,
      checkedIn: ev.checkedInCount ?? 0,
      maxSlots: ev.maxSlots,
    }));
  }, [events]);

  const categoryChartData = useMemo(() => {
    const eventCategoryMap = new Map<string, string>();
    for (const ev of events) {
      eventCategoryMap.set(ev.id, ev.category || 'Hội nghị công nghệ');
    }
    const counts = new Map<string, number>();
    for (const cat of EVENT_CATEGORIES) {
      counts.set(cat, 0);
    }
    for (const r of registrations) {
      if (r.status === 'cancelled') continue;
      const cat = eventCategoryMap.get(r.eventId);
      if (cat) {
        counts.set(cat, (counts.get(cat) ?? 0) + 1);
      }
    }
    return Array.from(counts.entries())
      .map(([name, value], idx) => ({
        name,
        value,
        color: CATEGORY_COLORS[name] || FALLBACK_PIE_COLORS[idx % FALLBACK_PIE_COLORS.length],
      }))
      .filter((d) => d.value > 0);
  }, [events, registrations]);

  const filteredEvents = useMemo(() => {
    const q = eventSearch.trim().toLowerCase();
    return events.filter((ev) => {
      if (eventCategoryFilter !== 'all' && ev.category !== eventCategoryFilter) return false;
      if (!q) return true;
      return (
        ev.title.toLowerCase().includes(q) ||
        ev.location.toLowerCase().includes(q) ||
        ev.organizer.toLowerCase().includes(q)
      );
    });
  }, [events, eventCategoryFilter, eventSearch]);

  const filteredRegistrations = useMemo(() => {
    const q = regSearch.trim().toLowerCase();
    return registrations.filter((r) => {
      if (regEventFilter !== 'all' && r.eventId !== regEventFilter) return false;
      if (regStatusFilter !== 'all' && r.status !== regStatusFilter) return false;
      if (!q) return true;
      return (
        r.guestName.toLowerCase().includes(q) ||
        r.guestEmail.toLowerCase().includes(q) ||
        r.ticketCode.toLowerCase().includes(q) ||
        r.eventTitle.toLowerCase().includes(q)
      );
    });
  }, [registrations, regEventFilter, regStatusFilter, regSearch]);

  const sampleTicketCodes = useMemo(() => {
    return registrations
      .filter((r) => r.status === 'confirmed' || r.status === 'pending')
      .slice(0, 4);
  }, [registrations]);

  async function handleSeedData() {
    setSeeding(true);
    try {
      const result = await seedSampleData();
      onNotify(
        `Đã đồng bộ Cloud Firestore: ${result.eventsCount} sự kiện, ${result.registrationsCount} lượt đăng ký, ${result.usersCount} người dùng và ${result.feedbacksCount} đánh giá mẫu.`
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
      ...createEmptyForm(),
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
      category: ev.category,
      price: ev.price,
      vipPrice: ev.vipPrice || 0,
      organizer: ev.organizer,
      organizerVerified: ev.organizerVerified !== false,
      featured: Boolean(ev.featured),
      speakers:
        ev.speakers.length > 0
          ? ev.speakers.map((s) => ({
              name: s.name,
              role: s.role,
              company: s.company || '',
            }))
          : [{ name: '', role: '', company: '' }],
      agenda: ev.agenda.length > 0 ? ev.agenda : [{ time: '', title: '', speaker: '' }],
      faqs:
        ev.faqs && ev.faqs.length > 0
          ? ev.faqs
          : [{ question: '', answer: '' }],
      rules: ev.rules,
    });
    setEventModalOpen(true);
  }

  async function handleSaveEvent(e: FormEvent) {
    e.preventDefault();
    setSavingEvent(true);
    try {
      if (editingEventId) {
        await updateEvent(editingEventId, formState);
        onNotify('Đã cập nhật đầy đủ thông tin sự kiện.');
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

  async function handleDuplicateEvent(ev: EventItem) {
    try {
      await duplicateEvent(ev);
      onNotify(`Đã nhân bản sự kiện "${ev.title}".`);
    } catch (err) {
      onNotify(
        err instanceof Error ? err.message : 'Không thể nhân bản sự kiện.',
        'error'
      );
    }
  }

  async function handleQuickEventStatus(id: string, nextStatus: EventStatus) {
    try {
      await updateEvent(id, { status: nextStatus });
      onNotify(`Đã đổi trạng thái sang "${EVENT_STATUS_META[nextStatus].label}".`);
    } catch (err) {
      onNotify(
        err instanceof Error ? err.message : 'Không thể đổi trạng thái sự kiện.',
        'error'
      );
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
      onNotify(
        nextStatus === 'attended'
          ? `Check-in thành công cho ${reg.guestName} (${reg.ticketCode}).`
          : `Đã cập nhật trạng thái vé ${reg.ticketCode} sang "${REGISTRATION_STATUS_META[nextStatus].label}".`
      );
    } catch (err) {
      onNotify(
        err instanceof Error ? err.message : 'Không thể cập nhật trạng thái.',
        'error'
      );
    }
  }

  async function handleQrCheckIn(e: FormEvent) {
    e.preventDefault();
    if (!qrInput.trim()) return;
    setCheckingInQr(true);
    try {
      // Hỗ trợ người dùng dán nguyên chuỗi JSON QR hoặc chỉ mã vé EF-XXXX-XXXX
      let parsedCode = qrInput.trim();
      if (parsedCode.startsWith('{')) {
        try {
          const obj = JSON.parse(parsedCode) as { ticketCode?: string };
          if (obj.ticketCode) parsedCode = obj.ticketCode;
        } catch {
          // fallback raw string
        }
      }
      const checked = await checkInByTicketCode(parsedCode, registrations);
      setQrInput('');
      onNotify(
        `Check-in QR thành công: ${checked.guestName} · Vé ${checked.ticketCode} (${checked.eventTitle}).`
      );
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'Check-in thất bại.', 'error');
    } finally {
      setCheckingInQr(false);
    }
  }

  function handleExportCsv() {
    if (filteredRegistrations.length === 0) {
      onNotify('Không có dữ liệu khách tham dự để xuất file.', 'error');
      return;
    }
    const suffix = regEventFilter === 'all' ? 'tat-ca-su-kien' : regEventFilter;
    exportRegistrationsToCSV(filteredRegistrations, `khach-tham-du-${suffix}.csv`);
    onNotify(`Đã xuất ${filteredRegistrations.length} dòng ra file CSV chuẩn UTF-8.`);
  }

  const navItems: { key: AdminSection; label: string; icon: typeof LayoutDashboard }[] = [
    { key: 'overview', label: 'Tổng quan', icon: LayoutDashboard },
    { key: 'events', label: 'Quản lý sự kiện', icon: Calendar },
    { key: 'registrations', label: 'Khách & Check-in QR', icon: UserCheck },
    { key: 'users', label: 'Người dùng', icon: Users },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex">
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
          {permissionWarning && (
            <div
              role="alert"
              className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3.5 text-sm text-amber-900"
            >
              <p className="font-semibold">
                Cloud Firestore đang từ chối quyền truy cập ({permissionWarning})
              </p>
              <p className="mt-1 text-xs text-amber-800 leading-relaxed">
                Hãy mở Firebase Console của dự án <strong>quan-ly-su-kien-86a89</strong> →{' '}
                <strong>Firestore Database → Rules</strong> và cập nhật rules cho phép người dùng đã
                đăng nhập đọc/ghi các collection <code>events</code>, <code>users</code>,{' '}
                <code>registrations</code>, <code>feedbacks</code>.
              </p>
            </div>
          )}

          {section === 'overview' && (
            <>
              {/* 4 KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <div className="bg-white border border-slate-200 rounded-xl p-5">
                  <p className="text-xs font-medium text-slate-500">Tổng sự kiện</p>
                  <p className="mt-2 text-3xl font-bold text-slate-900 tabular-nums">
                    {stats.totalEvents}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">Trên 5 nhóm danh mục</p>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-5">
                  <p className="text-xs font-medium text-slate-500">Tổng lượt đăng ký</p>
                  <p className="mt-2 text-3xl font-bold text-slate-900 tabular-nums">
                    {stats.totalRegistrations}
                  </p>
                  <p className="mt-1 text-xs text-slate-500 tabular-nums">
                    {stats.activeRegistrationsCount} vé đang hiệu lực
                  </p>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-5">
                  <p className="text-xs font-medium text-slate-500">Tỷ lệ lấp đầy trung bình</p>
                  <p className="mt-2 text-3xl font-bold text-indigo-600 tabular-nums">
                    {stats.avgFillRate}%
                  </p>
                  <p className="mt-1 text-xs text-slate-500">Trung bình các sự kiện đang mở</p>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-5">
                  <p className="text-xs font-medium text-slate-500">Tỷ lệ Check-in thực tế</p>
                  <p className="mt-2 text-3xl font-bold text-emerald-600 tabular-nums">
                    {stats.checkInRate}%
                  </p>
                  <p className="mt-1 text-xs text-slate-500 tabular-nums">
                    {stats.attendedCount} khách đã qua cổng QR
                  </p>
                </div>
              </div>

              {events.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
                  <Database className="w-10 h-10 text-indigo-300 mx-auto" />
                  <h2 className="mt-4 text-base font-bold text-slate-900">
                    Chưa có dữ liệu sự kiện để thống kê
                  </h2>
                  <p className="mt-1.5 text-sm text-slate-500 max-w-md mx-auto">
                    Nhấn nút &ldquo;Tạo dữ liệu mẫu (Seed Data)&rdquo; để sinh bộ dữ liệu 8 sự kiện
                    đa dạng lĩnh vực kèm 20 vé đăng ký và đánh giá thực tế trên Firestore.
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
                  {/* Event Registrations vs Capacity Bar Chart */}
                  <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6">
                    <div className="mb-4">
                      <h2 className="text-sm font-bold text-slate-900">
                        Lượt đăng ký theo từng sự kiện
                      </h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        So sánh số vé đã đặt và sức chứa tối đa
                      </p>
                    </div>
                    <div className="h-72 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={capacityChartData}
                          margin={{ top: 8, right: 8, left: -12, bottom: 0 }}
                        >
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
                            dataKey="checkedIn"
                            name="Đã Check-in"
                            fill="#10B981"
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

                  {/* Category Distribution Donut Chart */}
                  <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between">
                    <div className="mb-2">
                      <h2 className="text-sm font-bold text-slate-900">
                        Lượt đăng ký theo Danh mục
                      </h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Phân bổ vé hợp lệ giữa các lĩnh vực sự kiện
                      </p>
                    </div>

                    <div className="h-56 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={categoryChartData}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            innerRadius={52}
                            outerRadius={82}
                            paddingAngle={3}
                          >
                            {categoryChartData.map((entry) => (
                              <Cell key={entry.name} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              backgroundColor: '#FFFFFF',
                              borderColor: '#E2E8F0',
                              borderRadius: '8px',
                              fontSize: '12px',
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 pt-2 border-t border-slate-100">
                      {categoryChartData.map((entry) => (
                        <div
                          key={entry.name}
                          className="flex items-center justify-between text-xs"
                        >
                          <span className="flex items-center gap-2 text-slate-700 truncate">
                            <span
                              className="w-2.5 h-2.5 rounded-xs shrink-0"
                              style={{ backgroundColor: entry.color }}
                            />
                            <span className="truncate">{entry.name}</span>
                          </span>
                          <span className="font-semibold text-slate-900 tabular-nums">
                            {entry.value}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {section === 'events' && (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex flex-col sm:flex-row gap-3 flex-1">
                  <div className="relative w-full sm:w-72">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="search"
                      value={eventSearch}
                      onChange={(e) => setEventSearch(e.target.value)}
                      placeholder="Tìm tên sự kiện, địa điểm..."
                      className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-600"
                    />
                  </div>
                  <select
                    aria-label="Lọc danh mục sự kiện"
                    value={eventCategoryFilter}
                    onChange={(e) =>
                      setEventCategoryFilter(e.target.value as 'all' | EventCategory)
                    }
                    className="px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-600"
                  >
                    <option value="all">Tất cả danh mục</option>
                    {EVENT_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <span className="text-xs text-slate-500 tabular-nums">
                  {filteredEvents.length} sự kiện
                </span>
              </div>

              {filteredEvents.length === 0 ? (
                <div className="p-10 text-center text-sm text-slate-500">
                  Chưa có sự kiện phù hợp. Hãy bấm &ldquo;Tạo sự kiện&rdquo; hoặc &ldquo;Tạo dữ liệu mẫu (Seed Data)&rdquo;.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                        <th className="py-3 px-4">Sự kiện</th>
                        <th className="py-3 px-4">Danh mục</th>
                        <th className="py-3 px-4">Giá vé</th>
                        <th className="py-3 px-4">Bắt đầu</th>
                        <th className="py-3 px-4 text-right">Đăng ký / Tối đa</th>
                        <th className="py-3 px-4">Đổi trạng thái nhanh</th>
                        <th className="py-3 px-4 text-right">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      {filteredEvents.map((ev) => (
                        <tr key={ev.id} className="hover:bg-slate-50/70">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3 min-w-[230px]">
                              <EventBanner
                                src={ev.bannerUrl}
                                alt={ev.title}
                                className="w-14 h-9 rounded-md shrink-0"
                              />
                              <div className="min-w-0">
                                <div className="font-semibold text-slate-900 line-clamp-1 flex items-center gap-1.5">
                                  <span className="truncate">{ev.title}</span>
                                  {ev.featured && (
                                    <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                                  )}
                                </div>
                                <div className="text-xs text-slate-500 truncate max-w-[220px] flex items-center gap-1">
                                  {ev.organizerVerified !== false && (
                                    <BadgeCheck className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                                  )}
                                  <span className="truncate">{ev.location}</span>
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-xs font-medium text-slate-700 whitespace-nowrap">
                            {ev.category}
                          </td>
                          <td className="py-3 px-4 text-xs font-semibold text-slate-900 tabular-nums whitespace-nowrap">
                            {formatCurrencyVN(ev.price)}
                          </td>
                          <td className="py-3 px-4 text-xs text-slate-600 tabular-nums whitespace-nowrap">
                            {formatShortDateVN(ev.startTime)}
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-xs font-semibold text-slate-800 tabular-nums">
                            {ev.registeredCount}/{ev.maxSlots}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <select
                              aria-label={`Trạng thái sự kiện ${ev.title}`}
                              value={ev.status}
                              onChange={(e) =>
                                handleQuickEventStatus(ev.id, e.target.value as EventStatus)
                              }
                              className={`px-2.5 py-1.5 text-xs font-semibold bg-white border border-slate-200 rounded-md focus:outline-none focus:border-indigo-600 cursor-pointer ${
                                EVENT_STATUS_META[ev.status]?.textClass || 'text-slate-700'
                              }`}
                            >
                              <option value="ongoing">Mở đăng ký</option>
                              <option value="upcoming">Sắp diễn ra</option>
                              <option value="paused">Tạm đóng</option>
                              <option value="completed">Đã kết thúc</option>
                              <option value="cancelled">Đã hủy</option>
                            </select>
                          </td>
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleDuplicateEvent(ev)}
                                className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-md cursor-pointer"
                                title="Nhân bản sự kiện"
                              >
                                <Copy className="w-4 h-4" />
                              </button>
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
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {section === 'registrations' && (
            <div className="space-y-5">
              {/* Interactive QR Code Check-in Simulator Panel */}
              <div className="bg-white border border-indigo-200 rounded-xl p-5 space-y-4">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                      <QrCode className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-slate-900">
                        Bộ giả lập Quét mã QR / Check-in nhanh bằng mã vé
                      </h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Nhập mã vé (ví dụ <code className="font-mono">EF-8421-TECH</code>) hoặc dán
                        nội dung JSON từ mã QR của khách để xác thực và ghi nhận thời gian check-in
                        lên Firestore.
                      </p>
                    </div>
                  </div>

                  <form onSubmit={handleQrCheckIn} className="flex gap-2 w-full lg:w-auto">
                    <input
                      type="text"
                      value={qrInput}
                      onChange={(e) => setQrInput(e.target.value)}
                      placeholder="Nhập mã vé EF-XXXX-XXXX..."
                      className="flex-1 lg:w-64 px-3.5 py-2 text-sm font-mono border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-600"
                    />
                    <button
                      type="submit"
                      disabled={checkingInQr || !qrInput.trim()}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg cursor-pointer disabled:opacity-50 whitespace-nowrap shrink-0"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{checkingInQr ? 'Đang xử lý...' : 'Check-in QR'}</span>
                    </button>
                  </form>
                </div>

                {sampleTicketCodes.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs">
                    <span className="text-slate-500 font-medium">
                      Mã vé chờ check-in (bấm để thử nhanh):
                    </span>
                    {sampleTicketCodes.map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => setQrInput(r.ticketCode)}
                        className="px-2.5 py-1 font-mono font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-md cursor-pointer"
                      >
                        {r.ticketCode} ({r.guestName})
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Attendees Filter & Export Toolbar */}
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <div className="p-4 border-b border-slate-200 flex flex-col xl:flex-row xl:items-center justify-between gap-3">
                  <div className="flex flex-col sm:flex-row flex-wrap gap-2.5">
                    <select
                      aria-label="Lọc theo sự kiện"
                      value={regEventFilter}
                      onChange={(e) => setRegEventFilter(e.target.value)}
                      className="px-3 py-2 text-xs font-medium bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-600 max-w-xs"
                    >
                      <option value="all">Tất cả sự kiện ({events.length})</option>
                      {events.map((ev) => (
                        <option key={ev.id} value={ev.id}>
                          {ev.title}
                        </option>
                      ))}
                    </select>

                    <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg overflow-x-auto">
                      {(
                        [
                          { key: 'all', label: 'Tất cả' },
                          { key: 'confirmed', label: 'Đã xác nhận' },
                          { key: 'attended', label: 'Đã tham dự' },
                          { key: 'pending', label: 'Chờ duyệt' },
                          { key: 'cancelled', label: 'Đã hủy' },
                        ] as const
                      ).map((tab) => (
                        <button
                          key={tab.key}
                          type="button"
                          onClick={() => setRegStatusFilter(tab.key)}
                          className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                            regStatusFilter === tab.key
                              ? 'bg-white text-slate-900 shadow-xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2.5">
                    <div className="relative w-full sm:w-64">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="search"
                        value={regSearch}
                        onChange={(e) => setRegSearch(e.target.value)}
                        placeholder="Tìm tên, email, mã vé..."
                        className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-600"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleExportCsv}
                      className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Xuất Excel / CSV (UTF-8)</span>
                    </button>
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
                          <th className="py-3 px-4">Mã vé</th>
                          <th className="py-3 px-4">Khách tham dự</th>
                          <th className="py-3 px-4">Sự kiện &amp; Hạng vé</th>
                          <th className="py-3 px-4">Trạng thái / Check-in</th>
                          <th className="py-3 px-4 text-right">Thao tác</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-sm">
                        {filteredRegistrations.map((reg) => {
                          const statusMeta = REGISTRATION_STATUS_META[reg.status];
                          return (
                            <tr key={reg.id} className="hover:bg-slate-50/70">
                              <td className="py-3 px-4 font-mono text-xs font-bold text-slate-800 whitespace-nowrap">
                                {reg.ticketCode}
                              </td>
                              <td className="py-3 px-4">
                                <div className="font-semibold text-slate-900">{reg.guestName}</div>
                                <div className="text-xs text-slate-500">
                                  {reg.guestEmail} · {reg.guestPhone}
                                </div>
                              </td>
                              <td className="py-3 px-4">
                                <div className="text-slate-800 font-medium max-w-[240px] truncate">
                                  {reg.eventTitle}
                                </div>
                                <div className="text-xs text-slate-500 tabular-nums">
                                  {reg.ticketTier === 'vip' ? 'VIP' : 'Tiêu chuẩn'} ·{' '}
                                  {formatCurrencyVN(reg.ticketPrice)}
                                </div>
                              </td>
                              <td className="py-3 px-4 whitespace-nowrap">
                                <div className={`text-xs font-semibold ${statusMeta.textClass}`}>
                                  {statusMeta.label}
                                </div>
                                <div className="text-[11px] text-slate-400 tabular-nums">
                                  {reg.checkedInAt
                                    ? `Check-in: ${formatDateTimeVN(reg.checkedInAt)}`
                                    : `ĐK: ${formatShortDateVN(reg.registeredAt)}`}
                                </div>
                              </td>
                              <td className="py-3 px-4 text-right whitespace-nowrap">
                                <div className="inline-flex items-center gap-2">
                                  {(reg.status === 'confirmed' || reg.status === 'pending') && (
                                    <button
                                      type="button"
                                      onClick={() => handleStatusChange(reg, 'attended')}
                                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-md cursor-pointer"
                                    >
                                      <CheckCircle2 className="w-3.5 h-3.5" />
                                      <span>Check-in</span>
                                    </button>
                                  )}
                                  <select
                                    aria-label={`Trạng thái vé ${reg.ticketCode}`}
                                    value={reg.status}
                                    onChange={(e) =>
                                      handleStatusChange(reg, e.target.value as RegistrationStatus)
                                    }
                                    className="px-2 py-1.5 text-xs font-medium bg-white border border-slate-200 rounded-md focus:outline-none focus:border-indigo-600 cursor-pointer"
                                  >
                                    <option value="pending">Chờ duyệt</option>
                                    <option value="confirmed">Đã xác nhận</option>
                                    <option value="attended">Đã tham dự</option>
                                    <option value="cancelled">Đã hủy</option>
                                  </select>
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

      {/* Create / Edit Event Modal with Category, Pricing, Speakers & Agenda Builder */}
      {eventModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="admin-event-modal-title"
        >
          <div className="bg-white border border-slate-200 rounded-2xl max-w-3xl w-full max-h-[92vh] overflow-y-auto">
            <div className="sticky top-0 z-10 bg-white px-6 py-4 border-b border-slate-200 flex items-center justify-between">
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

            <form onSubmit={handleSaveEvent} className="p-6 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
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
                    Danh mục
                  </label>
                  <select
                    value={formState.category}
                    onChange={(e) =>
                      setFormState((s) => ({ ...s, category: e.target.value as EventCategory }))
                    }
                    className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-600"
                  >
                    {EVENT_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
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
                  placeholder="Nội dung chính, đối tượng tham dự, giá trị nhận được..."
                  className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-600"
                />
              </div>

              {/* Banner URL + 6 Preset Picker */}
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

                <div className="mt-2.5 grid grid-cols-3 sm:grid-cols-6 gap-2">
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Địa điểm tổ chức
                  </label>
                  <input
                    type="text"
                    required
                    value={formState.location}
                    onChange={(e) => setFormState((s) => ({ ...s, location: e.target.value }))}
                    className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Đơn vị tổ chức
                  </label>
                  <input
                    type="text"
                    required
                    value={formState.organizer}
                    onChange={(e) => setFormState((s) => ({ ...s, organizer: e.target.value }))}
                    className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-600"
                  />
                </div>
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

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Giá vé tiêu chuẩn (VNĐ)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={1000}
                    value={formState.price}
                    onChange={(e) =>
                      setFormState((s) => ({ ...s, price: Number(e.target.value) || 0 }))
                    }
                    className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-600 tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Giá vé VIP (0 = tắt)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={1000}
                    value={formState.vipPrice || 0}
                    onChange={(e) =>
                      setFormState((s) => ({ ...s, vipPrice: Number(e.target.value) || 0 }))
                    }
                    className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-600 tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Sức chứa tối đa
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
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-600"
                  >
                    <option value="ongoing">Mở đăng ký</option>
                    <option value="upcoming">Sắp diễn ra</option>
                    <option value="paused">Tạm đóng</option>
                    <option value="completed">Đã kết thúc</option>
                    <option value="cancelled">Đã hủy</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-wrap gap-6 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(formState.featured)}
                    onChange={(e) =>
                      setFormState((s) => ({ ...s, featured: e.target.checked }))
                    }
                    className="w-4 h-4 accent-indigo-600 rounded"
                  />
                  <span>Đánh dấu sự kiện nổi bật (Spotlight Hero)</span>
                </label>
                <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formState.organizerVerified !== false}
                    onChange={(e) =>
                      setFormState((s) => ({ ...s, organizerVerified: e.target.checked }))
                    }
                    className="w-4 h-4 accent-indigo-600 rounded"
                  />
                  <span>Huy hiệu Đơn vị tổ chức đã xác thực</span>
                </label>
              </div>

              {/* Speakers Builder */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">
                    Diễn giả / Khách mời
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setFormState((s) => ({
                        ...s,
                        speakers: [...s.speakers, { name: '', role: '', company: '' }],
                      }))
                    }
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 cursor-pointer"
                  >
                    + Thêm diễn giả
                  </button>
                </div>

                {formState.speakers.map((sp, idx) => (
                  <div key={idx} className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                    <input
                      type="text"
                      value={sp.name}
                      onChange={(e) => {
                        const next = [...formState.speakers];
                        next[idx] = { ...next[idx], name: e.target.value };
                        setFormState((s) => ({ ...s, speakers: next }));
                      }}
                      placeholder="Tên diễn giả"
                      className="sm:col-span-4 px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-md"
                    />
                    <input
                      type="text"
                      value={sp.role}
                      onChange={(e) => {
                        const next = [...formState.speakers];
                        next[idx] = { ...next[idx], role: e.target.value };
                        setFormState((s) => ({ ...s, speakers: next }));
                      }}
                      placeholder="Chức danh"
                      className="sm:col-span-4 px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-md"
                    />
                    <input
                      type="text"
                      value={sp.company || ''}
                      onChange={(e) => {
                        const next = [...formState.speakers];
                        next[idx] = { ...next[idx], company: e.target.value };
                        setFormState((s) => ({ ...s, speakers: next }));
                      }}
                      placeholder="Doanh nghiệp / Đơn vị"
                      className="sm:col-span-3 px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-md"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setFormState((s) => ({
                          ...s,
                          speakers: s.speakers.filter((_, i) => i !== idx),
                        }))
                      }
                      className="sm:col-span-1 p-1.5 text-slate-400 hover:text-rose-600 cursor-pointer"
                      aria-label="Xóa diễn giả"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Agenda Builder */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">
                    Lịch trình chi tiết (Agenda)
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setFormState((s) => ({
                        ...s,
                        agenda: [...s.agenda, { time: '', title: '', speaker: '' }],
                      }))
                    }
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 cursor-pointer"
                  >
                    + Thêm mốc giờ
                  </button>
                </div>

                {formState.agenda.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                    <input
                      type="text"
                      value={item.time}
                      onChange={(e) => {
                        const next = [...formState.agenda];
                        next[idx] = { ...next[idx], time: e.target.value };
                        setFormState((s) => ({ ...s, agenda: next }));
                      }}
                      placeholder="09:00 - 10:30"
                      className="sm:col-span-3 px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-md"
                    />
                    <input
                      type="text"
                      value={item.title}
                      onChange={(e) => {
                        const next = [...formState.agenda];
                        next[idx] = { ...next[idx], title: e.target.value };
                        setFormState((s) => ({ ...s, agenda: next }));
                      }}
                      placeholder="Nội dung phiên"
                      className="sm:col-span-5 px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-md"
                    />
                    <input
                      type="text"
                      value={item.speaker || ''}
                      onChange={(e) => {
                        const next = [...formState.agenda];
                        next[idx] = { ...next[idx], speaker: e.target.value };
                        setFormState((s) => ({ ...s, agenda: next }));
                      }}
                      placeholder="Diễn giả (tùy chọn)"
                      className="sm:col-span-3 px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-md"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setFormState((s) => ({
                          ...s,
                          agenda: s.agenda.filter((_, i) => i !== idx),
                        }))
                      }
                      className="sm:col-span-1 p-1.5 text-slate-400 hover:text-rose-600 cursor-pointer"
                      aria-label="Xóa mốc giờ"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              {/* FAQ Builder */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 inline-flex items-center gap-1.5">
                    <HelpCircle className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Câu hỏi thường gặp (FAQ)</span>
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setFormState((s) => ({
                        ...s,
                        faqs: [...s.faqs, { question: '', answer: '' }],
                      }))
                    }
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 cursor-pointer"
                  >
                    + Thêm câu hỏi
                  </button>
                </div>

                {formState.faqs.map((faq, idx) => (
                  <div key={idx} className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-start">
                    <input
                      type="text"
                      value={faq.question}
                      onChange={(e) => {
                        const next = [...formState.faqs];
                        next[idx] = { ...next[idx], question: e.target.value };
                        setFormState((s) => ({ ...s, faqs: next }));
                      }}
                      placeholder="Câu hỏi..."
                      className="sm:col-span-5 px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-md"
                    />
                    <input
                      type="text"
                      value={faq.answer}
                      onChange={(e) => {
                        const next = [...formState.faqs];
                        next[idx] = { ...next[idx], answer: e.target.value };
                        setFormState((s) => ({ ...s, faqs: next }));
                      }}
                      placeholder="Câu trả lời..."
                      className="sm:col-span-6 px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-md"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setFormState((s) => ({
                          ...s,
                          faqs: s.faqs.filter((_, i) => i !== idx),
                        }))
                      }
                      className="sm:col-span-1 p-1.5 text-slate-400 hover:text-rose-600 cursor-pointer"
                      aria-label="Xóa câu hỏi"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Quy định tham gia
                </label>
                <input
                  type="text"
                  value={formState.rules}
                  onChange={(e) => setFormState((s) => ({ ...s, rules: e.target.value }))}
                  className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-600"
                />
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
