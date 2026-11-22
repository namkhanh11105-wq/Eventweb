import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Bookmark,
  Calendar,
  CalendarDays,
  Check,
  CheckCircle2,
  ClipboardList,
  Image as ImageIcon,
  Layers,
  LogIn,
  LogOut,
  MapPin,
  Menu,
  Plus,
  Search,
  Send,
  ShieldCheck,
  Star,
  Ticket,
  Users,
  X,
} from 'lucide-react';
import { DEFAULT_EVENT_BANNERS } from '../data/seedData';
import {
  createOrganizerEventRequest,
  submitFeedback,
  updateRegistrationStatus,
} from '../services/dataService';
import { ContactPage } from './ContactPage';
import { EventBanner } from './EventBanner';
import { EventDetailPage } from './EventDetailPage';
import { LumaFloatingHero } from './LumaFloatingHero';
import {
  AnimatedModal,
  AnimatedNumber,
  AnimatedProgressBar,
  RevealBlock,
  triggerPageProgress,
  useSlidingIndicator,
} from './MotionPrimitives';
import { PublicFooter } from './PublicFooter';
import { ServicesPage } from './ServicesPage';
import {
  ENTERPRISE_PARTNERS,
  EVENT_CATEGORIES,
  EVENT_STATUS_META,
  formatDateTimeVN,
  formatShortDateVN,
  PLANNING_STATUS_META,
  REGISTRATION_STATUS_META,
  SERVICE_STATUS_META,
  SYSTEM_SERVICE_CATALOG,
  toDatetimeLocalValue,
} from '../utils/formatters';
import type {
  AppUser,
  EventItem,
  EventServiceRequest,
  EventStatus,
  FeedbackItem,
  PublicContactInfo,
  PublicPage,
  RegistrationItem,
} from '../types';

function defaultRequestStartDatetime(daysAhead: number, hour: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  d.setHours(hour, 0, 0, 0);
  return toDatetimeLocalValue(d.toISOString());
}

interface UserLayoutProps {
  currentUser: AppUser | null;
  activePage: PublicPage;
  activeMyEventsTab?: 'registered' | 'requests';
  openCreateRequestSignal?: number;
  selectedEventId?: string | null;
  events: EventItem[];
  eventsLoading: boolean;
  registrations: RegistrationItem[];
  feedbacks: FeedbackItem[];
  publicContact: PublicContactInfo;
  permissionWarning?: string | null;
  onNavigatePage: (
    page: 'discover' | 'services' | 'contact' | 'tickets',
    tab?: 'registered' | 'requests'
  ) => void;
  onOpenEventDetail: (eventId: string) => void;
  onSwitchToAdmin?: () => void;
  onOpenAuth: (mode?: 'login' | 'register') => void;
  onLogout: () => void;
  onNotify: (message: string, type?: 'success' | 'error') => void;
}

