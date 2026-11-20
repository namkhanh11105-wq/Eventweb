import { useMemo, useState, type FormEvent } from 'react';
import {
  BadgeCheck,
  Building2,
  Calendar,
  CalendarDays,
  Check,
  CheckCircle2,
  ClipboardList,
  ExternalLink,
  Globe,
  Image as ImageIcon,
  Layers,
  LogOut,
  Mail,
  MapPin,
  Menu,
  Phone,
  Plus,
  Send,
  Users,
  X,
} from 'lucide-react';
import { DEFAULT_EVENT_BANNERS } from '../data/seedData';
import { createOrganizerEventRequest } from '../services/dataService';
import { EventBanner } from './EventBanner';
import { EventDetailModal } from './EventDetailModal';
import { AnimatedNumber, RevealBlock } from './MotionPrimitives';
import {
  EVENT_CATEGORIES,
  EVENT_STATUS_META,
  formatDateTimeVN,
  formatShortDateVN,
  PLANNING_STATUS_META,
  SERVICE_STATUS_META,
  SYSTEM_SERVICE_CATALOG,
  toDatetimeLocalValue,
} from '../utils/formatters';
import type {
  AppUser,
  EventItem,
  EventServiceRequest,
  FeedbackItem,
  PublicContactInfo,
  RegistrationItem,
} from '../types';

interface OrganizerLayoutProps {
  currentUser: AppUser;
  events: EventItem[];
  registrations: RegistrationItem[];
  feedbacks: FeedbackItem[];
  publicContact: PublicContactInfo;
  permissionWarning?: string | null;
  onViewPublicLanding: () => void;
  onLogout: () => void;
  onNotify: (message: string, type?: 'success' | 'error') => void;
}

type OrganizerTab = 'requests' | 'create' | 'public_events';

function defaultStartDatetime(daysAhead: number, hour: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  d.setHours(hour, 0, 0, 0);
  return toDatetimeLocalValue(d.toISOString());
}

