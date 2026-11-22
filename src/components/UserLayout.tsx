import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Bookmark,
  Calendar,
  CalendarDays,
  Check,
  CheckCircle2,
  ClipboardList,
  Copy,
  Image as ImageIcon,
  Layers,
  Loader2,
  LogIn,
  LogOut,
  MapPin,
  Menu,
  MessageSquare,
  Plus,
  Search,
  Send,
  ShieldCheck,
  Star,
  Ticket,
  Users,
  X,
} from 'lucide-react';
import {
  createOrganizerEventRequest,
  submitFeedback,
  updateRegistrationStatus,
} from '../services/dataService';
import { ContactPage } from './ContactPage';
import { EventBanner } from './EventBanner';
import { EventDetailPage } from './EventDetailPage';
import {
  EventServiceSelector,
  type ServiceSelectionItem,
} from './EventServiceSelector';
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
  DEFAULT_EVENT_BANNERS,
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
  PreselectedServiceBooking,
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
  regCountsByEvent?: Record<string, number>;
  regCountsAvailable?: boolean;
  pendingServiceBooking?: PreselectedServiceBooking | null;
  feedbacks: FeedbackItem[];
  publicContact: PublicContactInfo;
  permissionWarning?: string | null;
  onNavigatePage: (
    page: 'discover' | 'services' | 'contact' | 'tickets',
    tab?: 'registered' | 'requests'
  ) => void;
  onOpenEventDetail: (eventId: string) => void;
  onRequestServiceBooking?: (preset?: PreselectedServiceBooking) => void;
  onConsumePendingBooking?: () => void;
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
  regCountsByEvent,
  regCountsAvailable = false,
  pendingServiceBooking,
  feedbacks,
  publicContact,
  permissionWarning,
  onNavigatePage,
  onOpenEventDetail,
  onRequestServiceBooking,
  onConsumePendingBooking,
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
  const [cancellingRegId, setCancellingRegId] = useState<string | null>(null);
  const [copiedRegId, setCopiedRegId] = useState<string | null>(null);
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
  const [bookingPackageLabel, setBookingPackageLabel] = useState<string | null>(null);

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
    Record<string, ServiceSelectionItem>
  >(() => {
    const initial: Record<string, ServiceSelectionItem> = {};
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
  const [reqFormError, setReqFormError] = useState<string | null>(null);
  const reqFormContainerRef = useRef<HTMLDivElement | null>(null);

  function createDefaultSelectedServices(): Record<string, ServiceSelectionItem> {
    const initial: Record<string, ServiceSelectionItem> = {};
    for (const s of SYSTEM_SERVICE_CATALOG) {
      initial[s.key] = {
        enabled: s.key === 'av_stage' || s.key === 'checkin_staff',
        quantityOrScope: '',
        clientNote: '',
      };
    }
    return initial;
  }

  function applyServiceBookingPreset(preset?: PreselectedServiceBooking | null) {
    if (!preset) {
      setBookingPackageLabel(null);
      return;
    }
    if (preset.serviceKeys && preset.serviceKeys.length > 0) {
      const next: Record<string, ServiceSelectionItem> = {};
      for (const s of SYSTEM_SERVICE_CATALOG) {
        next[s.key] = {
          enabled: preset.serviceKeys.includes(s.key),
          quantityOrScope: '',
          clientNote: '',
        };
      }
      setReqSelectedServices(next);
    }
    if (
      preset.suggestedCategory &&
      (EVENT_CATEGORIES as readonly string[]).includes(preset.suggestedCategory)
    ) {
      setReqCategory(preset.suggestedCategory);
    }
    setBookingPackageLabel(preset.packageTitle || null);
  }

  useEffect(() => {
    setMyEventsTab(activeMyEventsTab);
  }, [activeMyEventsTab]);

  useEffect(() => {
    if (openCreateRequestSignal > 0) {
      setMyEventsTab('requests');
      setShowCreateRequestForm(true);
      if (pendingServiceBooking) {
        applyServiceBookingPreset(pendingServiceBooking);
        onConsumePendingBooking?.();
      }
      window.setTimeout(() => {
        reqFormContainerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 180);
    }
  }, [openCreateRequestSignal, pendingServiceBooking, onConsumePendingBooking]);

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

  function getLiveRegisteredCount(ev: EventItem): number {
    if (regCountsAvailable && regCountsByEvent) {
      return regCountsByEvent[ev.id] ?? 0;
    }
    return ev.registeredCount || 0;
  }

  const heroMetrics = useMemo(() => {
    const totalEvents = publicEvents.length;
    const totalRegistrations = publicEvents.reduce(
      (acc, ev) =>
        acc +
        (regCountsAvailable && regCountsByEvent
          ? regCountsByEvent[ev.id] ?? 0
          : ev.registeredCount || 0),
      0
    );
    const activeEvents = publicEvents.filter(
      (ev) => ev.status !== 'cancelled' && ev.maxSlots > 0
    );
    const avgFillRate =
      activeEvents.length > 0
        ? Math.round(
            activeEvents.reduce((acc, ev) => {
              const count =
                regCountsAvailable && regCountsByEvent
                  ? regCountsByEvent[ev.id] ?? 0
                  : ev.registeredCount || 0;
              return acc + Math.min(100, (count / ev.maxSlots) * 100);
            }, 0) / activeEvents.length
          )
        : 0;

    return {
      totalEvents,
      totalRegistrations,
      avgFillRate,
    };
  }, [publicEvents, regCountsAvailable, regCountsByEvent]);

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

  function handleBookOrganization(preset?: PreselectedServiceBooking) {
    const validPreset =
      preset && Array.isArray(preset.serviceKeys) ? preset : undefined;
    if (!currentUser) {
      if (onRequestServiceBooking) {
        onRequestServiceBooking(validPreset);
      } else {
        onOpenAuth('register');
      }
      return;
    }
    if (currentUser.role === 'admin' && onSwitchToAdmin) {
      onSwitchToAdmin();
      return;
    }
    if (validPreset) {
      applyServiceBookingPreset(validPreset);
    } else {
      setBookingPackageLabel(null);
    }
    smoothNavigatePage('tickets', 'requests', true);
    window.setTimeout(() => {
      reqFormContainerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 220);
  }

  function failRequestValidation(message: string) {
    setReqFormError(message);
    onNotify(message, 'error');
    reqFormContainerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  async function handleSubmitEventRequest(e: FormEvent) {
    e.preventDefault();
    if (reqSubmitting) return;
    setReqFormError(null);

    if (!currentUser) {
      onOpenAuth('login');
      return;
    }

    const missingFields: string[] = [];
    if (!reqTitle.trim()) missingFields.push('Tên sự kiện');
    if (!reqStartTime.trim() || !reqEndTime.trim()) missingFields.push('Thời gian tổ chức');
    if (!reqLocation.trim()) missingFields.push('Địa điểm tổ chức');
    if (!reqDescription.trim()) missingFields.push('Mô tả sự kiện');

    if (missingFields.length > 0) {
      failRequestValidation(
        `Vui lòng điền đầy đủ thông tin bắt buộc: ${missingFields.join(', ')}.`
      );
      return;
    }

    if (!reqOrganizerName.trim()) {
      failRequestValidation('Vui lòng nhập đơn vị hoặc người đứng tên tổ chức.');
      return;
    }

    const startMs = new Date(reqStartTime).getTime();
    const endMs = new Date(reqEndTime).getTime();
    if (Number.isNaN(startMs) || Number.isNaN(endMs)) {
      failRequestValidation('Thời gian bắt đầu hoặc kết thúc chưa hợp lệ.');
      return;
    }
    if (endMs <= startMs) {
      failRequestValidation('Thời gian kết thúc phải sau thời gian bắt đầu sự kiện.');
      return;
    }

    const safeMaxSlots = Number(reqMaxSlots);
    if (!Number.isFinite(safeMaxSlots) || safeMaxSlots < 10) {
      failRequestValidation('Quy mô khách dự kiến cần tối thiểu 10 người.');
      return;
    }

    const servicesPayload: EventServiceRequest[] = SYSTEM_SERVICE_CATALOG.filter(
      (s) => reqSelectedServices[s.key]?.enabled
    ).map((s, idx) => ({
      id: `srv-${Date.now()}-${idx}`,
      serviceKey: s.key,
      serviceName: s.name,
      quantityOrScope: (reqSelectedServices[s.key]?.quantityOrScope ?? '').trim(),
      clientNote: (reqSelectedServices[s.key]?.clientNote ?? '').trim(),
      adminNote: '',
      status: 'pending',
    }));

    if (reqCustomServiceName.trim()) {
      servicesPayload.push({
        id: `srv-custom-${Date.now()}`,
        serviceKey: 'custom',
        serviceName: reqCustomServiceName.trim(),
        quantityOrScope: '',
        clientNote: '',
        adminNote: '',
        status: 'pending',
      });
    }

    if (servicesPayload.length === 0) {
      failRequestValidation(
        'Vui lòng chọn ít nhất 1 dịch vụ đi kèm hoặc chọn nhanh một Combo ở phía trên.'
      );
      return;
    }

    setReqSubmitting(true);
    try {
      await createOrganizerEventRequest({
        title: reqTitle.trim(),
        category: reqCategory || EVENT_CATEGORIES[0],
        startTime: reqStartTime,
        endTime: reqEndTime,
        location: reqLocation.trim(),
        maxSlots: Math.round(safeMaxSlots),
        description: reqDescription.trim(),
        bannerUrl: reqBannerUrl.trim() || DEFAULT_EVENT_BANNERS[0].url,
        organizerName: reqOrganizerName.trim() || currentUser.fullName || 'Thành viên EventFlow',
        clientUserId: currentUser.uid || '',
        clientName: (currentUser.fullName ?? '').trim() || 'Thành viên EventFlow',
        clientEmail: (currentUser.email ?? '').trim(),
        clientPhone: (currentUser.phone ?? '').trim(),
        requestedServices: servicesPayload,
      });

      setReqFormError(null);
      setReqTitle('');
      setReqLocation('');
      setReqDescription('');
      setReqCustomServiceName('');
      setBookingPackageLabel(null);
      setReqSelectedServices(createDefaultSelectedServices());
      setShowCreateRequestForm(false);
      setMyEventsTab('requests');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      onNotify(
        'Đã gửi yêu cầu tổ chức sự kiện thành công lên Cloud Firestore. Ban quản trị sẽ xem xét và phản hồi sớm.'
      );
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Không thể gửi yêu cầu tổ chức sự kiện.';
      setReqFormError(msg);
      onNotify(msg, 'error');
    } finally {
      setReqSubmitting(false);
    }
  }

  async function handleCancelTicket(reg: RegistrationItem) {
    if (cancellingRegId) return;
    setCancellingRegId(reg.id);
    try {
      await updateRegistrationStatus(reg, 'cancelled');
      onNotify(`Đã hủy đăng ký ${reg.ticketCode} và hoàn trả chỗ trống lên Firestore.`);
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'Không thể hủy đăng ký.', 'error');
    } finally {
      setCancellingRegId(null);
    }
  }

  async function handleCopyRegId(regId: string) {
    try {
      await navigator.clipboard.writeText(regId);
      setCopiedRegId(regId);
      onNotify(`Đã sao chép mã đăng ký ${regId}.`);
      window.setTimeout(() => {
        setCopiedRegId((prev) => (prev === regId ? null : prev));
      }, 2000);
    } catch {
      onNotify('Không thể sao chép tự động, vui lòng bôi đen mã.', 'error');
    }
  }

  async function handleSubmitTicketFeedback(e: FormEvent) {
    e.preventDefault();
    if (sendingFeedback || !currentUser || !feedbackReg || !ratingComment.trim()) return;
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
                  className="ef-btn-tactile inline-flex items-center gap-1.5 h-8 px-4 text-xs font-semibold text-white bg-slate-950 hover:bg-slate-800 rounded-full whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Đăng ký</span>
                </button>
              </div>
            )}
          </div>

          <button
            type="button"
            aria-label={mobileMenuOpen ? 'Đóng menu điều hướng' : 'Mở menu điều hướng'}
            aria-expanded={mobileMenuOpen}
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="md:hidden min-w-[44px] min-h-[44px] inline-flex items-center justify-center rounded-xl text-slate-700 hover:bg-slate-100 active:scale-[0.97] transition-all cursor-pointer"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Slide-out Mobile Navigation Drawer */}
      <div
        className={`fixed inset-0 z-50 md:hidden transition-opacity duration-[320ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${
          mobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        aria-hidden={!mobileMenuOpen}
      >
        <div
          className="absolute inset-0 bg-slate-900/45 backdrop-blur-sm"
          onClick={() => setMobileMenuOpen(false)}
        />
        <aside
          role="dialog"
          aria-modal="true"
          aria-label="Menu điều hướng di động"
          className={`absolute inset-y-0 right-0 w-[84vw] max-w-xs bg-white border-l border-slate-200 shadow-2xl flex flex-col justify-between transition-transform duration-[320ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${
            mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          <div className="flex flex-col flex-1 min-h-0 overflow-y-auto">
            <div className="h-14 px-4 border-b border-slate-200/80 flex items-center justify-between shrink-0">
              <button
                type="button"
                onClick={() => smoothNavigatePage('discover')}
                className="inline-flex items-center gap-2 text-[15px] font-bold tracking-tight text-slate-900 cursor-pointer"
              >
                <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-rose-500 to-orange-500 text-white flex items-center justify-center shadow-xs">
                  <CalendarDays className="w-4 h-4" />
                </span>
                <span>EventFlow</span>
              </button>
              <button
                type="button"
                aria-label="Đóng menu điều hướng"
                onClick={() => setMobileMenuOpen(false)}
                className="min-w-[44px] min-h-[44px] inline-flex items-center justify-center rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {currentUser && (
              <div className="mx-4 mt-4 p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl border text-sm font-bold flex items-center justify-center shrink-0 ${
                    currentUser.role === 'admin'
                      ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                      : 'bg-white border-slate-200 text-slate-800'
                  }`}
                >
                  {currentUser.fullName.trim().charAt(0).toUpperCase() || 'U'}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold text-slate-900 truncate">
                    {currentUser.fullName}
                  </div>
                  <div className="text-xs text-slate-500 truncate">{currentUser.email}</div>
                  <span
                    className={`mt-1 inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-full ${
                      currentUser.role === 'admin'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-200/80 text-slate-700'
                    }`}
                  >
                    {currentUser.role === 'admin' && <ShieldCheck className="w-3 h-3" />}
                    <span>
                      {currentUser.role === 'admin' ? 'Quản trị viên' : 'Tài khoản thành viên'}
                    </span>
                  </span>
                </div>
              </div>
            )}

            <nav className="p-4 space-y-1.5">
              <div className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Điều hướng
              </div>
              <button
                type="button"
                onClick={() => smoothNavigatePage('discover')}
                className={`w-full min-h-[44px] flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm transition-colors cursor-pointer ${
                  activePage === 'discover' || activePage === 'event_detail'
                    ? 'bg-slate-900 text-white font-semibold'
                    : 'text-slate-700 hover:bg-slate-100 font-medium'
                }`}
              >
                <span>Khám phá sự kiện</span>
                <ArrowRight className="w-4 h-4 opacity-60" />
              </button>
              <button
                type="button"
                onClick={() => smoothNavigatePage('services')}
                className={`w-full min-h-[44px] flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm transition-colors cursor-pointer ${
                  activePage === 'services'
                    ? 'bg-slate-900 text-white font-semibold'
                    : 'text-slate-700 hover:bg-slate-100 font-medium'
                }`}
              >
                <span>Dịch vụ tổ chức sự kiện</span>
                <ArrowRight className="w-4 h-4 opacity-60" />
              </button>
              <button
                type="button"
                onClick={() => smoothNavigatePage('contact')}
                className={`w-full min-h-[44px] flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm transition-colors cursor-pointer ${
                  activePage === 'contact'
                    ? 'bg-slate-900 text-white font-semibold'
                    : 'text-slate-700 hover:bg-slate-100 font-medium'
                }`}
              >
                <span>Liên hệ Ban quản trị</span>
                <ArrowRight className="w-4 h-4 opacity-60" />
              </button>
              {currentUser && (
                <button
                  type="button"
                  onClick={() => smoothNavigatePage('tickets')}
                  className={`w-full min-h-[44px] flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm transition-colors cursor-pointer ${
                    activePage === 'tickets'
                      ? 'bg-slate-900 text-white font-semibold'
                      : 'text-slate-700 hover:bg-slate-100 font-medium'
                  }`}
                >
                  <span>Sự kiện của tôi</span>
                  <span
                    className={`text-xs font-bold px-2 py-0.5 rounded-full tabular-nums ${
                      activePage === 'tickets'
                        ? 'bg-white/20 text-white'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {myRegistrations.length + myRequests.length}
                  </span>
                </button>
              )}

              {onSwitchToAdmin && (
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onSwitchToAdmin();
                  }}
                  className="w-full min-h-[44px] mt-2 flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200/80 hover:bg-indigo-100 transition-colors cursor-pointer"
                >
                  <span className="inline-flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Không gian Quản trị viên</span>
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </nav>
          </div>

          <div className="p-4 border-t border-slate-200/80 bg-slate-50/70 space-y-2.5 shrink-0">
            {currentUser ? (
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onLogout();
                }}
                className="w-full min-h-[44px] inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-rose-700 bg-white hover:bg-rose-50 border border-rose-200/80 transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Đăng xuất tài khoản</span>
              </button>
            ) : (
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenAuth('login');
                  }}
                  className="min-h-[44px] px-3 py-2.5 rounded-xl text-sm font-semibold text-slate-800 bg-white border border-slate-200 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Đăng nhập
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenAuth('register');
                  }}
                  className="min-h-[44px] px-3 py-2.5 rounded-xl text-sm font-semibold text-white bg-slate-950 hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Đăng ký
                </button>
              </div>
            )}
          </div>
        </aside>
      </div>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-8">
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
                  liveRegisteredCount={getLiveRegisteredCount(activeDetailEvent)}
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
                  onCreateFirstEvent={() => handleBookOrganization()}
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
                {!eventsLoading && featuredEvent && (() => {
                  const featuredRegistered = getLiveRegisteredCount(featuredEvent);
                  const featuredRemaining = Math.max(0, featuredEvent.maxSlots - featuredRegistered);
                  const featuredIsFull =
                    featuredRemaining === 0 &&
                    (featuredEvent.status === 'ongoing' || featuredEvent.status === 'upcoming');
                  const featuredFillPercent = Math.min(
                    100,
                    Math.round((featuredRegistered / Math.max(1, featuredEvent.maxSlots)) * 100)
                  );
                  const featuredMeta =
                    EVENT_STATUS_META[featuredEvent.status] || EVENT_STATUS_META.upcoming;

                  return (
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
                            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                              <span className="font-semibold text-rose-600">
                                {featuredEvent.category}
                              </span>
                              <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full border font-semibold ${
                                  featuredIsFull
                                    ? 'bg-rose-50 border-rose-200 text-rose-700'
                                    : `${featuredMeta.bgClass} ${featuredMeta.textClass}`
                                }`}
                              >
                                {featuredIsFull ? 'Đã đủ chỗ' : featuredMeta.label}
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

                          <div className="pt-4 border-t border-slate-100 space-y-3">
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between text-xs tabular-nums">
                                <span className="text-slate-500">
                                  Đã đăng ký:{' '}
                                  <strong className="text-slate-900">
                                    {featuredRegistered}/{featuredEvent.maxSlots}
                                  </strong>
                                </span>
                                <span
                                  className={`font-semibold ${
                                    featuredIsFull ? 'text-rose-600' : 'text-emerald-700'
                                  }`}
                                >
                                  {featuredIsFull
                                    ? 'Hết chỗ trống'
                                    : `Còn ${featuredRemaining} chỗ`}
                                </span>
                              </div>
                              <AnimatedProgressBar
                                percent={featuredFillPercent}
                                barClassName={
                                  featuredIsFull
                                    ? 'bg-rose-500'
                                    : featuredFillPercent >= 85
                                    ? 'bg-amber-500'
                                    : 'bg-gradient-to-r from-rose-500 to-orange-500'
                                }
                              />
                            </div>
                            <div className="flex justify-end">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  smoothOpenEventDetail(featuredEvent.id);
                                }}
                                className="ef-btn-tactile w-full sm:w-auto h-11 sm:h-10 px-5 text-sm font-semibold text-white bg-slate-950 hover:bg-slate-800 rounded-full cursor-pointer whitespace-nowrap"
                              >
                                Xem chi tiết &amp; Đăng ký
                              </button>
                            </div>
                          </div>
                        </div>
                      </article>
                    </section>
                  </RevealBlock>
                  );
                })()}

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
                    <div className="bg-white border border-slate-200 rounded-2xl p-8 sm:p-12 text-center">
                      <Calendar className="w-10 h-10 text-slate-300 mx-auto" />
                      <h2 className="mt-4 text-base font-bold text-slate-900">
                        {publicEvents.length === 0
                          ? 'Hiện chưa có sự kiện công khai nào đang mở'
                          : 'Không tìm thấy sự kiện phù hợp'}
                      </h2>
                      <p className="mt-1.5 text-sm text-slate-500 max-w-lg mx-auto">
                        {publicEvents.length === 0
                          ? 'Các sự kiện mới đang được Ban quản trị cập nhật trực tiếp trên hệ thống. Bạn có thể gửi yêu cầu tổ chức sự kiện riêng hoặc liên hệ để được hỗ trợ.'
                          : 'Thử thay đổi bộ lọc danh mục, trạng thái hoặc xóa từ khóa tìm kiếm.'}
                      </p>
                      <div className="mt-5 flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center justify-center gap-3">
                        {publicEvents.length > 0 && (
                          <button
                            type="button"
                            onClick={resetAllFilters}
                            className="min-h-[42px] px-5 py-2.5 text-sm font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-full cursor-pointer transition-colors"
                          >
                            Đặt lại bộ lọc
                          </button>
                        )}
                        {!currentUser && (
                          <button
                            type="button"
                            onClick={() => onOpenAuth('login')}
                            className="min-h-[42px] px-5 py-2.5 text-sm font-semibold text-white bg-slate-950 hover:bg-slate-800 rounded-full cursor-pointer transition-colors"
                          >
                            Đăng nhập / Đăng ký ngay
                          </button>
                        )}
                        {currentUser && currentUser.role !== 'admin' && publicEvents.length === 0 && (
                          <button
                            type="button"
                            onClick={() => smoothNavigatePage('tickets', 'requests', true)}
                            className="min-h-[42px] px-5 py-2.5 text-sm font-semibold text-white bg-slate-950 hover:bg-slate-800 rounded-full cursor-pointer transition-colors"
                          >
                            Tạo yêu cầu tổ chức sự kiện
                          </button>
                        )}
                        {publicEvents.length === 0 && (
                          <button
                            type="button"
                            onClick={() => smoothNavigatePage('contact')}
                            className="min-h-[42px] px-5 py-2.5 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-full cursor-pointer transition-colors"
                          >
                            Liên hệ Ban quản trị
                          </button>
                        )}
                        {onSwitchToAdmin && publicEvents.length === 0 && (
                          <button
                            type="button"
                            onClick={onSwitchToAdmin}
                            className="min-h-[42px] px-5 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-full cursor-pointer transition-colors"
                          >
                            Mở Không gian Quản trị
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {filteredEvents.map((ev, idx) => {
                        const statusMeta =
                          EVENT_STATUS_META[ev.status] || EVENT_STATUS_META.upcoming;
                        const actualRegistered = getLiveRegisteredCount(ev);
                        const remaining = Math.max(0, ev.maxSlots - actualRegistered);
                        const isFull =
                          remaining === 0 &&
                          (ev.status === 'ongoing' || ev.status === 'upcoming');
                        const fillPercent = Math.min(
                          100,
                          Math.round((actualRegistered / Math.max(1, ev.maxSlots)) * 100)
                        );
                        const myReg = activeRegistrationMap.get(ev.id);
                        const isSaved = savedEventIds.includes(ev.id);

                        return (
                          <div
                            key={ev.id}
                            style={{ animationDelay: `${Math.min(idx, 11) * 60}ms` }}
                            className="animate-ef-fade-up h-full"
                          >
                            <article
                              onClick={() => smoothOpenEventDetail(ev.id)}
                              className="group h-full ef-card-sheen bg-white border border-slate-200/80 rounded-2xl overflow-hidden flex flex-col justify-between transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-1.5 hover:border-orange-200 hover:shadow-[0_18px_36px_-14px_rgba(15,23,42,0.16)] active:scale-[0.985] cursor-pointer"
                            >
                              <div>
                                <div className="relative aspect-video w-full overflow-hidden bg-slate-100">
                                  <EventBanner
                                    src={ev.bannerUrl}
                                    alt={ev.title}
                                    className="w-full h-full transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.05]"
                                  />
                                  <div className="absolute top-3 left-3">
                                    <span
                                      className={`inline-flex items-center px-2.5 py-1 text-[11px] font-semibold border rounded-full shadow-xs backdrop-blur-xs ${
                                        isFull
                                          ? 'bg-rose-50/95 border-rose-200 text-rose-700'
                                          : `${statusMeta.bgClass} ${statusMeta.textClass}`
                                      }`}
                                    >
                                      {isFull ? 'Đã đủ chỗ' : statusMeta.label}
                                    </span>
                                  </div>
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
                                    <span className="font-semibold text-rose-600 truncate">
                                      {ev.category}
                                    </span>
                                    <span className="text-slate-500 tabular-nums shrink-0">
                                      {formatShortDateVN(ev.startTime)}
                                    </span>
                                  </div>

                                  <h3 className="mt-2 text-base font-bold text-slate-900 leading-snug line-clamp-2 group-hover:text-rose-600 transition-colors">
                                    {ev.title}
                                  </h3>

                                  <div className="mt-3 space-y-1.5 text-xs text-slate-500">
                                    <div className="flex items-center gap-2 tabular-nums">
                                      <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                      <span className="truncate">
                                        {formatDateTimeVN(ev.startTime)}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                      <span className="truncate">{ev.location}</span>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              <div className="px-5 pb-5 pt-1">
                                <div className="mb-3.5 space-y-1.5">
                                  <div className="flex items-center justify-between text-xs tabular-nums">
                                    <span className="inline-flex items-center gap-1.5 text-slate-600">
                                      <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                      <span>
                                        {actualRegistered}/{ev.maxSlots} đã đăng ký
                                      </span>
                                    </span>
                                    <span
                                      className={`font-semibold ${
                                        isFull ? 'text-rose-600' : 'text-slate-700'
                                      }`}
                                    >
                                      {isFull ? 'Hết chỗ' : `Còn ${remaining} chỗ`}
                                    </span>
                                  </div>
                                  <AnimatedProgressBar
                                    percent={fillPercent}
                                    barClassName={
                                      isFull
                                        ? 'bg-rose-500'
                                        : fillPercent >= 85
                                        ? 'bg-amber-500'
                                        : 'bg-gradient-to-r from-rose-500 to-orange-500'
                                    }
                                  />
                                </div>

                                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                                  <span className="text-xs text-slate-500 truncate inline-flex items-center gap-1">
                                    {ev.organizer}
                                    {ev.organizerVerified !== false && (
                                      <BadgeCheck className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                                    )}
                                  </span>
                                  <span className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-full bg-slate-950 text-white group-hover:bg-rose-600 whitespace-nowrap shrink-0 transition-colors duration-200">
                                    {myReg
                                      ? 'Xem vé của tôi'
                                      : isFull || ev.status === 'paused' || ev.status === 'completed' || ev.status === 'cancelled'
                                      ? 'Xem chi tiết'
                                      : 'Đăng ký ngay'}
                                    <ArrowRight className="w-3 h-3" />
                                  </span>
                                </div>
                              </div>
                            </article>
                          </div>
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
                      className="ef-btn-tactile w-full sm:w-auto inline-flex items-center justify-center gap-1.5 h-10 sm:h-9 px-4 text-xs font-semibold text-white bg-slate-950 hover:bg-slate-800 rounded-full whitespace-nowrap shrink-0 cursor-pointer"
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
                      className="ef-btn-tactile w-full sm:w-auto min-h-[44px] inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-slate-950 hover:bg-slate-800 rounded-full shadow-xs cursor-pointer whitespace-nowrap shrink-0"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Tạo yêu cầu tổ chức sự kiện</span>
                    </button>
                  )}
                </div>

                {!currentUser ? (
                  <div className="bg-white border border-slate-200 rounded-2xl p-8 sm:p-10 text-center">
                    <Ticket className="w-10 h-10 text-slate-300 mx-auto" />
                    <p className="mt-3 text-sm text-slate-600">
                      Hãy đăng nhập để xem sự kiện bạn đã đăng ký tham gia hoặc gửi yêu cầu tổ chức
                      sự kiện mới.
                    </p>
                    <button
                      type="button"
                      onClick={() => onOpenAuth('login')}
                      className="mt-4 min-h-[44px] px-5 py-2.5 text-sm font-semibold text-white bg-slate-950 hover:bg-slate-800 rounded-full cursor-pointer"
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
                        className="relative w-full sm:w-auto grid grid-cols-2 sm:inline-flex items-center gap-1 p-1 bg-slate-100 border border-slate-200/80 rounded-full"
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
                          className={`relative z-10 min-h-[40px] inline-flex items-center justify-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-2 text-xs sm:text-sm rounded-full transition-colors cursor-pointer whitespace-nowrap ${
                            myEventsTab === 'registered'
                              ? 'text-slate-900 font-semibold'
                              : 'text-slate-600 hover:text-slate-900 font-medium'
                          }`}
                        >
                          <Ticket className="w-3.5 h-3.5 shrink-0" />
                          <span className="sm:hidden">Đã ĐK ({myRegistrations.length})</span>
                          <span className="hidden sm:inline">
                            Đã đăng ký tham gia ({myRegistrations.length})
                          </span>
                        </button>
                        <button
                          ref={setMyEventsTabRef('requests')}
                          type="button"
                          onClick={() => {
                            setMyEventsTab('requests');
                            onNavigatePage('tickets', 'requests');
                          }}
                          className={`relative z-10 min-h-[40px] inline-flex items-center justify-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-2 text-xs sm:text-sm rounded-full transition-colors cursor-pointer whitespace-nowrap ${
                            myEventsTab === 'requests'
                              ? 'text-slate-900 font-semibold'
                              : 'text-slate-600 hover:text-slate-900 font-medium'
                          }`}
                        >
                          <ClipboardList className="w-3.5 h-3.5 shrink-0" />
                          <span className="sm:hidden">Yêu cầu ({myRequests.length})</span>
                          <span className="hidden sm:inline">
                            Yêu cầu tổ chức ({myRequests.length})
                          </span>
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
                            {myRegistrations.map((reg, idx) => {
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
                                <div
                                  key={reg.id}
                                  style={{ animationDelay: `${Math.min(idx, 8) * 60}ms` }}
                                  className="animate-ef-fade-up h-full"
                                >
                                  <article
                                    className="h-full bg-white border border-slate-200 rounded-2xl overflow-hidden flex flex-col sm:flex-row transition-all duration-200 hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-md"
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

                                      <div className="mt-3 p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-wrap items-center justify-between gap-2 text-xs">
                                        <div className="min-w-0">
                                          <span className="text-[11px] text-slate-500 block">
                                            Mã đăng ký (Firestore ID)
                                          </span>
                                          <span className="font-mono text-[11px] font-semibold text-slate-800 break-all">
                                            {reg.id}
                                          </span>
                                        </div>
                                        <button
                                          type="button"
                                          onClick={() => handleCopyRegId(reg.id)}
                                          className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg cursor-pointer shrink-0"
                                        >
                                          {copiedRegId === reg.id ? (
                                            <>
                                              <Check className="w-3 h-3 text-emerald-600" />
                                              <span>Đã chép</span>
                                            </>
                                          ) : (
                                            <>
                                              <Copy className="w-3 h-3" />
                                              <span>Sao chép</span>
                                            </>
                                          )}
                                        </button>
                                      </div>
                                    </div>

                                    <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2.5">
                                      <span className="font-mono text-xs font-semibold text-slate-700">
                                        Vé QR: {reg.ticketCode}
                                      </span>
                                      <div className="flex flex-wrap items-center gap-2">
                                        {linkedEvent && (
                                          <button
                                            type="button"
                                            onClick={() => smoothOpenEventDetail(linkedEvent.id)}
                                            className="min-h-[38px] px-3.5 py-1.5 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-full cursor-pointer transition-colors"
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
                                            className="min-h-[38px] inline-flex items-center gap-1 px-3.5 py-1.5 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-full cursor-pointer transition-colors"
                                          >
                                            <Star className="w-3.5 h-3.5" />
                                            <span>Đánh giá</span>
                                          </button>
                                        )}
                                        {canCancel && (
                                          <button
                                            type="button"
                                            disabled={cancellingRegId === reg.id}
                                            onClick={() => handleCancelTicket(reg)}
                                            className="min-h-[38px] inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-full cursor-pointer transition-colors disabled:opacity-60"
                                          >
                                            {cancellingRegId === reg.id && (
                                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                            )}
                                            <span>
                                              {cancellingRegId === reg.id
                                                ? 'Đang hủy...'
                                                : 'Hủy tham gia'}
                                            </span>
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  <div className="sm:w-44 bg-slate-50 border-t sm:border-t-0 sm:border-l border-dashed border-slate-300 p-4 sm:p-5 flex flex-col items-center justify-center text-center shrink-0">
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
                                </div>
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
                          <div
                            ref={reqFormContainerRef}
                            className="max-w-4xl mx-auto bg-white border border-slate-200 rounded-2xl p-4 sm:p-8 space-y-6 animate-ef-form-spring"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
                              <div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setReqFormError(null);
                                    setShowCreateRequestForm(false);
                                  }}
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

                            {bookingPackageLabel && (
                              <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-indigo-50/80 border border-indigo-200 text-indigo-900 text-xs sm:text-sm animate-ef-fade-in">
                                <Layers className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                                <div className="flex-1">
                                  Đã chọn sẵn cấu hình từ trang Dịch vụ:{' '}
                                  <strong className="font-semibold">{bookingPackageLabel}</strong>.
                                  Bạn có thể tùy chỉnh thêm hạng mục bên dưới trước khi gửi.
                                </div>
                              </div>
                            )}

                            {reqFormError && (
                              <div
                                role="alert"
                                className="flex items-start gap-2.5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm animate-ef-fade-in"
                              >
                                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                                <div className="flex-1 font-medium leading-relaxed">
                                  {reqFormError}
                                </div>
                                <button
                                  type="button"
                                  aria-label="Đóng thông báo lỗi"
                                  onClick={() => setReqFormError(null)}
                                  className="p-0.5 text-rose-500 hover:text-rose-700 rounded cursor-pointer"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}

                            <form onSubmit={handleSubmitEventRequest} noValidate className="space-y-6">
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
                                <div className="mt-2.5 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
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
                                          className="w-full h-14 sm:h-12 object-cover"
                                        />
                                        <div className="px-2 py-1 text-[11px] sm:text-[10px] font-medium text-slate-700 truncate bg-white">
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

                              {/* Enhanced Services Selector with Combo Presets & Quick Chips */}
                              <EventServiceSelector
                                selectedServices={reqSelectedServices}
                                customServiceName={reqCustomServiceName}
                                expectedGuestCount={reqMaxSlots}
                                onChangeSelectedServices={setReqSelectedServices}
                                onChangeCustomServiceName={setReqCustomServiceName}
                              />

                              <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2.5 sm:gap-3 pt-3 border-t border-slate-200">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setReqFormError(null);
                                    setShowCreateRequestForm(false);
                                  }}
                                  className="w-full sm:w-auto min-h-[44px] px-5 py-2.5 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-full cursor-pointer"
                                >
                                  Hủy
                                </button>
                                <button
                                  type="submit"
                                  disabled={reqSubmitting}
                                  className="ef-btn-tactile w-full sm:w-auto min-h-[44px] inline-flex items-center justify-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-slate-950 hover:bg-slate-800 rounded-full cursor-pointer disabled:opacity-60"
                                >
                                  {reqSubmitting ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <Send className="w-4 h-4" />
                                  )}
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
                                  className="ef-btn-tactile mt-4 inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-slate-950 hover:bg-slate-800 rounded-full cursor-pointer"
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
                                  const isRejected = ev.planningStatus === 'rejected';
                                  const currentStepIndex =
                                    ev.planningStatus === 'confirmed'
                                      ? 2
                                      : ev.planningStatus === 'planning'
                                      ? 1
                                      : ev.planningStatus === 'rejected'
                                      ? 2
                                      : 0;
                                  const stepItems = [
                                    { key: 'pending_review', label: 'Chờ duyệt' },
                                    { key: 'planning', label: 'Đang xử lý / Triển khai' },
                                    {
                                      key: isRejected ? 'rejected' : 'confirmed',
                                      label: isRejected ? 'Từ chối' : 'Đã duyệt',
                                    },
                                  ];
                                  const serviceFeedbacks = ev.requestedServices.filter(
                                    (s) => s.adminNote && s.adminNote.trim().length > 0
                                  );

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

                                        <div className="lg:col-span-8 p-4 sm:p-6 space-y-5">
                                          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 sm:gap-3">
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

                                            <div className="text-left sm:text-right text-xs text-slate-500 tabular-nums shrink-0">
                                              <div>Quy mô dự kiến: {ev.maxSlots} khách</div>
                                              {ev.isPublic && (
                                                <div className="mt-0.5 font-semibold text-indigo-700">
                                                  Đã đăng ký: {getLiveRegisteredCount(ev)}/{ev.maxSlots}
                                                </div>
                                              )}
                                            </div>
                                          </div>

                                          {/* Visual 3-Step Approval Timeline */}
                                          <div className="p-3.5 sm:p-4 rounded-xl bg-slate-50/90 border border-slate-200/80 space-y-2.5">
                                            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                                              <span>Tiến trình phê duyệt yêu cầu</span>
                                              <span className={planMeta.textClass}>{planMeta.label}</span>
                                            </div>
                                            <div className="grid grid-cols-3 gap-2">
                                              {stepItems.map((step, stepIdx) => {
                                                const isReached = stepIdx <= currentStepIndex;
                                                const isFinalReject = isRejected && stepIdx === 2;
                                                const isCurrent = stepIdx === currentStepIndex;

                                                return (
                                                  <div key={step.key} className="space-y-1.5">
                                                    <div
                                                      className={`h-1.5 rounded-full transition-colors ${
                                                        isFinalReject
                                                          ? 'bg-rose-500'
                                                          : isReached
                                                          ? isCurrent && ev.planningStatus === 'confirmed'
                                                            ? 'bg-emerald-500'
                                                            : 'bg-indigo-600'
                                                          : 'bg-slate-200'
                                                      }`}
                                                    />
                                                    <div className="flex items-center gap-1.5 text-[11px] leading-tight">
                                                      <span
                                                        className={`w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center shrink-0 tabular-nums ${
                                                          isFinalReject
                                                            ? 'bg-rose-600 text-white'
                                                            : isReached
                                                            ? isCurrent && ev.planningStatus === 'confirmed'
                                                              ? 'bg-emerald-600 text-white'
                                                              : 'bg-indigo-600 text-white'
                                                            : 'bg-slate-200 text-slate-500'
                                                        }`}
                                                      >
                                                        {isFinalReject ? (
                                                          <X className="w-2.5 h-2.5" />
                                                        ) : isReached && stepIdx < currentStepIndex ? (
                                                          <Check className="w-2.5 h-2.5" />
                                                        ) : (
                                                          stepIdx + 1
                                                        )}
                                                      </span>
                                                      <span
                                                        className={`truncate ${
                                                          isFinalReject
                                                            ? 'font-bold text-rose-700'
                                                            : isCurrent
                                                            ? 'font-bold text-slate-900'
                                                            : isReached
                                                            ? 'font-medium text-slate-700'
                                                            : 'text-slate-400'
                                                        }`}
                                                      >
                                                        {step.label}
                                                      </span>
                                                    </div>
                                                  </div>
                                                );
                                              })}
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
                                                      {srv.clientNote && (
                                                        <div className="text-[11px] text-slate-500">
                                                          Ghi chú của bạn: {srv.clientNote}
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

                                          {/* Prominent Admin Response Panel */}
                                          <div
                                            className={`p-3.5 rounded-xl border space-y-1.5 ${
                                              isRejected
                                                ? 'bg-rose-50/70 border-rose-200'
                                                : ev.adminResponseNote || serviceFeedbacks.length > 0
                                                ? 'bg-indigo-50/70 border-indigo-200'
                                                : 'bg-slate-50 border-slate-200/80'
                                            }`}
                                          >
                                            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                                              <MessageSquare
                                                className={`w-3.5 h-3.5 shrink-0 ${
                                                  isRejected ? 'text-rose-600' : 'text-indigo-600'
                                                }`}
                                              />
                                              <span>Phản hồi từ Ban quản trị</span>
                                            </div>
                                            {ev.adminResponseNote ? (
                                              <p className="text-xs sm:text-sm text-slate-800 leading-relaxed whitespace-pre-line">
                                                {ev.adminResponseNote}
                                              </p>
                                            ) : serviceFeedbacks.length > 0 ? (
                                              <ul className="space-y-1 text-xs text-slate-700">
                                                {serviceFeedbacks.map((sf) => (
                                                  <li key={sf.id}>
                                                    <strong className="text-slate-900">
                                                      {sf.serviceName}:
                                                    </strong>{' '}
                                                    {sf.adminNote}
                                                  </li>
                                                ))}
                                              </ul>
                                            ) : (
                                              <p className="text-xs text-slate-500 leading-relaxed">
                                                Yêu cầu của bạn đã được lưu trên Cloud Firestore.
                                                Ban quản trị sẽ cập nhật ghi chú điều phối và phản
                                                hồi chi tiết tại đây.
                                              </p>
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
        onBookOrganization={() => handleBookOrganization()}
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
                  className="ef-btn-tactile inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-slate-950 hover:bg-slate-800 rounded-full cursor-pointer disabled:opacity-60"
                >
                  {sendingFeedback && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>{sendingFeedback ? 'Đang gửi...' : 'Gửi đánh giá'}</span>
                </button>
              </div>
            </form>
          </>
        )}
      </AnimatedModal>
    </div>
  );
}
