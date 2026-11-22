import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  ClipboardList,
  Copy,
  Download,
  Edit3,
  ExternalLink,
  Globe,
  HelpCircle,
  LayoutDashboard,
  Loader2,
  Lock,
  LogOut,
  Mail,
  Menu,
  MessageSquare,
  Phone,
  Plus,
  QrCode,
  Save,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserCheck,
  UserPlus,
  Users,
  Wrench,
  X,
} from 'lucide-react';
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
  checkInByTicketCode,
  createEvent,
  deleteEvent,
  duplicateEvent,
  updateContactInquiryStatus,
  updateEvent,
  updateEventInvitedGuests,
  updateEventServices,
  updatePublicContact,
  updateRegistrationStatus,
} from '../services/dataService';
import { AccountMenuDropdown } from './AccountMenuDropdown';
import { EventBanner } from './EventBanner';
import { EventImagePicker } from './EventImagePicker';
import {
  AnimatedModal,
  AnimatedNumber,
  handleSpotlightMove,
  prefersReducedMotion,
  triggerPageProgress,
  useSlidingIndicator,
} from './MotionPrimitives';
import {
  EVENT_CATEGORIES,
  EVENT_STATUS_META,
  exportRegistrationsToCSV,
  formatDateTimeVN,
  formatShortDateVN,
  getEventCategoryMeta,
  GUEST_RSVP_META,
  GUEST_TYPE_OPTIONS,
  matchesEventCategoryFilter,
  normalizeEventCategory,
  PLANNING_STATUS_META,
  REGISTRATION_STATUS_META,
  SERVICE_STATUS_META,
  STANDARD_EVENT_CATEGORIES,
  SYSTEM_SERVICE_CATALOG,
  toDatetimeLocalValue,
} from '../utils/formatters';
import type {
  AppUser,
  ContactInquiry,
  ContactInquiryStatus,
  EventCategory,
  EventFormInput,
  EventGuest,
  EventItem,
  EventServiceRequest,
  EventStatus,
  GuestCategory,
  GuestRsvpStatus,
  PlanningStatus,
  PublicContactInfo,
  RegistrationItem,
  RegistrationStatus,
  ServiceRequestStatus,
} from '../types';

type AdminSection = 'overview' | 'events' | 'registrations' | 'users' | 'contact';
type EventWorkspaceTab = 'services' | 'guests' | 'participants';

interface AdminLayoutProps {
  currentUser: AppUser;
  events: EventItem[];
  registrations: RegistrationItem[];
  users: AppUser[];
  contactInquiries?: ContactInquiry[];
  publicContact: PublicContactInfo;
  permissionWarning?: string | null;
  onSwitchToUser: () => void;
  onOpenProfileSettings: () => void;
  onLogout: () => void;
  onNotify: (message: string, type?: 'success' | 'error') => void;
}

const SECTION_TITLES: Record<AdminSection, string> = {
  overview: 'Tổng quan điều hành',
  events: 'Quản lý sự kiện',
  registrations: 'Người tham gia & Check-in QR',
  users: 'Tài khoản hệ thống',
  contact: 'Thông tin liên hệ công khai',
};

const CATEGORY_COLORS: Record<string, string> = {
  'Hoạt động ngoại khóa / Teambuilding': '#10B981',
  'Hội thảo / Workshop': '#4F46E5',
  'Tiệc Gala / Ra mắt sản phẩm': '#EC4899',
  'Đào tạo nội bộ': '#0EA5E9',
  'Sự kiện văn hóa / Nghệ thuật / Ca nhạc': '#F59E0B',
  'Hoạt động tình nguyện / Cộng đồng': '#14B8A6',
  Khác: '#64748B',
};

const FALLBACK_PIE_COLORS = ['#6366F1', '#0EA5E9', '#10B981', '#F59E0B', '#EC4899', '#14B8A6', '#64748B'];

function createEmptyForm(): EventFormInput {
  return {
    title: '',
    description: '',
    bannerUrl: '',
    location: '',
    startTime: '',
    endTime: '',
    maxSlots: 120,
    status: 'ongoing',
    planningStatus: 'confirmed',
    isPublic: true,
    category: EVENT_CATEGORIES[0],
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
        question: 'Tôi cần chuẩn bị gì khi đến check-in sự kiện?',
        answer: 'Vui lòng mang theo mã QR xác nhận tham gia trên mục Sự kiện đã đăng ký.',
      },
    ],
    rules: 'Vui lòng mang theo mã QR xác nhận khi tham dự.',
  };
}