export function OrganizerLayout({
  currentUser,
  events,
  registrations,
  feedbacks,
  publicContact,
  permissionWarning,
  onViewPublicLanding,
  onLogout,
  onNotify,
}: OrganizerLayoutProps) {
  const [tab, setTab] = useState<OrganizerTab>('requests');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [previewEvent, setPreviewEvent] = useState<EventItem | null>(null);

  // Create request form state
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<string>(EVENT_CATEGORIES[0]);
  const [organizerName, setOrganizerName] = useState(
    currentUser.organization || currentUser.fullName
  );
  const [startTime, setStartTime] = useState(() => defaultStartDatetime(14, 8));
  const [endTime, setEndTime] = useState(() => defaultStartDatetime(14, 17));
  const [location, setLocation] = useState('');
  const [maxSlots, setMaxSlots] = useState(100);
  const [description, setDescription] = useState('');
  const [bannerUrl, setBannerUrl] = useState(DEFAULT_EVENT_BANNERS[0].url);
  const [selectedServices, setSelectedServices] = useState<
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
  const [customServiceName, setCustomServiceName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const myRequests = useMemo(() => {
    const emailLower = currentUser.email.toLowerCase();
    return events.filter(
      (ev) =>
        ev.clientUserId === currentUser.uid ||
        ev.clientEmail?.toLowerCase() === emailLower
    );
  }, [events, currentUser]);

  const publicEvents = useMemo(
    () => events.filter((ev) => ev.isPublic && ev.status !== 'cancelled'),
    [events]
  );

  const requestStats = useMemo(() => {
    return {
      total: myRequests.length,
      pending: myRequests.filter((e) => e.planningStatus === 'pending_review').length,
      planning: myRequests.filter((e) => e.planningStatus === 'planning').length,
      confirmed: myRequests.filter((e) => e.planningStatus === 'confirmed').length,
    };
  }, [myRequests]);

  function toggleService(key: string) {
    setSelectedServices((prev) => ({
      ...prev,
      [key]: {
        ...(prev[key] || { quantityOrScope: '', clientNote: '' }),
        enabled: !prev[key]?.enabled,
      },
    }));
  }

  async function handleSubmitRequest(e: FormEvent) {
    e.preventDefault();
    if (!title.trim() || !location.trim() || !description.trim()) {
      onNotify('Vui lòng điền đầy đủ tên, địa điểm và mô tả sự kiện.', 'error');
      return;
    }

    const servicesPayload: EventServiceRequest[] = SYSTEM_SERVICE_CATALOG.filter(
      (s) => selectedServices[s.key]?.enabled
    ).map((s, idx) => ({
      id: `srv-${Date.now()}-${idx}`,
      serviceKey: s.key,
      serviceName: s.name,
      quantityOrScope: selectedServices[s.key]?.quantityOrScope.trim() || undefined,
      clientNote: selectedServices[s.key]?.clientNote.trim() || undefined,
      status: 'pending',
    }));

    if (customServiceName.trim()) {
      servicesPayload.push({
        id: `srv-custom-${Date.now()}`,
        serviceKey: 'custom',
        serviceName: customServiceName.trim(),
        status: 'pending',
      });
    }

    if (servicesPayload.length === 0) {
      onNotify('Vui lòng chọn ít nhất 1 dịch vụ đi kèm cho sự kiện.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      await createOrganizerEventRequest({
        title,
        category,
        startTime,
        endTime,
        location,
        maxSlots,
        description,
        bannerUrl,
        organizerName,
        clientUserId: currentUser.uid,
        clientName: currentUser.fullName,
        clientEmail: currentUser.email,
        clientPhone: currentUser.phone,
        requestedServices: servicesPayload,
      });

      onNotify(
        'Đã gửi yêu cầu tổ chức sự kiện lên Cloud Firestore. Ban quản trị sẽ duyệt và phản hồi sớm.'
      );
      setTitle('');
      setLocation('');
      setDescription('');
      setCustomServiceName('');
      setTab('requests');
    } catch (err) {
      onNotify(
        err instanceof Error ? err.message : 'Không thể gửi yêu cầu tổ chức sự kiện.',
        'error'
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4 lg:gap-8">
          <button
            type="button"
            onClick={() => setTab('requests')}
            className="inline-flex items-center gap-2 text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <span className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </span>
            <span>EventFlow Organizer</span>
          </button>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
            <button
              type="button"
              onClick={() => setTab('requests')}
              className={`whitespace-nowrap shrink-0 pb-0.5 transition-colors cursor-pointer ${
                tab === 'requests'
                  ? 'text-indigo-600 font-semibold border-b-2 border-indigo-600'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Yêu cầu của tôi ({myRequests.length})
            </button>
            <button
              type="button"
              onClick={() => setTab('create')}
              className={`whitespace-nowrap shrink-0 pb-0.5 transition-colors cursor-pointer ${
                tab === 'create'
                  ? 'text-indigo-600 font-semibold border-b-2 border-indigo-600'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Gửi yêu cầu mới
            </button>
            <button
              type="button"
              onClick={() => setTab('public_events')}
              className={`whitespace-nowrap shrink-0 pb-0.5 transition-colors cursor-pointer ${
                tab === 'public_events'
                  ? 'text-indigo-600 font-semibold border-b-2 border-indigo-600'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Sự kiện công khai
            </button>
            <button
              type="button"
              onClick={onViewPublicLanding}
              className="whitespace-nowrap shrink-0 text-slate-600 hover:text-indigo-600 transition-colors cursor-pointer inline-flex items-center gap-1"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Trang giới thiệu</span>
            </button>
          </nav>

          <div className="hidden md:flex items-center gap-3 shrink-0">
            <div className="text-right leading-tight">
              <div className="text-xs font-bold text-slate-900 truncate max-w-[150px]">
                {currentUser.fullName}
              </div>
              <div className="text-[11px] font-medium text-sky-700">
                Khách hàng Tổ chức
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

          <button
            type="button"
            aria-label="Mở menu"
            onClick={() => setMobileMenuOpen((v) => !v)}
            className="md:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100 cursor-pointer"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-200 bg-white px-4 py-3 space-y-2">
            <button
              type="button"
              onClick={() => {
                setTab('requests');
                setMobileMenuOpen(false);
              }}
              className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              Yêu cầu của tôi ({myRequests.length})
            </button>
            <button
              type="button"
              onClick={() => {
                setTab('create');
                setMobileMenuOpen(false);
              }}
              className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-indigo-700 bg-indigo-50"
            >
              + Gửi yêu cầu tổ chức mới
            </button>
            <button
              type="button"
              onClick={() => {
                setTab('public_events');
                setMobileMenuOpen(false);
              }}
              className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              Sự kiện công khai
            </button>
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                onViewPublicLanding();
              }}
              className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              Trang giới thiệu &amp; Liên hệ
            </button>
            <button
              type="button"
              onClick={onLogout}
              className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-rose-700 hover:bg-rose-50"
            >
              Đăng xuất ({currentUser.fullName})
            </button>
          </div>
        )}
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {permissionWarning && (
          <div
            role="alert"
            className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
          >
            <span className="font-semibold">Lưu ý Cloud Firestore: </span>
            <span>{permissionWarning}</span>
          </div>
        )}

        {tab === 'requests' && (
          <div className="space-y-6 animate-ef-fade-up">
            {/* Header & Primary Action */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">
                  Cổng Khách hàng Tổ chức Sự kiện
                </h1>
                <p className="mt-1 text-sm text-slate-500">
                  Theo dõi trạng thái xử lý yêu cầu tổ chức sự kiện và tiến độ phê duyệt từng dịch
                  vụ đi kèm từ Ban quản trị theo thời gian thực.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setTab('create')}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Gửi yêu cầu tổ chức mới</span>
              </button>
            </div>

            {/* 4 KPI Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white border border-slate-200 rounded-xl p-4">
                <div className="text-xs font-medium text-slate-500">Tổng yêu cầu của bạn</div>
                <div className="mt-1.5 text-2xl sm:text-3xl font-bold text-slate-900 tabular-nums">
                  <AnimatedNumber value={requestStats.total} />
                </div>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-4">
                <div className="text-xs font-medium text-slate-500">Đang chờ duyệt</div>
                <div className="mt-1.5 text-2xl sm:text-3xl font-bold text-amber-600 tabular-nums">
                  <AnimatedNumber value={requestStats.pending} />
                </div>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-4">
                <div className="text-xs font-medium text-slate-500">Đang lên kế hoạch</div>
                <div className="mt-1.5 text-2xl sm:text-3xl font-bold text-indigo-600 tabular-nums">
                  <AnimatedNumber value={requestStats.planning} />
                </div>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-4">
                <div className="text-xs font-medium text-slate-500">Đã xác nhận triển khai</div>
                <div className="mt-1.5 text-2xl sm:text-3xl font-bold text-emerald-600 tabular-nums">
                  <AnimatedNumber value={requestStats.confirmed} />
                </div>
              </div>
            </div>

            {/* Requests List */}
            {myRequests.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center">
                <ClipboardList className="w-10 h-10 text-slate-300 mx-auto" />
                <h2 className="mt-3 text-base font-bold text-slate-900">
                  Bạn chưa gửi yêu cầu tổ chức sự kiện nào
                </h2>
                <p className="mt-1 text-sm text-slate-500 max-w-md mx-auto">
                  Hãy tạo yêu cầu đầu tiên kèm các dịch vụ mong muốn để Ban quản trị tiếp nhận và
                  lập kế hoạch triển khai.
                </p>
                <button
                  type="button"
                  onClick={() => setTab('create')}
                  className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tạo yêu cầu tổ chức sự kiện</span>
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
                                  Tiến độ: {planMeta.label}
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

                              <h2 className="mt-2.5 text-lg sm:text-xl font-bold text-slate-900">
                                {ev.title}
                              </h2>
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
                              <Calendar className="w-4 h-4 text-indigo-600 shrink-0" />
                              <span>
                                {formatDateTimeVN(ev.startTime)} → {formatShortDateVN(ev.endTime)}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <MapPin className="w-4 h-4 text-indigo-600 shrink-0" />
                              <span className="truncate">{ev.location}</span>
                            </div>
                          </div>

                          <p className="text-sm text-slate-600 leading-relaxed line-clamp-2">
                            {ev.description}
                          </p>

                          {/* Requested Services Progress */}
                          <div className="pt-4 border-t border-slate-100 space-y-2.5">
                            <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                              <span className="inline-flex items-center gap-1.5">
                                <Layers className="w-3.5 h-3.5 text-indigo-600" />
                                <span>
                                  Dịch vụ đi kèm đã yêu cầu ({ev.requestedServices.length})
                                </span>
                              </span>
                              <span className="text-slate-500 font-normal">
                                Khách mời VIP/Đại biểu: {ev.invitedGuests.length}
                              </span>
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

            {/* Direct Admin Contact Strip for Organizers */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  Liên hệ trực tiếp Ban quản trị để trao đổi chi tiết yêu cầu
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Phụ trách điều phối: <strong className="text-slate-800">{publicContact.adminName}</strong> ·{' '}
                  {publicContact.workingHours}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs font-semibold">
                <a
                  href={`tel:${publicContact.phone.replace(/\s+/g, '')}`}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 transition-colors tabular-nums"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>{publicContact.phone}</span>
                </a>
                <a
                  href={`mailto:${publicContact.email}`}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-100 text-slate-800 border border-slate-200 hover:bg-slate-200 transition-colors"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>{publicContact.email}</span>
                </a>
              </div>
            </div>
          </div>
        )}

        {tab === 'create' && (
          <div className="max-w-4xl mx-auto bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-6 animate-ef-fade-up">
            <div className="border-b border-slate-200 pb-4">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
                Gửi yêu cầu tổ chức sự kiện mới
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Điền thông tin chương trình và chọn các dịch vụ hỗ trợ từ EventFlow. Yêu cầu sẽ
                được lưu trực tiếp lên Cloud Firestore để Admin phê duyệt và lập kế hoạch.
              </p>
            </div>

            <form onSubmit={handleSubmitRequest} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Tên sự kiện dự kiến
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ví dụ: Hội nghị Khách hàng & Đối tác Khu vực Phía Nam 2026"
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Loại hình sự kiện
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-600"
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
                    Đơn vị / Doanh nghiệp đứng tên
                  </label>
                  <input
                    type="text"
                    required
                    value={organizerName}
                    onChange={(e) => setOrganizerName(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Thời gian bắt đầu dự kiến
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Thời gian kết thúc dự kiến
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-600"
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
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Tên khách sạn / trung tâm hội nghị hoặc khu vực..."
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-600"
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
                    value={maxSlots}
                    onChange={(e) => setMaxSlots(Number(e.target.value) || 50)}
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-600 tabular-nums"
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
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Nội dung chính, đối tượng khách mời VIP/đại biểu, yêu cầu đặc biệt..."
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-600"
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
                    value={bannerUrl}
                    onChange={(e) => setBannerUrl(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-600"
                  />
                </div>
                <div className="mt-2.5 grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {DEFAULT_EVENT_BANNERS.map((preset) => {
                    const selected = bannerUrl === preset.url;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => setBannerUrl(preset.url)}
                        className={`relative rounded-lg overflow-hidden border text-left cursor-pointer ${
                          selected
                            ? 'border-indigo-600 ring-2 ring-indigo-600/20'
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
                          <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center">
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
                  <h2 className="text-sm font-bold text-slate-900">
                    Chọn dịch vụ đi kèm của hệ thống EventFlow
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Chọn các hạng mục bạn muốn Ban quản trị chuẩn bị cho sự kiện này (chưa thu phí
                    trực tuyến ở bước này).
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {SYSTEM_SERVICE_CATALOG.map((srv) => {
                    const state = selectedServices[srv.key];
                    const enabled = Boolean(state?.enabled);
                    return (
                      <div
                        key={srv.key}
                        className={`rounded-xl border p-3.5 transition-colors ${
                          enabled
                            ? 'bg-white border-indigo-400 shadow-xs'
                            : 'bg-white/70 border-slate-200'
                        }`}
                      >
                        <label className="flex items-start gap-2.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={enabled}
                            onChange={() => toggleService(srv.key)}
                            className="mt-0.5 w-4 h-4 accent-indigo-600 rounded"
                          />
                          <div>
                            <div className="text-xs font-bold text-slate-900">{srv.name}</div>
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
                                setSelectedServices((prev) => ({
                                  ...prev,
                                  [srv.key]: {
                                    ...prev[srv.key],
                                    quantityOrScope: e.target.value,
                                  },
                                }))
                              }
                              placeholder="Số lượng / Quy mô (vd: 100 suất, 2 nhân sự...)"
                              className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:border-indigo-600"
                            />
                            <input
                              type="text"
                              value={state?.clientNote || ''}
                              onChange={(e) =>
                                setSelectedServices((prev) => ({
                                  ...prev,
                                  [srv.key]: {
                                    ...prev[srv.key],
                                    clientNote: e.target.value,
                                  },
                                }))
                              }
                              placeholder="Ghi chú yêu cầu riêng..."
                              className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:border-indigo-600"
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
                    value={customServiceName}
                    onChange={(e) => setCustomServiceName(e.target.value)}
                    placeholder="Ví dụ: Phiên dịch cabin song ngữ, khu trưng bày sản phẩm..."
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-600"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setTab('requests')}
                  className="px-4 py-2.5 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl cursor-pointer disabled:opacity-60"
                >
                  <Send className="w-4 h-4" />
                  <span>{submitting ? 'Đang gửi lên Firestore...' : 'Gửi yêu cầu tổ chức'}</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {tab === 'public_events' && (
          <div className="space-y-6 animate-ef-fade-up">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                Các sự kiện công khai trên EventFlow
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Tham khảo cách tổ chức, lịch trình và quy mô các sự kiện đang mở trên hệ thống.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {publicEvents.map((ev, idx) => {
                const statusMeta = EVENT_STATUS_META[ev.status] || EVENT_STATUS_META.upcoming;
                return (
                  <RevealBlock key={ev.id} delayMs={Math.min(idx, 5) * 45}>
                    <article
                      onClick={() => setPreviewEvent(ev)}
                      className="group ef-card-shine bg-white border border-slate-200 rounded-2xl overflow-hidden hover:-translate-y-1 hover:border-indigo-300 hover:shadow-md transition-all duration-300 cursor-pointer h-full flex flex-col justify-between"
                    >
                      <div>
                        <div className="aspect-video overflow-hidden bg-slate-100">
                          <EventBanner
                            src={ev.bannerUrl}
                            alt={ev.title}
                            className="w-full h-full group-hover:scale-[1.03] transition-transform duration-500"
                          />
                        </div>
                        <div className="p-5 space-y-2.5">
                          <div className="flex items-center justify-between gap-2 text-xs">
                            <span className={`font-semibold ${statusMeta.textClass}`}>
                              {statusMeta.label}
                            </span>
                            <span className="text-slate-500 tabular-nums">
                              {formatShortDateVN(ev.startTime)}
                            </span>
                          </div>
                          <h2 className="text-base font-bold text-slate-900 line-clamp-2 group-hover:text-indigo-700 transition-colors">
                            {ev.title}
                          </h2>
                          <div className="text-xs text-slate-500 flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">{ev.location}</span>
                          </div>
                        </div>
                      </div>
                      <div className="px-5 pb-4 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                        <span className="text-slate-500 truncate inline-flex items-center gap-1">
                          {ev.organizer}
                          {ev.organizerVerified !== false && (
                            <BadgeCheck className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                          )}
                        </span>
                        <span className="font-semibold text-indigo-600 inline-flex items-center gap-1">
                          <span>Xem chi tiết</span>
                          <ExternalLink className="w-3 h-3" />
                        </span>
                      </div>
                    </article>
                  </RevealBlock>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {previewEvent && (
        <EventDetailModal
          event={previewEvent}
          currentUser={currentUser}
          existingRegistration={registrations.find(
            (r) =>
              r.eventId === previewEvent.id &&
              r.status !== 'cancelled' &&
              (r.userId === currentUser.uid ||
                r.guestEmail.toLowerCase() === currentUser.email.toLowerCase())
          )}
          feedbacks={feedbacks}
          isSaved={false}
          onToggleSave={() => {}}
          onClose={() => setPreviewEvent(null)}
          onRequireAuth={() => setPreviewEvent(null)}
          onViewMyTickets={() => setPreviewEvent(null)}
          onNotify={onNotify}
        />
      )}
    </div>
  );
}
