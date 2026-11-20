import { useMemo, useState, type FormEvent } from 'react';
import {
  Calendar,
  CheckCircle2,
  LogIn,
  LogOut,
  MapPin,
  Menu,
  Search,
  ShieldCheck,
  Ticket,
  Users,
  X,
} from 'lucide-react';
import { createRegistration, updateRegistrationStatus } from '../services/dataService';
import { EventBanner } from './EventBanner';
import {
  EVENT_STATUS_META,
  formatDateTimeVN,
  formatShortDateVN,
  REGISTRATION_STATUS_META,
} from '../utils/formatters';
import type { AppUser, EventItem, EventStatus, RegistrationItem } from '../types';

interface UserLayoutProps {
  currentUser: AppUser | null;
  events: EventItem[];
  registrations: RegistrationItem[];
  onSwitchToAdmin?: () => void;
  onOpenAuth: () => void;
  onLogout: () => void;
  onNotify: (message: string, type?: 'success' | 'error') => void;
}

export function UserLayout({
  currentUser,
  events,
  registrations,
  onSwitchToAdmin,
  onOpenAuth,
  onLogout,
  onNotify,
}: UserLayoutProps) {
  const [activeTab, setActiveTab] = useState<'discover' | 'tickets'>('discover');
  const [statusFilter, setStatusFilter] = useState<'all' | EventStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);
  const [guestName, setGuestName] = useState(currentUser?.fullName || '');
  const [guestEmail, setGuestEmail] = useState(currentUser?.email || '');
  const [guestPhone, setGuestPhone] = useState(currentUser?.phone || '');
  const [note, setNote] = useState('');
  const [registering, setRegistering] = useState(false);

  const filteredEvents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return events.filter((ev) => {
      if (statusFilter !== 'all' && ev.status !== statusFilter) return false;
      if (!q) return true;
      return (
        ev.title.toLowerCase().includes(q) ||
        ev.location.toLowerCase().includes(q) ||
        ev.description.toLowerCase().includes(q)
      );
    });
  }, [events, statusFilter, searchQuery]);

  const myRegistrations = useMemo(() => {
    if (!currentUser) return [];
    return registrations.filter(
      (r) =>
        r.userId === currentUser.uid ||
        r.guestEmail.toLowerCase() === currentUser.email.toLowerCase()
    );
  }, [registrations, currentUser]);

  function openEventModal(ev: EventItem) {
    setSelectedEvent(ev);
    setGuestName(currentUser?.fullName || '');
    setGuestEmail(currentUser?.email || '');
    setGuestPhone(currentUser?.phone || '');
    setNote('');
  }

  async function handleRegister(e: FormEvent) {
    e.preventDefault();
    if (!selectedEvent) return;
    if (!currentUser) {
      onNotify('Vui lòng đăng nhập trước khi đăng ký tham dự sự kiện.', 'error');
      onOpenAuth();
      return;
    }

    const remaining = selectedEvent.maxSlots - selectedEvent.registeredCount;
    if (remaining <= 0) {
      onNotify('Sự kiện đã đủ số lượng người tham dự.', 'error');
      return;
    }

    setRegistering(true);
    try {
      await createRegistration({
        eventId: selectedEvent.id,
        eventTitle: selectedEvent.title,
        userId: currentUser.uid,
        guestName,
        guestEmail,
        guestPhone,
        note,
      });
      onNotify(`Đăng ký thành công sự kiện "${selectedEvent.title}".`);
      setSelectedEvent(null);
    } catch (err) {
      onNotify(
        err instanceof Error ? err.message : 'Không thể hoàn tất đăng ký.',
        'error'
      );
    } finally {
      setRegistering(false);
    }
  }

  async function handleCancelTicket(reg: RegistrationItem) {
    try {
      await updateRegistrationStatus(reg, 'cancelled');
      onNotify('Đã hủy lượt đăng ký của bạn.');
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'Không thể hủy vé.', 'error');
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Navbar: Strict 3-zone contract */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Wordmark */}
          <button
            type="button"
            onClick={() => setActiveTab('discover')}
            className="text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 cursor-pointer"
          >
            EventFlow
          </button>

          {/* Zone 2: Concise single-line nav links */}
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
              Vé của tôi ({myRegistrations.length})
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

          {/* Zone 3: Single primary action / account */}
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

          {/* Mobile menu toggle */}
          <button
            type="button"
            aria-label="Mở menu điều hướng"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="md:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100 cursor-pointer"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile Drawer */}
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
              Vé của tôi ({myRegistrations.length})
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
        {activeTab === 'discover' ? (
          <div className="space-y-8">
            {/* Clean Hero Header */}
            <section className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div className="max-w-2xl">
                <p className="text-xs font-semibold text-indigo-600 tracking-wide">
                  Cổng thông tin sự kiện
                </p>
                <h1 className="mt-2 text-2xl sm:text-4xl font-bold text-slate-900 tracking-tight text-balance">
                  Khám phá hội thảo, workshop và kết nối cộng đồng chuyên môn
                </h1>
                <p className="mt-3 text-sm sm:text-base text-slate-600 leading-relaxed">
                  Đăng ký chỗ ngồi trực tuyến chỉ trong một bước, theo dõi lịch trình và quản lý vé
                  tham dự cá nhân mọi lúc.
                </p>
              </div>

              {currentUser?.role === 'admin' && onSwitchToAdmin && (
                <button
                  type="button"
                  onClick={onSwitchToAdmin}
                  className="inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shrink-0 cursor-pointer whitespace-nowrap"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Vào Dashboard Quản trị</span>
                </button>
              )}
            </section>

            {/* Filter & Search Bar */}
            <section className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-lg overflow-x-auto">
                {(
                  [
                    { key: 'all', label: 'Tất cả' },
                    { key: 'upcoming', label: 'Sắp diễn ra' },
                    { key: 'ongoing', label: 'Đang diễn ra' },
                    { key: 'completed', label: 'Đã kết thúc' },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setStatusFilter(tab.key)}
                    className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      statusFilter === tab.key
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="relative w-full md:w-80">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm theo tên sự kiện, địa điểm..."
                  className="w-full pl-10 pr-4 py-2 text-sm bg-white border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                />
              </div>
            </section>

            {/* Events Grid */}
            {filteredEvents.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
                <Calendar className="w-10 h-10 text-slate-300 mx-auto" />
                <h2 className="mt-4 text-base font-semibold text-slate-900">
                  Chưa có sự kiện nào phù hợp
                </h2>
                <p className="mt-1.5 text-sm text-slate-500 max-w-md mx-auto">
                  {events.length === 0
                    ? 'Hệ thống hiện chưa có dữ liệu sự kiện. Hãy đăng nhập với tài khoản Demo Admin và bấm "Tạo dữ liệu mẫu (Seed Data)" để trải nghiệm ngay.'
                    : 'Hãy thử đổi bộ lọc trạng thái hoặc từ khóa tìm kiếm khác.'}
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
                  return (
                    <article
                      key={ev.id}
                      className="bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col justify-between hover:border-indigo-300 transition-colors"
                    >
                      <div>
                        <div className="aspect-video w-full overflow-hidden bg-slate-100">
                          <EventBanner
                            src={ev.bannerUrl}
                            alt={ev.title}
                            className="w-full h-full"
                          />
                        </div>

                        <div className="p-5">
                          <div className="flex items-center gap-2 text-xs text-slate-500 tabular-nums">
                            <span className={`font-semibold ${statusMeta.textClass}`}>
                              {statusMeta.label}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span>{formatShortDateVN(ev.startTime)}</span>
                          </div>

                          <h3 className="mt-2 text-lg font-bold text-slate-900 leading-snug line-clamp-2">
                            {ev.title}
                          </h3>

                          <p className="mt-2 text-sm text-slate-600 line-clamp-2 leading-relaxed">
                            {ev.description}
                          </p>

                          <div className="mt-4 space-y-1.5 text-xs text-slate-500">
                            <div className="flex items-center gap-2">
                              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span className="truncate">{ev.location}</span>
                            </div>
                            <div className="flex items-center gap-2 tabular-nums">
                              <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span>
                                Đã đăng ký {ev.registeredCount}/{ev.maxSlots} chỗ (còn {remaining})
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="px-5 pb-5 pt-2">
                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mb-4">
                          <div
                            className="h-full bg-indigo-600 rounded-full"
                            style={{ width: `${fillPercent}%` }}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => openEventModal(ev)}
                          className="w-full py-2.5 px-4 text-sm font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
                        >
                          Xem chi tiết &amp; Đăng ký
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          /* My Tickets View */
          <section className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Vé tham dự của tôi</h1>
              <p className="mt-1 text-sm text-slate-500">
                Danh sách các sự kiện bạn đã đăng ký trên hệ thống.
              </p>
            </div>

            {!currentUser ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center">
                <Ticket className="w-10 h-10 text-slate-300 mx-auto" />
                <p className="mt-3 text-sm text-slate-600">
                  Hãy đăng nhập để xem danh sách vé sự kiện của bạn.
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
                  Bạn chưa đăng ký sự kiện nào
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Quay lại mục Khám phá sự kiện để chọn chương trình phù hợp.
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
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                        <th className="py-3.5 px-4">Sự kiện</th>
                        <th className="py-3.5 px-4">Người tham dự</th>
                        <th className="py-3.5 px-4">Thời gian đăng ký</th>
                        <th className="py-3.5 px-4">Trạng thái</th>
                        <th className="py-3.5 px-4 text-right">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      {myRegistrations.map((reg) => {
                        const statusMeta = REGISTRATION_STATUS_META[reg.status];
                        return (
                          <tr key={reg.id} className="hover:bg-slate-50/80">
                            <td className="py-3.5 px-4 font-semibold text-slate-900">
                              {reg.eventTitle}
                            </td>
                            <td className="py-3.5 px-4 text-slate-600">
                              {reg.guestName} · {reg.guestPhone}
                            </td>
                            <td className="py-3.5 px-4 text-slate-500 tabular-nums">
                              {formatDateTimeVN(reg.registeredAt)}
                            </td>
                            <td className="py-3.5 px-4">
                              <span className={`font-semibold ${statusMeta.textClass}`}>
                                {statusMeta.label}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              {reg.status !== 'cancelled' && reg.status !== 'attended' ? (
                                <button
                                  type="button"
                                  onClick={() => handleCancelTicket(reg)}
                                  className="text-xs font-semibold text-rose-600 hover:text-rose-700 cursor-pointer"
                                >
                                  Hủy đăng ký
                                </button>
                              ) : (
                                <span className="text-xs text-slate-400">—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>
        )}
      </main>

      {/* Event Detail & Registration Modal */}
      {selectedEvent && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="event-modal-title"
        >
          <div className="bg-white border border-slate-200 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="relative aspect-video w-full bg-slate-100">
              <EventBanner
                src={selectedEvent.bannerUrl}
                alt={selectedEvent.title}
                className="w-full h-full"
              />
              <button
                type="button"
                aria-label="Đóng hộp thoại"
                onClick={() => setSelectedEvent(null)}
                className="absolute top-3 right-3 p-2 bg-white/90 hover:bg-white text-slate-700 rounded-lg shadow-xs cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 sm:p-8 space-y-6">
              <div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 tabular-nums">
                  <span className={`font-semibold ${EVENT_STATUS_META[selectedEvent.status].textClass}`}>
                    {EVENT_STATUS_META[selectedEvent.status].label}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>
                    {formatDateTimeVN(selectedEvent.startTime)} –{' '}
                    {formatDateTimeVN(selectedEvent.endTime)}
                  </span>
                </div>
                <h2 id="event-modal-title" className="mt-2 text-xl sm:text-2xl font-bold text-slate-900">
                  {selectedEvent.title}
                </h2>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                  {selectedEvent.description}
                </p>
                <div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-600">
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-indigo-600" />
                    {selectedEvent.location}
                  </span>
                  <span className="inline-flex items-center gap-1.5 tabular-nums">
                    <Users className="w-3.5 h-3.5 text-indigo-600" />
                    {selectedEvent.registeredCount}/{selectedEvent.maxSlots} chỗ đã đăng ký
                  </span>
                </div>
              </div>

              {selectedEvent.status === 'cancelled' || selectedEvent.status === 'completed' ? (
                <div className="rounded-xl bg-slate-100 p-4 text-sm text-slate-600">
                  Sự kiện này hiện không tiếp nhận thêm lượt đăng ký mới.
                </div>
              ) : (
                <form onSubmit={handleRegister} className="pt-5 border-t border-slate-200 space-y-4">
                  <h3 className="text-sm font-bold text-slate-900">Đăng ký tham dự</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Họ và tên
                      </label>
                      <input
                        type="text"
                        required
                        value={guestName}
                        onChange={(e) => setGuestName(e.target.value)}
                        className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-600"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Số điện thoại
                      </label>
                      <input
                        type="tel"
                        required
                        value={guestPhone}
                        onChange={(e) => setGuestPhone(e.target.value)}
                        className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-600"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Email nhận vé
                    </label>
                    <input
                      type="email"
                      required
                      value={guestEmail}
                      onChange={(e) => setGuestEmail(e.target.value)}
                      className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-600"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Ghi chú (không bắt buộc)
                    </label>
                    <input
                      type="text"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="Yêu cầu đặc biệt hoặc câu hỏi cho diễn giả..."
                      className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-600"
                    />
                  </div>
                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setSelectedEvent(null)}
                      className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
                    >
                      Đóng
                    </button>
                    <button
                      type="submit"
                      disabled={registering}
                      className="inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg cursor-pointer disabled:opacity-60"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{registering ? 'Đang gửi...' : 'Xác nhận đăng ký'}</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
