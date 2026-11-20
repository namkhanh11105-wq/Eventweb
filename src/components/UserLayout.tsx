import { useMemo, useState, type FormEvent } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  Calendar,
  CheckCircle2,
  LogIn,
  LogOut,
  MapPin,
  Menu,
  Search,
  ShieldCheck,
  Star,
  Ticket,
  Users,
  X,
} from 'lucide-react';
import { submitFeedback, updateRegistrationStatus } from '../services/dataService';
import { EventBanner } from './EventBanner';
import { EventDetailModal } from './EventDetailModal';
import {
  EVENT_CATEGORIES,
  EVENT_STATUS_META,
  formatCurrencyVN,
  formatDateTimeVN,
  formatShortDateVN,
  REGISTRATION_STATUS_META,
} from '../utils/formatters';
import type {
  AppUser,
  EventCategory,
  EventItem,
  EventStatus,
  FeedbackItem,
  RegistrationItem,
} from '../types';

interface UserLayoutProps {
  currentUser: AppUser | null;
  events: EventItem[];
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
  const [categoryFilter, setCategoryFilter] = useState<'all' | EventCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

  async function handleCancelTicket(reg: RegistrationItem) {
    try {
      await updateRegistrationStatus(reg, 'cancelled');
      onNotify(`Đã hủy vé ${reg.ticketCode} và hoàn lại chỗ trống.`);
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
      onNotify('Đã gửi đánh giá của bạn cho sự kiện.');
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
      {/* Top Navbar: Strict 3-zone contract */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
          <button
            type="button"
            onClick={() => setActiveTab('discover')}
            className="text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 cursor-pointer"
          >
            EventFlow
          </button>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
            <button
              type="button"
              onClick={() => setActiveTab('discover')}
              className={`whitespace-nowrap shrink-0 pb-0.5 transition-colors cursor-pointer ${
                activeTab === 'discover'
                  ? 'text-indigo-600 border-b-2 border-indigo-600'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Khám phá sự kiện
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('tickets')}
              className={`whitespace-nowrap shrink-0 pb-0.5 transition-colors cursor-pointer ${
                activeTab === 'tickets'
                  ? 'text-indigo-600 border-b-2 border-indigo-600'
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
                Trang quản trị
              </button>
            )}
          </nav>

          <div className="hidden md:flex items-center gap-3 shrink-0">
            {currentUser ? (
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-slate-700 truncate max-w-[160px]">
                  {currentUser.fullName}
                </span>
                <button
                  type="button"
                  onClick={onLogout}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
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
          <div className="md:hidden border-t border-slate-200 bg-white px-4 py-4 space-y-2">
            <button
              type="button"
              onClick={() => {
                setActiveTab('discover');
                setMobileMenuOpen(false);
              }}
              className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              Khám phá sự kiện
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('tickets');
                setMobileMenuOpen(false);
              }}
              className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100"
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
                className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-semibold text-indigo-700 bg-indigo-50"
              >
                Mở Trang quản trị (Admin)
              </button>
            )}
            <div className="pt-2 border-t border-slate-100">
              {currentUser ? (
                <button
                  type="button"
                  onClick={onLogout}
                  className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-rose-700 hover:bg-rose-50"
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
            <span className="font-semibold">Không thể tải dữ liệu từ Firestore: </span>
            <span>
              {currentUser
                ? 'Vui lòng kiểm tra Firestore Security Rules trên Firebase Console.'
                : 'Vui lòng đăng nhập để xem và đăng ký sự kiện.'}
            </span>
          </div>
        )}

        {activeTab === 'discover' ? (
          <div className="space-y-8">
            {/* SaaS / Luma-style Hero Banner with Integrated Search */}
            <section className="relative overflow-hidden rounded-2xl bg-indigo-950 text-white p-6 sm:p-10 lg:p-12">
              <div className="max-w-3xl">
                <p className="text-xs font-semibold text-indigo-300 tracking-wide">
                  Nền tảng đặt vé &amp; điều phối sự kiện trực tuyến
                </p>
                <h1 className="mt-2.5 text-2xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-balance leading-tight">
                  Tìm kiếm hội thảo, workshop và trải nghiệm cộng đồng đáng nhớ
                </h1>
                <p className="mt-3 text-sm sm:text-base text-indigo-200/90 leading-relaxed max-w-2xl">
                  Giữ chỗ tức thì theo thời gian thực, nhận vé điện tử kèm mã QR Check-in và theo
                  dõi lịch trình chi tiết ngay trên một màn hình.
                </p>

                {/* Hero Integrated Search Bar */}
                <div className="mt-6 flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="search"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Tìm tên sự kiện, địa điểm, ban tổ chức..."
                      className="w-full pl-10 pr-4 py-3 text-sm bg-white text-slate-900 placeholder:text-slate-400 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                  </div>
                  <select
                    aria-label="Lọc theo trạng thái sự kiện"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as 'all' | EventStatus)}
                    className="px-4 py-3 text-sm font-medium bg-indigo-900/80 border border-indigo-700 text-white rounded-xl focus:outline-none cursor-pointer"
                  >
                    <option value="all">Tất cả trạng thái</option>
                    <option value="ongoing">Đang mở đăng ký</option>
                    <option value="upcoming">Sắp diễn ra</option>
                    <option value="completed">Đã kết thúc</option>
                  </select>
                </div>
              </div>

              {currentUser?.role === 'admin' && onSwitchToAdmin && (
                <button
                  type="button"
                  onClick={onSwitchToAdmin}
                  className="mt-6 lg:mt-0 lg:absolute lg:top-8 lg:right-8 inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-indigo-950 bg-white hover:bg-indigo-50 rounded-xl transition-colors cursor-pointer whitespace-nowrap"
                >
                  <ShieldCheck className="w-4 h-4 text-indigo-600" />
                  <span>Mở Admin Dashboard</span>
                </button>
              )}
            </section>

            {/* Category & Status Segmented Filter Toolbar */}
            <section className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
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
                Tìm thấy {filteredEvents.length} sự kiện
              </div>
            </section>

            {/* Events Grid */}
            {filteredEvents.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
                <Calendar className="w-10 h-10 text-slate-300 mx-auto" />
                <h2 className="mt-4 text-base font-semibold text-slate-900">
                  Chưa có sự kiện phù hợp bộ lọc
                </h2>
                <p className="mt-1.5 text-sm text-slate-500 max-w-md mx-auto">
                  {events.length === 0
                    ? 'Hệ thống chưa có dữ liệu sự kiện. Vui lòng đăng nhập Demo Admin và bấm "Tạo dữ liệu mẫu (Seed Data)".'
                    : 'Hãy thử đặt lại danh mục, trạng thái hoặc từ khóa tìm kiếm khác.'}
                </p>
                {currentUser?.role === 'admin' && onSwitchToAdmin && events.length === 0 && (
                  <button
                    type="button"
                    onClick={onSwitchToAdmin}
                    className="mt-5 inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg cursor-pointer"
                  >
                    Đi tới Trang Admin để Seed Data
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredEvents.map((ev) => {
                  const statusMeta = EVENT_STATUS_META[ev.status];
                  const remaining = Math.max(0, ev.maxSlots - ev.registeredCount);
                  const fillPercent = Math.min(
                    100,
                    Math.round((ev.registeredCount / Math.max(1, ev.maxSlots)) * 100)
                  );
                  const myReg = activeRegistrationMap.get(ev.id);

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
                          <div className="absolute top-3 left-3">
                            <span className="inline-block px-2.5 py-1 text-[11px] font-semibold bg-white/95 text-slate-900 rounded-md shadow-xs">
                              {ev.category}
                            </span>
                          </div>
                          {myReg && (
                            <div className="absolute top-3 right-3">
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold bg-emerald-600 text-white rounded-md shadow-xs">
                                <CheckCircle2 className="w-3 h-3" />
                                Đã đăng ký
                              </span>
                            </div>
                          )}
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
                                Còn {remaining}/{ev.maxSlots} chỗ ({fillPercent}% đã đặt)
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
                        <div className="flex items-center justify-between text-xs font-semibold text-indigo-700">
                          <span>{myReg ? 'Xem chi tiết & Vé của bạn' : 'Xem lịch trình & Đặt vé'}</span>
                          <span>→</span>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
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
                  Khám phá các sự kiện đang mở đăng ký để nhận vé điện tử miễn phí hoặc ưu đãi.
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
                      {/* Left E-Ticket Info */}
                      <div className="flex-1 p-5 sm:p-6 flex flex-col justify-between gap-4">
                        <div>
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span
                              className={`text-xs font-semibold ${statusMeta.textClass}`}
                            >
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

                      {/* Right Perforated QR Stub */}
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

      {/* Event Detail Modal */}
      {selectedEvent && (
        <EventDetailModal
          event={selectedEvent}
          currentUser={currentUser}
          existingRegistration={activeRegistrationMap.get(selectedEvent.id)}
          feedbacks={feedbacks}
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
