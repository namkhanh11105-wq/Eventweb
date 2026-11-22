import { useMemo, useState, type FormEvent } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  ArrowRight,
  BadgeCheck,
  Bookmark,
  Building2,
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
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import { DEFAULT_EVENT_BANNERS } from '../data/seedData';
import { submitFeedback, updateRegistrationStatus } from '../services/dataService';
import { ContactPage } from './ContactPage';
import { EventBanner } from './EventBanner';
import { EventDetailPage } from './EventDetailPage';
import { AnimatedNumber, AnimatedProgressBar, RevealBlock } from './MotionPrimitives';
import { PublicFooter } from './PublicFooter';
import { ServicesPage } from './ServicesPage';
import {
  ENTERPRISE_PARTNERS,
  EVENT_CATEGORIES,
  EVENT_STATUS_META,
  formatDateTimeVN,
  formatShortDateVN,
  REGISTRATION_STATUS_META,
} from '../utils/formatters';
import type {
  AppUser,
  EventItem,
  EventStatus,
  FeedbackItem,
  PublicContactInfo,
  PublicPage,
  RegistrationItem,
} from '../types';

interface UserLayoutProps {
  currentUser: AppUser | null;
  activePage: PublicPage;
  selectedEventId?: string | null;
  events: EventItem[];
  eventsLoading: boolean;
  registrations: RegistrationItem[];
  feedbacks: FeedbackItem[];
  publicContact: PublicContactInfo;
  permissionWarning?: string | null;
  onNavigatePage: (page: 'discover' | 'services' | 'contact' | 'tickets') => void;
  onOpenEventDetail: (eventId: string) => void;
  onSwitchToAdmin?: () => void;
  onSwitchToOrganizer?: (tab?: 'requests' | 'create' | 'public_events') => void;
  onOpenAuth: (mode?: 'login' | 'register', role?: 'user' | 'organizer') => void;
  onLogout: () => void;
  onNotify: (message: string, type?: 'success' | 'error') => void;
}

