import { useMemo, useState, type FormEvent } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  BadgeCheck,
  Bookmark,
  Calendar,
  CalendarDays,
  CheckCircle2,
  LogIn,
  LogOut,
  Mail,
  MapPin,
  Menu,
  Phone,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Ticket,
  Users,
  X,
} from 'lucide-react';
import { submitFeedback, updateRegistrationStatus } from '../services/dataService';
import { EventBanner } from './EventBanner';
import { EventDetailModal } from './EventDetailModal';
import {
  ENTERPRISE_PARTNERS,
  EVENT_CATEGORIES,
  EVENT_STATUS_META,
  formatCurrencyVN,
  formatDateTimeVN,
  formatShortDateVN,
  REGISTRATION_STATUS_META,
} from '../utils/formatters';
import type {
  AppUser,
  EventItem,
  EventStatus,
  FeedbackItem,
  RegistrationItem,
} from '../types';

interface UserLayoutProps {
  currentUser: AppUser | null;
  events: EventItem[];
  eventsLoading: boolean;
  registrations: RegistrationItem[];
  feedbacks: FeedbackItem[];
  permissionWarning?: string | null;
  onSwitchToAdmin?: () => void;
  onOpenAuth: () => void;
  onLogout: () => void;
  onNotify: (message: string, type?: 'success' | 'error') => void;
}

