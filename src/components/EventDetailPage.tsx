import { useMemo, useState, type FormEvent } from 'react';
import {
  ArrowLeft,
  BadgeCheck,
  Bookmark,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronDown,
  Clock,
  ExternalLink,
  HelpCircle,
  MapPin,
  MessageSquare,
  Share2,
  ShieldAlert,
  Star,
  Ticket,
  User,
  Users,
} from 'lucide-react';
import { createRegistration, submitFeedback } from '../services/dataService';
import { EventBanner } from './EventBanner';
import { AnimatedProgressBar } from './MotionPrimitives';
import {
  EVENT_STATUS_META,
  formatDateTimeVN,
  formatShortDateVN,
} from '../utils/formatters';
import type {
  AppUser,
  EventItem,
  FeedbackItem,
  RegistrationItem,
} from '../types';

interface EventDetailPageProps {
  event: EventItem;
  currentUser: AppUser | null;
  existingRegistration?: RegistrationItem;
  feedbacks: FeedbackItem[];
  isSaved: boolean;
  onToggleSave: (eventId: string) => void;
  onBack: () => void;
  onRequireAuth: () => void;
  onViewMyTickets: () => void;
  onNotify: (message: string, type?: 'success' | 'error') => void;
}

export function EventDetailPage({
  event,
  currentUser,
  existingRegistration,
  feedbacks,
  isSaved,
  onToggleSave,
  onBack,
  onRequireAuth,
  onViewMyTickets,
  onNotify,
}: EventDetailPageProps) {
  const [guestName, setGuestName] = useState(currentUser?.fullName || '');
  const [guestEmail, setGuestEmail] = useState(currentUser?.email || '');
  const [guestPhone, setGuestPhone] = useState(currentUser?.phone || '');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  const eventFeedbacks = useMemo(
    () => feedbacks.filter((f) => f.eventId === event.id),
    [feedbacks, event.id]
  );

  const avgRating = useMemo(() => {
    if (eventFeedbacks.length === 0) return null;
    const sum = eventFeedbacks.reduce((acc, f) => acc + f.rating, 0);
    return (sum / eventFeedbacks.length).toFixed(1);
  }, [eventFeedbacks]);

  const statusMeta = EVENT_STATUS_META[event.status] || EVENT_STATUS_META.upcoming;
  const remaining = Math.max(0, event.maxSlots - event.registeredCount);
  const fillPercent = Math.min(
    100,
    Math.round((event.registeredCount / Math.max(1, event.maxSlots)) * 100)
  );
  const canBook =
    event.status !== 'cancelled' &&
    event.status !== 'completed' &&
    event.status !== 'paused' &&
    remaining > 0;

  const canLeaveFeedback =
    Boolean(currentUser) &&
    (existingRegistration?.status === 'attended' ||
      (event.status === 'completed' &&
        existingRegistration &&
        existingRegistration.status !== 'cancelled'));

  const mapsSearchUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    event.location
  )}`;

  async function handleShare() {
    const shareText = `${event.title} — ${formatDateTimeVN(event.startTime)} tại ${
      event.location
    }`;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(`${shareText} (${window.location.href})`);
      }
      onNotify('Đã sao chép liên kết sự kiện để chia sẻ.');
    } catch {
      onNotify('Đã sẵn sàng chia sẻ sự kiện.');
    }
  }

  async function handleRegister(e: FormEvent) {
    e.preventDefault();
    if (!currentUser) {
      onNotify('Vui lòng đăng nhập tài khoản để đăng ký tham gia sự kiện.', 'error');
      onRequireAuth();
      return;
    }
    if (!canBook) {
      onNotify('Sự kiện hiện không còn chỗ hoặc đang tạm đóng đăng ký.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const reg = await createRegistration({
        eventId: event.id,
        eventTitle: event.title,
        userId: currentUser.uid,
        guestName,
        guestEmail,
        guestPhone,
        note,
      });
      onNotify(`Đăng ký tham gia thành công! Mã xác nhận của bạn: ${reg.ticketCode}.`);
      onViewMyTickets();
    } catch (err) {
      onNotify(
        err instanceof Error ? err.message : 'Không thể hoàn tất đăng ký.',
        'error'
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSendFeedback(e: FormEvent) {
    e.preventDefault();
    if (!currentUser || !comment.trim()) return;
    setSubmittingFeedback(true);
    try {
      await submitFeedback({
        eventId: event.id,
        eventTitle: event.title,
        userId: currentUser.uid,
        userName: currentUser.fullName,
        rating,
        comment,
      });
      setComment('');
      onNotify('Cảm ơn bạn đã gửi đánh giá sự kiện.');
    } catch (err) {
      onNotify(
        err instanceof Error ? err.message : 'Không thể gửi đánh giá.',
        'error'
      );
    } finally {
      setSubmittingFeedback(false);
    }
  }

  return (
    <div className="space-y-6 animate-ef-fade-up">
      {/* Top Breadcrumb & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 h-9 px-3.5 text-xs font-semibold text-slate-700 hover:text-indigo-700 bg-white border border-slate-200/80 hover:border-indigo-200 rounded-xl transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Quay lại Khám phá</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleShare}
            className="inline-flex items-center gap-1.5 h-9 px-3.5 bg-white hover:bg-slate-50 border border-slate-200/80 text-slate-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Chia sẻ</span>
          </button>
          <button
            type="button"
            onClick={() => onToggleSave(event.id)}
            className={`inline-flex items-center gap-1.5 h-9 px-3.5 text-xs font-semibold rounded-xl border transition-colors cursor-pointer ${
              isSaved
                ? 'bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700'
                : 'bg-white hover:bg-slate-50 border-slate-200/80 text-slate-700'
            }`}
          >
            <Bookmark className={`w-3.5 h-3.5 ${isSaved ? 'fill-current' : ''}`} />
            <span>{isSaved ? 'Đã lưu' : 'Lưu sự kiện'}</span>
          </button>
        </div>
      </div>

      {/* Main Detail Shell */}
      <article className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden">
        {/* Hero Cover Banner */}
        <div className="relative aspect-[16/6] min-h-[240px] w-full bg-slate-100 overflow-hidden">
          <EventBanner src={event.bannerUrl} alt={event.title} className="w-full h-full" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/30 to-transparent" />

          <div className="absolute bottom-0 inset-x-0 p-6 sm:p-8 text-white">
            <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-200">
              <span className="font-semibold text-white">{event.category}</span>
              <span aria-hidden="true">·</span>
              <span className="font-semibold text-emerald-300">{statusMeta.label}</span>
              {avgRating && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="inline-flex items-center gap-1 text-amber-300 font-semibold tabular-nums">
                    <Star className="w-3.5 h-3.5 fill-current" />
                    {avgRating} ({eventFeedbacks.length} đánh giá)
                  </span>
                </>
              )}
            </div>
            <h1 className="mt-2.5 text-2xl sm:text-3xl font-bold tracking-tight text-balance leading-tight max-w-3xl">
              {event.title}
            </h1>
            <div className="mt-2 inline-flex items-center gap-1.5 text-xs sm:text-sm text-slate-200">
              <span>Đơn vị tổ chức:</span>
              <strong className="text-white">{event.organizer}</strong>
              {event.organizerVerified !== false && (
                <BadgeCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              )}
            </div>
          </div>
        </div>

        {/* Two-column body with Sticky Registration Card */}
        <div className="p-6 sm:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Content Column */}
          <div className="lg:col-span-7 space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50/80 border border-slate-200/80">
              <div className="flex items-start gap-3">
                <Calendar className="w-4 h-4 text-indigo-600 mt-0.5 shrink-0" />
                <div>
                  <div className="text-xs font-medium text-slate-500">Thời gian tổ chức</div>
                  <div className="mt-0.5 text-sm font-semibold text-slate-900 tabular-nums">
                    {formatDateTimeVN(event.startTime)}
                  </div>
                  <div className="text-xs text-slate-500 tabular-nums">
                    Kết thúc: {formatDateTimeVN(event.endTime)}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-indigo-600 mt-0.5 shrink-0" />
                <div>
                  <div className="text-xs font-medium text-slate-500">Địa điểm</div>
                  <div className="mt-0.5 text-sm font-semibold text-slate-900">
                    {event.location}
                  </div>
                  <a
                    href={mapsSearchUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700"
                  >
                    <span>Chỉ đường trên Google Maps</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>

            {/* Verified Organizer Box */}
            <div className="flex items-center justify-between gap-4 p-4 rounded-xl border border-slate-200/80 bg-white">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0">
                  <Building2 className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold text-slate-900 truncate">
                      {event.organizer}
                    </span>
                    {event.organizerVerified !== false && (
                      <BadgeCheck className="w-4 h-4 text-indigo-600 shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-slate-500">
                    Đơn vị tổ chức được xác thực &amp; điều phối trên EventFlow
                  </p>
                </div>
              </div>
            </div>

            <section>
              <h2 className="text-base font-bold text-slate-900">Giới thiệu sự kiện</h2>
              <p className="mt-2.5 text-sm text-slate-600 leading-relaxed whitespace-pre-line">
                {event.description}
              </p>
            </section>

            {/* Speakers & Invited Guests */}
            {event.speakers && event.speakers.length > 0 && (
              <section>
                <h2 className="text-base font-bold text-slate-900">
                  Diễn giả &amp; Khách mời chuyên môn
                </h2>
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {event.speakers.map((sp, idx) => (
                    <div
                      key={`${sp.name}-${idx}`}
                      className="flex items-center gap-3 p-3.5 rounded-xl border border-slate-200/80 bg-white"
                    >
                      <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-sm shrink-0">
                        {sp.name.trim().slice(0, 1).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-slate-900 truncate">
                          {sp.name}
                        </div>
                        <div className="text-xs text-slate-500 truncate">
                          {sp.role}
                          {sp.company ? ` · ${sp.company}` : ''}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {event.invitedGuests && event.invitedGuests.length > 0 && (
              <section>
                <h2 className="text-base font-bold text-slate-900">
                  Khách mời danh dự &amp; Đại biểu ({event.invitedGuests.length})
                </h2>
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {event.invitedGuests.slice(0, 6).map((g) => (
                    <div
                      key={g.id}
                      className="p-3 rounded-xl bg-slate-50/70 border border-slate-200/80 flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-slate-900 truncate">
                          {g.fullName}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate">
                          {[g.title, g.organization].filter(Boolean).join(' · ') || g.guestType}
                        </div>
                      </div>
                      <span className="text-[11px] font-medium text-indigo-700 shrink-0">
                        {g.guestType}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Agenda */}
            {event.agenda && event.agenda.length > 0 && (
              <section>
                <h2 className="text-base font-bold text-slate-900">
                  Lịch trình chi tiết (Agenda)
                </h2>
                <div className="mt-4 relative pl-5 border-l border-slate-200 space-y-5">
                  {event.agenda.map((item, idx) => (
                    <div key={`${item.time}-${idx}`} className="relative">
                      <span className="absolute -left-[25px] top-1.5 w-2.5 h-2.5 rounded-full bg-indigo-600 ring-4 ring-white" />
                      <div className="flex items-center gap-2 text-xs font-mono font-semibold text-indigo-600 tabular-nums">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{item.time}</span>
                      </div>
                      <div className="mt-1 text-sm font-semibold text-slate-900">
                        {item.title}
                      </div>
                      {item.speaker && (
                        <div className="mt-0.5 text-xs text-slate-500 flex items-center gap-1.5">
                          <User className="w-3 h-3" />
                          <span>{item.speaker}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Event FAQs */}
            {event.faqs && event.faqs.length > 0 && (
              <section>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-indigo-600" />
                  <span>Câu hỏi thường gặp</span>
                </h2>
                <div className="mt-3 divide-y divide-slate-200/80 border border-slate-200/80 rounded-xl overflow-hidden bg-white">
                  {event.faqs.map((faq, idx) => {
                    const isOpen = openFaqIndex === idx;
                    return (
                      <div key={idx}>
                        <button
                          type="button"
                          onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                          className="w-full px-4 py-3.5 text-left flex items-center justify-between gap-3 hover:bg-slate-50 transition-colors cursor-pointer"
                        >
                          <span className="text-sm font-semibold text-slate-900">
                            {faq.question}
                          </span>
                          <ChevronDown
                            className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${
                              isOpen ? 'rotate-180' : ''
                            }`}
                          />
                        </button>
                        {isOpen && (
                          <div className="px-4 pb-3.5 text-sm text-slate-600 leading-relaxed animate-ef-fade-in">
                            {faq.answer}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Rules */}
            {event.rules && (
              <section className="p-4 rounded-xl bg-slate-50/80 border border-slate-200/80">
                <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                  <ShieldAlert className="w-4 h-4 text-indigo-600" />
                  <span>Quy định tham gia</span>
                </div>
                <p className="mt-2 text-xs sm:text-sm text-slate-600 leading-relaxed">
                  {event.rules}
                </p>
              </section>
            )}

            {/* Reviews */}
            <section className="pt-4 border-t border-slate-200 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-indigo-600" />
                  <span>Đánh giá từ người tham dự ({eventFeedbacks.length})</span>
                </h2>
                {avgRating && (
                  <span className="text-sm font-bold text-amber-600 tabular-nums">
                    {avgRating} / 5.0 ★
                  </span>
                )}
              </div>

              {canLeaveFeedback && (
                <form
                  onSubmit={handleSendFeedback}
                  className="p-4 rounded-xl border border-indigo-200 bg-indigo-50/50 space-y-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-semibold text-slate-800">
                      Gửi đánh giá của bạn
                    </span>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setRating(star)}
                          className="p-0.5 cursor-pointer"
                          aria-label={`Đánh giá ${star} sao`}
                        >
                          <Star
                            className={`w-4 h-4 ${
                              star <= rating
                                ? 'text-amber-500 fill-amber-400'
                                : 'text-slate-300'
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      required
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="Chia sẻ trải nghiệm của bạn về sự kiện..."
                      className="flex-1 px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-600"
                    />
                    <button
                      type="submit"
                      disabled={submittingFeedback}
                      className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg cursor-pointer shrink-0 disabled:opacity-60"
                    >
                      {submittingFeedback ? 'Đang gửi...' : 'Gửi'}
                    </button>
                  </div>
                </form>
              )}

              {eventFeedbacks.length === 0 ? (
                <p className="text-xs text-slate-500">Chưa có đánh giá nào cho sự kiện này.</p>
              ) : (
                <div className="space-y-3">
                  {eventFeedbacks.map((fb) => (
                    <div
                      key={fb.id}
                      className="p-4 rounded-xl border border-slate-200/80 bg-white space-y-1.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold text-slate-900">
                          {fb.userName}
                        </span>
                        <span className="text-xs text-slate-400 tabular-nums">
                          {formatShortDateVN(fb.createdAt)}
                        </span>
                      </div>
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            className={`w-3.5 h-3.5 ${
                              s <= fb.rating
                                ? 'text-amber-500 fill-amber-400'
                                : 'text-slate-200'
                            }`}
                          />
                        ))}
                      </div>
                      <p className="text-sm text-slate-600 leading-relaxed">{fb.comment}</p>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* Right Sticky Registration Card */}
          <aside className="lg:col-span-5 lg:sticky lg:top-20 bg-slate-50/60 border border-slate-200/80 rounded-2xl p-6 space-y-5">
            <div className="flex items-baseline justify-between gap-3">
              <div>
                <div className="text-xs font-medium text-slate-500">Hình thức tham gia</div>
                <div className="mt-0.5 text-xl font-bold text-slate-900">
                  Đăng ký giữ chỗ trực tuyến
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs font-semibold text-indigo-700 tabular-nums">
                  Còn {remaining}/{event.maxSlots} chỗ
                </div>
                <div className="text-[11px] text-slate-500 tabular-nums">
                  {event.registeredCount} người đã đăng ký
                </div>
              </div>
            </div>

            <AnimatedProgressBar
              percent={fillPercent}
              barClassName={fillPercent >= 90 ? 'bg-amber-500' : 'bg-indigo-600'}
              trackClassName="w-full h-2 bg-slate-200/80 rounded-full overflow-hidden"
            />

            {existingRegistration && existingRegistration.status !== 'cancelled' ? (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 space-y-3">
                <div className="flex items-center gap-2 text-sm font-bold text-emerald-800">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Bạn đã đăng ký tham gia sự kiện này</span>
                </div>
                <p className="text-xs text-emerald-700 leading-relaxed">
                  Mã xác nhận check-in:{' '}
                  <strong className="font-mono">{existingRegistration.ticketCode}</strong>.
                </p>
                <button
                  type="button"
                  onClick={onViewMyTickets}
                  className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl cursor-pointer transition-colors"
                >
                  <Ticket className="w-4 h-4" />
                  <span>Xem mã QR &amp; Trạng thái tham gia</span>
                </button>
              </div>
            ) : !canBook ? (
              <div className="p-4 rounded-xl bg-slate-100 border border-slate-200 text-sm text-slate-600">
                {event.status === 'cancelled'
                  ? 'Sự kiện này đã bị hủy.'
                  : event.status === 'completed'
                  ? 'Sự kiện này đã kết thúc.'
                  : event.status === 'paused'
                  ? 'Cổng đăng ký hiện đang tạm đóng để rà soát danh sách.'
                  : 'Sự kiện đã hết chỗ trống.'}
              </div>
            ) : !currentUser ? (
              <div className="p-5 rounded-xl bg-white border border-indigo-200 space-y-3">
                <p className="text-sm font-semibold text-slate-900">
                  Đăng nhập để đăng ký tham gia sự kiện
                </p>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Bạn cần đăng nhập hoặc tạo tài khoản Người tham gia để hệ thống lưu thông tin
                  đăng ký và cấp mã QR check-in riêng.
                </p>
                <button
                  type="button"
                  onClick={onRequireAuth}
                  className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors cursor-pointer"
                >
                  <Users className="w-4 h-4" />
                  <span>Đăng nhập / Đăng ký để tham gia</span>
                </button>
              </div>
            ) : (
              <form onSubmit={handleRegister} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Họ và tên người tham dự
                  </label>
                  <input
                    type="text"
                    required
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    placeholder="Nguyễn Văn An"
                    className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-600"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Email nhận thông tin
                    </label>
                    <input
                      type="email"
                      required
                      value={guestEmail}
                      onChange={(e) => setGuestEmail(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-600"
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
                      className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Ghi chú / Câu hỏi cho Ban tổ chức
                  </label>
                  <textarea
                    rows={2}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Đơn vị công tác hoặc câu hỏi gửi diễn giả..."
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-600"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full inline-flex items-center justify-center gap-2 py-3 px-5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors cursor-pointer disabled:opacity-60"
                >
                  <Users className="w-4 h-4" />
                  <span>
                    {submitting
                      ? 'Đang ghi nhận lên Firestore...'
                      : 'Xác nhận đăng ký tham gia'}
                  </span>
                </button>
              </form>
            )}
          </aside>
        </div>
      </article>
    </div>
  );
}