export function AdminLayout({
  currentUser,
  events,
  registrations,
  users,
  contactInquiries = [],
  publicContact,
  permissionWarning,
  onSwitchToUser,
  onOpenProfileSettings,
  onLogout,
  onNotify,
}: AdminLayoutProps) {
  const [section, setSection] = useState<AdminSection>('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isAdminTransitioningOut, setIsAdminTransitioningOut] = useState(false);
  const adminTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (adminTimerRef.current !== null) {
        window.clearTimeout(adminTimerRef.current);
      }
    };
  }, []);

  function runAdminTransition(action: () => void) {
    triggerPageProgress();
    if (prefersReducedMotion()) {
      action();
      window.scrollTo({ top: 0, behavior: 'auto' });
      return;
    }
    if (adminTimerRef.current !== null) {
      window.clearTimeout(adminTimerRef.current);
    }
    setIsAdminTransitioningOut(true);
    adminTimerRef.current = window.setTimeout(() => {
      action();
      window.scrollTo({ top: 0, behavior: 'auto' });
      setIsAdminTransitioningOut(false);
      adminTimerRef.current = null;
    }, 140);
  }

  // Events list filters
  const [eventSearch, setEventSearch] = useState('');
  const [eventCategoryFilter, setEventCategoryFilter] = useState<'all' | string>('all');
  const [eventPlanningFilter, setEventPlanningFilter] = useState<'all' | PlanningStatus>('all');

  // Per-Event Detail Workspace state (3 isolated tabs per selected event)
  const [workspaceEventId, setWorkspaceEventId] = useState<string | null>(null);
  const [workspaceTab, setWorkspaceTab] = useState<EventWorkspaceTab>('services');

  // Workspace Tab 1: Services & Event-level response editing state
  const [serviceNotesDraft, setServiceNotesDraft] = useState<Record<string, string>>({});
  const [eventResponseDraft, setEventResponseDraft] = useState('');
  const [savingEventResponse, setSavingEventResponse] = useState(false);
  const [newServiceKey, setNewServiceKey] = useState<string>(SYSTEM_SERVICE_CATALOG[0].key);
  const [newCustomServiceName, setNewCustomServiceName] = useState('');
  const [newServiceScope, setNewServiceScope] = useState('');
  const [newServiceAdminNote, setNewServiceAdminNote] = useState('');
  const [savingServices, setSavingServices] = useState(false);

  // Granular pending locks for async mutations
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingPublicId, setTogglingPublicId] = useState<string | null>(null);
  const [updatingStatusEventId, setUpdatingStatusEventId] = useState<string | null>(null);
  const [updatingPlanningEventId, setUpdatingPlanningEventId] = useState<string | null>(null);
  const [pendingRegIds, setPendingRegIds] = useState<Record<string, boolean>>({});
  const [updatingInquiryId, setUpdatingInquiryId] = useState<string | null>(null);

  // Workspace Tab 2: Invited Guests state
  const [guestFullName, setGuestFullName] = useState('');
  const [guestType, setGuestType] = useState<GuestCategory>('VIP');
  const [guestTitle, setGuestTitle] = useState('');
  const [guestOrg, setGuestOrg] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [guestNote, setGuestNote] = useState('');
  const [guestFilterType, setGuestFilterType] = useState<'all' | GuestCategory>('all');
  const [savingGuests, setSavingGuests] = useState(false);

  // Workspace Tab 3: Event-scoped Participants state
  const [wsParticipantSearch, setWsParticipantSearch] = useState('');
  const [wsParticipantStatus, setWsParticipantStatus] = useState<'all' | RegistrationStatus>('all');
  const [wsQrInput, setWsQrInput] = useState('');
  const [wsCheckingIn, setWsCheckingIn] = useState(false);

  // Global Registrations & Check-in filter
  const [regEventFilter, setRegEventFilter] = useState<string>('all');
  const [regStatusFilter, setRegStatusFilter] = useState<'all' | RegistrationStatus>('all');
  const [regSearch, setRegSearch] = useState('');
  const [qrInput, setQrInput] = useState('');
  const [checkingInQr, setCheckingInQr] = useState(false);

  // Public Contact Form state
  const [contactForm, setContactForm] = useState({
    organizationName: publicContact.organizationName,
    adminName: publicContact.adminName,
    phone: publicContact.phone,
    hotline: publicContact.hotline,
    email: publicContact.email,
    officeAddress: publicContact.officeAddress,
    workingHours: publicContact.workingHours,
  });
  const [savingContact, setSavingContact] = useState(false);

  useEffect(() => {
    setContactForm({
      organizationName: publicContact.organizationName,
      adminName: publicContact.adminName,
      phone: publicContact.phone,
      hotline: publicContact.hotline,
      email: publicContact.email,
      officeAddress: publicContact.officeAddress,
      workingHours: publicContact.workingHours,
    });
  }, [publicContact]);

  // Event create/edit modal
  const [eventModalOpen, setEventModalOpen] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [formState, setFormState] = useState<EventFormInput>(createEmptyForm);
  const [customCategory, setCustomCategory] = useState('');
  const [savingEvent, setSavingEvent] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const workspaceEvent = useMemo(
    () => events.find((e) => e.id === workspaceEventId) || null,
    [events, workspaceEventId]
  );

  useEffect(() => {
    if (!workspaceEvent) return;
    const notes: Record<string, string> = {};
    for (const srv of workspaceEvent.requestedServices) {
      notes[srv.id] = srv.adminNote || '';
    }
    setServiceNotesDraft(notes);
    setEventResponseDraft(workspaceEvent.adminResponseNote || '');
  }, [workspaceEvent]);

  const stats = useMemo(() => {
    const totalEvents = events.length;
    const publicEventsCount = events.filter((e) => e.isPublic !== false).length;
    const pendingReviewCount = events.filter((e) => e.planningStatus === 'pending_review').length;
    const planningCount = events.filter((e) => e.planningStatus === 'planning').length;
    const activeRegistrations = registrations.filter((r) => r.status !== 'cancelled');
    const attendedCount = registrations.filter((r) => r.status === 'attended').length;
    const newInquiriesCount = contactInquiries.filter((i) => i.status === 'new').length;

    const fillRates = events
      .filter((e) => e.maxSlots > 0 && e.status !== 'cancelled' && e.isPublic)
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
      publicEventsCount,
      pendingReviewCount,
      planningCount,
      totalRegistrations: registrations.length,
      activeRegistrationsCount: activeRegistrations.length,
      attendedCount,
      newInquiriesCount,
      avgFillRate,
      checkInRate,
    };
  }, [events, registrations, contactInquiries]);

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
      eventCategoryMap.set(ev.id, normalizeEventCategory(ev.category || EVENT_CATEGORIES[0]));
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
      if (!matchesEventCategoryFilter(ev.category, eventCategoryFilter)) return false;
      if (eventPlanningFilter !== 'all' && ev.planningStatus !== eventPlanningFilter) return false;
      if (!q) return true;
      return (
        ev.title.toLowerCase().includes(q) ||
        ev.location.toLowerCase().includes(q) ||
        ev.organizer.toLowerCase().includes(q) ||
        ev.category.toLowerCase().includes(q) ||
        (ev.clientName || '').toLowerCase().includes(q)
      );
    });
  }, [events, eventCategoryFilter, eventPlanningFilter, eventSearch]);

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

  // Scoped participants for the currently opened Event Workspace
  const workspaceEventRegs = useMemo(() => {
    if (!workspaceEvent) return [];
    return registrations.filter((r) => r.eventId === workspaceEvent.id);
  }, [registrations, workspaceEvent]);

  const filteredWorkspaceRegs = useMemo(() => {
    const q = wsParticipantSearch.trim().toLowerCase();
    return workspaceEventRegs.filter((r) => {
      if (wsParticipantStatus !== 'all' && r.status !== wsParticipantStatus) return false;
      if (!q) return true;
      return (
        r.guestName.toLowerCase().includes(q) ||
        r.guestEmail.toLowerCase().includes(q) ||
        r.guestPhone.toLowerCase().includes(q) ||
        r.ticketCode.toLowerCase().includes(q)
      );
    });
  }, [workspaceEventRegs, wsParticipantSearch, wsParticipantStatus]);

  const filteredWorkspaceGuests = useMemo(() => {
    if (!workspaceEvent) return [];
    if (guestFilterType === 'all') return workspaceEvent.invitedGuests;
    return workspaceEvent.invitedGuests.filter((g) => g.guestType === guestFilterType);
  }, [workspaceEvent, guestFilterType]);

  function openCreateModal() {
    const start = new Date();
    start.setDate(start.getDate() + 5);
    start.setHours(9, 0, 0, 0);
    const end = new Date(start);
    end.setHours(17, 0, 0, 0);

    setEditingEventId(null);
    setCustomCategory('');
    setFormState({
      ...createEmptyForm(),
      startTime: toDatetimeLocalValue(start.toISOString()),
      endTime: toDatetimeLocalValue(end.toISOString()),
    });
    setEventModalOpen(true);
  }

  function openEditModal(ev: EventItem) {
    const rawCat = String(ev.category || '').trim();
    const normalizedCat = normalizeEventCategory(rawCat);
    const isStandard = (STANDARD_EVENT_CATEGORIES as string[]).includes(normalizedCat);

    setEditingEventId(ev.id);
    setCustomCategory(isStandard ? '' : rawCat === 'Khác' ? '' : rawCat);
    setFormState({
      title: ev.title,
      description: ev.description,
      bannerUrl: ev.bannerUrl || '',
      location: ev.location,
      startTime: toDatetimeLocalValue(ev.startTime),
      endTime: toDatetimeLocalValue(ev.endTime),
      maxSlots: ev.maxSlots,
      status: ev.status,
      planningStatus: ev.planningStatus || 'confirmed',
      isPublic: ev.isPublic,
      category: isStandard ? normalizedCat : 'Khác',
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
        ev.faqs && ev.faqs.length > 0 ? ev.faqs : [{ question: '', answer: '' }],
      rules: ev.rules,
    });
    setEventModalOpen(true);
  }

  async function handleSaveEvent(e: FormEvent) {
    e.preventDefault();
    if (savingEvent) return;

    if (formState.category === 'Khác' && !customCategory.trim()) {
      onNotify('Vui lòng nhập tên loại hình sự kiện khi chọn mục "Khác".', 'error');
      return;
    }

    const resolvedCategory =
      formState.category === 'Khác'
        ? customCategory.trim()
        : formState.category || EVENT_CATEGORIES[0];

    const payload: EventFormInput = {
      ...formState,
      category: resolvedCategory,
      bannerUrl: (formState.bannerUrl || '').trim(),
    };

    setSavingEvent(true);
    try {
      if (editingEventId) {
        await updateEvent(editingEventId, payload);
        onNotify('Đã cập nhật thông tin sự kiện.');
      } else {
        await createEvent(payload);
        onNotify('Đã tạo sự kiện mới thành công.');
      }
      setEventModalOpen(false);
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'Không thể lưu sự kiện.', 'error');
    } finally {
      setSavingEvent(false);
    }
  }

  async function handleDuplicateEvent(ev: EventItem) {
    if (duplicatingId) return;
    setDuplicatingId(ev.id);
    try {
      await duplicateEvent(ev);
      onNotify(`Đã nhân bản sự kiện "${ev.title}".`);
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'Không thể nhân bản sự kiện.', 'error');
    } finally {
      setDuplicatingId(null);
    }
  }

  async function handleQuickEventStatus(id: string, nextStatus: EventStatus) {
    if (updatingStatusEventId) return;
    setUpdatingStatusEventId(id);
    try {
      await updateEvent(id, { status: nextStatus });
      onNotify(`Đã đổi trạng thái đăng ký sang "${EVENT_STATUS_META[nextStatus].label}".`);
    } catch (err) {
      onNotify(
        err instanceof Error ? err.message : 'Không thể đổi trạng thái sự kiện.',
        'error'
      );
    } finally {
      setUpdatingStatusEventId(null);
    }
  }

  async function handlePlanningStatusChange(id: string, nextPlanning: PlanningStatus) {
    if (updatingPlanningEventId) return;
    setUpdatingPlanningEventId(id);
    try {
      await updateEvent(id, { planningStatus: nextPlanning });
      onNotify(`Đã cập nhật tiến độ duyệt sang "${PLANNING_STATUS_META[nextPlanning].label}".`);
    } catch (err) {
      onNotify(
        err instanceof Error ? err.message : 'Không thể cập nhật tiến độ kế hoạch.',
        'error'
      );
    } finally {
      setUpdatingPlanningEventId(null);
    }
  }

  async function handleTogglePublic(ev: EventItem) {
    if (togglingPublicId) return;
    setTogglingPublicId(ev.id);
    try {
      await updateEvent(ev.id, { isPublic: !ev.isPublic });
      onNotify(
        !ev.isPublic
          ? `Đã công khai sự kiện "${ev.title}" lên trang chủ.`
          : `Đã ẩn sự kiện "${ev.title}" khỏi trang công khai.`
      );
    } catch (err) {
      onNotify(
        err instanceof Error ? err.message : 'Không thể thay đổi trạng thái công khai.',
        'error'
      );
    } finally {
      setTogglingPublicId(null);
    }
  }

  async function handleConfirmDelete(id: string) {
    if (deletingId) return;
    setDeletingId(id);
    try {
      await deleteEvent(id);
      setDeleteTargetId(null);
      if (workspaceEventId === id) {
        setWorkspaceEventId(null);
      }
      onNotify('Đã xóa sự kiện khỏi hệ thống.');
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'Không thể xóa sự kiện.', 'error');
    } finally {
      setDeletingId(null);
    }
  }

  // ---- Per-Event Workspace Tab 1: Services & Response handlers ----
  async function handleSaveEventResponse() {
    if (!workspaceEvent || savingEventResponse) return;
    setSavingEventResponse(true);
    try {
      await updateEvent(workspaceEvent.id, {
        adminResponseNote: eventResponseDraft.trim(),
      });
      onNotify('Đã lưu phản hồi của Ban quản trị lên Firestore cho khách hàng.');
    } catch (err) {
      onNotify(
        err instanceof Error ? err.message : 'Không thể lưu ghi chú phản hồi.',
        'error'
      );
    } finally {
      setSavingEventResponse(false);
    }
  }

  async function handleServiceStatusChange(srvId: string, nextStatus: ServiceRequestStatus) {
    if (!workspaceEvent || savingServices) return;
    setSavingServices(true);
    try {
      const next = workspaceEvent.requestedServices.map((s) =>
        s.id === srvId
          ? {
              ...s,
              status: nextStatus,
              adminNote: serviceNotesDraft[srvId] ?? s.adminNote ?? '',
            }
          : s
      );
      await updateEventServices(workspaceEvent.id, next);
      onNotify('Đã cập nhật trạng thái dịch vụ cho sự kiện.');
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'Không thể cập nhật dịch vụ.', 'error');
    } finally {
      setSavingServices(false);
    }
  }

  async function handleSaveServiceNote(srvId: string) {
    if (!workspaceEvent || savingServices) return;
    setSavingServices(true);
    try {
      const next = workspaceEvent.requestedServices.map((s) =>
        s.id === srvId ? { ...s, adminNote: serviceNotesDraft[srvId] ?? '' } : s
      );
      await updateEventServices(workspaceEvent.id, next);
      onNotify('Đã lưu ghi chú phản hồi cho dịch vụ.');
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'Không thể lưu ghi chú dịch vụ.', 'error');
    } finally {
      setSavingServices(false);
    }
  }

  async function handleAddServiceToEvent(e: FormEvent) {
    e.preventDefault();
    if (!workspaceEvent) return;
    const isCustom = newServiceKey === 'custom';
    const catalogItem = SYSTEM_SERVICE_CATALOG.find((c) => c.key === newServiceKey);
    const serviceName = isCustom ? newCustomServiceName.trim() : catalogItem?.name || '';
    if (!serviceName) {
      onNotify('Vui lòng chọn hoặc nhập tên dịch vụ.', 'error');
      return;
    }

    const newReq: EventServiceRequest = {
      id: `srv-${Date.now()}`,
      serviceKey: isCustom ? 'custom' : newServiceKey,
      serviceName,
      quantityOrScope: newServiceScope.trim(),
      clientNote: '',
      adminNote: newServiceAdminNote.trim(),
      status: 'approved',
    };

    setSavingServices(true);
    try {
      await updateEventServices(workspaceEvent.id, [
        ...workspaceEvent.requestedServices,
        newReq,
      ]);
      setNewCustomServiceName('');
      setNewServiceScope('');
      setNewServiceAdminNote('');
      onNotify(`Đã thêm dịch vụ "${serviceName}" vào sự kiện.`);
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'Không thể thêm dịch vụ.', 'error');
    } finally {
      setSavingServices(false);
    }
  }

  async function handleRemoveService(srvId: string) {
    if (!workspaceEvent) return;
    setSavingServices(true);
    try {
      const next = workspaceEvent.requestedServices.filter((s) => s.id !== srvId);
      await updateEventServices(workspaceEvent.id, next);
      onNotify('Đã gỡ dịch vụ khỏi sự kiện.');
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'Không thể gỡ dịch vụ.', 'error');
    } finally {
      setSavingServices(false);
    }
  }

  // ---- Per-Event Workspace Tab 2: Invited Guests handlers ----
  async function handleAddGuest(e: FormEvent) {
    e.preventDefault();
    if (!workspaceEvent) return;
    if (!guestFullName.trim()) {
      onNotify('Vui lòng nhập họ tên khách mời.', 'error');
      return;
    }

    const newGuest: EventGuest = {
      id: `gst-${Date.now()}`,
      fullName: guestFullName.trim(),
      guestType,
      title: guestTitle.trim(),
      organization: guestOrg.trim(),
      email: guestEmail.trim(),
      phone: guestPhone.trim(),
      note: guestNote.trim(),
      rsvpStatus: 'invited',
    };

    setSavingGuests(true);
    try {
      await updateEventInvitedGuests(workspaceEvent.id, [
        ...workspaceEvent.invitedGuests,
        newGuest,
      ]);
      setGuestFullName('');
      setGuestTitle('');
      setGuestOrg('');
      setGuestEmail('');
      setGuestPhone('');
      setGuestNote('');
      onNotify(`Đã thêm khách mời ${newGuest.fullName} (${newGuest.guestType}).`);
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'Không thể thêm khách mời.', 'error');
    } finally {
      setSavingGuests(false);
    }
  }

  async function handleGuestRsvpChange(guestId: string, nextRsvp: GuestRsvpStatus) {
    if (!workspaceEvent) return;
    setSavingGuests(true);
    try {
      const next = workspaceEvent.invitedGuests.map((g) =>
        g.id === guestId ? { ...g, rsvpStatus: nextRsvp } : g
      );
      await updateEventInvitedGuests(workspaceEvent.id, next);
      onNotify('Đã cập nhật trạng thái khách mời.');
    } catch (err) {
      onNotify(
        err instanceof Error ? err.message : 'Không thể cập nhật khách mời.',
        'error'
      );
    } finally {
      setSavingGuests(false);
    }
  }

  async function handleRemoveGuest(guestId: string) {
    if (!workspaceEvent) return;
    setSavingGuests(true);
    try {
      const next = workspaceEvent.invitedGuests.filter((g) => g.id !== guestId);
      await updateEventInvitedGuests(workspaceEvent.id, next);
      onNotify('Đã xóa khách mời khỏi danh sách sự kiện.');
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'Không thể xóa khách mời.', 'error');
    } finally {
      setSavingGuests(false);
    }
  }

  // ---- Per-Event Workspace Tab 3 & Global Participants handlers ----
  async function handleStatusChange(reg: RegistrationItem, nextStatus: RegistrationStatus) {
    if (pendingRegIds[reg.id]) return;
    setPendingRegIds((prev) => ({ ...prev, [reg.id]: true }));
    try {
      await updateRegistrationStatus(reg, nextStatus);
      onNotify(
        nextStatus === 'attended'
          ? `Check-in thành công cho ${reg.guestName} (${reg.ticketCode}).`
          : `Đã cập nhật trạng thái mã ${reg.ticketCode} sang "${REGISTRATION_STATUS_META[nextStatus].label}".`
      );
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'Không thể cập nhật trạng thái.', 'error');
    } finally {
      setPendingRegIds((prev) => {
        const next = { ...prev };
        delete next[reg.id];
        return next;
      });
    }
  }

  async function handleWorkspaceQrCheckIn(e: FormEvent) {
    e.preventDefault();
    if (!wsQrInput.trim() || !workspaceEvent) return;
    setWsCheckingIn(true);
    try {
      let parsedCode = wsQrInput.trim();
      if (parsedCode.startsWith('{')) {
        try {
          const obj = JSON.parse(parsedCode) as { ticketCode?: string };
          if (obj.ticketCode) parsedCode = obj.ticketCode;
        } catch {
          // fallback raw string
        }
      }
      const checked = await checkInByTicketCode(parsedCode, workspaceEventRegs);
      setWsQrInput('');
      onNotify(`Check-in thành công tại sự kiện: ${checked.guestName} (${checked.ticketCode}).`);
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'Check-in thất bại.', 'error');
    } finally {
      setWsCheckingIn(false);
    }
  }

  async function handleQrCheckIn(e: FormEvent) {
    e.preventDefault();
    if (!qrInput.trim()) return;
    setCheckingInQr(true);
    try {
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
        `Check-in QR thành công: ${checked.guestName} · Mã ${checked.ticketCode} (${checked.eventTitle}).`
      );
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'Check-in thất bại.', 'error');
    } finally {
      setCheckingInQr(false);
    }
  }

  function handleExportCsv(targetRegs: RegistrationItem[], suffix: string) {
    if (targetRegs.length === 0) {
      onNotify('Không có dữ liệu người tham gia để xuất file.', 'error');
      return;
    }
    exportRegistrationsToCSV(targetRegs, `nguoi-tham-gia-${suffix}.csv`);
    onNotify(`Đã xuất ${targetRegs.length} dòng ra file CSV chuẩn UTF-8.`);
  }

  async function handleSavePublicContact(e: FormEvent) {
    e.preventDefault();
    setSavingContact(true);
    try {
      await updatePublicContact(contactForm);
      onNotify('Đã cập nhật thông tin liên hệ Ban quản trị lên trang công khai.');
    } catch (err) {
      onNotify(
        err instanceof Error ? err.message : 'Không thể lưu thông tin liên hệ.',
        'error'
      );
    } finally {
      setSavingContact(false);
    }
  }

  const navItems: { key: AdminSection; label: string; icon: typeof LayoutDashboard; badge?: number }[] = [
    { key: 'overview', label: 'Tổng quan', icon: LayoutDashboard },
    {
      key: 'events',
      label: 'Quản lý sự kiện',
      icon: Calendar,
      badge: stats.pendingReviewCount > 0 ? stats.pendingReviewCount : undefined,
    },
    { key: 'registrations', label: 'Người tham gia & QR', icon: UserCheck },
    { key: 'users', label: 'Tài khoản hệ thống', icon: Users },
    { key: 'contact', label: 'Liên hệ công khai', icon: Phone },
  ];

  const headerTitle =
    section === 'events' && workspaceEvent
      ? `Không gian sự kiện: ${workspaceEvent.title}`
      : SECTION_TITLES[section];

  const {
    containerRef: sidebarNavRef,
    setItemRef: setSidebarNavRef,
    rect: sidebarNavPill,
  } = useSlidingIndicator(section, stats.pendingReviewCount);

  const {
    containerRef: wsTabNavRef,
    setItemRef: setWsTabNavRef,
    rect: wsTabPill,
  } = useSlidingIndicator(workspaceTab, workspaceEvent?.id || '');

  const adminViewKey = `${section}-${workspaceEvent ? workspaceEvent.id : 'list'}`;

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <div
        aria-hidden="true"
        className={`fixed inset-0 z-40 bg-slate-900/45 backdrop-blur-sm lg:hidden transition-opacity duration-[320ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${
          sidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 flex flex-col justify-between transition-transform duration-[320ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none lg:static lg:translate-x-0 ${
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

          <nav className="p-4">
            <div ref={sidebarNavRef} className="relative space-y-1">
              <span
                aria-hidden="true"
                className="ef-sliding-pill pointer-events-none absolute top-0 left-0 rounded-lg bg-indigo-50 border border-indigo-200/70 transition-[transform,width,height,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
                style={{
                  width: `${sidebarNavPill.width}px`,
                  height: `${sidebarNavPill.height}px`,
                  transform: `translate3d(${sidebarNavPill.x}px, ${sidebarNavPill.y}px, 0)`,
                  opacity: sidebarNavPill.ready ? 1 : 0,
                }}
              />
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = section === item.key;
                return (
                  <button
                    key={item.key}
                    ref={setSidebarNavRef(item.key)}
                    type="button"
                    onClick={() => {
                      setSidebarOpen(false);
                      if (section === item.key && !(item.key === 'events' && workspaceEventId)) {
                        return;
                      }
                      runAdminTransition(() => {
                        setSection(item.key);
                        if (item.key !== 'events') {
                          setWorkspaceEventId(null);
                        } else if (section === 'events') {
                          setWorkspaceEventId(null);
                        }
                      });
                    }}
                    className={`relative z-10 w-full flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer whitespace-nowrap ${
                      active
                        ? 'text-indigo-700 font-semibold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <Icon className="w-4 h-4 shrink-0" />
                      <span>{item.label}</span>
                    </span>
                    {item.badge !== undefined && (
                      <span className="px-2 py-0.5 text-[11px] font-bold rounded-full bg-amber-100 text-amber-800">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </nav>
        </div>

        <div className="p-4 border-t border-slate-200 space-y-2">
          <button
            type="button"
            onClick={() => {
              setSidebarOpen(false);
              onOpenProfileSettings();
            }}
            className="w-full text-left px-3 py-2 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <div className="text-xs font-semibold text-slate-900 truncate">
              {currentUser.fullName}
            </div>
            <div className="text-xs text-slate-500 truncate">{currentUser.email}</div>
          </button>

          <button
            type="button"
            onClick={() => {
              setSidebarOpen(false);
              onOpenProfileSettings();
            }}
            className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
          >
            <Settings className="w-3.5 h-3.5 shrink-0" />
            <span>Cài đặt tài khoản</span>
          </button>

          <button
            type="button"
            onClick={onSwitchToUser}
            className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
          >
            <ExternalLink className="w-3.5 h-3.5 shrink-0" />
            <span>Xem trang giới thiệu công khai</span>
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
                {headerTitle}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <div className="hidden sm:block">
              <AccountMenuDropdown
                currentUser={currentUser}
                variant="admin"
                onOpenProfileSettings={onOpenProfileSettings}
                onOpenAdminPortal={() => {
                  if (section === 'overview' && !workspaceEventId) return;
                  runAdminTransition(() => {
                    setSection('overview');
                    setWorkspaceEventId(null);
                  });
                }}
                onOpenPublicSite={onSwitchToUser}
                onLogout={onLogout}
              />
            </div>

            <button
              type="button"
              onClick={openCreateModal}
              className="ef-btn-tactile min-h-[40px] inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg cursor-pointer whitespace-nowrap shrink-0"
            >
              <Plus className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
              <span>Tạo sự kiện</span>
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
                <strong>Firestore Database → Rules</strong> và cập nhật rules cho phép đọc/ghi các
                collection <code>events</code>, <code>users</code>, <code>registrations</code>,{' '}
                <code>feedbacks</code>, <code>contact_inquiries</code>, <code>site_settings</code>.
              </p>
            </div>
          )}

          <div
            className={`transition-[opacity,transform] duration-150 ease-out motion-reduce:transition-none motion-reduce:transform-none ${
              isAdminTransitioningOut
                ? 'opacity-0 scale-[0.985] pointer-events-none'
                : 'opacity-100'
            }`}
          >
            <div key={adminViewKey} className="animate-ef-page-enter">
          {/* SECTION 1: OVERVIEW */}
          {section === 'overview' && (
            <div className="space-y-6">
              {/* Alert banner if pending event organization requests exist */}
              {stats.pendingReviewCount > 0 && (
                <div className="rounded-xl border border-indigo-200 bg-indigo-50/70 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <ClipboardList className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-bold text-slate-900">
                        Có {stats.pendingReviewCount} yêu cầu tổ chức sự kiện mới đang chờ duyệt
                      </p>
                      <p className="text-xs text-slate-600 mt-0.5">
                        Kiểm tra yêu cầu dịch vụ từ Người dùng, phê duyệt và lên danh sách khách
                        mời trong không gian riêng của từng sự kiện.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      runAdminTransition(() => {
                        setSection('events');
                        setEventPlanningFilter('pending_review');
                        setWorkspaceEventId(null);
                      })
                    }
                    className="ef-btn-tactile px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg cursor-pointer whitespace-nowrap shrink-0"
                  >
                    Xem yêu cầu chờ duyệt
                  </button>
                </div>
              )}

              {/* 4 Clickable Real-time KPI Cards with Cursor Spotlight & 60ms Staggered Reveal */}
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <div style={{ animationDelay: '0ms' }} className="animate-ef-fade-up h-full">
                  <button
                    type="button"
                    onMouseMove={handleSpotlightMove}
                    onClick={() =>
                      runAdminTransition(() => {
                        setSection('events');
                        setEventPlanningFilter('all');
                        setWorkspaceEventId(null);
                      })
                    }
                    className="ef-spotlight-card group w-full h-full text-left bg-white border border-slate-200 rounded-xl p-5 hover:border-indigo-300 cursor-pointer flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-medium text-slate-500">Tổng số sự kiện</p>
                      <Calendar className="w-4 h-4 text-indigo-500 shrink-0" />
                    </div>
                    <p className="mt-2 text-3xl font-bold text-slate-900 tabular-nums">
                      <AnimatedNumber value={stats.totalEvents} />
                    </p>
                    <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                      <span className="tabular-nums">
                        {stats.publicEventsCount} công khai · Lấp đầy TB {stats.avgFillRate}%
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all shrink-0" />
                    </div>
                  </button>
                </div>

                <div style={{ animationDelay: '60ms' }} className="animate-ef-fade-up h-full">
                  <button
                    type="button"
                    onMouseMove={handleSpotlightMove}
                    onClick={() =>
                      runAdminTransition(() => {
                        setSection('events');
                        setEventPlanningFilter('pending_review');
                        setWorkspaceEventId(null);
                      })
                    }
                    className={`ef-spotlight-card group w-full h-full text-left bg-white border rounded-xl p-5 cursor-pointer flex flex-col justify-between ${
                      stats.pendingReviewCount > 0
                        ? 'border-amber-200 hover:border-amber-400'
                        : 'border-slate-200 hover:border-indigo-300'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-medium text-slate-500">
                        Yêu cầu tổ chức chờ duyệt
                      </p>
                      <ClipboardList
                        className={`w-4 h-4 shrink-0 ${
                          stats.pendingReviewCount > 0 ? 'text-amber-500' : 'text-slate-400'
                        }`}
                      />
                    </div>
                    <p
                      className={`mt-2 text-3xl font-bold tabular-nums ${
                        stats.pendingReviewCount > 0 ? 'text-amber-600' : 'text-slate-900'
                      }`}
                    >
                      <AnimatedNumber value={stats.pendingReviewCount} />
                    </p>
                    <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                      <span className="tabular-nums">
                        {stats.planningCount} đang lên kế hoạch
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-600 group-hover:translate-x-0.5 transition-all shrink-0" />
                    </div>
                  </button>
                </div>

                <div style={{ animationDelay: '120ms' }} className="animate-ef-fade-up h-full">
                  <button
                    type="button"
                    onMouseMove={handleSpotlightMove}
                    onClick={() =>
                      runAdminTransition(() => {
                        setSection('registrations');
                      })
                    }
                    className="ef-spotlight-card group w-full h-full text-left bg-white border border-slate-200 rounded-xl p-5 hover:border-emerald-300 cursor-pointer flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-medium text-slate-500">
                        Tổng lượt đăng ký tham gia
                      </p>
                      <UserCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                    </div>
                    <p className="mt-2 text-3xl font-bold text-slate-900 tabular-nums">
                      <AnimatedNumber value={stats.activeRegistrationsCount} />
                    </p>
                    <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                      <span className="tabular-nums">
                        {stats.attendedCount} đã Check-in ({stats.checkInRate}%)
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all shrink-0" />
                    </div>
                  </button>
                </div>

                <div style={{ animationDelay: '180ms' }} className="animate-ef-fade-up h-full">
                  <button
                    type="button"
                    onMouseMove={handleSpotlightMove}
                    onClick={() => {
                      runAdminTransition(() => {
                        setSection('contact');
                      });
                      window.setTimeout(() => {
                        document
                          .getElementById('admin-contact-inquiries')
                          ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }, 220);
                    }}
                    className={`ef-spotlight-card group w-full h-full text-left bg-white border rounded-xl p-5 cursor-pointer flex flex-col justify-between ${
                      stats.newInquiriesCount > 0
                        ? 'border-rose-200 hover:border-rose-400'
                        : 'border-slate-200 hover:border-indigo-300'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-medium text-slate-500">Yêu cầu tư vấn mới</p>
                      <MessageSquare
                        className={`w-4 h-4 shrink-0 ${
                          stats.newInquiriesCount > 0 ? 'text-rose-500' : 'text-slate-400'
                        }`}
                      />
                    </div>
                    <p
                      className={`mt-2 text-3xl font-bold tabular-nums ${
                        stats.newInquiriesCount > 0 ? 'text-rose-600' : 'text-slate-900'
                      }`}
                    >
                      <AnimatedNumber value={stats.newInquiriesCount} />
                    </p>
                    <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                      <span className="tabular-nums">
                        {contactInquiries.length} tổng yêu cầu tư vấn
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-rose-600 group-hover:translate-x-0.5 transition-all shrink-0" />
                    </div>
                  </button>
                </div>
              </div>

              {events.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-xl p-8 sm:p-10 text-center">
                  <Calendar className="w-10 h-10 text-indigo-300 mx-auto" />
                  <h2 className="mt-4 text-base font-bold text-slate-900">
                    Chưa có sự kiện nào trên hệ thống
                  </h2>
                  <p className="mt-1.5 text-sm text-slate-500 max-w-md mx-auto">
                    Bắt đầu bằng cách tạo sự kiện công khai mới hoặc chờ người dùng gửi yêu cầu tổ
                    chức sự kiện từ cổng công khai.
                  </p>
                  <button
                    type="button"
                    onClick={openCreateModal}
                    className="ef-btn-tactile mt-5 min-h-[42px] inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Tạo sự kiện mới</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-4 sm:p-6">
                    <div className="mb-4">
                      <h2 className="text-sm font-bold text-slate-900">
                        Lượt tham gia theo từng sự kiện
                      </h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        So sánh số người đã đăng ký, đã Check-in và sức chứa tối đa
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

                  <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-4 sm:p-6 flex flex-col justify-between">
                    <div className="mb-2">
                      <h2 className="text-sm font-bold text-slate-900">
                        Phân bổ người tham gia theo Danh mục
                      </h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Tỷ trọng lượt đăng ký hợp lệ giữa các lĩnh vực sự kiện
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
            </div>
          )}

          {/* SECTION 2: EVENTS LIST OR PER-EVENT 3-TAB WORKSPACE */}
          {section === 'events' && !workspaceEvent && (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="p-4 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                <div className="flex flex-col sm:flex-row flex-wrap gap-2.5 flex-1">
                  <div className="relative w-full sm:w-64">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="search"
                      value={eventSearch}
                      onChange={(e) => setEventSearch(e.target.value)}
                      placeholder="Tìm sự kiện, địa điểm, khách hàng..."
                      className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-600"
                    />
                  </div>
                  <select
                    aria-label="Lọc danh mục sự kiện"
                    value={eventCategoryFilter}
                    onChange={(e) => setEventCategoryFilter(e.target.value)}
                    className="px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-600"
                  >
                    <option value="all">Tất cả danh mục</option>
                    {EVENT_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                  <select
                    aria-label="Lọc tiến độ duyệt"
                    value={eventPlanningFilter}
                    onChange={(e) =>
                      setEventPlanningFilter(e.target.value as 'all' | PlanningStatus)
                    }
                    className="px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-600"
                  >
                    <option value="all">Mọi tiến độ tổ chức</option>
                    <option value="pending_review">Chờ duyệt</option>
                    <option value="planning">Đang lên kế hoạch</option>
                    <option value="confirmed">Đã xác nhận</option>
                    <option value="rejected">Từ chối</option>
                  </select>
                </div>

                <span className="text-xs text-slate-500 tabular-nums">
                  {filteredEvents.length} sự kiện · Bấm &ldquo;Quản lý chi tiết&rdquo; để thao tác 3
                  mục riêng biệt
                </span>
              </div>

              {filteredEvents.length === 0 ? (
                <div className="p-8 sm:p-10 text-center text-sm text-slate-500">
                  Chưa có sự kiện phù hợp trên hệ thống. Hãy bấm &ldquo;Tạo sự kiện&rdquo; để thêm
                  mới.
                </div>
              ) : (
                <>
                  {/* Mobile Card View (< md) */}
                  <div className="md:hidden divide-y divide-slate-100">
                    {filteredEvents.map((ev) => {
                      const planMeta = PLANNING_STATUS_META[ev.planningStatus || 'confirmed'];
                      return (
                        <div key={ev.id} className="p-4 space-y-3">
                          <div className="flex items-start gap-3">
                            <EventBanner
                              src={ev.bannerUrl}
                              alt={ev.title}
                              category={ev.category}
                              className="w-16 h-12 rounded-lg shrink-0"
                            />
                            <div className="min-w-0 flex-1">
                              <button
                                type="button"
                                onClick={() =>
                                  runAdminTransition(() => {
                                    setWorkspaceEventId(ev.id);
                                    setWorkspaceTab('services');
                                  })
                                }
                                className="font-bold text-sm text-slate-900 hover:text-indigo-600 text-left line-clamp-2 flex items-start gap-1 cursor-pointer"
                              >
                                <span>{ev.title}</span>
                                {ev.featured && (
                                  <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                                )}
                              </button>
                              <div className="mt-1 text-xs text-slate-500 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                                {ev.clientName ? (
                                  <span className="text-indigo-700 font-medium">
                                    Yêu cầu: {ev.clientName}
                                  </span>
                                ) : (
                                  <span>{ev.organizer}</span>
                                )}
                                <span>·</span>
                                <span className="tabular-nums">{formatShortDateVN(ev.startTime)}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className={`inline-block px-2 py-0.5 font-semibold rounded border ${planMeta.bgClass} ${planMeta.textClass}`}
                              >
                                {planMeta.label}
                              </span>
                              <span
                                className={`inline-block px-2 py-0.5 font-medium rounded border ${
                                  getEventCategoryMeta(ev.category).badgeClass
                                }`}
                              >
                                {ev.category}
                              </span>
                              <span className="inline-flex items-center gap-1 text-slate-500">
                                {ev.isPublic ? (
                                  <>
                                    <Globe className="w-3 h-3 text-emerald-600" />
                                    <span>Công khai</span>
                                  </>
                                ) : (
                                  <>
                                    <Lock className="w-3 h-3 text-slate-400" />
                                    <span>Ẩn</span>
                                  </>
                                )}
                              </span>
                            </div>
                            <span className="font-mono font-semibold text-slate-800 tabular-nums">
                              {ev.registeredCount}/{ev.maxSlots} ĐK
                            </span>
                          </div>

                          <div className="text-xs text-slate-600 flex flex-wrap gap-x-4 gap-y-1 tabular-nums">
                            <span>{ev.requestedServices.length} dịch vụ</span>
                            <span>{ev.invitedGuests.length} khách mời VIP</span>
                          </div>

                          <div className="space-y-2 pt-1">
                            <select
                              aria-label={`Trạng thái sự kiện ${ev.title}`}
                              disabled={updatingStatusEventId === ev.id}
                              value={ev.status}
                              onChange={(e) =>
                                handleQuickEventStatus(ev.id, e.target.value as EventStatus)
                              }
                              className={`w-full min-h-[40px] px-3 py-2 text-xs font-semibold bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-600 cursor-pointer disabled:opacity-60 ${
                                EVENT_STATUS_META[ev.status]?.textClass || 'text-slate-700'
                              }`}
                            >
                              <option value="ongoing">Mở đăng ký</option>
                              <option value="upcoming">Sắp diễn ra</option>
                              <option value="paused">Tạm đóng</option>
                              <option value="completed">Đã kết thúc</option>
                              <option value="cancelled">Đã hủy</option>
                            </select>

                            <div className="flex flex-wrap items-center gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  runAdminTransition(() => {
                                    setWorkspaceEventId(ev.id);
                                    setWorkspaceTab('services');
                                  })
                                }
                                className="flex-1 min-h-[40px] px-3 py-2 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg cursor-pointer"
                              >
                                Quản lý chi tiết
                              </button>
                              <button
                                type="button"
                                disabled={duplicatingId === ev.id}
                                onClick={() => handleDuplicateEvent(ev)}
                                className="min-w-[40px] min-h-[40px] inline-flex items-center justify-center text-slate-600 bg-slate-50 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-200 rounded-lg cursor-pointer disabled:opacity-60"
                                title="Nhân bản sự kiện"
                              >
                                {duplicatingId === ev.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Copy className="w-4 h-4" />
                                )}
                              </button>
                              <button
                                type="button"
                                onClick={() => openEditModal(ev)}
                                className="min-w-[40px] min-h-[40px] inline-flex items-center justify-center text-slate-600 bg-slate-50 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-200 rounded-lg cursor-pointer"
                                title="Chỉnh sửa thông tin sự kiện"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              {deleteTargetId === ev.id ? (
                                <div className="inline-flex items-center gap-1">
                                  <button
                                    type="button"
                                    disabled={deletingId === ev.id}
                                    onClick={() => handleConfirmDelete(ev.id)}
                                    className="min-h-[40px] inline-flex items-center gap-1 px-3 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg cursor-pointer disabled:opacity-60"
                                  >
                                    {deletingId === ev.id && (
                                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    )}
                                    <span>Xóa</span>
                                  </button>
                                  <button
                                    type="button"
                                    disabled={deletingId === ev.id}
                                    onClick={() => setDeleteTargetId(null)}
                                    className="min-h-[40px] px-3 py-2 text-xs font-medium text-slate-600 bg-slate-100 rounded-lg cursor-pointer"
                                  >
                                    Hủy
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setDeleteTargetId(ev.id)}
                                  className="min-w-[40px] min-h-[40px] inline-flex items-center justify-center text-slate-600 bg-slate-50 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 rounded-lg cursor-pointer"
                                  title="Xóa sự kiện"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Desktop Table View (>= md) */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                        <th className="py-3 px-4">Sự kiện &amp; Nguồn yêu cầu</th>
                        <th className="py-3 px-4">Tiến độ tổ chức</th>
                        <th className="py-3 px-4">Dịch vụ / Khách mời</th>
                        <th className="py-3 px-4 text-right">Tham gia</th>
                        <th className="py-3 px-4">Trạng thái đăng ký</th>
                        <th className="py-3 px-4 text-right">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      {filteredEvents.map((ev) => {
                        const planMeta =
                          PLANNING_STATUS_META[ev.planningStatus || 'confirmed'];
                        return (
                          <tr key={ev.id} className="hover:bg-slate-50/70">
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-3 min-w-[240px]">
                                <EventBanner
                                  src={ev.bannerUrl}
                                  alt={ev.title}
                                  category={ev.category}
                                  className="w-14 h-9 rounded-md shrink-0"
                                />
                                <div className="min-w-0">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      runAdminTransition(() => {
                                        setWorkspaceEventId(ev.id);
                                        setWorkspaceTab('services');
                                      })
                                    }
                                    className="font-semibold text-slate-900 hover:text-indigo-600 text-left line-clamp-1 flex items-center gap-1.5 cursor-pointer"
                                  >
                                    <span className="truncate">{ev.title}</span>
                                    {ev.featured && (
                                      <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                                    )}
                                  </button>
                                  <div className="mt-0.5 text-xs text-slate-500 flex flex-wrap items-center gap-1.5">
                                    {ev.clientName ? (
                                      <span className="text-indigo-700 font-medium truncate max-w-[140px]">
                                        Yêu cầu từ: {ev.clientName}
                                      </span>
                                    ) : (
                                      <span className="truncate max-w-[140px]">{ev.organizer}</span>
                                    )}
                                    <span>·</span>
                                    <span className="shrink-0">{formatShortDateVN(ev.startTime)}</span>
                                    <span>·</span>
                                    <span
                                      className={`inline-block px-1.5 py-0.5 text-[10px] font-semibold rounded border truncate max-w-[155px] ${
                                        getEventCategoryMeta(ev.category).badgeClass
                                      }`}
                                    >
                                      {ev.category}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap">
                              <span
                                className={`inline-block px-2 py-0.5 text-xs font-semibold rounded border ${planMeta.bgClass} ${planMeta.textClass}`}
                              >
                                {planMeta.label}
                              </span>
                              <div className="mt-1 text-[11px] text-slate-500 flex items-center gap-1">
                                {ev.isPublic ? (
                                  <>
                                    <Globe className="w-3 h-3 text-emerald-600" />
                                    <span>Đang công khai</span>
                                  </>
                                ) : (
                                  <>
                                    <Lock className="w-3 h-3 text-slate-400" />
                                    <span>Nội bộ / Ẩn</span>
                                  </>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-4 text-xs text-slate-700 whitespace-nowrap tabular-nums">
                              <div>{ev.requestedServices.length} dịch vụ yêu cầu</div>
                              <div className="text-slate-500">
                                {ev.invitedGuests.length} khách mời VIP/Đại biểu
                              </div>
                            </td>
                            <td className="py-3 px-4 text-right font-mono text-xs font-semibold text-slate-800 tabular-nums">
                              {ev.registeredCount}/{ev.maxSlots}
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap">
                              <select
                                aria-label={`Trạng thái sự kiện ${ev.title}`}
                                disabled={updatingStatusEventId === ev.id}
                                value={ev.status}
                                onChange={(e) =>
                                  handleQuickEventStatus(ev.id, e.target.value as EventStatus)
                                }
                                className={`px-2.5 py-1.5 text-xs font-semibold bg-white border border-slate-200 rounded-md focus:outline-none focus:border-indigo-600 cursor-pointer disabled:opacity-60 ${
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
                                  onClick={() =>
                                    runAdminTransition(() => {
                                      setWorkspaceEventId(ev.id);
                                      setWorkspaceTab('services');
                                    })
                                  }
                                  className="px-2.5 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-md cursor-pointer"
                                >
                                  Quản lý chi tiết
                                </button>
                                <button
                                  type="button"
                                  disabled={duplicatingId === ev.id}
                                  onClick={() => handleDuplicateEvent(ev)}
                                  className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-md cursor-pointer disabled:opacity-60"
                                  title="Nhân bản sự kiện"
                                >
                                  {duplicatingId === ev.id ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <Copy className="w-4 h-4" />
                                  )}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => openEditModal(ev)}
                                  className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-md cursor-pointer"
                                  title="Chỉnh sửa thông tin sự kiện"
                                >
                                  <Edit3 className="w-4 h-4" />
                                </button>
                                {deleteTargetId === ev.id ? (
                                  <div className="inline-flex items-center gap-1">
                                    <button
                                      type="button"
                                      disabled={deletingId === ev.id}
                                      onClick={() => handleConfirmDelete(ev.id)}
                                      className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded cursor-pointer disabled:opacity-60"
                                    >
                                      {deletingId === ev.id && (
                                        <Loader2 className="w-3 h-3 animate-spin" />
                                      )}
                                      <span>Xóa</span>
                                    </button>
                                    <button
                                      type="button"
                                      disabled={deletingId === ev.id}
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
                </>
              )}
            </div>
          )}

          {/* PER-EVENT WORKSPACE (STRICTLY 3 ISOLATED TABS FOR THIS SPECIFIC EVENT) */}
          {section === 'events' && workspaceEvent && (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => runAdminTransition(() => setWorkspaceEventId(null))}
                  className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:border-indigo-300 hover:text-indigo-700 rounded-lg cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Quay lại danh sách sự kiện</span>
                </button>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={togglingPublicId === workspaceEvent.id}
                    onClick={() => handleTogglePublic(workspaceEvent)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border cursor-pointer disabled:opacity-60 ${
                      workspaceEvent.isPublic
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                        : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                    }`}
                  >
                    {togglingPublicId === workspaceEvent.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : workspaceEvent.isPublic ? (
                      <Globe className="w-3.5 h-3.5" />
                    ) : (
                      <Lock className="w-3.5 h-3.5" />
                    )}
                    <span>
                      {workspaceEvent.isPublic
                        ? 'Đang công khai trên trang chủ'
                        : 'Đang ẩn · Bấm để công khai'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => openEditModal(workspaceEvent)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Sửa thông tin chung</span>
                  </button>
                </div>
              </div>

              {/* Event Summary Header Card */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col lg:flex-row gap-5 justify-between">
                <div className="flex flex-col sm:flex-row gap-4 min-w-0">
                  <EventBanner
                    src={workspaceEvent.bannerUrl}
                    alt={workspaceEvent.title}
                    category={workspaceEvent.category}
                    className="w-full sm:w-44 h-28 rounded-xl shrink-0"
                  />
                  <div className="min-w-0 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 font-semibold border rounded-md ${
                          getEventCategoryMeta(workspaceEvent.category).badgeClass
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            getEventCategoryMeta(workspaceEvent.category).dotClass
                          }`}
                        />
                        <span>{workspaceEvent.category}</span>
                      </span>
                      <span className="text-slate-300">·</span>
                      <span className="text-slate-600">{workspaceEvent.organizer}</span>
                    </div>
                    <h2 className="text-xl font-bold text-slate-900">{workspaceEvent.title}</h2>
                    <div className="text-xs text-slate-500">
                      {formatDateTimeVN(workspaceEvent.startTime)} · {workspaceEvent.location}
                    </div>
                    {workspaceEvent.clientName && (
                      <div className="pt-1 text-xs text-slate-700 flex flex-wrap items-center gap-3">
                        <span className="font-semibold text-indigo-700">
                          Khách đặt tổ chức: {workspaceEvent.clientName}
                        </span>
                        {workspaceEvent.clientPhone && <span>SĐT: {workspaceEvent.clientPhone}</span>}
                        {workspaceEvent.clientEmail && <span>Email: {workspaceEvent.clientEmail}</span>}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row lg:flex-col gap-3 shrink-0 lg:w-60">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                      Tiến độ duyệt &amp; kế hoạch
                    </label>
                    <select
                      disabled={updatingPlanningEventId === workspaceEvent.id}
                      value={workspaceEvent.planningStatus}
                      onChange={(e) =>
                        handlePlanningStatusChange(
                          workspaceEvent.id,
                          e.target.value as PlanningStatus
                        )
                      }
                      className={`w-full px-3 py-1.5 text-xs font-semibold bg-white border border-slate-200 rounded-lg cursor-pointer disabled:opacity-60 ${
                        PLANNING_STATUS_META[workspaceEvent.planningStatus]?.textClass
                      }`}
                    >
                      <option value="pending_review">Chờ duyệt</option>
                      <option value="planning">Đang lên kế hoạch</option>
                      <option value="confirmed">Đã xác nhận</option>
                      <option value="rejected">Từ chối</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                      Trạng thái mở đăng ký
                    </label>
                    <select
                      disabled={updatingStatusEventId === workspaceEvent.id}
                      value={workspaceEvent.status}
                      onChange={(e) =>
                        handleQuickEventStatus(workspaceEvent.id, e.target.value as EventStatus)
                      }
                      className={`w-full px-3 py-1.5 text-xs font-semibold bg-white border border-slate-200 rounded-lg cursor-pointer disabled:opacity-60 ${
                        EVENT_STATUS_META[workspaceEvent.status]?.textClass
                      }`}
                    >
                      <option value="ongoing">Mở đăng ký</option>
                      <option value="upcoming">Sắp diễn ra</option>
                      <option value="paused">Tạm đóng</option>
                      <option value="completed">Đã kết thúc</option>
                      <option value="cancelled">Đã hủy</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* 3 Isolated Event-Scoped Tabs with Sliding Indicator */}
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                <div className="border-b border-slate-200 px-4 py-2.5 overflow-x-auto bg-slate-50/70">
                  <div ref={wsTabNavRef} className="relative inline-flex items-center gap-1.5">
                    <span
                      aria-hidden="true"
                      className="ef-sliding-pill pointer-events-none absolute top-0 left-0 rounded-lg bg-white border border-slate-200/80 shadow-xs transition-[transform,width,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
                      style={{
                        width: `${wsTabPill.width}px`,
                        height: `${wsTabPill.height}px`,
                        transform: `translate3d(${wsTabPill.x}px, ${wsTabPill.y}px, 0)`,
                        opacity: wsTabPill.ready ? 1 : 0,
                      }}
                    />
                    <button
                      ref={setWsTabNavRef('services')}
                      type="button"
                      onClick={() => {
                        triggerPageProgress();
                        setWorkspaceTab('services');
                      }}
                      className={`relative z-10 inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                        workspaceTab === 'services'
                          ? 'text-indigo-700'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Wrench className="w-4 h-4" />
                      <span>
                        1. Dịch vụ khách hàng yêu cầu ({workspaceEvent.requestedServices.length})
                      </span>
                    </button>

                    <button
                      ref={setWsTabNavRef('guests')}
                      type="button"
                      onClick={() => {
                        triggerPageProgress();
                        setWorkspaceTab('guests');
                      }}
                      className={`relative z-10 inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                        workspaceTab === 'guests'
                          ? 'text-indigo-700'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <BadgeCheck className="w-4 h-4" />
                      <span>
                        2. Danh sách khách mời của sự kiện ({workspaceEvent.invitedGuests.length})
                      </span>
                    </button>

                    <button
                      ref={setWsTabNavRef('participants')}
                      type="button"
                      onClick={() => {
                        triggerPageProgress();
                        setWorkspaceTab('participants');
                      }}
                      className={`relative z-10 inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                        workspaceTab === 'participants'
                          ? 'text-indigo-700'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <UserCheck className="w-4 h-4" />
                      <span>
                        3. Danh sách người tham gia ({workspaceEventRegs.length}/
                        {workspaceEvent.maxSlots})
                      </span>
                    </button>
                  </div>
                </div>

                {/* TAB 1: REQUESTED SERVICES FOR THIS EVENT */}
                {workspaceTab === 'services' && (
                  <div key="ws-services" className="p-5 sm:p-6 space-y-6 animate-ef-page-enter">
                    {/* Overall Event Response Note for Client */}
                    <div className="p-4 sm:p-5 rounded-xl bg-indigo-50/60 border border-indigo-200 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <MessageSquare className="w-4 h-4 text-indigo-600 shrink-0" />
                          <h3 className="text-sm font-bold text-slate-900">
                            Ghi chú phản hồi cho khách hàng
                          </h3>
                        </div>
                        <span className="text-[11px] text-indigo-700 font-medium">
                          Hiển thị trực tiếp tại mục &ldquo;Sự kiện của tôi → Yêu cầu tổ chức&rdquo;
                        </span>
                      </div>

                      <textarea
                        rows={2}
                        value={eventResponseDraft}
                        onChange={(e) => setEventResponseDraft(e.target.value)}
                        placeholder="Nhập phản hồi phê duyệt, lịch khảo sát địa điểm hoặc lưu ý điều phối gửi tới người yêu cầu tổ chức..."
                        className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white border border-indigo-200/80 rounded-xl focus:outline-none focus:border-indigo-600"
                      />

                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-[11px] text-slate-500">
                          Đồng bộ trường <code className="font-mono">adminResponseNote</code> lên Cloud Firestore.
                        </span>
                        <button
                          type="button"
                          disabled={savingEventResponse}
                          onClick={handleSaveEventResponse}
                          className="ef-btn-tactile min-h-[38px] inline-flex items-center justify-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg cursor-pointer disabled:opacity-60"
                        >
                          {savingEventResponse ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Save className="w-3.5 h-3.5" />
                          )}
                          <span>
                            {savingEventResponse ? 'Đang lưu...' : 'Lưu phản hồi cho khách'}
                          </span>
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">
                          Hạng mục dịch vụ của sự kiện này
                        </h3>
                        <p className="text-xs text-slate-500">
                          Duyệt yêu cầu từ khách hàng tổ chức, cập nhật tiến độ chuẩn bị và phản hồi
                          ghi chú trực tiếp cho từng dịch vụ.
                        </p>
                      </div>
                    </div>

                    {workspaceEvent.requestedServices.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
                        Sự kiện này chưa có dịch vụ đi kèm nào. Bạn có thể bổ sung dịch vụ bằng biểu
                        mẫu bên dưới.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {workspaceEvent.requestedServices.map((srv) => {
                          const sMeta = SERVICE_STATUS_META[srv.status];
                          return (
                            <div
                              key={srv.id}
                              className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3"
                            >
                              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                                <div className="space-y-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-sm font-bold text-slate-900">
                                      {srv.serviceName}
                                    </span>
                                    <span
                                      className={`px-2 py-0.5 text-[11px] font-semibold rounded border ${sMeta.bgClass} ${sMeta.textClass}`}
                                    >
                                      {sMeta.label}
                                    </span>
                                  </div>
                                  {srv.quantityOrScope && (
                                    <p className="text-xs text-slate-700">
                                      <span className="font-semibold">Quy mô / Số lượng:</span>{' '}
                                      {srv.quantityOrScope}
                                    </p>
                                  )}
                                  {srv.clientNote && (
                                    <p className="text-xs text-slate-600">
                                      <span className="font-semibold">Ghi chú từ khách:</span>{' '}
                                      {srv.clientNote}
                                    </p>
                                  )}
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                  <select
                                    aria-label={`Trạng thái dịch vụ ${srv.serviceName}`}
                                    disabled={savingServices}
                                    value={srv.status}
                                    onChange={(e) =>
                                      handleServiceStatusChange(
                                        srv.id,
                                        e.target.value as ServiceRequestStatus
                                      )
                                    }
                                    className="px-2.5 py-1.5 text-xs font-semibold bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-600 cursor-pointer disabled:opacity-60"
                                  >
                                    <option value="pending">Chờ duyệt</option>
                                    <option value="approved">Đã duyệt</option>
                                    <option value="in_progress">Đang chuẩn bị</option>
                                    <option value="completed">Sẵn sàng / Hoàn tất</option>
                                    <option value="rejected">Không áp dụng</option>
                                  </select>
                                  <button
                                    type="button"
                                    disabled={savingServices}
                                    onClick={() => handleRemoveService(srv.id)}
                                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md cursor-pointer disabled:opacity-60"
                                    title="Xóa dịch vụ"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>

                              <div className="flex flex-col sm:flex-row gap-2">
                                <input
                                  type="text"
                                  value={serviceNotesDraft[srv.id] ?? ''}
                                  onChange={(e) =>
                                    setServiceNotesDraft((prev) => ({
                                      ...prev,
                                      [srv.id]: e.target.value,
                                    }))
                                  }
                                  placeholder="Phản hồi / ghi chú điều phối của Ban quản trị cho khách..."
                                  className="flex-1 px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-600"
                                />
                                <button
                                  type="button"
                                  disabled={savingServices}
                                  onClick={() => handleSaveServiceNote(srv.id)}
                                  className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-white border border-indigo-200 hover:bg-indigo-50 rounded-lg cursor-pointer shrink-0 disabled:opacity-60"
                                >
                                  {savingServices ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <Save className="w-3.5 h-3.5" />
                                  )}
                                  <span>Lưu ghi chú</span>
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Add service to this event */}
                    <form
                      onSubmit={handleAddServiceToEvent}
                      className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3"
                    >
                      <div className="text-xs font-bold text-slate-800">
                        + Bổ sung dịch vụ vận hành cho sự kiện này
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                        <select
                          value={newServiceKey}
                          onChange={(e) => setNewServiceKey(e.target.value)}
                          className="sm:col-span-4 px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg"
                        >
                          {SYSTEM_SERVICE_CATALOG.map((c) => (
                            <option key={c.key} value={c.key}>
                              {c.name}
                            </option>
                          ))}
                          <option value="custom">Dịch vụ tùy chỉnh khác...</option>
                        </select>

                        {newServiceKey === 'custom' && (
                          <input
                            type="text"
                            value={newCustomServiceName}
                            onChange={(e) => setNewCustomServiceName(e.target.value)}
                            placeholder="Tên dịch vụ tùy chỉnh..."
                            className="sm:col-span-3 px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg"
                          />
                        )}

                        <input
                          type="text"
                          value={newServiceScope}
                          onChange={(e) => setNewServiceScope(e.target.value)}
                          placeholder="Quy mô / Số lượng (vd: 2 nhân sự)"
                          className={`${
                            newServiceKey === 'custom' ? 'sm:col-span-2' : 'sm:col-span-4'
                          } px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg`}
                        />
                        <input
                          type="text"
                          value={newServiceAdminNote}
                          onChange={(e) => setNewServiceAdminNote(e.target.value)}
                          placeholder="Ghi chú xác nhận..."
                          className="sm:col-span-3 px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg"
                        />
                        <button
                          type="submit"
                          disabled={savingServices}
                          className="sm:col-span-1 inline-flex items-center justify-center gap-1 px-3 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg cursor-pointer disabled:opacity-60"
                        >
                          {savingServices ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <span>Thêm</span>
                          )}
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {/* TAB 2: INVITED GUESTS FOR THIS EVENT */}
                {workspaceTab === 'guests' && (
                  <div key="ws-guests" className="p-5 sm:p-6 space-y-6 animate-ef-page-enter">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">
                          Danh sách khách mời chính thức của sự kiện
                        </h3>
                        <p className="text-xs text-slate-500">
                          Quản lý VIP, Đại biểu, Diễn giả và Khách mời riêng biệt cho sự kiện{' '}
                          <strong>{workspaceEvent.title}</strong>.
                        </p>
                      </div>
                      <select
                        value={guestFilterType}
                        onChange={(e) =>
                          setGuestFilterType(e.target.value as 'all' | GuestCategory)
                        }
                        className="px-3 py-1.5 text-xs font-medium bg-white border border-slate-200 rounded-lg"
                      >
                        <option value="all">Tất cả nhóm khách mời</option>
                        {GUEST_TYPE_OPTIONS.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Add Guest Form */}
                    <form
                      onSubmit={handleAddGuest}
                      className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3"
                    >
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                        <UserPlus className="w-4 h-4 text-indigo-600" />
                        <span>Thêm khách mời mới vào sự kiện</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                        <input
                          type="text"
                          required
                          value={guestFullName}
                          onChange={(e) => setGuestFullName(e.target.value)}
                          placeholder="Họ và tên khách mời *"
                          className="sm:col-span-3 px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg"
                        />
                        <select
                          value={guestType}
                          onChange={(e) => setGuestType(e.target.value as GuestCategory)}
                          className="sm:col-span-2 px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg"
                        >
                          {GUEST_TYPE_OPTIONS.map((t) => (
                            <option key={t} value={t}>
                              {t}
                            </option>
                          ))}
                        </select>
                        <input
                          type="text"
                          value={guestTitle}
                          onChange={(e) => setGuestTitle(e.target.value)}
                          placeholder="Chức danh (vd: Giám đốc)"
                          className="sm:col-span-2 px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg"
                        />
                        <input
                          type="text"
                          value={guestOrg}
                          onChange={(e) => setGuestOrg(e.target.value)}
                          placeholder="Đơn vị / Công ty"
                          className="sm:col-span-2 px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg"
                        />
                        <input
                          type="text"
                          value={guestPhone}
                          onChange={(e) => setGuestPhone(e.target.value)}
                          placeholder="Số điện thoại"
                          className="sm:col-span-3 px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg"
                        />
                        <input
                          type="email"
                          value={guestEmail}
                          onChange={(e) => setGuestEmail(e.target.value)}
                          placeholder="Email liên hệ"
                          className="sm:col-span-4 px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg"
                        />
                        <input
                          type="text"
                          value={guestNote}
                          onChange={(e) => setGuestNote(e.target.value)}
                          placeholder="Ghi chú đón tiếp / vị trí ghế..."
                          className="sm:col-span-6 px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg"
                        />
                        <button
                          type="submit"
                          disabled={savingGuests}
                          className="ef-btn-tactile sm:col-span-2 px-3 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg cursor-pointer disabled:opacity-60"
                        >
                          {savingGuests ? 'Đang lưu...' : 'Thêm khách mời'}
                        </button>
                      </div>
                    </form>

                    {filteredWorkspaceGuests.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
                        Chưa có khách mời nào trong danh sách của sự kiện này.
                      </div>
                    ) : (
                      <>
                        {/* Mobile Card View (< md) */}
                        <div className="md:hidden space-y-3">
                          {filteredWorkspaceGuests.map((g) => (
                            <div
                              key={g.id}
                              className="p-4 rounded-xl border border-slate-200 bg-white space-y-2.5 text-xs"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <div className="font-bold text-sm text-slate-900">
                                    {g.fullName}
                                  </div>
                                  {(g.title || g.organization) && (
                                    <div className="text-slate-600 mt-0.5">
                                      {[g.title, g.organization].filter(Boolean).join(' · ')}
                                    </div>
                                  )}
                                </div>
                                <span className="px-2 py-0.5 font-semibold rounded bg-indigo-50 text-indigo-700 border border-indigo-200 shrink-0">
                                  {g.guestType}
                                </span>
                              </div>
                              {(g.phone || g.email) && (
                                <div className="text-slate-600 flex flex-wrap gap-x-3 gap-y-0.5">
                                  {g.phone && <span className="tabular-nums">{g.phone}</span>}
                                  {g.email && <span className="truncate">{g.email}</span>}
                                </div>
                              )}
                              {g.note && (
                                <div className="text-[11px] text-slate-500 bg-slate-50 px-2.5 py-1.5 rounded-lg">
                                  {g.note}
                                </div>
                              )}
                              <div className="flex items-center gap-2 pt-1">
                                <select
                                  disabled={savingGuests}
                                  value={g.rsvpStatus}
                                  onChange={(e) =>
                                    handleGuestRsvpChange(
                                      g.id,
                                      e.target.value as GuestRsvpStatus
                                    )
                                  }
                                  className={`flex-1 min-h-[40px] px-3 py-1.5 text-xs font-semibold bg-white border border-slate-200 rounded-lg cursor-pointer ${
                                    GUEST_RSVP_META[g.rsvpStatus]?.textClass
                                  }`}
                                >
                                  <option value="invited">Đã gửi mời</option>
                                  <option value="confirmed">Xác nhận tham dự</option>
                                  <option value="checked_in">Đã có mặt</option>
                                  <option value="declined">Từ chối</option>
                                </select>
                                <button
                                  type="button"
                                  disabled={savingGuests}
                                  onClick={() => handleRemoveGuest(g.id)}
                                  className="min-w-[40px] min-h-[40px] inline-flex items-center justify-center text-slate-500 hover:text-rose-600 bg-slate-50 hover:bg-rose-50 border border-slate-200 rounded-lg cursor-pointer"
                                  title="Xóa khách mời"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Desktop Table View (>= md) */}
                        <div className="hidden md:block overflow-x-auto border border-slate-200 rounded-xl">
                          <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                              <th className="py-3 px-4">Khách mời</th>
                              <th className="py-3 px-4">Nhóm</th>
                              <th className="py-3 px-4">Đơn vị &amp; Chức danh</th>
                              <th className="py-3 px-4">Liên hệ</th>
                              <th className="py-3 px-4">Trạng thái tham dự</th>
                              <th className="py-3 px-4 text-right">Xóa</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-xs">
                            {filteredWorkspaceGuests.map((g) => (
                              <tr key={g.id} className="hover:bg-slate-50/70">
                                <td className="py-3 px-4">
                                  <div className="font-bold text-slate-900">{g.fullName}</div>
                                  {g.note && (
                                    <div className="text-[11px] text-slate-500 mt-0.5">
                                      {g.note}
                                    </div>
                                  )}
                                </td>
                                <td className="py-3 px-4 whitespace-nowrap">
                                  <span className="px-2 py-0.5 font-semibold rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                                    {g.guestType}
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-slate-700">
                                  <div>{g.title || '—'}</div>
                                  <div className="text-slate-500">{g.organization || ''}</div>
                                </td>
                                <td className="py-3 px-4 text-slate-600">
                                  <div>{g.phone || '—'}</div>
                                  <div className="text-slate-500">{g.email || ''}</div>
                                </td>
                                <td className="py-3 px-4 whitespace-nowrap">
                                  <select
                                    disabled={savingGuests}
                                    value={g.rsvpStatus}
                                    onChange={(e) =>
                                      handleGuestRsvpChange(
                                        g.id,
                                        e.target.value as GuestRsvpStatus
                                      )
                                    }
                                    className={`px-2.5 py-1 text-xs font-semibold bg-white border border-slate-200 rounded-md cursor-pointer ${
                                      GUEST_RSVP_META[g.rsvpStatus]?.textClass
                                    }`}
                                  >
                                    <option value="invited">Đã gửi mời</option>
                                    <option value="confirmed">Xác nhận tham dự</option>
                                    <option value="checked_in">Đã có mặt</option>
                                    <option value="declined">Từ chối</option>
                                  </select>
                                </td>
                                <td className="py-3 px-4 text-right">
                                  <button
                                    type="button"
                                    disabled={savingGuests}
                                    onClick={() => handleRemoveGuest(g.id)}
                                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md cursor-pointer"
                                    title="Xóa khách mời"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      </>
                    )}
                  </div>
                )}

                {/* TAB 3: PARTICIPANTS REGISTERED FOR THIS SPECIFIC EVENT */}
                {workspaceTab === 'participants' && (
                  <div key="ws-participants" className="p-5 sm:p-6 space-y-5 animate-ef-page-enter">
                    <div className="p-4 rounded-xl bg-indigo-50/70 border border-indigo-200 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <QrCode className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                        <div>
                          <div className="text-xs font-bold text-slate-900">
                            Check-in nhanh mã QR cho sự kiện này
                          </div>
                          <div className="text-[11px] text-slate-600">
                            Chỉ đối chiếu với danh sách người đã đăng ký của{' '}
                            <strong>{workspaceEvent.title}</strong>.
                          </div>
                        </div>
                      </div>
                      <form onSubmit={handleWorkspaceQrCheckIn} className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
                        <input
                          type="text"
                          value={wsQrInput}
                          onChange={(e) => setWsQrInput(e.target.value)}
                          placeholder="Nhập mã EF-XXXX-XXXX..."
                          className="min-h-[40px] flex-1 px-3 py-2 text-xs font-mono bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-600"
                        />
                        <button
                          type="submit"
                          disabled={wsCheckingIn || !wsQrInput.trim()}
                          className="ef-btn-tactile min-h-[40px] px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg cursor-pointer disabled:opacity-50 whitespace-nowrap"
                        >
                          {wsCheckingIn ? 'Đang xử lý...' : 'Check-in'}
                        </button>
                      </form>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="relative">
                          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            type="search"
                            value={wsParticipantSearch}
                            onChange={(e) => setWsParticipantSearch(e.target.value)}
                            placeholder="Tìm tên, email, SĐT, mã QR..."
                            className="pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-600"
                          />
                        </div>
                        <select
                          value={wsParticipantStatus}
                          onChange={(e) =>
                            setWsParticipantStatus(
                              e.target.value as 'all' | RegistrationStatus
                            )
                          }
                          className="px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg"
                        >
                          <option value="all">Tất cả trạng thái</option>
                          <option value="confirmed">Đã xác nhận</option>
                          <option value="attended">Đã tham dự</option>
                          <option value="pending">Chờ duyệt</option>
                          <option value="cancelled">Đã hủy</option>
                        </select>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleExportCsv(filteredWorkspaceRegs, workspaceEvent.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Xuất CSV sự kiện</span>
                      </button>
                    </div>

                    {filteredWorkspaceRegs.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
                        Chưa có người tham gia nào đăng ký sự kiện này.
                      </div>
                    ) : (
                      <>
                        {/* Mobile Card View (< md) */}
                        <div className="md:hidden space-y-3">
                          {filteredWorkspaceRegs.map((reg) => {
                            const statusMeta = REGISTRATION_STATUS_META[reg.status];
                            return (
                              <div
                                key={reg.id}
                                className="p-4 rounded-xl border border-slate-200 bg-white space-y-2.5 text-xs"
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0">
                                    <div className="font-bold text-sm text-slate-900">
                                      {reg.guestName}
                                    </div>
                                    <div className="font-mono text-[11px] font-semibold text-indigo-700 mt-0.5">
                                      {reg.ticketCode}
                                    </div>
                                  </div>
                                  <span className={`font-semibold shrink-0 ${statusMeta.textClass}`}>
                                    {statusMeta.label}
                                  </span>
                                </div>
                                <div className="text-slate-600">
                                  {reg.guestEmail} · {reg.guestPhone}
                                </div>
                                {reg.note && (
                                  <div className="text-[11px] text-slate-500 bg-slate-50 px-2.5 py-1.5 rounded-lg">
                                    {reg.note}
                                  </div>
                                )}
                                <div className="text-[11px] text-slate-400 tabular-nums">
                                  {reg.checkedInAt
                                    ? `Check-in: ${formatDateTimeVN(reg.checkedInAt)}`
                                    : `ĐK: ${formatShortDateVN(reg.registeredAt)}`}
                                </div>
                                <div className="flex flex-wrap items-center gap-2 pt-1">
                                  {(reg.status === 'confirmed' || reg.status === 'pending') && (
                                    <button
                                      type="button"
                                      disabled={Boolean(pendingRegIds[reg.id])}
                                      onClick={() => handleStatusChange(reg, 'attended')}
                                      className="min-h-[40px] inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg cursor-pointer disabled:opacity-60"
                                    >
                                      {pendingRegIds[reg.id] ? (
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                      ) : (
                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                      )}
                                      <span>Check-in</span>
                                    </button>
                                  )}
                                  <select
                                    disabled={Boolean(pendingRegIds[reg.id])}
                                    value={reg.status}
                                    onChange={(e) =>
                                      handleStatusChange(
                                        reg,
                                        e.target.value as RegistrationStatus
                                      )
                                    }
                                    className="flex-1 min-h-[40px] px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg cursor-pointer disabled:opacity-60"
                                  >
                                    <option value="pending">Chờ duyệt</option>
                                    <option value="confirmed">Đã xác nhận</option>
                                    <option value="attended">Đã tham dự</option>
                                    <option value="cancelled">Đã hủy</option>
                                  </select>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Desktop Table View (>= md) */}
                        <div className="hidden md:block overflow-x-auto border border-slate-200 rounded-xl">
                          <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                              <th className="py-3 px-4">Mã QR</th>
                              <th className="py-3 px-4">Người tham gia</th>
                              <th className="py-3 px-4">Ghi chú đăng ký</th>
                              <th className="py-3 px-4">Trạng thái</th>
                              <th className="py-3 px-4 text-right">Cập nhật</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-xs">
                            {filteredWorkspaceRegs.map((reg) => {
                              const statusMeta = REGISTRATION_STATUS_META[reg.status];
                              return (
                                <tr key={reg.id} className="hover:bg-slate-50/70">
                                  <td className="py-3 px-4 font-mono font-bold text-slate-800 whitespace-nowrap">
                                    {reg.ticketCode}
                                  </td>
                                  <td className="py-3 px-4">
                                    <div className="font-semibold text-slate-900">
                                      {reg.guestName}
                                    </div>
                                    <div className="text-slate-500">
                                      {reg.guestEmail} · {reg.guestPhone}
                                    </div>
                                  </td>
                                  <td className="py-3 px-4 text-slate-600 max-w-xs">
                                    {reg.note || '—'}
                                  </td>
                                  <td className="py-3 px-4 whitespace-nowrap">
                                    <div className={`font-semibold ${statusMeta.textClass}`}>
                                      {statusMeta.label}
                                    </div>
                                    <div className="text-[11px] text-slate-400">
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
                                          disabled={Boolean(pendingRegIds[reg.id])}
                                          onClick={() => handleStatusChange(reg, 'attended')}
                                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-md cursor-pointer disabled:opacity-60"
                                        >
                                          {pendingRegIds[reg.id] ? (
                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                          ) : (
                                            <CheckCircle2 className="w-3.5 h-3.5" />
                                          )}
                                          <span>Check-in</span>
                                        </button>
                                      )}
                                      <select
                                        disabled={Boolean(pendingRegIds[reg.id])}
                                        value={reg.status}
                                        onChange={(e) =>
                                          handleStatusChange(
                                            reg,
                                            e.target.value as RegistrationStatus
                                          )
                                        }
                                        className="px-2 py-1 text-xs bg-white border border-slate-200 rounded-md cursor-pointer disabled:opacity-60"
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
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* SECTION 3: GLOBAL PARTICIPANTS & QR CHECK-IN */}
          {section === 'registrations' && (
            <div className="space-y-5">
              <div className="bg-white border border-indigo-200 rounded-xl p-5 space-y-4">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                      <QrCode className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-slate-900">
                        Check-in nhanh bằng mã QR toàn hệ thống
                      </h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Nhập mã xác nhận (ví dụ <code className="font-mono">EF-8421-TECH</code>)
                        hoặc dán chuỗi JSON từ mã QR của người tham gia để ghi nhận check-in.
                      </p>
                    </div>
                  </div>

                  <form onSubmit={handleQrCheckIn} className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
                    <input
                      type="text"
                      value={qrInput}
                      onChange={(e) => setQrInput(e.target.value)}
                      placeholder="Nhập mã EF-XXXX-XXXX..."
                      className="min-h-[42px] flex-1 lg:w-64 px-3.5 py-2 text-sm font-mono border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-600"
                    />
                    <button
                      type="submit"
                      disabled={checkingInQr || !qrInput.trim()}
                      className="ef-btn-tactile min-h-[42px] inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg cursor-pointer disabled:opacity-50 whitespace-nowrap shrink-0"
                    >
                      {checkingInQr ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4" />
                      )}
                      <span>{checkingInQr ? 'Đang xử lý...' : 'Check-in QR'}</span>
                    </button>
                  </form>
                </div>
              </div>

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
                      ).map((tabItem) => (
                        <button
                          key={tabItem.key}
                          type="button"
                          onClick={() => setRegStatusFilter(tabItem.key)}
                          className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                            regStatusFilter === tabItem.key
                              ? 'bg-white text-slate-900 shadow-xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          {tabItem.label}
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
                        placeholder="Tìm tên, email, mã QR..."
                        className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-600"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        handleExportCsv(
                          filteredRegistrations,
                          regEventFilter === 'all' ? 'tat-ca-su-kien' : regEventFilter
                        )
                      }
                      className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Xuất CSV (UTF-8)</span>
                    </button>
                  </div>
                </div>

                {filteredRegistrations.length === 0 ? (
                  <div className="p-8 sm:p-10 text-center text-sm text-slate-500">
                    Không tìm thấy lượt đăng ký phù hợp.
                  </div>
                ) : (
                  <>
                    {/* Mobile Card View (< md) */}
                    <div className="md:hidden divide-y divide-slate-100">
                      {filteredRegistrations.map((reg) => {
                        const statusMeta = REGISTRATION_STATUS_META[reg.status];
                        return (
                          <div key={reg.id} className="p-4 space-y-2.5 text-xs">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <div className="font-bold text-sm text-slate-900">
                                  {reg.guestName}
                                </div>
                                <div className="font-mono text-[11px] font-semibold text-indigo-700 mt-0.5">
                                  {reg.ticketCode}
                                </div>
                              </div>
                              <span className={`font-semibold shrink-0 ${statusMeta.textClass}`}>
                                {statusMeta.label}
                              </span>
                            </div>
                            <div className="text-slate-700 font-medium line-clamp-1">
                              {reg.eventTitle}
                            </div>
                            <div className="text-slate-500">
                              {reg.guestEmail} · {reg.guestPhone}
                            </div>
                            {reg.note && (
                              <div className="text-[11px] text-slate-500 bg-slate-50 px-2.5 py-1.5 rounded-lg">
                                {reg.note}
                              </div>
                            )}
                            <div className="text-[11px] text-slate-400 tabular-nums">
                              {reg.checkedInAt
                                ? `Check-in: ${formatDateTimeVN(reg.checkedInAt)}`
                                : `ĐK: ${formatShortDateVN(reg.registeredAt)}`}
                            </div>
                            <div className="flex flex-wrap items-center gap-2 pt-1">
                              {(reg.status === 'confirmed' || reg.status === 'pending') && (
                                <button
                                  type="button"
                                  disabled={Boolean(pendingRegIds[reg.id])}
                                  onClick={() => handleStatusChange(reg, 'attended')}
                                  className="min-h-[40px] inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg cursor-pointer disabled:opacity-60"
                                >
                                  {pendingRegIds[reg.id] ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                  )}
                                  <span>Check-in</span>
                                </button>
                              )}
                              <select
                                aria-label={`Trạng thái mã ${reg.ticketCode}`}
                                disabled={Boolean(pendingRegIds[reg.id])}
                                value={reg.status}
                                onChange={(e) =>
                                  handleStatusChange(reg, e.target.value as RegistrationStatus)
                                }
                                className="flex-1 min-h-[40px] px-3 py-1.5 text-xs font-medium bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-600 cursor-pointer disabled:opacity-60"
                              >
                                <option value="pending">Chờ duyệt</option>
                                <option value="confirmed">Đã xác nhận</option>
                                <option value="attended">Đã tham dự</option>
                                <option value="cancelled">Đã hủy</option>
                              </select>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Desktop Table View (>= md) */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                          <th className="py-3 px-4">Mã QR</th>
                          <th className="py-3 px-4">Người tham gia</th>
                          <th className="py-3 px-4">Sự kiện đăng ký</th>
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
                                <div className="text-slate-800 font-medium max-w-[260px] truncate">
                                  {reg.eventTitle}
                                </div>
                                {reg.note && (
                                  <div className="text-xs text-slate-500 truncate max-w-[260px]">
                                    {reg.note}
                                  </div>
                                )}
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
                                      disabled={Boolean(pendingRegIds[reg.id])}
                                      onClick={() => handleStatusChange(reg, 'attended')}
                                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-md cursor-pointer disabled:opacity-60"
                                    >
                                      {pendingRegIds[reg.id] ? (
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                      ) : (
                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                      )}
                                      <span>Check-in</span>
                                    </button>
                                  )}
                                  <select
                                    aria-label={`Trạng thái mã ${reg.ticketCode}`}
                                    disabled={Boolean(pendingRegIds[reg.id])}
                                    value={reg.status}
                                    onChange={(e) =>
                                      handleStatusChange(reg, e.target.value as RegistrationStatus)
                                    }
                                    className="px-2 py-1.5 text-xs font-medium bg-white border border-slate-200 rounded-md focus:outline-none focus:border-indigo-600 cursor-pointer disabled:opacity-60"
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
                  </>
                )}
              </div>
            </div>
          )}

          {/* SECTION 4: USERS */}
          {section === 'users' && (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-900">
                  Danh sách tài khoản hệ thống (User &amp; Admin)
                </h2>
                <span className="text-xs text-slate-500 tabular-nums">
                  {users.length} tài khoản
                </span>
              </div>
              {/* Mobile Card View (< md) */}
              <div className="md:hidden divide-y divide-slate-100">
                {users.map((u) => (
                  <div key={u.uid} className="p-4 space-y-1.5 text-xs">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-bold text-sm text-slate-900">{u.fullName}</div>
                        {u.organization && (
                          <div className="text-slate-500 flex items-center gap-1 mt-0.5">
                            <Building2 className="w-3 h-3 shrink-0" />
                            <span className="truncate">{u.organization}</span>
                          </div>
                        )}
                      </div>
                      <span
                        className={`px-2 py-0.5 font-semibold rounded-md shrink-0 ${
                          u.role === 'admin'
                            ? 'bg-indigo-50 text-indigo-700'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {u.role === 'admin' ? 'Admin' : 'User'}
                      </span>
                    </div>
                    <div className="text-slate-600 truncate">{u.email}</div>
                    <div className="flex items-center justify-between text-slate-500 tabular-nums pt-0.5">
                      <span>{u.phone || 'Chưa có SĐT'}</span>
                      <span>Tạo: {formatShortDateVN(u.createdAt)}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table View (>= md) */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                      <th className="py-3 px-4">Họ tên &amp; Đơn vị</th>
                      <th className="py-3 px-4">Email</th>
                      <th className="py-3 px-4">Số điện thoại</th>
                      <th className="py-3 px-4">Vai trò</th>
                      <th className="py-3 px-4">Ngày tạo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {users.map((u) => (
                      <tr key={u.uid} className="hover:bg-slate-50/70">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900">{u.fullName}</div>
                          {u.organization && (
                            <div className="text-xs text-slate-500 flex items-center gap-1">
                              <Building2 className="w-3 h-3" />
                              <span>{u.organization}</span>
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-600">{u.email}</td>
                        <td className="py-3 px-4 text-slate-600 tabular-nums">
                          {u.phone || '—'}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`text-xs font-semibold ${
                              u.role === 'admin' ? 'text-indigo-700' : 'text-slate-700'
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

          {/* SECTION 5: PUBLIC CONTACT SETTINGS & INQUIRIES */}
          {section === 'contact' && (
            <div className="space-y-6">
              <div className="max-w-3xl bg-white border border-slate-200 rounded-2xl p-4 sm:p-8">
                <div className="mb-6">
                  <h2 className="text-lg font-bold text-slate-900">
                    Cấu hình thông tin liên hệ công khai
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Số điện thoại, hotline và email tại đây sẽ hiển thị công khai trên trang Liên
                    hệ và chân trang để khách chưa đăng nhập có thể liên hệ trực tiếp với Ban quản
                    trị.
                  </p>
                </div>

                <form onSubmit={handleSavePublicContact} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        Tên nền tảng / Ban tổ chức
                      </label>
                      <input
                        type="text"
                        required
                        value={contactForm.organizationName}
                        onChange={(e) =>
                          setContactForm((s) => ({ ...s, organizationName: e.target.value }))
                        }
                        className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-600"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        Đại diện Ban quản trị
                      </label>
                      <input
                        type="text"
                        required
                        value={contactForm.adminName}
                        onChange={(e) =>
                          setContactForm((s) => ({ ...s, adminName: e.target.value }))
                        }
                        className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-600"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        Số điện thoại trực tiếp
                      </label>
                      <div className="relative">
                        <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          required
                          value={contactForm.phone}
                          onChange={(e) =>
                            setContactForm((s) => ({ ...s, phone: e.target.value }))
                          }
                          className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-600"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        Tổng đài / Hotline
                      </label>
                      <input
                        type="text"
                        required
                        value={contactForm.hotline}
                        onChange={(e) =>
                          setContactForm((s) => ({ ...s, hotline: e.target.value }))
                        }
                        className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-600"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        Email liên hệ chính thức
                      </label>
                      <div className="relative">
                        <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="email"
                          required
                          value={contactForm.email}
                          onChange={(e) =>
                            setContactForm((s) => ({ ...s, email: e.target.value }))
                          }
                          className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-600"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        Địa chỉ văn phòng
                      </label>
                      <input
                        type="text"
                        required
                        value={contactForm.officeAddress}
                        onChange={(e) =>
                          setContactForm((s) => ({ ...s, officeAddress: e.target.value }))
                        }
                        className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-600"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        Khung giờ làm việc
                      </label>
                      <input
                        type="text"
                        required
                        value={contactForm.workingHours}
                        onChange={(e) =>
                          setContactForm((s) => ({ ...s, workingHours: e.target.value }))
                        }
                        className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-600"
                      />
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex justify-end">
                    <button
                      type="submit"
                      disabled={savingContact}
                      className="ef-btn-tactile w-full sm:w-auto min-h-[42px] inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg cursor-pointer disabled:opacity-60"
                    >
                      {savingContact ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4" />
                      )}
                      <span>{savingContact ? 'Đang lưu...' : 'Lưu thông tin liên hệ'}</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* Incoming Consultation Inquiries from /lien-he */}
              <div
                id="admin-contact-inquiries"
                className="max-w-3xl bg-white border border-slate-200 rounded-2xl p-4 sm:p-8 space-y-4 scroll-mt-20"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">
                      Yêu cầu tư vấn từ trang Liên hệ ({contactInquiries.length})
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Đồng bộ trực tiếp từ collection <span className="font-mono">contact_inquiries</span> trên Cloud Firestore.
                    </p>
                  </div>
                </div>

                {contactInquiries.length === 0 ? (
                  <p className="text-xs text-slate-500 py-4">
                    Chưa có yêu cầu tư vấn nào được gửi từ trang Liên hệ.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {contactInquiries.map((inq) => (
                      <div
                        key={inq.id}
                        className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/80 space-y-2"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="text-sm font-bold text-slate-900">
                            {inq.fullName}{' '}
                            <span className="font-normal text-xs text-slate-500">
                              · {inq.contactInfo}
                            </span>
                          </div>
                          <div className="inline-flex items-center gap-1.5">
                            {updatingInquiryId === inq.id && (
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                            )}
                            <select
                              aria-label={`Trạng thái yêu cầu ${inq.fullName}`}
                              disabled={updatingInquiryId === inq.id}
                              value={inq.status}
                              onChange={async (e) => {
                                const next = e.target.value as ContactInquiryStatus;
                                setUpdatingInquiryId(inq.id);
                                try {
                                  await updateContactInquiryStatus(inq.id, next);
                                  onNotify('Đã cập nhật trạng thái yêu cầu tư vấn.');
                                } catch (err) {
                                  onNotify(
                                    err instanceof Error ? err.message : 'Lỗi cập nhật.',
                                    'error'
                                  );
                                } finally {
                                  setUpdatingInquiryId(null);
                                }
                              }}
                              className="h-8 px-2.5 text-xs font-semibold bg-white border border-slate-200 rounded-lg cursor-pointer disabled:opacity-60"
                            >
                              <option value="new">Mới tiếp nhận</option>
                              <option value="reviewed">Đã liên hệ</option>
                              <option value="resolved">Đã xử lý</option>
                            </select>
                          </div>
                        </div>
                        <div className="text-xs font-semibold text-indigo-600">{inq.topic}</div>
                        <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                          {inq.message}
                        </p>
                        <div className="text-[11px] text-slate-400 tabular-nums">
                          Gửi lúc: {formatDateTimeVN(inq.createdAt)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
            </div>
          </div>
        </main>
      </div>

      {/* Create / Edit Event Modal with smooth scale + backdrop-blur enter/exit */}
      <AnimatedModal
        isOpen={eventModalOpen}
        onClose={() => setEventModalOpen(false)}
        maxWidthClassName="max-w-3xl"
        labelledBy="admin-event-modal-title"
        backdropClassName="bg-slate-900/50 backdrop-blur-xs p-4"
        panelClassName="bg-white border border-slate-200 rounded-2xl w-full max-h-[92vh] overflow-y-auto shadow-2xl"
      >
            <div className="sticky top-0 z-10 bg-white px-4 sm:px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h2 id="admin-event-modal-title" className="text-base sm:text-lg font-bold text-slate-900">
                {editingEventId ? 'Chỉnh sửa thông tin sự kiện' : 'Tạo sự kiện mới'}
              </h2>
              <button
                type="button"
                onClick={() => setEventModalOpen(false)}
                className="min-w-[38px] min-h-[38px] inline-flex items-center justify-center text-slate-500 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEvent} className="p-4 sm:p-6 space-y-5">
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
                    Loại hình sự kiện
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

              {formState.category === 'Khác' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Nhập tên loại hình sự kiện cụ thể <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    placeholder="Ví dụ: Ngày hội Gia đình, Giải chạy Marathon, Triển lãm Sản phẩm..."
                    className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-600"
                  />
                </div>
              )}

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

              <EventImagePicker
                value={formState.bannerUrl}
                onChange={(nextUrl) => setFormState((s) => ({ ...s, bannerUrl: nextUrl }))}
                eventTitle={formState.title}
                eventCategory={
                  formState.category === 'Khác' ? customCategory : formState.category
                }
                accentColor="indigo"
              />

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

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                    Trạng thái mở đăng ký
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
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Tiến độ kế hoạch
                  </label>
                  <select
                    value={formState.planningStatus || 'confirmed'}
                    onChange={(e) =>
                      setFormState((s) => ({
                        ...s,
                        planningStatus: e.target.value as PlanningStatus,
                      }))
                    }
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-600"
                  >
                    <option value="pending_review">Chờ duyệt</option>
                    <option value="planning">Đang lên kế hoạch</option>
                    <option value="confirmed">Đã xác nhận</option>
                    <option value="rejected">Từ chối</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-wrap gap-6 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formState.isPublic !== false}
                    onChange={(e) =>
                      setFormState((s) => ({ ...s, isPublic: e.target.checked }))
                    }
                    className="w-4 h-4 accent-indigo-600 rounded"
                  />
                  <span>Công khai trên Trang chủ (cho phép người tham gia đăng ký)</span>
                </label>
                <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(formState.featured)}
                    onChange={(e) =>
                      setFormState((s) => ({ ...s, featured: e.target.checked }))
                    }
                    className="w-4 h-4 accent-indigo-600 rounded"
                  />
                  <span>Đánh dấu nổi bật</span>
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
                  <span>Xác thực đơn vị tổ chức</span>
                </label>
              </div>

              {/* Speakers Builder */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">Diễn giả / Chủ trì</span>
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

              <div className="pt-4 border-t border-slate-200 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2.5 sm:gap-3">
                <button
                  type="button"
                  onClick={() => setEventModalOpen(false)}
                  className="w-full sm:w-auto min-h-[42px] px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={savingEvent}
                  className="ef-btn-tactile w-full sm:w-auto min-h-[42px] inline-flex items-center justify-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg cursor-pointer disabled:opacity-60"
                >
                  {savingEvent && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>
                    {savingEvent ? 'Đang lưu...' : editingEventId ? 'Lưu thay đổi' : 'Tạo sự kiện'}
                  </span>
                </button>
              </div>
            </form>
      </AnimatedModal>
    </div>
  );
}