export function UserLayout({
  currentUser,
  events,
  eventsLoading,
  registrations,
  feedbacks,
  permissionWarning,
  onSwitchToAdmin,
  onOpenAuth,
  onLogout,
  onNotify,
}: UserLayoutProps) {
  const [activeTab, setActiveTab] = useState<'discover' | 'tickets'>('discover');
  const [statusFilter, setStatusFilter] = useState<'all' | EventStatus>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [savedEventIds, setSavedEventIds] = useState<string[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);
  const [feedbackReg, setFeedbackReg] = useState<RegistrationItem | null>(null);
  const [ratingValue, setRatingValue] = useState(5);
  const [ratingComment, setRatingComment] = useState('');
  const [sendingFeedback, setSendingFeedback] = useState(false);

  const myRegistrations = useMemo(() => {
    if (!currentUser) return [];
    return registrations.filter(
      (r) =>
        r.userId === currentUser.uid ||
        r.guestEmail.toLowerCase() === currentUser.email.toLowerCase()
    );
  }, [registrations, currentUser]);

  const activeRegistrationMap = useMemo(() => {
    const map = new Map<string, RegistrationItem>();
    for (const r of myRegistrations) {
      if (r.status !== 'cancelled') {
        map.set(r.eventId, r);
      }
    }
    return map;
  }, [myRegistrations]);

  const heroMetrics = useMemo(() => {
    const totalEvents = events.length;
    const totalRegistrations = events.reduce((acc, ev) => acc + (ev.registeredCount || 0), 0);
    const totalCheckedIn = events.reduce((acc, ev) => acc + (ev.checkedInCount || 0), 0);
    const activeEvents = events.filter(
      (ev) => ev.status !== 'cancelled' && ev.maxSlots > 0
    );
    const avgFillRate =
      activeEvents.length > 0
        ? Math.round(
            activeEvents.reduce(
              (acc, ev) => acc + Math.min(100, (ev.registeredCount / ev.maxSlots) * 100),
              0
            ) / activeEvents.length
          )
        : 0;
    const checkInRate =
      totalRegistrations > 0
        ? Math.round((totalCheckedIn / totalRegistrations) * 100)
        : 0;

    return {
      totalEvents,
      totalRegistrations,
      avgFillRate,
      checkInRate,
    };
  }, [events]);

  const featuredEvent = useMemo(() => {
    if (
      statusFilter !== 'all' ||
      categoryFilter !== 'all' ||
      searchQuery.trim() !== ''
    ) {
      return null;
    }
    return (
      events.find((e) => e.featured && e.status !== 'cancelled') ||
      events.find((e) => e.status === 'ongoing') ||
      null
    );
  }, [events, statusFilter, categoryFilter, searchQuery]);

  const filteredEvents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return events.filter((ev) => {
      if (statusFilter !== 'all' && ev.status !== statusFilter) return false;
      if (categoryFilter !== 'all' && ev.category !== categoryFilter) return false;
      if (!q) return true;
      return (
        ev.title.toLowerCase().includes(q) ||
        ev.location.toLowerCase().includes(q) ||
        ev.category.toLowerCase().includes(q) ||
        ev.organizer.toLowerCase().includes(q)
      );
    });
  }, [events, statusFilter, categoryFilter, searchQuery]);

  function toggleSaveEvent(eventId: string) {
    setSavedEventIds((prev) => {
      const exists = prev.includes(eventId);
      onNotify(exists ? 'Đã bỏ lưu sự kiện.' : 'Đã lưu sự kiện vào danh sách quan tâm.');
      return exists ? prev.filter((id) => id !== eventId) : [...prev, eventId];
    });
  }

  function resetAllFilters() {
    setStatusFilter('all');
    setCategoryFilter('all');
    setSearchQuery('');
  }

  async function handleCancelTicket(reg: RegistrationItem) {
    try {
      await updateRegistrationStatus(reg, 'cancelled');
      onNotify(`Đã hủy vé ${reg.ticketCode} và hoàn trả chỗ trống lên Firestore.`);
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'Không thể hủy vé.', 'error');
    }
  }

  async function handleSubmitTicketFeedback(e: FormEvent) {
    e.preventDefault();
    if (!currentUser || !feedbackReg || !ratingComment.trim()) return;
    setSendingFeedback(true);
    try {
      await submitFeedback({
        eventId: feedbackReg.eventId,
        eventTitle: feedbackReg.eventTitle,
        userId: currentUser.uid,
        userName: currentUser.fullName,
        rating: ratingValue,
        comment: ratingComment,
      });
      onNotify('Đã gửi đánh giá của bạn lên Firestore.');
      setFeedbackReg(null);
      setRatingComment('');
      setRatingValue(5);
    } catch (err) {
      onNotify(
        err instanceof Error ? err.message : 'Không thể gửi đánh giá.',
        'error'
      );
    } finally {
      setSendingFeedback(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Enterprise Top Navigation Bar */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4 lg:gap-8">
          {/* Logo */}
          <button
            type="button"
            onClick={() => setActiveTab('discover')}
            className="inline-flex items-center gap-2 text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <span className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
              <CalendarDays className="w-4 h-4" />
            </span>
            <span>EventFlow</span>
          </button>

          {/* Header Quick Search */}
          <div className="hidden lg:block relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (activeTab !== 'discover') setActiveTab('discover');
              }}
              placeholder="Tìm sự kiện, địa điểm, danh mục..."
              className="w-full pl-9 pr-3 py-1.5 text-sm bg-slate-100/80 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-indigo-600"
            />
          </div>

          {/* Nav Links */}
          <nav className="hidden md:flex items-center gap-5 text-sm font-medium">
            <button
              type="button"
              onClick={() => setActiveTab('discover')}
              className={`whitespace-nowrap shrink-0 pb-0.5 transition-colors cursor-pointer ${
                activeTab === 'discover'
                  ? 'text-indigo-600 font-semibold border-b-2 border-indigo-600'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Khám phá
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('tickets')}
              className={`whitespace-nowrap shrink-0 pb-0.5 transition-colors cursor-pointer ${
                activeTab === 'tickets'
                  ? 'text-indigo-600 font-semibold border-b-2 border-indigo-600'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Sự kiện của tôi ({myRegistrations.length})
            </button>
            {currentUser?.role === 'admin' && onSwitchToAdmin && (
              <button
                type="button"
                onClick={onSwitchToAdmin}
                className="whitespace-nowrap shrink-0 text-slate-600 hover:text-indigo-600 transition-colors cursor-pointer"
              >
                Quản trị
              </button>
            )}
          </nav>

          {/* Account Area */}
          <div className="hidden md:flex items-center gap-3 shrink-0">
            {currentUser ? (
              <div className="flex items-center gap-3">
                <div className="text-right leading-tight">
                  <div className="text-xs font-bold text-slate-900 truncate max-w-[140px]">
                    {currentUser.fullName}
                  </div>
                  <div className="text-[11px] font-medium text-indigo-600">
                    {currentUser.role === 'admin' ? 'Quản trị viên' : 'Thành viên'}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onLogout}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Đăng xuất</span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={onOpenAuth}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Đăng nhập</span>
              </button>
            )}
          </div>

          <button
            type="button"
            aria-label="Mở menu điều hướng"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="md:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100 cursor-pointer"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-200 bg-white px-4 py-4 space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm sự kiện, địa điểm..."
                className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg"
              />
            </div>
            <button
              type="button"
              onClick={() => {
                setActiveTab('discover');
                setMobileMenuOpen(false);
              }}
              className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              Khám phá
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('tickets');
                setMobileMenuOpen(false);
              }}
              className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              Sự kiện của tôi ({myRegistrations.length})
            </button>
            {currentUser?.role === 'admin' && onSwitchToAdmin && (
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onSwitchToAdmin();
                }}
                className="w-full text-left px-3 py-2 rounded-lg text-sm font-semibold text-indigo-700 bg-indigo-50"
              >
                Cổng Quản trị Doanh nghiệp
              </button>
            )}
            <div className="pt-2 border-t border-slate-100">
              {currentUser ? (
                <button
                  type="button"
                  onClick={onLogout}
                  className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-rose-700 hover:bg-rose-50"
                >
                  Đăng xuất ({currentUser.fullName})
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onOpenAuth}
                  className="w-full text-center px-4 py-2.5 rounded-lg text-sm font-semibold text-white bg-indigo-600"
                >
                  Đăng nhập / Đăng ký
                </button>
              )}
            </div>
          </div>
        )}
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {permissionWarning && (
          <div
            role="alert"
            className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
          >
            <span className="font-semibold">Lưu ý phân quyền Cloud Firestore: </span>
            <span>
              {currentUser
                ? `Không thể đọc dữ liệu (${permissionWarning}). Vui lòng kiểm tra Firestore Rules của dự án quan-ly-su-kien-86a89.`
                : 'Vui lòng đăng nhập để xem đầy đủ danh sách sự kiện và đặt vé.'}
            </span>
          </div>
        )}

        {activeTab === 'discover' ? (
          <div className="space-y-10">
            {/* Enterprise Hero Section */}
            <section className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-10 lg:p-12 space-y-8">
              <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
                <div className="max-w-3xl">
                  <div className="inline-flex items-center gap-2 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-100 px-3 py-1 rounded-md">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Enterprise Event &amp; QR Check-in Platform</span>
                  </div>
                  <h1 className="mt-4 text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 tracking-tight text-balance leading-[1.15]">
                    Nền tảng quản lý &amp; vận hành sự kiện tập trung cho doanh nghiệp
                  </h1>
                  <p className="mt-4 text-sm sm:text-base text-slate-600 leading-relaxed max-w-2xl">
                    Tổ chức hội nghị công nghệ, workshop chuyên đề, đào tạo nội bộ và gala đối tác
                    trên một hệ thống đồng bộ thời gian thực với Cloud Firestore — giữ chỗ an toàn
                    bằng Transaction và check-in tức thì qua mã QR E-Ticket.
                  </p>
                </div>

                {currentUser?.role === 'admin' && onSwitchToAdmin && (
                  <button
                    type="button"
                    onClick={onSwitchToAdmin}
                    className="inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shrink-0 cursor-pointer whitespace-nowrap"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>Mở Admin Portal</span>
                  </button>
                )}
              </div>

              {/* Hero Quick Filter Bar */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex flex-col lg:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Tìm kiếm theo tên sự kiện, địa điểm, đơn vị tổ chức..."
                    className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-600"
                  />
                </div>
                <select
                  aria-label="Lọc theo danh mục"
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="px-3.5 py-2.5 text-sm font-medium bg-white border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:border-indigo-600 cursor-pointer"
                >
                  <option value="all">Tất cả danh mục</option>
                  {EVENT_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
                <select
                  aria-label="Lọc theo trạng thái"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as 'all' | EventStatus)}
                  className="px-3.5 py-2.5 text-sm font-medium bg-white border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:border-indigo-600 cursor-pointer"
                >
                  <option value="all">Tất cả trạng thái</option>
                  <option value="ongoing">Mở đăng ký</option>
                  <option value="upcoming">Sắp diễn ra</option>
                  <option value="paused">Tạm đóng</option>
                  <option value="completed">Đã kết thúc</option>
                </select>
              </div>

              {/* 4 Live Enterprise Metrics Strip */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pt-2 border-t border-slate-100">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
                  <div className="text-xs font-medium text-slate-500">Tổng sự kiện</div>
                  <div className="mt-1.5 text-2xl sm:text-3xl font-bold text-slate-900 tabular-nums">
                    {heroMetrics.totalEvents}
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
                  <div className="text-xs font-medium text-slate-500">Tổng lượt đăng ký</div>
                  <div className="mt-1.5 text-2xl sm:text-3xl font-bold text-slate-900 tabular-nums">
                    {heroMetrics.totalRegistrations}
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
                  <div className="text-xs font-medium text-slate-500">Tỷ lệ lấp đầy</div>
                  <div className="mt-1.5 text-2xl sm:text-3xl font-bold text-indigo-600 tabular-nums">
                    {heroMetrics.avgFillRate}%
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
                  <div className="text-xs font-medium text-slate-500">Tỷ lệ check-in</div>
                  <div className="mt-1.5 text-2xl sm:text-3xl font-bold text-emerald-600 tabular-nums">
                    {heroMetrics.checkInRate}%
                  </div>
                </div>
              </div>
            </section>

            {/* Enterprise Trust Strip */}
            <section aria-label="Đơn vị tổ chức và đối tác tiêu biểu" className="space-y-3">
              <div className="text-xs font-semibold text-slate-500">
                Đơn vị tổ chức &amp; đối tác doanh nghiệp đã xác thực trên EventFlow
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {ENTERPRISE_PARTNERS.map((partner) => (
                  <div
                    key={partner.name}
                    className="bg-white border border-slate-200 rounded-xl px-4 py-3 flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-900 truncate">
                        {partner.name}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate">{partner.sector}</div>
                    </div>
                    <BadgeCheck className="w-4 h-4 text-indigo-600 shrink-0" />
                  </div>
                ))}
              </div>
            </section>

            {/* Featured Event Spotlight */}
            {!eventsLoading && featuredEvent && (
              <section className="space-y-3">
                <h2 className="text-lg font-bold text-slate-900">Sự kiện tiêu biểu</h2>
                <article
                  onClick={() => setSelectedEvent(featuredEvent)}
                  className="bg-white border border-slate-200 rounded-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 items-stretch hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer"
                >
                  <div className="lg:col-span-6 aspect-video lg:aspect-auto bg-slate-100">
                    <EventBanner
                      src={featuredEvent.bannerUrl}
                      alt={featuredEvent.title}
                      className="w-full h-full"
                    />
                  </div>
                  <div className="lg:col-span-6 p-6 sm:p-8 flex flex-col justify-between gap-5">
                    <div>
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="px-2.5 py-1 font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-md">
                          {featuredEvent.category}
                        </span>
                        <span
                          className={`px-2.5 py-1 font-semibold border rounded-md ${
                            EVENT_STATUS_META[featuredEvent.status].bgClass
                          } ${EVENT_STATUS_META[featuredEvent.status].textClass}`}
                        >
                          {EVENT_STATUS_META[featuredEvent.status].label}
                        </span>
                      </div>

                      <h3 className="mt-3 text-xl sm:text-2xl font-bold text-slate-900 leading-snug">
                        {featuredEvent.title}
                      </h3>

                      <p className="mt-2.5 text-sm text-slate-600 line-clamp-3 leading-relaxed">
                        {featuredEvent.description}
                      </p>

                      <div className="mt-4 space-y-1.5 text-xs text-slate-600">
                        <div className="flex items-center gap-2 tabular-nums">
                          <Calendar className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                          <span>{formatDateTimeVN(featuredEvent.startTime)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                          <span className="truncate">{featuredEvent.location}</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-4">
                      <div>
                        <div className="text-xs text-slate-500">Vé từ</div>
                        <div className="text-lg font-bold text-indigo-700 tabular-nums">
                          {formatCurrencyVN(featuredEvent.price)}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedEvent(featuredEvent);
                        }}
                        className="px-5 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors cursor-pointer whitespace-nowrap"
                      >
                        Xem chi tiết &amp; Đăng ký
                      </button>
                    </div>
                  </div>
                </article>
              </section>
            )}

            {/* Category Quick Pills + Results Count */}
            <section className="space-y-5">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                  <button
                    type="button"
                    onClick={() => setCategoryFilter('all')}
                    className={`px-3.5 py-2 text-xs font-semibold rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      categoryFilter === 'all'
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    Tất cả danh mục
                  </button>
                  {EVENT_CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategoryFilter(cat)}
                      className={`px-3.5 py-2 text-xs font-semibold rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        categoryFilter === cat
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                <div className="text-xs font-medium text-slate-500 tabular-nums">
                  {eventsLoading
                    ? 'Đang đồng bộ Cloud Firestore...'
                    : `Hiển thị ${filteredEvents.length} sự kiện`}
                </div>
              </div>

              {/* Skeleton Loading State */}
              {eventsLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[1, 2, 3, 4, 5, 6].map((idx) => (
                    <div
                      key={idx}
                      className="bg-white border border-slate-200 rounded-2xl overflow-hidden animate-pulse"
                    >
                      <div className="aspect-video bg-slate-200" />
                      <div className="p-5 space-y-3">
                        <div className="flex justify-between">
                          <div className="h-4 w-24 bg-slate-200 rounded" />
                          <div className="h-4 w-16 bg-slate-200 rounded" />
                        </div>
                        <div className="h-5 w-4/5 bg-slate-200 rounded" />
                        <div className="h-4 w-full bg-slate-100 rounded" />
                        <div className="h-2 w-full bg-slate-100 rounded-full" />
                        <div className="h-9 w-full bg-slate-100 rounded-lg" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredEvents.length === 0 ? (
                /* Empty State */
                <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
                  <Calendar className="w-10 h-10 text-slate-300 mx-auto" />
                  <h2 className="mt-4 text-base font-bold text-slate-900">
                    Không tìm thấy sự kiện phù hợp
                  </h2>
                  <p className="mt-1.5 text-sm text-slate-500 max-w-md mx-auto">
                    {events.length === 0
                      ? 'Cloud Firestore hiện chưa có dữ liệu sự kiện. Hãy đăng nhập Demo Admin và bấm "Tạo dữ liệu mẫu (Seed Data)" để khởi tạo 8 sự kiện doanh nghiệp.'
                      : 'Thử thay đổi bộ lọc danh mục, trạng thái hoặc xóa từ khóa tìm kiếm.'}
                  </p>
                  <div className="mt-5 flex items-center justify-center gap-3">
                    {events.length > 0 && (
                      <button
                        type="button"
                        onClick={resetAllFilters}
                        className="px-4 py-2 text-sm font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg cursor-pointer"
                      >
                        Đặt lại bộ lọc
                      </button>
                    )}
                    {currentUser?.role === 'admin' && onSwitchToAdmin && events.length === 0 && (
                      <button
                        type="button"
                        onClick={onSwitchToAdmin}
                        className="px-4 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg cursor-pointer"
                      >
                        Đi tới Admin Portal để Seed Data
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                /* Corporate Event Cards Grid */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredEvents.map((ev) => {
                    const statusMeta =
                      EVENT_STATUS_META[ev.status] || EVENT_STATUS_META.upcoming;
                    const remaining = Math.max(0, ev.maxSlots - ev.registeredCount);
                    const fillPercent = Math.min(
                      100,
                      Math.round((ev.registeredCount / Math.max(1, ev.maxSlots)) * 100)
                    );
                    const myReg = activeRegistrationMap.get(ev.id);
                    const isSaved = savedEventIds.includes(ev.id);

                    return (
                      <article
                        key={ev.id}
                        onClick={() => setSelectedEvent(ev)}
                        className="group bg-white border border-slate-200 rounded-2xl overflow-hidden flex flex-col justify-between hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer"
                      >
                        <div>
                          <div className="relative aspect-video w-full overflow-hidden bg-slate-100">
                            <EventBanner
                              src={ev.bannerUrl}
                              alt={ev.title}
                              className="w-full h-full group-hover:scale-[1.02] transition-transform duration-300"
                            />
                            <div className="absolute top-3 left-3 flex items-center gap-1.5">
                              <span className="px-2.5 py-1 text-[11px] font-semibold bg-white/95 text-slate-900 rounded-md shadow-xs">
                                {ev.category}
                              </span>
                            </div>
                            <div className="absolute top-3 right-3 flex items-center gap-1.5">
                              {myReg && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold bg-emerald-600 text-white rounded-md shadow-xs">
                                  <CheckCircle2 className="w-3 h-3" />
                                  Đã đăng ký
                                </span>
                              )}
                              <button
                                type="button"
                                aria-label="Lưu sự kiện"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleSaveEvent(ev.id);
                                }}
                                className={`p-1.5 rounded-md shadow-xs cursor-pointer transition-colors ${
                                  isSaved
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-white/95 text-slate-600 hover:text-indigo-600'
                                }`}
                              >
                                <Bookmark
                                  className={`w-3.5 h-3.5 ${isSaved ? 'fill-current' : ''}`}
                                />
                              </button>
                            </div>
                          </div>

                          <div className="p-5">
                            <div className="flex items-center justify-between gap-2 text-xs">
                              <div className="flex items-center gap-1.5 tabular-nums text-slate-500">
                                <span className={`font-semibold ${statusMeta.textClass}`}>
                                  {statusMeta.label}
                                </span>
                                <span aria-hidden="true">·</span>
                                <span>{formatShortDateVN(ev.startTime)}</span>
                              </div>
                              <span className="font-bold text-indigo-700 tabular-nums">
                                {formatCurrencyVN(ev.price)}
                              </span>
                            </div>

                            <h3 className="mt-2.5 text-lg font-bold text-slate-900 leading-snug line-clamp-2 group-hover:text-indigo-700 transition-colors">
                              {ev.title}
                            </h3>

                            <div className="mt-3.5 space-y-1.5 text-xs text-slate-500">
                              <div className="flex items-center gap-2">
                                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                <span className="truncate">{ev.location}</span>
                              </div>
                              <div className="flex items-center gap-2 tabular-nums">
                                <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                <span>
                                  {ev.registeredCount} đã đăng ký · còn {remaining}/{ev.maxSlots} chỗ
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="px-5 pb-5 pt-1">
                          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mb-4">
                            <div
                              className={`h-full rounded-full ${
                                fillPercent >= 90 ? 'bg-amber-500' : 'bg-indigo-600'
                              }`}
                              style={{ width: `${fillPercent}%` }}
                            />
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs text-slate-500 truncate inline-flex items-center gap-1">
                              {ev.organizer}
                              {ev.organizerVerified !== false && (
                                <BadgeCheck className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                              )}
                            </span>
                            <span className="text-xs font-semibold text-indigo-700 whitespace-nowrap shrink-0">
                              {myReg ? 'Xem vé →' : 'Đăng ký ngay →'}
                            </span>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        ) : (
          /* My Events & E-Tickets View */
          <section className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                Sự kiện của tôi &amp; Vé điện tử (E-Ticket)
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Xuất trình mã QR bên dưới tại quầy lễ tân để Ban tổ chức quét Check-in nhanh chóng.
              </p>
            </div>

            {!currentUser ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center">
                <Ticket className="w-10 h-10 text-slate-300 mx-auto" />
                <p className="mt-3 text-sm text-slate-600">
                  Hãy đăng nhập để xem vé điện tử và mã QR check-in của bạn.
                </p>
                <button
                  type="button"
                  onClick={onOpenAuth}
                  className="mt-4 px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg cursor-pointer"
                >
                  Đăng nhập ngay
                </button>
              </div>
            ) : myRegistrations.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center">
                <Ticket className="w-10 h-10 text-slate-300 mx-auto" />
                <h2 className="mt-3 text-base font-semibold text-slate-900">
                  Bạn chưa có vé sự kiện nào
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Khám phá các sự kiện đang mở đăng ký để nhận vé điện tử và mã QR check-in.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab('discover')}
                  className="mt-4 px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg cursor-pointer"
                >
                  Khám phá sự kiện
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {myRegistrations.map((reg) => {
                  const statusMeta = REGISTRATION_STATUS_META[reg.status];
                  const linkedEvent = events.find((e) => e.id === reg.eventId);
                  const canCancel =
                    reg.status !== 'cancelled' &&
                    reg.status !== 'attended' &&
                    linkedEvent?.status !== 'completed';
                  const canRate =
                    reg.status === 'attended' ||
                    (linkedEvent?.status === 'completed' && reg.status !== 'cancelled');
                  const qrPayload = JSON.stringify({
                    ticketCode: reg.ticketCode,
                    eventId: reg.eventId,
                    guest: reg.guestName,
                  });

                  return (
                    <article
                      key={reg.id}
                      className="bg-white border border-slate-200 rounded-2xl overflow-hidden flex flex-col sm:flex-row"
                    >
                      <div className="flex-1 p-5 sm:p-6 flex flex-col justify-between gap-4">
                        <div>
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className={`text-xs font-semibold ${statusMeta.textClass}`}>
                              {statusMeta.label}
                            </span>
                            <span className="text-xs font-semibold text-indigo-700 tabular-nums">
                              {reg.ticketTier === 'vip' ? 'Hạng VIP' : 'Tiêu chuẩn'} ·{' '}
                              {formatCurrencyVN(reg.ticketPrice)}
                            </span>
                          </div>

                          <h3 className="mt-2 text-lg font-bold text-slate-900 leading-snug">
                            {reg.eventTitle}
                          </h3>

                          <div className="mt-3 space-y-1 text-xs text-slate-600">
                            <div>
                              Khách tham dự:{' '}
                              <strong className="text-slate-900">{reg.guestName}</strong> (
                              {reg.guestPhone})
                            </div>
                            {linkedEvent && (
                              <div className="tabular-nums">
                                Thời gian: {formatDateTimeVN(linkedEvent.startTime)}
                              </div>
                            )}
                            {linkedEvent && (
                              <div className="truncate">Địa điểm: {linkedEvent.location}</div>
                            )}
                            {reg.checkedInAt && (
                              <div className="text-emerald-700 font-semibold tabular-nums">
                                Đã Check-in lúc: {formatDateTimeVN(reg.checkedInAt)}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                          <span className="font-mono text-xs font-semibold text-slate-700">
                            Mã vé: {reg.ticketCode}
                          </span>
                          <div className="flex items-center gap-2">
                            {canRate && (
                              <button
                                type="button"
                                onClick={() => {
                                  setFeedbackReg(reg);
                                  setRatingValue(5);
                                  setRatingComment('');
                                }}
                                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg cursor-pointer"
                              >
                                <Star className="w-3.5 h-3.5" />
                                <span>Đánh giá</span>
                              </button>
                            )}
                            {canCancel && (
                              <button
                                type="button"
                                onClick={() => handleCancelTicket(reg)}
                                className="px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg cursor-pointer"
                              >
                                Hủy vé
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="sm:w-44 bg-slate-50 border-t sm:border-t-0 sm:border-l border-dashed border-slate-300 p-5 flex flex-col items-center justify-center text-center shrink-0">
                        <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                          <QRCodeSVG
                            value={qrPayload}
                            size={104}
                            level="M"
                            fgColor={reg.status === 'cancelled' ? '#94A3B8' : '#0F172A'}
                          />
                        </div>
                        <span className="mt-2.5 font-mono text-[11px] font-bold text-slate-800 tracking-wide">
                          {reg.ticketCode}
                        </span>
                        <span className="mt-0.5 text-[11px] text-slate-500">
                          {reg.status === 'cancelled' ? 'Vé đã vô hiệu' : 'Quét QR Check-in'}
                        </span>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        )}
      </main>

      {/* Enterprise 4-Column Corporate Footer */}
      <footer className="bg-white border-t border-slate-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            <div>
              <div className="inline-flex items-center gap-2 text-base font-bold text-slate-900">
                <span className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
                  <CalendarDays className="w-4 h-4" />
                </span>
                <span>EventFlow Enterprise</span>
              </div>
              <p className="mt-3 text-xs text-slate-500 leading-relaxed">
                Giải pháp quản trị sự kiện doanh nghiệp, phát hành vé điện tử QR Code và phân tích
                dữ liệu tham dự theo thời gian thực trên nền tảng Cloud Firestore.
              </p>
            </div>

            <div>
              <h3 className="text-xs font-bold text-slate-900 tracking-wide">
                Giải pháp &amp; Tính năng
              </h3>
              <ul className="mt-3 space-y-2 text-xs text-slate-600">
                <li>
                  <button
                    type="button"
                    onClick={() => setActiveTab('discover')}
                    className="hover:text-indigo-600 cursor-pointer"
                  >
                    Cổng khám phá sự kiện
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => setActiveTab('tickets')}
                    className="hover:text-indigo-600 cursor-pointer"
                  >
                    Vé điện tử &amp; QR Check-in
                  </button>
                </li>
                <li>Quản trị chỗ ngồi Transaction</li>
                <li>Xuất báo cáo Excel / CSV UTF-8</li>
              </ul>
            </div>

            <div>
              <h3 className="text-xs font-bold text-slate-900 tracking-wide">
                Hỗ trợ &amp; Chính sách
              </h3>
              <ul className="mt-3 space-y-2 text-xs text-slate-600">
                <li>Hướng dẫn Check-in tại sự kiện</li>
                <li>Chính sách hoàn &amp; hủy vé</li>
                <li>Bảo mật dữ liệu doanh nghiệp</li>
                <li>Điều khoản sử dụng nền tảng</li>
              </ul>
            </div>

            <div>
              <h3 className="text-xs font-bold text-slate-900 tracking-wide">
                Thông tin liên hệ
              </h3>
              <ul className="mt-3 space-y-2 text-xs text-slate-600">
                <li className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  <span>enterprise@eventflow.vn</span>
                </li>
                <li className="flex items-center gap-2 tabular-nums">
                  <Phone className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  <span>(028) 3820 8866</span>
                </li>
                <li className="flex items-start gap-2">
                  <MapPin className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
                  <span>Tầng 12, Saigon Innovation Tower, Quận 1, TP.HCM</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-10 pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
            <span>© 2026 EventFlow Enterprise Platform. Bảo lưu mọi quyền.</span>
            <span>Đồng bộ thời gian thực với Firebase Cloud Firestore</span>
          </div>
        </div>
      </footer>

      {/* Event Detail Modal */}
      {selectedEvent && (
        <EventDetailModal
          event={selectedEvent}
          currentUser={currentUser}
          existingRegistration={activeRegistrationMap.get(selectedEvent.id)}
          feedbacks={feedbacks}
          isSaved={savedEventIds.includes(selectedEvent.id)}
          onToggleSave={toggleSaveEvent}
          onClose={() => setSelectedEvent(null)}
          onRequireAuth={() => {
            setSelectedEvent(null);
            onOpenAuth();
          }}
          onViewMyTickets={() => setActiveTab('tickets')}
          onNotify={onNotify}
        />
      )}

      {/* Feedback Modal from E-Ticket */}
      {feedbackReg && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900">Đánh giá sự kiện</h2>
              <button
                type="button"
                onClick={() => setFeedbackReg(null)}
                className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-500">{feedbackReg.eventTitle}</p>

            <form onSubmit={handleSubmitTicketFeedback} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">
                  Mức độ hài lòng
                </label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRatingValue(star)}
                      className="p-1 cursor-pointer"
                    >
                      <Star
                        className={`w-6 h-6 ${
                          star <= ratingValue
                            ? 'text-amber-500 fill-amber-400'
                            : 'text-slate-300'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Nhận xét của bạn
                </label>
                <textarea
                  rows={3}
                  required
                  value={ratingComment}
                  onChange={(e) => setRatingComment(e.target.value)}
                  placeholder="Chia sẻ cảm nhận về nội dung, diễn giả và công tác tổ chức..."
                  className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-600"
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setFeedbackReg(null)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  disabled={sendingFeedback}
                  className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg cursor-pointer disabled:opacity-60"
                >
                  {sendingFeedback ? 'Đang gửi...' : 'Gửi đánh giá'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