export function UserLayout({
  currentUser,
  activePage,
  selectedEventId,
  events,
  eventsLoading,
  registrations,
  feedbacks,
  publicContact,
  permissionWarning,
  onNavigatePage,
  onOpenEventDetail,
  onSwitchToAdmin,
  onSwitchToOrganizer,
  onOpenAuth,
  onLogout,
  onNotify,
}: UserLayoutProps) {
  const [statusFilter, setStatusFilter] = useState<'all' | EventStatus>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [savedEventIds, setSavedEventIds] = useState<string[]>([]);
  const [feedbackReg, setFeedbackReg] = useState<RegistrationItem | null>(null);
  const [ratingValue, setRatingValue] = useState(5);
  const [ratingComment, setRatingComment] = useState('');
  const [sendingFeedback, setSendingFeedback] = useState(false);

  const publicEvents = useMemo(() => {
    return events.filter((ev) => ev.isPublic !== false);
  }, [events]);

  const activeDetailEvent = useMemo(() => {
    if (activePage !== 'event_detail' || !selectedEventId) return null;
    return (
      events.find((e) => e.id === selectedEventId) || null
    );
  }, [activePage, selectedEventId, events]);

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
    const totalEvents = publicEvents.length;
    const totalRegistrations = publicEvents.reduce(
      (acc, ev) => acc + (ev.registeredCount || 0),
      0
    );
    const activeEvents = publicEvents.filter(
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

    return {
      totalEvents,
      totalRegistrations,
      avgFillRate,
    };
  }, [publicEvents]);

  const featuredEvent = useMemo(() => {
    if (
      statusFilter !== 'all' ||
      categoryFilter !== 'all' ||
      searchQuery.trim() !== ''
    ) {
      return null;
    }
    return (
      publicEvents.find((e) => e.featured && e.status !== 'cancelled') ||
      publicEvents.find((e) => e.status === 'ongoing') ||
      null
    );
  }, [publicEvents, statusFilter, categoryFilter, searchQuery]);

  const filteredEvents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return publicEvents.filter((ev) => {
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
  }, [publicEvents, statusFilter, categoryFilter, searchQuery]);

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

  function handleBookOrganization() {
    if (!currentUser) {
      onOpenAuth('register', 'organizer');
      return;
    }
    if (currentUser.role === 'organizer' && onSwitchToOrganizer) {
      onSwitchToOrganizer('create');
      return;
    }
    if (currentUser.role === 'admin' && onSwitchToAdmin) {
      onSwitchToAdmin();
      return;
    }
    onNotify(
      'Tài khoản hiện tại là Người tham gia. Hãy gửi yêu cầu tư vấn tổ chức tại trang Liên hệ hoặc đăng ký tài khoản Khách hàng Tổ chức.',
      'success'
    );
    onNavigatePage('contact');
  }

  function navigateAndCloseMobile(page: 'discover' | 'services' | 'contact' | 'tickets') {
    setMobileMenuOpen(false);
    onNavigatePage(page);
  }

  async function handleCancelTicket(reg: RegistrationItem) {
    try {
      await updateRegistrationStatus(reg, 'cancelled');
      onNotify(`Đã hủy đăng ký ${reg.ticketCode} và hoàn trả chỗ trống lên Firestore.`);
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'Không thể hủy đăng ký.', 'error');
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

  const navButtonClass = (isActive: boolean) =>
    `px-3 py-1.5 rounded-lg transition-all duration-150 whitespace-nowrap shrink-0 cursor-pointer ${
      isActive
        ? 'bg-indigo-50 text-indigo-700 font-semibold'
        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
    }`;

  const pageTransitionKey =
    activePage === 'event_detail' ? `event-${selectedEventId || ''}` : activePage;

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col">
      {/* Multi-Page Frosted Top Navigation Bar */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-6">
          {/* Zone 1: Brand */}
          <button
            type="button"
            onClick={() => onNavigatePage('discover')}
            className="inline-flex items-center gap-2.5 text-[15px] font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 cursor-pointer transition-opacity hover:opacity-85"
          >
            <span className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
              <CalendarDays className="w-4 h-4" />
            </span>
            <span>EventFlow</span>
          </button>

          {/* Zone 2: Multi-page Navigation Links */}
          <nav className="hidden md:flex items-center gap-1.5 text-[13px] font-medium">
            <button
              type="button"
              onClick={() => onNavigatePage('discover')}
              className={navButtonClass(
                activePage === 'discover' || activePage === 'event_detail'
              )}
            >
              Khám phá
            </button>
            <button
              type="button"
              onClick={() => onNavigatePage('services')}
              className={navButtonClass(activePage === 'services')}
            >
              Dịch vụ
            </button>
            <button
              type="button"
              onClick={() => onNavigatePage('contact')}
              className={navButtonClass(activePage === 'contact')}
            >
              Liên hệ
            </button>
            {currentUser && (
              <button
                type="button"
                onClick={() => onNavigatePage('tickets')}
                className={navButtonClass(activePage === 'tickets')}
              >
                Đã đăng ký ({myRegistrations.length})
              </button>
            )}
            {onSwitchToOrganizer && (
              <button
                type="button"
                onClick={() => onSwitchToOrganizer('requests')}
                className="px-3 py-1.5 rounded-lg text-sky-700 hover:bg-sky-50 font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Cổng Tổ chức
              </button>
            )}
            {onSwitchToAdmin && (
              <button
                type="button"
                onClick={onSwitchToAdmin}
                className="px-3 py-1.5 rounded-lg text-indigo-700 hover:bg-indigo-50 font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Cổng Quản trị
              </button>
            )}
          </nav>

          {/* Zone 3: Account / Role & Auth */}
          <div className="hidden md:flex items-center gap-3 shrink-0">
            {currentUser ? (
              <div className="flex items-center gap-3 pl-4 border-l border-slate-200/80">
                <div className="w-7 h-7 rounded-lg bg-slate-100 border border-slate-200/80 text-slate-700 text-xs font-bold flex items-center justify-center shrink-0">
                  {currentUser.fullName.trim().charAt(0).toUpperCase() || 'U'}
                </div>
                <div className="leading-tight min-w-0">
                  <div className="text-xs font-semibold text-slate-900 truncate max-w-[140px]">
                    {currentUser.fullName}
                  </div>
                  <div className="text-[11px] text-slate-500 whitespace-nowrap">
                    {currentUser.role === 'admin'
                      ? 'Quản trị viên'
                      : currentUser.role === 'organizer'
                      ? 'Khách hàng Tổ chức'
                      : 'Người tham gia'}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onLogout}
                  className="ml-1 inline-flex items-center gap-1.5 h-8 px-2.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200/80 rounded-lg transition-all duration-150 active:scale-[0.98] whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Đăng xuất</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 pl-4 border-l border-slate-200/80">
                <button
                  type="button"
                  onClick={() => onOpenAuth('login', 'user')}
                  className="h-8 px-3 text-xs font-semibold text-slate-700 hover:text-slate-900 rounded-lg hover:bg-slate-100/70 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Đăng nhập
                </button>
                <button
                  type="button"
                  onClick={() => onOpenAuth('register', 'user')}
                  className="inline-flex items-center gap-1.5 h-8 px-3.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-all duration-150 active:scale-[0.98] whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Đăng ký</span>
                </button>
              </div>
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
          <div className="md:hidden border-t border-slate-200 bg-white px-4 py-4 space-y-1.5 animate-ef-fade-in">
            <button
              type="button"
              onClick={() => navigateAndCloseMobile('discover')}
              className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium ${
                activePage === 'discover' || activePage === 'event_detail'
                  ? 'bg-indigo-50 text-indigo-700 font-semibold'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              Khám phá sự kiện
            </button>
            <button
              type="button"
              onClick={() => navigateAndCloseMobile('services')}
              className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium ${
                activePage === 'services'
                  ? 'bg-indigo-50 text-indigo-700 font-semibold'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              Dịch vụ tổ chức sự kiện
            </button>
            <button
              type="button"
              onClick={() => navigateAndCloseMobile('contact')}
              className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium ${
                activePage === 'contact'
                  ? 'bg-indigo-50 text-indigo-700 font-semibold'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              Liên hệ Ban quản trị
            </button>
            {currentUser && (
              <button
                type="button"
                onClick={() => navigateAndCloseMobile('tickets')}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium ${
                  activePage === 'tickets'
                    ? 'bg-indigo-50 text-indigo-700 font-semibold'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                Sự kiện đã đăng ký ({myRegistrations.length})
              </button>
            )}
            {onSwitchToOrganizer && (
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onSwitchToOrganizer('requests');
                }}
                className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-semibold text-sky-700 bg-sky-50"
              >
                Cổng Khách hàng Tổ chức
              </button>
            )}
            {onSwitchToAdmin && (
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onSwitchToAdmin();
                }}
                className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-semibold text-indigo-700 bg-indigo-50"
              >
                Cổng Quản trị viên (Admin)
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
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenAuth('login', 'user');
                  }}
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
        {permissionWarning && currentUser && (
          <div
            role="alert"
            className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
          >
            <span className="font-semibold">Lưu ý phân quyền Cloud Firestore: </span>
            <span>
              Không thể đọc một số dữ liệu ({permissionWarning}). Vui lòng kiểm tra Firestore Rules
              của dự án quan-ly-su-kien-86a89.
            </span>
          </div>
        )}

        {/* Smooth Multi-Page View Container */}
        <div key={pageTransitionKey} className="animate-ef-fade-up">
          {activePage === 'services' && (
            <ServicesPage
              publicContact={publicContact}
              onBookOrganization={handleBookOrganization}
              onGoContact={() => onNavigatePage('contact')}
            />
          )}

          {activePage === 'contact' && (
            <ContactPage
              currentUser={currentUser}
              publicContact={publicContact}
              onNotify={onNotify}
            />
          )}

          {activePage === 'event_detail' && (
            eventsLoading && !activeDetailEvent ? (
              <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden">
                <div className="aspect-[16/6] ef-skeleton-shimmer" />
                <div className="p-8 space-y-4">
                  <div className="h-7 w-2/3 ef-skeleton-shimmer rounded-lg" />
                  <div className="h-4 w-1/2 ef-skeleton-shimmer rounded" />
                  <div className="h-28 w-full ef-skeleton-shimmer rounded-xl" />
                </div>
              </div>
            ) : activeDetailEvent ? (
              <EventDetailPage
                event={activeDetailEvent}
                currentUser={currentUser}
                existingRegistration={activeRegistrationMap.get(activeDetailEvent.id)}
                feedbacks={feedbacks}
                isSaved={savedEventIds.includes(activeDetailEvent.id)}
                onToggleSave={toggleSaveEvent}
                onBack={() => onNavigatePage('discover')}
                onRequireAuth={() => onOpenAuth('login', 'user')}
                onViewMyTickets={() => onNavigatePage('tickets')}
                onNotify={onNotify}
              />
            ) : (
              <div className="bg-white border border-slate-200/80 rounded-2xl p-12 text-center">
                <Calendar className="w-10 h-10 text-slate-300 mx-auto" />
                <h1 className="mt-4 text-lg font-bold text-slate-900">
                  Không tìm thấy sự kiện
                </h1>
                <p className="mt-1.5 text-sm text-slate-500">
                  Sự kiện bạn chọn có thể đã bị xóa hoặc không còn hiển thị công khai.
                </p>
                <button
                  type="button"
                  onClick={() => onNavigatePage('discover')}
                  className="mt-5 px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl cursor-pointer transition-colors"
                >
                  Quay lại trang Khám phá
                </button>
              </div>
            )
          )}

          {activePage === 'discover' && (
            <div className="space-y-10">
              {/* Compact Modern 2-Column Hero + Unified Search & Filter */}
              <section className="bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-8 lg:p-10 space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
                  {/* Left: Eyebrow, Crisp Title, Short Description & Primary Actions */}
                  <div className="lg:col-span-7 flex flex-col justify-between py-1">
                    <div>
                      <div className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-700 bg-indigo-50/70 border border-indigo-200/60 px-2.5 py-1 rounded-md">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Khám phá Sự kiện Công khai</span>
                      </div>

                      <h1 className="mt-4 text-2xl sm:text-3xl lg:text-[2.25rem] font-bold text-slate-900 tracking-tight text-balance leading-[1.2] max-w-2xl">
                        Tìm kiếm sự kiện, đăng ký giữ chỗ và nhận mã QR{' '}
                        <span className="text-indigo-600">chỉ trong vài giây</span>
                      </h1>

                      <p className="mt-3.5 text-sm sm:text-[15px] text-slate-600 leading-relaxed max-w-xl">
                        Tổng hợp các hội nghị công nghệ, workshop thực hành, đào tạo và gala doanh
                        nghiệp đang mở đăng ký, đồng bộ trực tiếp trên Cloud Firestore.
                      </p>
                    </div>

                    <div className="mt-6 flex flex-wrap items-center gap-2.5">
                      {!currentUser ? (
                        <>
                          <button
                            type="button"
                            onClick={() => onOpenAuth('register', 'user')}
                            className="inline-flex items-center gap-2 h-10 px-4 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all duration-150 active:scale-[0.98] cursor-pointer whitespace-nowrap"
                          >
                            <UserCheck className="w-4 h-4" />
                            <span>Đăng ký tham gia</span>
                            <ArrowRight className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onNavigatePage('services')}
                            className="inline-flex items-center gap-2 h-10 px-4 text-sm font-semibold text-slate-800 bg-white hover:bg-slate-50 border border-slate-200/90 rounded-xl transition-all duration-150 active:scale-[0.98] cursor-pointer whitespace-nowrap"
                          >
                            <Building2 className="w-4 h-4 text-indigo-600" />
                            <span>Xem dịch vụ tổ chức</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => onNavigatePage('contact')}
                            className="inline-flex items-center gap-1.5 h-10 px-3 text-sm font-medium text-slate-600 hover:text-indigo-600 rounded-xl transition-colors cursor-pointer whitespace-nowrap"
                          >
                            <Phone className="w-4 h-4" />
                            <span>Liên hệ tư vấn</span>
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => onNavigatePage('tickets')}
                            className="inline-flex items-center gap-2 h-10 px-4 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all duration-150 active:scale-[0.98] cursor-pointer whitespace-nowrap"
                          >
                            <Ticket className="w-4 h-4" />
                            <span>Sự kiện đã đăng ký ({myRegistrations.length})</span>
                          </button>
                          {onSwitchToOrganizer && (
                            <button
                              type="button"
                              onClick={() => onSwitchToOrganizer('requests')}
                              className="inline-flex items-center gap-2 h-10 px-4 text-sm font-semibold text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200/80 rounded-xl transition-all duration-150 cursor-pointer whitespace-nowrap"
                            >
                              <Building2 className="w-4 h-4" />
                              <span>Cổng Khách hàng Tổ chức</span>
                            </button>
                          )}
                          {onSwitchToAdmin && (
                            <button
                              type="button"
                              onClick={onSwitchToAdmin}
                              className="inline-flex items-center gap-2 h-10 px-4 text-sm font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200/80 rounded-xl transition-all duration-150 cursor-pointer whitespace-nowrap"
                            >
                              <ShieldCheck className="w-4 h-4" />
                              <span>Cổng Quản trị</span>
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {/* Right: Live Overview Preview + Quick Admin Support */}
                  <div className="lg:col-span-5 rounded-2xl bg-slate-50/70 border border-slate-200/80 overflow-hidden flex flex-col justify-between">
                    <div className="p-4 pb-3.5 space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-16 h-11 rounded-lg overflow-hidden bg-slate-200 shrink-0 border border-slate-200/80">
                          <EventBanner
                            src={featuredEvent?.bannerUrl || DEFAULT_EVENT_BANNERS[0].url}
                            alt={featuredEvent?.title || 'EventFlow Platform Preview'}
                            className="w-full h-full"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-[11px] font-semibold text-indigo-600">
                            Tổng quan vận hành trực tiếp
                          </div>
                          <div className="text-xs font-bold text-slate-900 truncate">
                            {featuredEvent ? featuredEvent.title : publicContact.organizationName}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                        <div className="bg-white border border-slate-200/70 rounded-lg py-2 px-2">
                          <div className="text-[11px] text-slate-500">Công khai</div>
                          <div className="text-sm font-bold text-slate-900 tabular-nums">
                            <AnimatedNumber value={heroMetrics.totalEvents} />
                          </div>
                        </div>
                        <div className="bg-white border border-slate-200/70 rounded-lg py-2 px-2">
                          <div className="text-[11px] text-slate-500">Tham gia</div>
                          <div className="text-sm font-bold text-slate-900 tabular-nums">
                            <AnimatedNumber value={heroMetrics.totalRegistrations} />
                          </div>
                        </div>
                        <div className="bg-white border border-slate-200/70 rounded-lg py-2 px-2">
                          <div className="text-[11px] text-slate-500">Lấp đầy</div>
                          <div className="text-sm font-bold text-indigo-600 tabular-nums">
                            <AnimatedNumber value={heroMetrics.avgFillRate} suffix="%" />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-slate-200/80 bg-white/80 p-4 space-y-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-semibold text-slate-500">
                          Hỗ trợ trực tiếp · {publicContact.adminName}
                        </span>
                        <button
                          type="button"
                          onClick={() => onNavigatePage('contact')}
                          className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 cursor-pointer"
                        >
                          Trang Liên hệ →
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2 text-xs">
                        <a
                          href={`tel:${publicContact.phone.replace(/\s+/g, '')}`}
                          className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-slate-50/80 border border-slate-200/80 hover:border-indigo-300 hover:bg-white transition-colors"
                        >
                          <span className="inline-flex items-center gap-2 text-slate-600 font-medium">
                            <Phone className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                            <span>Điện thoại</span>
                          </span>
                          <span className="font-semibold text-slate-900 tabular-nums">
                            {publicContact.phone}
                          </span>
                        </a>

                        <a
                          href={`mailto:${publicContact.email}`}
                          className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-slate-50/80 border border-slate-200/80 hover:border-indigo-300 hover:bg-white transition-colors"
                        >
                          <span className="inline-flex items-center gap-2 text-slate-600 font-medium">
                            <Mail className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                            <span>Email</span>
                          </span>
                          <span className="font-semibold text-slate-900 truncate">
                            {publicContact.email}
                          </span>
                        </a>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Unified Single-Row Search & Filter Bar */}
                <div className="p-2 bg-slate-50/80 border border-slate-200/80 rounded-xl flex flex-col lg:flex-row items-stretch lg:items-center gap-2">
                  <div className="relative flex-1 min-w-0">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="search"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Tìm kiếm sự kiện theo tên, địa điểm, đơn vị tổ chức..."
                      className="w-full h-10 pl-10 pr-3.5 text-sm bg-white border border-slate-200/80 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-600 transition-colors"
                    />
                  </div>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
                    <select
                      aria-label="Lọc theo danh mục"
                      value={categoryFilter}
                      onChange={(e) => setCategoryFilter(e.target.value)}
                      className="h-10 px-3 text-sm font-medium bg-white border border-slate-200/80 rounded-lg text-slate-700 focus:outline-none focus:border-indigo-600 cursor-pointer transition-colors"
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
                      className="h-10 px-3 text-sm font-medium bg-white border border-slate-200/80 rounded-lg text-slate-700 focus:outline-none focus:border-indigo-600 cursor-pointer transition-colors"
                    >
                      <option value="all">Tất cả trạng thái</option>
                      <option value="ongoing">Mở đăng ký</option>
                      <option value="upcoming">Sắp diễn ra</option>
                      <option value="paused">Tạm đóng</option>
                      <option value="completed">Đã kết thúc</option>
                    </select>
                    {(searchQuery || categoryFilter !== 'all' || statusFilter !== 'all') && (
                      <button
                        type="button"
                        onClick={resetAllFilters}
                        className="h-10 px-3 text-xs font-semibold text-slate-600 hover:text-indigo-700 bg-white border border-slate-200/80 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                      >
                        Xóa lọc
                      </button>
                    )}
                  </div>
                </div>
              </section>

              {/* Featured Event Spotlight */}
              {!eventsLoading && featuredEvent && (
                <RevealBlock>
                  <section className="space-y-3">
                    <h2 className="text-base font-bold text-slate-900">
                      Sự kiện công khai tiêu biểu
                    </h2>
                    <article
                      onClick={() => onOpenEventDetail(featuredEvent.id)}
                      className="group bg-white border border-slate-200/80 rounded-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 items-stretch transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-[0_14px_30px_-14px_rgba(79,70,229,0.16)] cursor-pointer"
                    >
                      <div className="lg:col-span-6 aspect-video lg:aspect-auto bg-slate-100 overflow-hidden">
                        <EventBanner
                          src={featuredEvent.bannerUrl}
                          alt={featuredEvent.title}
                          className="w-full h-full transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.03]"
                        />
                      </div>
                      <div className="lg:col-span-6 p-6 sm:p-8 flex flex-col justify-between gap-5">
                        <div>
                          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                            <span className="font-semibold text-indigo-600">
                              {featuredEvent.category}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span
                              className={`font-semibold ${
                                EVENT_STATUS_META[featuredEvent.status].textClass
                              }`}
                            >
                              {EVENT_STATUS_META[featuredEvent.status].label}
                            </span>
                          </div>

                          <h3 className="mt-2.5 text-xl sm:text-2xl font-bold text-slate-900 leading-snug group-hover:text-indigo-700 transition-colors">
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
                          <div className="text-xs text-slate-500 tabular-nums">
                            Đã giữ chỗ:{' '}
                            <strong className="text-slate-900">
                              {featuredEvent.registeredCount}/{featuredEvent.maxSlots}
                            </strong>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenEventDetail(featuredEvent.id);
                            }}
                            className="h-10 px-4 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all duration-150 active:scale-[0.98] cursor-pointer whitespace-nowrap"
                          >
                            Xem chi tiết &amp; Đăng ký
                          </button>
                        </div>
                      </div>
                    </article>
                  </section>
                </RevealBlock>
              )}

              {/* Public Open Events Grid */}
              <section className="space-y-6">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="inline-flex items-center gap-1 p-1 bg-slate-100/80 border border-slate-200/70 rounded-xl overflow-x-auto max-w-full">
                    <button
                      type="button"
                      onClick={() => setCategoryFilter('all')}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all duration-150 whitespace-nowrap shrink-0 cursor-pointer ${
                        categoryFilter === 'all'
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Tất cả danh mục
                    </button>
                    {EVENT_CATEGORIES.map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setCategoryFilter(cat)}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all duration-150 whitespace-nowrap shrink-0 cursor-pointer ${
                          categoryFilter === cat
                            ? 'bg-white text-slate-900 shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>

                  <div className="text-xs font-medium text-slate-500 tabular-nums">
                    {eventsLoading
                      ? 'Đang đồng bộ Cloud Firestore...'
                      : `Hiển thị ${filteredEvents.length} sự kiện công khai`}
                  </div>
                </div>

                {eventsLoading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3, 4, 5, 6].map((idx) => (
                      <div
                        key={idx}
                        className="bg-white border border-slate-200 rounded-2xl overflow-hidden"
                      >
                        <div className="aspect-video ef-skeleton-shimmer" />
                        <div className="p-5 space-y-3">
                          <div className="flex justify-between">
                            <div className="h-4 w-24 ef-skeleton-shimmer rounded" />
                            <div className="h-4 w-16 ef-skeleton-shimmer rounded" />
                          </div>
                          <div className="h-5 w-4/5 ef-skeleton-shimmer rounded" />
                          <div className="h-4 w-full ef-skeleton-shimmer rounded" />
                          <div className="h-2 w-full ef-skeleton-shimmer rounded-full" />
                          <div className="h-9 w-full ef-skeleton-shimmer rounded-lg" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : filteredEvents.length === 0 ? (
                  <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
                    <Calendar className="w-10 h-10 text-slate-300 mx-auto" />
                    <h2 className="mt-4 text-base font-bold text-slate-900">
                      {publicEvents.length === 0
                        ? 'Chưa có sự kiện công khai nào được hiển thị'
                        : 'Không tìm thấy sự kiện phù hợp'}
                    </h2>
                    <p className="mt-1.5 text-sm text-slate-500 max-w-lg mx-auto">
                      {publicEvents.length === 0
                        ? 'Hãy đăng nhập Demo Admin để tạo dữ liệu mẫu (Seed Data) hoặc liên hệ trực tiếp với Ban quản trị.'
                        : 'Thử thay đổi bộ lọc danh mục, trạng thái hoặc xóa từ khóa tìm kiếm.'}
                    </p>
                    <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
                      {publicEvents.length > 0 && (
                        <button
                          type="button"
                          onClick={resetAllFilters}
                          className="px-4 py-2 text-sm font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg cursor-pointer transition-colors"
                        >
                          Đặt lại bộ lọc
                        </button>
                      )}
                      {!currentUser && (
                        <button
                          type="button"
                          onClick={() => onOpenAuth('login', 'user')}
                          className="px-5 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg cursor-pointer transition-colors"
                        >
                          Đăng nhập / Đăng ký ngay
                        </button>
                      )}
                      {onSwitchToAdmin && publicEvents.length === 0 && (
                        <button
                          type="button"
                          onClick={onSwitchToAdmin}
                          className="px-4 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg cursor-pointer transition-colors"
                        >
                          Đi tới Admin Portal để Seed Data
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
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
                          onClick={() => onOpenEventDetail(ev.id)}
                          className="group bg-white border border-slate-200/80 rounded-2xl overflow-hidden flex flex-col justify-between transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-1 hover:border-indigo-300 hover:shadow-[0_14px_30px_-14px_rgba(79,70,229,0.16)] active:scale-[0.99] cursor-pointer"
                        >
                          <div>
                            <div className="relative aspect-video w-full overflow-hidden bg-slate-100">
                              <EventBanner
                                src={ev.bannerUrl}
                                alt={ev.title}
                                className="w-full h-full transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.03]"
                              />
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
                                  className={`p-1.5 rounded-md shadow-xs cursor-pointer transition-all duration-150 hover:scale-105 ${
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
                                <div className="flex items-center gap-1.5 tabular-nums text-slate-500 truncate">
                                  <span className="font-semibold text-indigo-600 truncate">
                                    {ev.category}
                                  </span>
                                  <span aria-hidden="true">·</span>
                                  <span className={`font-medium ${statusMeta.textClass}`}>
                                    {statusMeta.label}
                                  </span>
                                  <span aria-hidden="true">·</span>
                                  <span>{formatShortDateVN(ev.startTime)}</span>
                                </div>
                                <span className="font-semibold text-slate-700 tabular-nums shrink-0">
                                  Còn {remaining}
                                </span>
                              </div>

                              <h3 className="mt-2.5 text-base font-bold text-slate-900 leading-snug line-clamp-2 group-hover:text-indigo-700 transition-colors">
                                {ev.title}
                              </h3>

                              <div className="mt-3 space-y-1.5 text-xs text-slate-500">
                                <div className="flex items-center gap-2">
                                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                  <span className="truncate">{ev.location}</span>
                                </div>
                                <div className="flex items-center gap-2 tabular-nums">
                                  <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                  <span>
                                    {ev.registeredCount}/{ev.maxSlots} người đã đăng ký
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="px-5 pb-5 pt-1">
                            <div className="mb-3.5">
                              <AnimatedProgressBar
                                percent={fillPercent}
                                barClassName={fillPercent >= 90 ? 'bg-amber-500' : 'bg-indigo-600'}
                              />
                            </div>
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs text-slate-500 truncate inline-flex items-center gap-1">
                                {ev.organizer}
                                {ev.organizerVerified !== false && (
                                  <BadgeCheck className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                                )}
                              </span>
                              <span className="text-xs font-semibold text-indigo-600 whitespace-nowrap shrink-0 inline-flex items-center gap-1 transition-transform duration-150 group-hover:translate-x-0.5">
                                {myReg ? 'Xem chi tiết →' : 'Đăng ký ngay →'}
                              </span>
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
              </section>

              {/* Compact Enterprise Trust Strip + Cross-Page Link */}
              <RevealBlock>
                <section className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="text-xs font-semibold text-slate-900">
                      Doanh nghiệp tổ chức sự kiện chuyên nghiệp trên EventFlow
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                      {ENTERPRISE_PARTNERS.map((p) => (
                        <span key={p.name}>{p.name}</span>
                      ))}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onNavigatePage('services')}
                    className="inline-flex items-center gap-1.5 h-9 px-4 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <span>Khám phá gói dịch vụ tổ chức</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </section>
              </RevealBlock>
            </div>
          )}

          {activePage === 'tickets' && (
            /* Flow 1: Attendee My Registered Events & QR Status */
            <section className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">
                  Sự kiện đã đăng ký &amp; Trạng thái tham gia
                </h1>
                <p className="mt-1 text-sm text-slate-500">
                  Theo dõi trạng thái xác nhận từ Ban quản trị và xuất trình mã QR khi tham dự sự
                  kiện.
                </p>
              </div>

              {!currentUser ? (
                <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center">
                  <Ticket className="w-10 h-10 text-slate-300 mx-auto" />
                  <p className="mt-3 text-sm text-slate-600">
                    Hãy đăng nhập để xem danh sách sự kiện bạn đã đăng ký và mã QR check-in.
                  </p>
                  <button
                    type="button"
                    onClick={() => onOpenAuth('login', 'user')}
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
                    Khám phá các sự kiện công khai đang mở để đăng ký giữ chỗ và nhận mã QR.
                  </p>
                  <button
                    type="button"
                    onClick={() => onNavigatePage('discover')}
                    className="mt-4 px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg cursor-pointer"
                  >
                    Xem sự kiện đang mở
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
                        className="bg-white border border-slate-200 rounded-2xl overflow-hidden flex flex-col sm:flex-row transition-all duration-200 hover:border-indigo-200 hover:shadow-sm"
                      >
                        <div className="flex-1 p-5 sm:p-6 flex flex-col justify-between gap-4">
                          <div>
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span
                                className={`px-2.5 py-0.5 text-xs font-semibold border rounded-md ${statusMeta.bgClass} ${statusMeta.textClass}`}
                              >
                                {statusMeta.label}
                              </span>
                              <span className="text-xs text-slate-400 tabular-nums">
                                ĐK: {formatShortDateVN(reg.registeredAt)}
                              </span>
                            </div>

                            <h3 className="mt-2.5 text-lg font-bold text-slate-900 leading-snug">
                              {reg.eventTitle}
                            </h3>

                            <div className="mt-3 space-y-1 text-xs text-slate-600">
                              <div>
                                Người tham dự:{' '}
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
                              Mã: {reg.ticketCode}
                            </span>
                            <div className="flex items-center gap-2">
                              {linkedEvent && (
                                <button
                                  type="button"
                                  onClick={() => onOpenEventDetail(linkedEvent.id)}
                                  className="px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg cursor-pointer"
                                >
                                  Chi tiết
                                </button>
                              )}
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
                                  Hủy tham gia
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
                            {reg.status === 'cancelled' ? 'Đã hủy' : 'Quét QR Check-in'}
                          </span>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          )}
        </div>
      </main>

      {/* Enterprise Corporate Footer across all public views */}
      <PublicFooter
        publicContact={publicContact}
        activePage={activePage}
        onNavigatePage={onNavigatePage}
        onBookOrganization={handleBookOrganization}
      />

      {/* Feedback Modal */}
      {feedbackReg && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 animate-ef-fade-in"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 space-y-4 animate-ef-modal-in shadow-xl">
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
