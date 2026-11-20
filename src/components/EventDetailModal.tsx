import { useMemo, useState, type FormEvent } from 'react';
import {
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  MapPin,
  MessageSquare,
  ShieldAlert,
  Star,
  Ticket,
  User,
  Users,
  X,
} from 'lucide-react';
import { createRegistration, submitFeedback } from '../services/dataService';
import { EventBanner } from './EventBanner';
import {
  EVENT_STATUS_META,
  formatCurrencyVN,
  formatDateTimeVN,
  formatShortDateVN,
} from '../utils/formatters';
import type {
  AppUser,
  EventItem,
  FeedbackItem,
  RegistrationItem,
  TicketTier,
} from '../types';

interface EventDetailModalProps {
  event: EventItem;
  currentUser: AppUser | null;
  existingRegistration?: RegistrationItem;
  feedbacks: FeedbackItem[];
  onClose: () => void;
  onRequireAuth: () => void;
  onViewMyTickets: () => void;
  onNotify: (message: string, type?: 'success' | 'error') => void;
}

export function EventDetailModal({
  event,
  currentUser,
  existingRegistration,
  feedbacks,
  onClose,
  onRequireAuth,
  onViewMyTickets,
  onNotify,
}: EventDetailModalProps) {
  const [guestName, setGuestName] = useState(currentUser?.fullName || '');
  const [guestEmail, setGuestEmail] = useState(currentUser?.email || '');
  const [guestPhone, setGuestPhone] = useState(currentUser?.phone || '');
  const [note, setNote] = useState('');
  const [ticketTier, setTicketTier] = useState<TicketTier>('standard');
  const [submitting, setSubmitting] = useState(false);

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

  const statusMeta = EVENT_STATUS_META[event.status];
  const remaining = Math.max(0, event.maxSlots - event.registeredCount);
  const fillPercent = Math.min(
    100,
    Math.round((event.registeredCount / Math.max(1, event.maxSlots)) * 100)
  );
  const canBook =
    event.status !== 'cancelled' && event.status !== 'completed' && remaining > 0;

  const hasVip = Boolean(event.vipPrice && event.vipPrice > 0);
  const selectedPrice =
    ticketTier === 'vip' && event.vipPrice ? event.vipPrice : event.price;

  const canLeaveFeedback =
    Boolean(currentUser) &&
    (existingRegistration?.status === 'attended' ||
      (event.status === 'completed' &&
        existingRegistration &&
        existingRegistration.status !== 'cancelled'));

  const mapsSearchUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    event.location
  )}`;

  async function handleBook(e: FormEvent) {
    e.preventDefault();
    if (!currentUser) {
      onNotify('Vui lòng đăng nhập để đặt vé tham dự sự kiện.', 'error');
      onRequireAuth();
      return;
    }
    if (!canBook) {
      onNotify('Sự kiện hiện không còn chỗ hoặc đã đóng đăng ký.', 'error');
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
        ticketTier,
        ticketPrice: selectedPrice,
      });
      onNotify(`Đặt vé thành công! Mã vé của bạn là ${reg.ticketCode}.`);
      onClose();
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
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="event-detail-title"
    >
      <div className="bg-white border border-slate-200 rounded-2xl max-w-5xl w-full max-h-[92vh] overflow-y-auto shadow-2xl">
        {/* Hero Cover Banner */}
        <div className="relative aspect-[16/7] w-full bg-slate-100 overflow-hidden">
          <EventBanner
            src={event.bannerUrl}
            alt={event.title}
            className="w-full h-full"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-slate-950/20 to-transparent" />
          <button
            type="button"
            aria-label="Đóng chi tiết sự kiện"
            onClick={onClose}
            className="absolute top-4 right-4 p-2.5 bg-white/95 hover:bg-white text-slate-800 rounded-xl shadow-sm cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="absolute bottom-0 inset-x-0 p-6 sm:p-8 text-white">
            <div className="flex flex-wrap items-center gap-2.5 text-xs font-semibold">
              <span className="px-2.5 py-1 rounded-md bg-white/20 backdrop-blur-sm">
                {event.category}
              </span>
              <span className="px-2.5 py-1 rounded-md bg-indigo-600/90">
                {statusMeta.label}
              </span>
              {avgRating && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-500/90 text-white tabular-nums">
                  <Star className="w-3 h-3 fill-current" />
                  {avgRating} ({eventFeedbacks.length} đánh giá)
                </span>
              )}
            </div>
            <h2
              id="event-detail-title"
              className="mt-3 text-xl sm:text-3xl font-bold tracking-tight text-balance leading-tight"
            >
              {event.title}
            </h2>
            <p className="mt-1.5 text-xs sm:text-sm text-slate-200">
              Đơn vị tổ chức: <strong className="text-white">{event.organizer}</strong>
            </p>
          </div>
        </div>

        {/* Two-column body with Sticky Booking Card */}
        <div className="p-6 sm:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Content Column */}
          <div className="lg:col-span-7 space-y-8">
            {/* Key Event Info Strip */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-start gap-3">
                <Calendar className="w-4 h-4 text-indigo-600 mt-0.5 shrink-0" />
                <div>
                  <div className="text-xs font-medium text-slate-500">Thời gian</div>
                  <div className="mt-0.5 text-sm font-semibold text-slate-900 tabular-nums">
                    {formatDateTimeVN(event.startTime)}
                  </div>
                  <div className="text-xs text-slate-500 tabular-nums">
                    Đến {formatDateTimeVN(event.endTime)}
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
                    <span>Xem bản đồ chỉ đường</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>

            {/* Description */}
            <section>
              <h3 className="text-base font-bold text-slate-900">Giới thiệu sự kiện</h3>
              <p className="mt-2.5 text-sm text-slate-600 leading-relaxed whitespace-pre-line">
                {event.description}
              </p>
            </section>

            {/* Speakers */}
            {event.speakers && event.speakers.length > 0 && (
              <section>
                <h3 className="text-base font-bold text-slate-900">
                  Diễn giả &amp; Khách mời
                </h3>
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {event.speakers.map((sp, idx) => (
                    <div
                      key={`${sp.name}-${idx}`}
                      className="flex items-center gap-3 p-3.5 rounded-xl border border-slate-200 bg-white"
                    >
                      <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-sm shrink-0">
                        {sp.name.trim().slice(0, 1).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-slate-900 truncate">
                          {sp.name}
                        </div>
                        <div className="text-xs text-slate-500 truncate">{sp.role}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Agenda Timeline */}
            {event.agenda && event.agenda.length > 0 && (
              <section>
                <h3 className="text-base font-bold text-slate-900">
                  Lịch trình chi tiết (Agenda)
                </h3>
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

            {/* Participation Rules */}
            {event.rules && (
              <section className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                  <ShieldAlert className="w-4 h-4 text-indigo-600" />
                  <span>Quy định tham gia</span>
                </div>
                <p className="mt-2 text-xs sm:text-sm text-slate-600 leading-relaxed">
                  {event.rules}
                </p>
              </section>
            )}

            {/* Reviews & Feedback */}
            <section className="pt-4 border-t border-slate-200 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-indigo-600" />
                  <span>Đánh giá từ người tham dự ({eventFeedbacks.length})</span>
                </h3>
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
                <p className="text-xs text-slate-500">
                  Chưa có đánh giá nào cho sự kiện này.
                </p>
              ) : (
                <div className="space-y-3">
                  {eventFeedbacks.map((fb) => (
                    <div
                      key={fb.id}
                      className="p-4 rounded-xl border border-slate-200 bg-white space-y-1.5"
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

          {/* Right Sticky Booking Column */}
          <aside className="lg:col-span-5 lg:sticky lg:top-6 bg-white border border-slate-200 rounded-2xl p-6 space-y-5">
            <div className="flex items-baseline justify-between gap-3">
              <div>
                <div className="text-xs font-medium text-slate-500">Giá vé tham dự</div>
                <div className="mt-0.5 text-2xl font-bold text-slate-900 tabular-nums">
                  {formatCurrencyVN(selectedPrice)}
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs font-semibold text-indigo-700 tabular-nums">
                  Còn {remaining}/{event.maxSlots} chỗ
                </div>
                <div className="text-[11px] text-slate-500">
                  {event.registeredCount} người đã đăng ký
                </div>
              </div>
            </div>

            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-600 rounded-full transition-all"
                style={{ width: `${fillPercent}%` }}
              />
            </div>

            {existingRegistration && existingRegistration.status !== 'cancelled' ? (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 space-y-3">
                <div className="flex items-center gap-2 text-sm font-bold text-emerald-800">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Bạn đã đăng ký sự kiện này</span>
                </div>
                <p className="text-xs text-emerald-700 leading-relaxed">
                  Mã vé điện tử:{' '}
                  <strong className="font-mono">{existingRegistration.ticketCode}</strong> · Hạng{' '}
                  {existingRegistration.ticketTier === 'vip' ? 'VIP' : 'Tiêu chuẩn'}.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onViewMyTickets();
                  }}
                  className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg cursor-pointer"
                >
                  <Ticket className="w-4 h-4" />
                  <span>Mở Vé điện tử &amp; Mã QR</span>
                </button>
              </div>
            ) : !canBook ? (
              <div className="p-4 rounded-xl bg-slate-100 border border-slate-200 text-sm text-slate-600">
                {event.status === 'cancelled'
                  ? 'Sự kiện này đã bị hủy.'
                  : event.status === 'completed'
                  ? 'Sự kiện này đã kết thúc.'
                  : 'Sự kiện đã hết chỗ trống.'}
              </div>
            ) : (
              <form onSubmit={handleBook} className="space-y-4">
                {hasVip && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-2">
                      Chọn hạng vé
                    </label>
                    <div className="grid grid-cols-2 gap-2.5">
                      <button
                        type="button"
                        onClick={() => setTicketTier('standard')}
                        className={`p-3 rounded-xl border text-left cursor-pointer transition-colors ${
                          ticketTier === 'standard'
                            ? 'border-indigo-600 bg-indigo-50/70'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="text-xs font-semibold text-slate-900">Tiêu chuẩn</div>
                        <div className="mt-0.5 text-sm font-bold text-indigo-700 tabular-nums">
                          {formatCurrencyVN(event.price)}
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setTicketTier('vip')}
                        className={`p-3 rounded-xl border text-left cursor-pointer transition-colors ${
                          ticketTier === 'vip'
                            ? 'border-indigo-600 bg-indigo-50/70'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="text-xs font-semibold text-slate-900">Vé VIP</div>
                        <div className="mt-0.5 text-sm font-bold text-indigo-700 tabular-nums">
                          {formatCurrencyVN(event.vipPrice)}
                        </div>
                      </button>
                    </div>
                  </div>
                )}

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
                    className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-600"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Email nhận vé QR
                    </label>
                    <input
                      type="email"
                      required
                      value={guestEmail}
                      onChange={(e) => setGuestEmail(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-600"
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
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Ghi chú / Câu hỏi cho diễn giả
                  </label>
                  <textarea
                    rows={2}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Đặt câu hỏi trước cho diễn giả hoặc yêu cầu hỗ trợ..."
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-600"
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
                      ? 'Đang giữ chỗ...'
                      : `Xác nhận đặt vé · ${formatCurrencyVN(selectedPrice)}`}
                  </span>
                </button>
              </form>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}