export function UserLayout({
  currentUser,
  activePage,
  activeMyEventsTab = 'registered',
  openCreateRequestSignal = 0,
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
  onOpenAuth,
  onLogout,
  onNotify,
}: UserLayoutProps) {
  const [statusFilter, setStatusFilter] = useState<'all' | EventStatus>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [isTransitioningOut, setIsTransitioningOut] = useState(false);
  const transitionTimerRef = useRef<number | null>(null);

  const [savedEventIds, setSavedEventIds] = useState<string[]>([]);
  const [feedbackReg, setFeedbackReg] = useState<RegistrationItem | null>(null);
  const lastFeedbackRegRef = useRef<RegistrationItem | null>(null);
  if (feedbackReg) {
    lastFeedbackRegRef.current = feedbackReg;
  }
  const activeFeedbackReg = feedbackReg || lastFeedbackRegRef.current;

  const [ratingValue, setRatingValue] = useState(5);
  const [ratingComment, setRatingComment] = useState('');
  const [sendingFeedback, setSendingFeedback] = useState(false);

  const [myEventsTab, setMyEventsTab] = useState<'registered' | 'requests'>(activeMyEventsTab);
  const [showCreateRequestForm, setShowCreateRequestForm] = useState(false);

  // Create event organization request state (Tab 2 of Sự kiện của tôi)
  const [reqTitle, setReqTitle] = useState('');
  const [reqCategory, setReqCategory] = useState<string>(EVENT_CATEGORIES[0]);
  const [reqOrganizerName, setReqOrganizerName] = useState(
    currentUser?.organization || currentUser?.fullName || ''
  );
  const [reqStartTime, setReqStartTime] = useState(() => defaultRequestStartDatetime(14, 8));
  const [reqEndTime, setReqEndTime] = useState(() => defaultRequestStartDatetime(14, 17));
  const [reqLocation, setReqLocation] = useState('');
  const [reqMaxSlots, setReqMaxSlots] = useState(100);
  const [reqDescription, setReqDescription] = useState('');
  const [reqBannerUrl, setReqBannerUrl] = useState(DEFAULT_EVENT_BANNERS[0].url);
  const [reqSelectedServices, setReqSelectedServices] = useState<
    Record<string, { enabled: boolean; quantityOrScope: string; clientNote: string }>
  >(() => {
    const initial: Record<
      string,
      { enabled: boolean; quantityOrScope: string; clientNote: string }
    > = {};
    for (const s of SYSTEM_SERVICE_CATALOG) {
      initial[s.key] = {
        enabled: s.key === 'av_stage' || s.key === 'checkin_staff',
        quantityOrScope: '',
        clientNote: '',
      };
    }
    return initial;
  });
  const [reqCustomServiceName, setReqCustomServiceName] = useState('');
  const [reqSubmitting, setReqSubmitting] = useState(false);

  useEffect(() => {
    setMyEventsTab(activeMyEventsTab);
  }, [activeMyEventsTab]);

  useEffect(() => {
    if (openCreateRequestSignal > 0) {
      setMyEventsTab('requests');
      setShowCreateRequestForm(true);
    }
  }, [openCreateRequestSignal]);

  useEffect(() => {
    if (currentUser) {
      setReqOrganizerName((prev) => prev || currentUser.organization || currentUser.fullName);
    }
  }, [currentUser]);

  useEffect(() => {
    return () => {
      if (transitionTimerRef.current !== null) {
        window.clearTimeout(transitionTimerRef.current);
      }
    };
  }, []);

  function runSmoothViewTransition(action: () => void) {
    triggerPageProgress();

    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    if (reduced) {
      action();
      window.scrollTo({ top: 0, behavior: 'auto' });
      return;
    }

    if (transitionTimerRef.current !== null) {
      window.clearTimeout(transitionTimerRef.current);
    }

    setIsTransitioningOut(true);
    transitionTimerRef.current = window.setTimeout(() => {
      action();
      window.scrollTo({ top: 0, behavior: 'auto' });
      setIsTransitioningOut(false);
      transitionTimerRef.current = null;
    }, 150);
  }

  function smoothNavigatePage(
    page: 'discover' | 'services' | 'contact' | 'tickets',
    tab?: 'registered' | 'requests',
    openCreateForm = false
  ) {
    setMobileMenuOpen(false);
    if (tab) {
      setMyEventsTab(tab);
    }
    setShowCreateRequestForm(openCreateForm);

    if (activePage === page) {
      if (page === 'tickets' && tab) {
        onNavigatePage(page, tab);
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    runSmoothViewTransition(() => onNavigatePage(page, tab));
  }

  function smoothOpenEventDetail(eventId: string) {
    setMobileMenuOpen(false);
    if (activePage === 'event_detail' && selectedEventId === eventId) return;
    runSmoothViewTransition(() => onOpenEventDetail(eventId));
  }

  const publicEvents = useMemo(() => {
    return events.filter((ev) => ev.isPublic !== false);
  }, [events]);

  const activeDetailEvent = useMemo(() => {
    if (activePage !== 'event_detail' || !selectedEventId) return null;
    return events.find((e) => e.id === selectedEventId) || null;
  }, [activePage, selectedEventId, events]);

  const myRegistrations = useMemo(() => {
    if (!currentUser) return [];
    return registrations.filter(
      (r) =>
        r.userId === currentUser.uid ||
        r.guestEmail.toLowerCase() === currentUser.email.toLowerCase()
    );
  }, [registrations, currentUser]);

  const myRequests = useMemo(() => {
    if (!currentUser) return [];
    const emailLower = currentUser.email.toLowerCase();
    return events.filter(
      (ev) =>
        ev.clientUserId === currentUser.uid ||
        ev.clientEmail?.toLowerCase() === emailLower
    );
  }, [events, currentUser]);

  const requestStats = useMemo(() => {
    return {
      total: myRequests.length,
      pending: myRequests.filter((e) => e.planningStatus === 'pending_review').length,
      planning: myRequests.filter((e) => e.planningStatus === 'planning').length,
      confirmed: myRequests.filter((e) => e.planningStatus === 'confirmed').length,
    };
  }, [myRequests]);

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

  function scrollToOpenEvents() {
    document.getElementById('su-kien-dang-mo')?.scrollIntoView({ behavior: 'smooth' });
  }

  function handleHeroCardSelect(matchCategory?: string) {
    if (matchCategory) {
      const matched = publicEvents.find((e) => e.category === matchCategory);
      if (matched) {
        smoothOpenEventDetail(matched.id);
        return;
      }
      setCategoryFilter(matchCategory);
    }
    scrollToOpenEvents();
  }

  function handleBookOrganization() {
    if (!currentUser) {
      onOpenAuth('register');
      return;
    }
    if (currentUser.role === 'admin' && onSwitchToAdmin) {
      onSwitchToAdmin();
      return;
    }
    smoothNavigatePage('tickets', 'requests', true);
  }

  function toggleRequestService(key: string) {
    setReqSelectedServices((prev) => ({
      ...prev,
      [key]: {
        ...(prev[key] || { quantityOrScope: '', clientNote: '' }),
        enabled: !prev[key]?.enabled,
      },
    }));
  }

  async function handleSubmitEventRequest(e: FormEvent) {
    e.preventDefault();
    if (!currentUser) {
      onOpenAuth('login');
      return;
    }
    if (!reqTitle.trim() || !reqLocation.trim() || !reqDescription.trim()) {
      onNotify('Vui lòng điền đầy đủ tên, địa điểm và mô tả sự kiện.', 'error');
      return;
    }

    const servicesPayload: EventServiceRequest[] = SYSTEM_SERVICE_CATALOG.filter(
      (s) => reqSelectedServices[s.key]?.enabled
    ).map((s, idx) => ({
      id: `srv-${Date.now()}-${idx}`,
      serviceKey: s.key,
      serviceName: s.name,
      quantityOrScope: reqSelectedServices[s.key]?.quantityOrScope.trim() || undefined,
      clientNote: reqSelectedServices[s.key]?.clientNote.trim() || undefined,
      status: 'pending',
    }));

    if (reqCustomServiceName.trim()) {
      servicesPayload.push({
        id: `srv-custom-${Date.now()}`,
        serviceKey: 'custom',
        serviceName: reqCustomServiceName.trim(),
        status: 'pending',
      });
    }

    if (servicesPayload.length === 0) {
      onNotify('Vui lòng chọn ít nhất 1 dịch vụ đi kèm cho sự kiện.', 'error');
      return;
    }

    setReqSubmitting(true);
    try {
      await createOrganizerEventRequest({
        title: reqTitle,
        category: reqCategory,
        startTime: reqStartTime,
        endTime: reqEndTime,
        location: reqLocation,
        maxSlots: reqMaxSlots,
        description: reqDescription,
        bannerUrl: reqBannerUrl,
        organizerName: reqOrganizerName || currentUser.fullName,
        clientUserId: currentUser.uid,
        clientName: currentUser.fullName,
        clientEmail: currentUser.email,
        clientPhone: currentUser.phone,
        requestedServices: servicesPayload,
      });

      onNotify(
        'Đã gửi yêu cầu tổ chức sự kiện lên Cloud Firestore. Ban quản trị sẽ duyệt và phản hồi sớm.'
      );
      setReqTitle('');
      setReqLocation('');
      setReqDescription('');
      setReqCustomServiceName('');
      setShowCreateRequestForm(false);
      setMyEventsTab('requests');
    } catch (err) {
      onNotify(
        err instanceof Error ? err.message : 'Không thể gửi yêu cầu tổ chức sự kiện.',
        'error'
      );
    } finally {
      setReqSubmitting(false);
    }
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

  const activeNavKey = activePage === 'event_detail' ? 'discover' : activePage;
  const {
    containerRef: navContainerRef,
    setItemRef: setNavItemRef,
    rect: navPillRect,
  } = useSlidingIndicator(
    activeNavKey,
    `${Boolean(currentUser)}-${myRegistrations.length}-${myRequests.length}`
  );

  const {
    containerRef: myEventsTabRef,
    setItemRef: setMyEventsTabRef,
    rect: myEventsTabPill,
  } = useSlidingIndicator(
    myEventsTab,
    `${activePage}-${myRegistrations.length}-${myRequests.length}-${Boolean(currentUser)}`
  );

  const navButtonClass = (isActive: boolean) =>
    `relative z-10 px-3.5 py-1.5 rounded-full transition-colors duration-200 whitespace-nowrap shrink-0 cursor-pointer ${
      isActive ? 'text-white font-semibold' : 'text-slate-600 hover:text-slate-900'
    }`;

  const pageTransitionKey =
    activePage === 'event_detail' ? `event-${selectedEventId || ''}` : activePage;

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col">
      {/* Multi-Page Frosted Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-white/85 backdrop-blur-md border-b border-slate-200/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-6">
          {/* Zone 1: Brand */}
          <button
            type="button"
            onClick={() => smoothNavigatePage('discover')}
            className="inline-flex items-center gap-2.5 text-[15px] font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 cursor-pointer transition-opacity hover:opacity-85"
          >
            <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-rose-500 to-orange-500 text-white flex items-center justify-center shadow-xs">
              <CalendarDays className="w-4 h-4" />
            </span>
            <span>EventFlow</span>
          </button>

          {/* Zone 2: Multi-page Navigation Links with Sliding Active Indicator Pill */}
          <nav className="hidden md:flex items-center gap-1.5 text-[13px] font-medium">
            <div ref={navContainerRef} className="relative flex items-center gap-1">
              <span
                aria-hidden="true"
                className="ef-sliding-pill pointer-events-none absolute top-0 left-0 rounded-full bg-slate-900 shadow-xs transition-[transform,width,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
                style={{
                  width: `${navPillRect.width}px`,
                  height: `${navPillRect.height}px`,
                  transform: `translate3d(${navPillRect.x}px, ${navPillRect.y}px, 0)`,
                  opacity: navPillRect.ready ? 1 : 0,
                }}
              />
              <button
                ref={setNavItemRef('discover')}
                type="button"
                onClick={() => smoothNavigatePage('discover')}
                className={navButtonClass(activeNavKey === 'discover')}
              >
                Khám phá
              </button>
              <button
                ref={setNavItemRef('services')}
                type="button"
                onClick={() => smoothNavigatePage('services')}
                className={navButtonClass(activeNavKey === 'services')}
              >
                Dịch vụ
              </button>
              <button
                ref={setNavItemRef('contact')}
                type="button"
                onClick={() => smoothNavigatePage('contact')}
                className={navButtonClass(activeNavKey === 'contact')}
              >
                Liên hệ
              </button>
              {currentUser && (
                <button
                  ref={setNavItemRef('tickets')}
                  type="button"
                  onClick={() => smoothNavigatePage('tickets')}
                  className={navButtonClass(activeNavKey === 'tickets')}
                >
                  Sự kiện của tôi
                </button>
              )}
            </div>
            {onSwitchToAdmin && (
              <button
                type="button"
                onClick={onSwitchToAdmin}
                className="px-3.5 py-1.5 rounded-full text-indigo-700 hover:bg-indigo-50 font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Không gian Quản trị
              </button>
            )}
          </nav>

          {/* Zone 3: Account / Role & Auth */}
          <div className="hidden md:flex items-center gap-3 shrink-0">
            {currentUser ? (
              <div className="flex items-center gap-2.5 pl-4 border-l border-slate-200/80">
                <div
                  className={`w-7 h-7 rounded-lg border text-xs font-bold flex items-center justify-center shrink-0 ${
                    currentUser.role === 'admin'
                      ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                      : 'bg-slate-100 border-slate-200/80 text-slate-700'
                  }`}
                >
                  {currentUser.fullName.trim().charAt(0).toUpperCase() || 'U'}
                </div>
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs font-semibold text-slate-900 truncate max-w-[150px]">
                    {currentUser.fullName}
                  </span>
                  {currentUser.role === 'admin' && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold bg-indigo-600 text-white rounded-full whitespace-nowrap">
                      <ShieldCheck className="w-3 h-3" />
                      <span>Quản trị viên</span>
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={onLogout}
                  className="ml-1 inline-flex items-center gap-1.5 h-8 px-2.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200/80 rounded-full transition-all duration-150 active:scale-[0.98] whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Đăng xuất</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 pl-4 border-l border-slate-200/80">
                <button
                  type="button"
                  onClick={() => onOpenAuth('login')}
                  className="h-8 px-3.5 text-xs font-semibold text-slate-700 hover:text-slate-900 rounded-full hover:bg-slate-100/80 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Đăng nhập
                </button>
                <button
                  type="button"
                  onClick={() => onOpenAuth('register')}
                  className="inline-flex items-center gap-1.5 h-8 px-4 text-xs font-semibold text-white bg-slate-950 hover:bg-slate-800 rounded-full transition-all duration-150 active:scale-[0.98] whitespace-nowrap shrink-0 cursor-pointer"
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
              onClick={() => smoothNavigatePage('discover')}
              className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium ${
                activePage === 'discover' || activePage === 'event_detail'
                  ? 'bg-slate-900 text-white font-semibold'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              Khám phá sự kiện
            </button>
            <button
              type="button"
              onClick={() => smoothNavigatePage('services')}
              className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium ${
                activePage === 'services'
                  ? 'bg-slate-900 text-white font-semibold'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              Dịch vụ tổ chức sự kiện
            </button>
            <button
              type="button"
              onClick={() => smoothNavigatePage('contact')}
              className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium ${
                activePage === 'contact'
                  ? 'bg-slate-900 text-white font-semibold'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              Liên hệ Ban quản trị
            </button>
            {currentUser && (
              <button
                type="button"
                onClick={() => smoothNavigatePage('tickets')}
                className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium ${
                  activePage === 'tickets'
                    ? 'bg-slate-900 text-white font-semibold'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                Sự kiện của tôi
              </button>
            )}
            {onSwitchToAdmin && (
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onSwitchToAdmin();
                }}
                className="w-full text-left px-3 py-2.5 rounded-xl text-sm font-semibold text-indigo-700 bg-indigo-50"
              >
                Không gian Quản trị viên
              </button>
            )}
            <div className="pt-2 border-t border-slate-100">
              {currentUser ? (
                <button
                  type="button"
                  onClick={onLogout}
                  className="w-full text-left px-3 py-2 rounded-xl text-sm font-medium text-rose-700 hover:bg-rose-50"
                >
                  Đăng xuất ({currentUser.fullName})
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenAuth('login');
                  }}
                  className="w-full text-center px-4 py-2.5 rounded-full text-sm font-semibold text-white bg-slate-950"
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

        {/* Smooth Two-Phase Fade-Out -> Fade-In Multi-View Transition Wrapper */}
        <div
          className={`transition-[opacity,transform] duration-150 ease-out motion-reduce:transition-none motion-reduce:transform-none ${
            isTransitioningOut
              ? 'opacity-0 scale-[0.982] pointer-events-none'
              : 'opacity-100'
          }`}
        >
          <div key={pageTransitionKey} className="animate-ef-page-enter">
            {activePage === 'services' && (
              <ServicesPage
                publicContact={publicContact}
                onBookOrganization={handleBookOrganization}
                onGoContact={() => smoothNavigatePage('contact')}
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
                  onBack={() => smoothNavigatePage('discover')}
                  onRequireAuth={() => onOpenAuth('login')}
                  onViewMyTickets={() => smoothNavigatePage('tickets', 'registered')}
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
                    onClick={() => smoothNavigatePage('discover')}
                    className="mt-5 px-5 py-2.5 text-sm font-semibold text-white bg-slate-950 hover:bg-slate-800 rounded-full cursor-pointer transition-colors"
                  >
                    Quay lại trang Khám phá
                  </button>
                </div>
              )
            )}

            {activePage === 'discover' && (
              <div className="space-y-10">
                {/* Luma-Style Infinity Floating Hero */}
                <LumaFloatingHero
                  publicEvents={publicEvents}
                  onCreateFirstEvent={handleBookOrganization}
                  onExploreEvents={scrollToOpenEvents}
                  onSelectCard={handleHeroCardSelect}
                />

                {/* Live Search, Filters & Sync Metrics Strip */}
                <section className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 space-y-4">
                  <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-2.5">
                    <div className="relative flex-1 min-w-0">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="search"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Tìm kiếm sự kiện theo tên, địa điểm, đơn vị tổ chức..."
                        className="w-full h-10 pl-10 pr-3.5 text-sm bg-slate-50/70 border border-slate-200/80 rounded-xl text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-slate-900 transition-colors"
                      />
                    </div>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
                      <select
                        aria-label="Lọc theo danh mục"
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                        className="h-10 px-3 text-sm font-medium bg-slate-50/70 border border-slate-200/80 rounded-xl text-slate-700 focus:bg-white focus:outline-none focus:border-slate-900 cursor-pointer transition-colors"
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
                        className="h-10 px-3 text-sm font-medium bg-slate-50/70 border border-slate-200/80 rounded-xl text-slate-700 focus:bg-white focus:outline-none focus:border-slate-900 cursor-pointer transition-colors"
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
                          className="h-10 px-3.5 text-xs font-semibold text-slate-700 hover:text-slate-950 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors whitespace-nowrap cursor-pointer"
                        >
                          Xóa lọc
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Subtle Live Firestore Telemetry Strip */}
                  <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
                    <div className="flex flex-wrap items-center gap-4 sm:gap-6 tabular-nums">
                      <span>
                        Sự kiện công khai:{' '}
                        <strong className="text-slate-900">
                          <AnimatedNumber value={heroMetrics.totalEvents} />
                        </strong>
                      </span>
                      <span>
                        Lượt đăng ký:{' '}
                        <strong className="text-slate-900">
                          <AnimatedNumber value={heroMetrics.totalRegistrations} />
                        </strong>
                      </span>
                      <span>
                        Tỷ lệ lấp đầy:{' '}
                        <strong className="text-rose-600">
                          <AnimatedNumber value={heroMetrics.avgFillRate} suffix="%" />
                        </strong>
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      {currentUser && currentUser.role !== 'admin' && (
                        <button
                          type="button"
                          onClick={() => smoothNavigatePage('tickets', 'requests', true)}
                          className="inline-flex items-center gap-1 font-semibold text-rose-600 hover:text-rose-700 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Tạo yêu cầu tổ chức sự kiện</span>
                        </button>
                      )}
                      {onSwitchToAdmin && (
                        <button
                          type="button"
                          onClick={onSwitchToAdmin}
                          className="inline-flex items-center gap-1 font-semibold text-indigo-700 hover:text-indigo-800 cursor-pointer"
                        >
                          <span>Mở Không gian Quản trị →</span>
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
                        onClick={() => smoothOpenEventDetail(featuredEvent.id)}
                        className="group ef-card-sheen bg-white border border-slate-200/80 rounded-3xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 items-stretch transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-1 hover:border-orange-200 hover:shadow-[0_20px_42px_-16px_rgba(15,23,42,0.16)] cursor-pointer"
                      >
                        <div className="lg:col-span-6 aspect-video lg:aspect-auto bg-slate-100 overflow-hidden">
                          <EventBanner
                            src={featuredEvent.bannerUrl}
                            alt={featuredEvent.title}
                            className="w-full h-full transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.04]"
                          />
                        </div>
                        <div className="lg:col-span-6 p-6 sm:p-8 flex flex-col justify-between gap-5">
                          <div>
                            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                              <span className="font-semibold text-rose-600">
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

                            <h3 className="mt-2.5 text-xl sm:text-2xl font-bold text-slate-900 leading-snug group-hover:text-rose-600 transition-colors">
                              {featuredEvent.title}
                            </h3>

                            <p className="mt-2.5 text-sm text-slate-600 line-clamp-3 leading-relaxed">
                              {featuredEvent.description}
                            </p>

                            <div className="mt-4 space-y-1.5 text-xs text-slate-600">
                              <div className="flex items-center gap-2 tabular-nums">
                                <Calendar className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                                <span>{formatDateTimeVN(featuredEvent.startTime)}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
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
                                smoothOpenEventDetail(featuredEvent.id);
                              }}
                              className="h-10 px-5 text-sm font-semibold text-white bg-slate-950 hover:bg-slate-800 rounded-full transition-all duration-150 active:scale-[0.98] cursor-pointer whitespace-nowrap"
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
                <section id="su-kien-dang-mo" className="space-y-6 scroll-mt-20">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="inline-flex items-center gap-1 p-1 bg-slate-100/90 border border-slate-200/70 rounded-full overflow-x-auto max-w-full">
                      <button
                        type="button"
                        onClick={() => setCategoryFilter('all')}
                        className={`px-3.5 py-1.5 text-xs font-semibold rounded-full transition-all duration-150 whitespace-nowrap shrink-0 cursor-pointer ${
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
                          className={`px-3.5 py-1.5 text-xs font-semibold rounded-full transition-all duration-150 whitespace-nowrap shrink-0 cursor-pointer ${
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
                            className="px-4 py-2 text-sm font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-full cursor-pointer transition-colors"
                          >
                            Đặt lại bộ lọc
                          </button>
                        )}
                        {!currentUser && (
                          <button
                            type="button"
                            onClick={() => onOpenAuth('login')}
                            className="px-5 py-2.5 text-sm font-semibold text-white bg-slate-950 hover:bg-slate-800 rounded-full cursor-pointer transition-colors"
                          >
                            Đăng nhập / Đăng ký ngay
                          </button>
                        )}
                        {onSwitchToAdmin && publicEvents.length === 0 && (
                          <button
                            type="button"
                            onClick={onSwitchToAdmin}
                            className="px-5 py-2.5 text-sm font-semibold text-white bg-slate-950 hover:bg-slate-800 rounded-full cursor-pointer transition-colors"
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
                            onClick={() => smoothOpenEventDetail(ev.id)}
                            className="group ef-card-sheen bg-white border border-slate-200/80 rounded-2xl overflow-hidden flex flex-col justify-between transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-1.5 hover:border-orange-200 hover:shadow-[0_18px_36px_-14px_rgba(15,23,42,0.16)] active:scale-[0.985] cursor-pointer"
                          >
                            <div>
                              <div className="relative aspect-video w-full overflow-hidden bg-slate-100">
                                <EventBanner
                                  src={ev.bannerUrl}
                                  alt={ev.title}
                                  className="w-full h-full transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.05]"
                                />
                                <div className="absolute top-3 right-3 flex items-center gap-1.5">
                                  {myReg && (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold bg-emerald-600 text-white rounded-full shadow-xs">
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
                                    className={`p-1.5 rounded-full shadow-xs cursor-pointer transition-all duration-200 hover:scale-110 ${
                                      isSaved
                                        ? 'bg-rose-500 text-white'
                                        : 'bg-white/95 text-slate-600 hover:text-rose-600'
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
                                    <span className="font-semibold text-rose-600 truncate">
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

                                <h3 className="mt-2.5 text-base font-bold text-slate-900 leading-snug line-clamp-2 group-hover:text-rose-600 transition-colors">
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
                                  barClassName={
                                    fillPercent >= 90
                                      ? 'bg-amber-500'
                                      : 'bg-gradient-to-r from-rose-500 to-orange-500'
                                  }
                                />
                              </div>
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-xs text-slate-500 truncate inline-flex items-center gap-1">
                                  {ev.organizer}
                                  {ev.organizerVerified !== false && (
                                    <BadgeCheck className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                                  )}
                                </span>
                                <span className="text-xs font-semibold text-slate-900 group-hover:text-rose-600 whitespace-nowrap shrink-0 inline-flex items-center gap-1 transition-all duration-200 group-hover:translate-x-0.5">
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
                      onClick={() => smoothNavigatePage('services')}
                      className="inline-flex items-center gap-1.5 h-9 px-4 text-xs font-semibold text-white bg-slate-950 hover:bg-slate-800 rounded-full transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <span>Khám phá gói dịch vụ tổ chức</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </section>
                </RevealBlock>
              </div>
            )}

            {activePage === 'tickets' && (
              /* Unified User Workspace: "Sự kiện của tôi" with 2 Tabs */
              <section className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h1 className="text-2xl font-bold text-slate-900">Sự kiện của tôi</h1>
                    <p className="mt-1 text-sm text-slate-500">
                      Quản lý vé QR các sự kiện bạn đã đăng ký tham gia và theo dõi các yêu cầu tổ
                      chức sự kiện của bạn.
                    </p>
                  </div>

                  {currentUser && (
                    <button
                      type="button"
                      onClick={() => {
                        setMyEventsTab('requests');
                        setShowCreateRequestForm(true);
                        onNavigatePage('tickets', 'requests');
                      }}
                      className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-slate-950 hover:bg-slate-800 rounded-full shadow-xs transition-all duration-150 active:scale-[0.98] cursor-pointer whitespace-nowrap shrink-0"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Tạo yêu cầu tổ chức sự kiện</span>
                    </button>
                  )}
                </div>

                {!currentUser ? (
                  <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center">
                    <Ticket className="w-10 h-10 text-slate-300 mx-auto" />
                    <p className="mt-3 text-sm text-slate-600">
                      Hãy đăng nhập để xem sự kiện bạn đã đăng ký tham gia hoặc gửi yêu cầu tổ chức
                      sự kiện mới.
                    </p>
                    <button
                      type="button"
                      onClick={() => onOpenAuth('login')}
                      className="mt-4 px-5 py-2.5 text-sm font-semibold text-white bg-slate-950 hover:bg-slate-800 rounded-full cursor-pointer"
                    >
                      Đăng nhập ngay
                    </button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* 2 Clean Tabs with Sliding Active Indicator Pill */}
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div
                        ref={myEventsTabRef}
                        className="relative inline-flex items-center gap-1 p-1 bg-slate-100 border border-slate-200/80 rounded-full"
                      >
                        <span
                          aria-hidden="true"
                          className="ef-sliding-pill pointer-events-none absolute top-0 left-0 rounded-full bg-white shadow-xs transition-[transform,width,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
                          style={{
                            width: `${myEventsTabPill.width}px`,
                            height: `${myEventsTabPill.height}px`,
                            transform: `translate3d(${myEventsTabPill.x}px, ${myEventsTabPill.y}px, 0)`,
                            opacity: myEventsTabPill.ready ? 1 : 0,
                          }}
                        />
                        <button
                          ref={setMyEventsTabRef('registered')}
                          type="button"
                          onClick={() => {
                            setShowCreateRequestForm(false);
                            setMyEventsTab('registered');
                            onNavigatePage('tickets', 'registered');
                          }}
                          className={`relative z-10 inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm rounded-full transition-colors cursor-pointer whitespace-nowrap ${
                            myEventsTab === 'registered'
                              ? 'text-slate-900 font-semibold'
                              : 'text-slate-600 hover:text-slate-900 font-medium'
                          }`}
                        >
                          <Ticket className="w-3.5 h-3.5" />
                          <span>Đã đăng ký tham gia ({myRegistrations.length})</span>
                        </button>
                        <button
                          ref={setMyEventsTabRef('requests')}
                          type="button"
                          onClick={() => {
                            setMyEventsTab('requests');
                            onNavigatePage('tickets', 'requests');
                          }}
                          className={`relative z-10 inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm rounded-full transition-colors cursor-pointer whitespace-nowrap ${
                            myEventsTab === 'requests'
                              ? 'text-slate-900 font-semibold'
                              : 'text-slate-600 hover:text-slate-900 font-medium'
                          }`}
                        >
                          <ClipboardList className="w-3.5 h-3.5" />
                          <span>Yêu cầu tổ chức ({myRequests.length})</span>
                        </button>
                      </div>
                    </div>

                    {/* Tab 1: Đã đăng ký tham gia */}
                    {myEventsTab === 'registered' && (
                      <div key="tab-registered" className="animate-ef-page-enter">
                        {myRegistrations.length === 0 ? (
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
                              onClick={() => smoothNavigatePage('discover')}
                              className="mt-4 px-5 py-2.5 text-sm font-semibold text-white bg-slate-950 hover:bg-slate-800 rounded-full cursor-pointer"
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
                                  className="bg-white border border-slate-200 rounded-2xl overflow-hidden flex flex-col sm:flex-row transition-all duration-200 hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-md"
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
                                            onClick={() => smoothOpenEventDetail(linkedEvent.id)}
                                            className="px-3 py-1.5 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-full cursor-pointer transition-colors"
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
                                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-full cursor-pointer transition-colors"
                                          >
                                            <Star className="w-3.5 h-3.5" />
                                            <span>Đánh giá</span>
                                          </button>
                                        )}
                                        {canCancel && (
                                          <button
                                            type="button"
                                            onClick={() => handleCancelTicket(reg)}
                                            className="px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-full cursor-pointer transition-colors"
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
                      </div>
                    )}

                    {/* Tab 2: Yêu cầu tổ chức */}
                    {myEventsTab === 'requests' && (
                      <div key="tab-requests" className="animate-ef-page-enter space-y-6">
                        {showCreateRequestForm ? (
                          <div className="max-w-4xl mx-auto bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-6">
                            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
                              <div>
                                <button
                                  type="button"
                                  onClick={() => setShowCreateRequestForm(false)}
                                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 mb-2 cursor-pointer"
                                >
                                  <ArrowLeft className="w-3.5 h-3.5" />
                                  <span>Quay lại danh sách yêu cầu</span>
                                </button>
                                <h2 className="text-xl font-bold text-slate-900">
                                  Tạo yêu cầu tổ chức sự kiện mới
                                </h2>
                                <p className="mt-1 text-xs sm:text-sm text-slate-500">
                                  Điền thông tin chương trình và chọn các dịch vụ đi kèm. Yêu cầu sẽ
                                  được đồng bộ lên Cloud Firestore để Admin phê duyệt.
                                </p>
                              </div>
                            </div>

                            <form onSubmit={handleSubmitEventRequest} className="space-y-6">
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div className="sm:col-span-2">
                                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                                    Tên sự kiện dự kiến
                                  </label>
                                  <input
                                    type="text"
                                    required
                                    value={reqTitle}
                                    onChange={(e) => setReqTitle(e.target.value)}
                                    placeholder="Ví dụ: Hội nghị Khách hàng & Đối tác Khu vực Phía Nam 2026"
                                    className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-slate-900"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                                    Loại hình sự kiện
                                  </label>
                                  <select
                                    value={reqCategory}
                                    onChange={(e) => setReqCategory(e.target.value)}
                                    className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-slate-900"
                                  >
                                    {EVENT_CATEGORIES.map((c) => (
                                      <option key={c} value={c}>
                                        {c}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div>
                                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                                    Đơn vị / Người đứng tên tổ chức
                                  </label>
                                  <input
                                    type="text"
                                    required
                                    value={reqOrganizerName}
                                    onChange={(e) => setReqOrganizerName(e.target.value)}
                                    className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-slate-900"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                                    Thời gian bắt đầu dự kiến
                                  </label>
                                  <input
                                    type="datetime-local"
                                    required
                                    value={reqStartTime}
                                    onChange={(e) => setReqStartTime(e.target.value)}
                                    className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-slate-900"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                                    Thời gian kết thúc dự kiến
                                  </label>
                                  <input
                                    type="datetime-local"
                                    required
                                    value={reqEndTime}
                                    onChange={(e) => setReqEndTime(e.target.value)}
                                    className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-slate-900"
                                  />
                                </div>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div className="sm:col-span-2">
                                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                                    Địa điểm dự kiến tổ chức
                                  </label>
                                  <input
                                    type="text"
                                    required
                                    value={reqLocation}
                                    onChange={(e) => setReqLocation(e.target.value)}
                                    placeholder="Tên khách sạn / trung tâm hội nghị hoặc khu vực..."
                                    className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-slate-900"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                                    Quy mô khách dự kiến
                                  </label>
                                  <input
                                    type="number"
                                    min={10}
                                    max={10000}
                                    required
                                    value={reqMaxSlots}
                                    onChange={(e) => setReqMaxSlots(Number(e.target.value) || 50)}
                                    className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-slate-900 tabular-nums"
                                  />
                                </div>
                              </div>

                              <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                                  Mô tả mục tiêu &amp; yêu cầu tổng quan
                                </label>
                                <textarea
                                  rows={3}
                                  required
                                  value={reqDescription}
                                  onChange={(e) => setReqDescription(e.target.value)}
                                  placeholder="Nội dung chính, đối tượng khách mời VIP/đại biểu, yêu cầu đặc biệt..."
                                  className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-slate-900"
                                />
                              </div>

                              {/* Banner URL & Preset Picker */}
                              <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                                  Ảnh minh họa sự kiện (URL hoặc chọn mẫu)
                                </label>
                                <div className="relative">
                                  <ImageIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                  <input
                                    type="text"
                                    required
                                    value={reqBannerUrl}
                                    onChange={(e) => setReqBannerUrl(e.target.value)}
                                    className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-slate-900"
                                  />
                                </div>
                                <div className="mt-2.5 grid grid-cols-3 sm:grid-cols-6 gap-2">
                                  {DEFAULT_EVENT_BANNERS.map((preset) => {
                                    const selected = reqBannerUrl === preset.url;
                                    return (
                                      <button
                                        key={preset.id}
                                        type="button"
                                        onClick={() => setReqBannerUrl(preset.url)}
                                        className={`relative rounded-lg overflow-hidden border text-left cursor-pointer ${
                                          selected
                                            ? 'border-slate-900 ring-2 ring-slate-900/15'
                                            : 'border-slate-200'
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
                                          <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-slate-900 text-white flex items-center justify-center">
                                            <Check className="w-2.5 h-2.5" />
                                          </span>
                                        )}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>

                              {/* System Services Checklist */}
                              <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
                                <div>
                                  <h3 className="text-sm font-bold text-slate-900">
                                    Chọn dịch vụ đi kèm từ EventFlow
                                  </h3>
                                  <p className="text-xs text-slate-500 mt-0.5">
                                    Chọn các hạng mục bạn muốn Ban quản trị hỗ trợ chuẩn bị (chưa
                                    thu phí trực tuyến ở bước này).
                                  </p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  {SYSTEM_SERVICE_CATALOG.map((srv) => {
                                    const state = reqSelectedServices[srv.key];
                                    const enabled = Boolean(state?.enabled);
                                    return (
                                      <div
                                        key={srv.key}
                                        className={`rounded-xl border p-3.5 transition-colors ${
                                          enabled
                                            ? 'bg-white border-slate-900/40 shadow-xs'
                                            : 'bg-white/70 border-slate-200'
                                        }`}
                                      >
                                        <label className="flex items-start gap-2.5 cursor-pointer">
                                          <input
                                            type="checkbox"
                                            checked={enabled}
                                            onChange={() => toggleRequestService(srv.key)}
                                            className="mt-0.5 w-4 h-4 accent-slate-900 rounded"
                                          />
                                          <div>
                                            <div className="text-xs font-bold text-slate-900">
                                              {srv.name}
                                            </div>
                                            <div className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                                              {srv.summary}
                                            </div>
                                          </div>
                                        </label>

                                        {enabled && (
                                          <div className="mt-3 pt-3 border-t border-slate-100 space-y-2 animate-ef-fade-in">
                                            <input
                                              type="text"
                                              value={state?.quantityOrScope || ''}
                                              onChange={(e) =>
                                                setReqSelectedServices((prev) => ({
                                                  ...prev,
                                                  [srv.key]: {
                                                    ...prev[srv.key],
                                                    quantityOrScope: e.target.value,
                                                  },
                                                }))
                                              }
                                              placeholder="Số lượng / Quy mô (vd: 100 suất, 2 nhân sự...)"
                                              className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:border-slate-900"
                                            />
                                            <input
                                              type="text"
                                              value={state?.clientNote || ''}
                                              onChange={(e) =>
                                                setReqSelectedServices((prev) => ({
                                                  ...prev,
                                                  [srv.key]: {
                                                    ...prev[srv.key],
                                                    clientNote: e.target.value,
                                                  },
                                                }))
                                              }
                                              placeholder="Ghi chú yêu cầu riêng..."
                                              className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:border-slate-900"
                                            />
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>

                                <div>
                                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                                    Dịch vụ bổ sung khác (tùy chọn)
                                  </label>
                                  <input
                                    type="text"
                                    value={reqCustomServiceName}
                                    onChange={(e) => setReqCustomServiceName(e.target.value)}
                                    placeholder="Ví dụ: Phiên dịch cabin song ngữ, khu trưng bày sản phẩm..."
                                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-slate-900"
                                  />
                                </div>
                              </div>

                              <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-200">
                                <button
                                  type="button"
                                  onClick={() => setShowCreateRequestForm(false)}
                                  className="px-4 py-2.5 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-full cursor-pointer"
                                >
                                  Hủy
                                </button>
                                <button
                                  type="submit"
                                  disabled={reqSubmitting}
                                  className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-slate-950 hover:bg-slate-800 rounded-full cursor-pointer disabled:opacity-60"
                                >
                                  <Send className="w-4 h-4" />
                                  <span>
                                    {reqSubmitting
                                      ? 'Đang gửi lên Firestore...'
                                      : 'Gửi yêu cầu tổ chức'}
                                  </span>
                                </button>
                              </div>
                            </form>
                          </div>
                        ) : (
                          <>
                            {/* Compact KPI Summary Strip for Organization Requests */}
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                              <div className="bg-white border border-slate-200 rounded-xl p-4">
                                <div className="text-xs font-medium text-slate-500">
                                  Tổng yêu cầu đã gửi
                                </div>
                                <div className="mt-1.5 text-2xl font-bold text-slate-900 tabular-nums">
                                  <AnimatedNumber value={requestStats.total} />
                                </div>
                              </div>
                              <div className="bg-white border border-slate-200 rounded-xl p-4">
                                <div className="text-xs font-medium text-slate-500">
                                  Đang chờ Admin duyệt
                                </div>
                                <div className="mt-1.5 text-2xl font-bold text-amber-600 tabular-nums">
                                  <AnimatedNumber value={requestStats.pending} />
                                </div>
                              </div>
                              <div className="bg-white border border-slate-200 rounded-xl p-4">
                                <div className="text-xs font-medium text-slate-500">
                                  Đang lên kế hoạch
                                </div>
                                <div className="mt-1.5 text-2xl font-bold text-indigo-600 tabular-nums">
                                  <AnimatedNumber value={requestStats.planning} />
                                </div>
                              </div>
                              <div className="bg-white border border-slate-200 rounded-xl p-4">
                                <div className="text-xs font-medium text-slate-500">
                                  Đã xác nhận triển khai
                                </div>
                                <div className="mt-1.5 text-2xl font-bold text-emerald-600 tabular-nums">
                                  <AnimatedNumber value={requestStats.confirmed} />
                                </div>
                              </div>
                            </div>

                            {myRequests.length === 0 ? (
                              <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center">
                                <ClipboardList className="w-10 h-10 text-slate-300 mx-auto" />
                                <h2 className="mt-3 text-base font-bold text-slate-900">
                                  Bạn chưa gửi yêu cầu tổ chức sự kiện nào
                                </h2>
                                <p className="mt-1 text-sm text-slate-500 max-w-md mx-auto">
                                  Gửi yêu cầu tổ chức kèm các dịch vụ đi kèm để Ban quản trị tiếp
                                  nhận và phê duyệt trực tiếp trên Cloud Firestore.
                                </p>
                                <button
                                  type="button"
                                  onClick={() => setShowCreateRequestForm(true)}
                                  className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-slate-950 hover:bg-slate-800 rounded-full cursor-pointer"
                                >
                                  <Plus className="w-4 h-4" />
                                  <span>+ Tạo yêu cầu tổ chức sự kiện</span>
                                </button>
                              </div>
                            ) : (
                              <div className="space-y-5">
                                {myRequests.map((ev, idx) => {
                                  const planMeta =
                                    PLANNING_STATUS_META[ev.planningStatus] ||
                                    PLANNING_STATUS_META.pending_review;
                                  const statusMeta =
                                    EVENT_STATUS_META[ev.status] || EVENT_STATUS_META.upcoming;

                                  return (
                                    <article
                                      key={ev.id}
                                      style={{ animationDelay: `${Math.min(idx, 5) * 60}ms` }}
                                      className="animate-ef-fade-up bg-white border border-slate-200 rounded-2xl overflow-hidden"
                                    >
                                      <div className="grid grid-cols-1 lg:grid-cols-12">
                                        <div className="lg:col-span-4 aspect-video lg:aspect-auto bg-slate-100">
                                          <EventBanner
                                            src={ev.bannerUrl}
                                            alt={ev.title}
                                            className="w-full h-full"
                                          />
                                        </div>

                                        <div className="lg:col-span-8 p-6 space-y-5">
                                          <div className="flex flex-wrap items-start justify-between gap-3">
                                            <div>
                                              <div className="flex flex-wrap items-center gap-2 text-xs">
                                                <span
                                                  className={`px-2.5 py-1 font-semibold border rounded-md ${planMeta.bgClass} ${planMeta.textClass}`}
                                                >
                                                  Duyệt từ Admin: {planMeta.label}
                                                </span>
                                                <span className="px-2.5 py-1 font-medium bg-slate-100 text-slate-700 rounded-md">
                                                  {ev.category}
                                                </span>
                                                <span
                                                  className={`px-2.5 py-1 font-medium border rounded-md ${
                                                    ev.isPublic
                                                      ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                                                      : 'bg-slate-50 border-slate-200 text-slate-600'
                                                  }`}
                                                >
                                                  {ev.isPublic
                                                    ? `Đang mở công khai (${statusMeta.label})`
                                                    : 'Chưa mở đăng ký công khai'}
                                                </span>
                                              </div>

                                              <h3 className="mt-2.5 text-lg sm:text-xl font-bold text-slate-900">
                                                {ev.title}
                                              </h3>
                                            </div>

                                            <div className="text-right text-xs text-slate-500 tabular-nums">
                                              <div>Quy mô dự kiến: {ev.maxSlots} khách</div>
                                              {ev.isPublic && (
                                                <div className="mt-0.5 font-semibold text-indigo-700">
                                                  Đã đăng ký: {ev.registeredCount}/{ev.maxSlots}
                                                </div>
                                              )}
                                            </div>
                                          </div>

                                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-600">
                                            <div className="flex items-center gap-2 tabular-nums">
                                              <Calendar className="w-4 h-4 text-rose-500 shrink-0" />
                                              <span>
                                                {formatDateTimeVN(ev.startTime)} →{' '}
                                                {formatShortDateVN(ev.endTime)}
                                              </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                              <MapPin className="w-4 h-4 text-rose-500 shrink-0" />
                                              <span className="truncate">{ev.location}</span>
                                            </div>
                                          </div>

                                          <p className="text-sm text-slate-600 leading-relaxed line-clamp-2">
                                            {ev.description}
                                          </p>

                                          {/* Requested Services Progress */}
                                          <div className="pt-4 border-t border-slate-100 space-y-2.5">
                                            <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-slate-800">
                                              <span className="inline-flex items-center gap-1.5">
                                                <Layers className="w-3.5 h-3.5 text-indigo-600" />
                                                <span>
                                                  Dịch vụ đi kèm đã yêu cầu (
                                                  {ev.requestedServices.length})
                                                </span>
                                              </span>
                                              <div className="flex items-center gap-3 font-normal text-slate-500">
                                                <span>
                                                  Khách mời dự kiến: {ev.invitedGuests.length}
                                                </span>
                                                {ev.isPublic && (
                                                  <button
                                                    type="button"
                                                    onClick={() => smoothOpenEventDetail(ev.id)}
                                                    className="font-semibold text-indigo-700 hover:text-indigo-800 cursor-pointer"
                                                  >
                                                    Xem trang công khai →
                                                  </button>
                                                )}
                                              </div>
                                            </div>

                                            {ev.requestedServices.length === 0 ? (
                                              <p className="text-xs text-slate-500">
                                                Chưa có dịch vụ đi kèm được ghi nhận.
                                              </p>
                                            ) : (
                                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                                {ev.requestedServices.map((srv) => {
                                                  const sMeta =
                                                    SERVICE_STATUS_META[srv.status] ||
                                                    SERVICE_STATUS_META.pending;
                                                  return (
                                                    <div
                                                      key={srv.id}
                                                      className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1"
                                                    >
                                                      <div className="flex items-start justify-between gap-2">
                                                        <span className="text-xs font-semibold text-slate-900">
                                                          {srv.serviceName}
                                                        </span>
                                                        <span
                                                          className={`px-2 py-0.5 text-[11px] font-semibold border rounded-md whitespace-nowrap shrink-0 ${sMeta.bgClass} ${sMeta.textClass}`}
                                                        >
                                                          {sMeta.label}
                                                        </span>
                                                      </div>
                                                      {srv.quantityOrScope && (
                                                        <div className="text-[11px] text-slate-600">
                                                          Quy mô: {srv.quantityOrScope}
                                                        </div>
                                                      )}
                                                      {srv.adminNote && (
                                                        <div className="text-[11px] text-indigo-700 font-medium">
                                                          Phản hồi Admin: {srv.adminNote}
                                                        </div>
                                                      )}
                                                    </div>
                                                  );
                                                })}
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    </article>
                                  );
                                })}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </section>
            )}
          </div>
        </div>
      </main>

      {/* Enterprise Corporate Footer across all public views */}
      <PublicFooter
        publicContact={publicContact}
        activePage={activePage}
        onNavigatePage={smoothNavigatePage}
        onBookOrganization={handleBookOrganization}
      />

      {/* Feedback Modal with smooth scale + backdrop-blur enter/exit */}
      <AnimatedModal
        isOpen={Boolean(feedbackReg)}
        onClose={() => setFeedbackReg(null)}
        maxWidthClassName="max-w-md"
        backdropClassName="bg-slate-900/50 backdrop-blur-xs p-4"
        panelClassName="bg-white border border-slate-200 rounded-2xl w-full p-6 space-y-4 shadow-xl"
      >
        {activeFeedbackReg && (
          <>
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
            <p className="text-xs text-slate-500">{activeFeedbackReg.eventTitle}</p>

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
                      className="p-1 cursor-pointer transition-transform hover:scale-110"
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
                  className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-slate-900"
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setFeedbackReg(null)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-full cursor-pointer"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  disabled={sendingFeedback}
                  className="px-5 py-2 text-sm font-semibold text-white bg-slate-950 hover:bg-slate-800 rounded-full cursor-pointer disabled:opacity-60"
                >
                  {sendingFeedback ? 'Đang gửi...' : 'Gửi đánh giá'}
                </button>
              </div>
            </form>
          </>
        )}
      </AnimatedModal>
    </div>
  );
}
