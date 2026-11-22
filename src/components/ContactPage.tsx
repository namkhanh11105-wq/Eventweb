import { useEffect, useRef, useState, type FormEvent } from 'react';
import {
  AlertCircle,
  ArrowRight,
  CalendarPlus,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  Copy,
  HelpCircle,
  Layers,
  Loader2,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  Send,
  Sparkles,
  UserCheck,
} from 'lucide-react';
import { createContactInquiry } from '../services/dataService';
import { formatDateTimeVN, PUBLIC_CONTACT_FAQS } from '../utils/formatters';
import type { AppUser, ContactInquiry, PublicContactInfo } from '../types';

interface ContactPageProps {
  currentUser: AppUser | null;
  publicContact: PublicContactInfo;
  onGoServices?: () => void;
  onBookOrganization?: () => void;
  onNotify: (message: string, type?: 'success' | 'error') => void;
}

const INQUIRY_TOPICS = [
  'Tư vấn tổ chức sự kiện / Dã ngoại',
  'Điều phối dịch vụ & Báo giá',
  'Hỗ trợ vé / Tài khoản',
  'Hợp tác',
];

type CopyFieldKey = 'phone' | 'hotline' | 'email' | 'address' | 'ticket';

export function ContactPage({
  currentUser,
  publicContact,
  onGoServices,
  onBookOrganization,
  onNotify,
}: ContactPageProps) {
  const [openFaqIdx, setOpenFaqIdx] = useState<number | null>(0);
  const [copiedKey, setCopiedKey] = useState<CopyFieldKey | null>(null);

  const [fullName, setFullName] = useState(currentUser?.fullName || '');
  const [email, setEmail] = useState(currentUser?.email || '');
  const [phone, setPhone] = useState(currentUser?.phone || '');
  const [topic, setTopic] = useState(INQUIRY_TOPICS[0]);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submittedRecord, setSubmittedRecord] = useState<ContactInquiry | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const lastAutoFillRef = useRef({
    fullName: currentUser?.fullName || '',
    email: currentUser?.email || '',
    phone: currentUser?.phone || '',
  });

  useEffect(() => {
    const nextName = currentUser?.fullName || '';
    const nextEmail = currentUser?.email || '';
    const nextPhone = currentUser?.phone || '';
    const prev = lastAutoFillRef.current;

    setFullName((val) => (!val.trim() || val === prev.fullName ? nextName : val));
    setEmail((val) => (!val.trim() || val === prev.email ? nextEmail : val));
    setPhone((val) => (!val.trim() || val === prev.phone ? nextPhone : val));

    lastAutoFillRef.current = {
      fullName: nextName,
      email: nextEmail,
      phone: nextPhone,
    };
  }, [currentUser?.fullName, currentUser?.email, currentUser?.phone]);

  async function handleCopyValue(key: CopyFieldKey, value: string, label: string) {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
      }
      setCopiedKey(key);
      onNotify(`Đã sao chép ${label}: ${value}`);
      window.setTimeout(() => {
        setCopiedKey((curr) => (curr === key ? null : curr));
      }, 2000);
    } catch {
      onNotify(`${label}: ${value}`);
    }
  }

  function handleResetForNewMessage() {
    setSubmittedRecord(null);
    setSubmitError(null);
    setMessage('');
    setTopic(INQUIRY_TOPICS[0]);
    if (currentUser) {
      setFullName((prev) => prev.trim() || currentUser.fullName || '');
      setEmail((prev) => prev.trim() || currentUser.email || '');
      setPhone((prev) => prev.trim() || currentUser.phone || '');
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitError(null);

    const cleanName = fullName.trim();
    const cleanEmail = email.trim();
    const cleanPhone = phone.trim();
    const cleanMessage = message.trim();

    if (!cleanName || !cleanEmail || !cleanPhone || !cleanMessage) {
      const msg = 'Vui lòng điền đầy đủ Họ tên, Email, Số điện thoại và Nội dung chi tiết.';
      setSubmitError(msg);
      onNotify(msg, 'error');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      const msg = 'Địa chỉ Email chưa đúng định dạng. Vui lòng kiểm tra lại.';
      setSubmitError(msg);
      onNotify(msg, 'error');
      return;
    }

    const digitsOnly = cleanPhone.replace(/[^\d]/g, '');
    if (digitsOnly.length < 8 || digitsOnly.length > 15) {
      const msg = 'Số điện thoại cần có từ 8 đến 15 chữ số hợp lệ.';
      setSubmitError(msg);
      onNotify(msg, 'error');
      return;
    }

    setSubmitting(true);
    try {
      const saved = await createContactInquiry({
        fullName: cleanName,
        email: cleanEmail,
        phone: cleanPhone,
        topic: topic.trim() || INQUIRY_TOPICS[0],
        message: cleanMessage,
        userId: currentUser?.uid || '',
      });
      setSubmittedRecord(saved);
      setCopiedKey(null);
      setMessage('');
      setSubmitError(null);
      onNotify('Đã gửi yêu cầu tư vấn lên Cloud Firestore. Ban quản trị sẽ phản hồi sớm.');
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Không thể gửi yêu cầu liên hệ lên Cloud Firestore.';
      setSubmitError(msg);
      onNotify(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <section className="bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-8">
        <div className="max-w-2xl space-y-2.5">
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50/80 border border-indigo-200/70 px-2.5 py-1 rounded-md">
            <Phone className="w-3.5 h-3.5" />
            <span>Kênh Liên hệ &amp; Tư vấn Trực tiếp</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight text-balance">
            Kết nối với Ban quản trị {publicContact.organizationName}
          </h1>
          <p className="text-sm text-slate-600 leading-relaxed">
            Liên hệ trực tiếp qua kênh hỗ trợ chính thức hoặc gửi yêu cầu tư vấn chi tiết để đội
            ngũ điều phối EventFlow tiếp nhận và phản hồi trực tiếp qua Cloud Firestore.
          </p>
        </div>
      </section>

      {/* Balanced 2-Column Desktop / 1-Column Mobile Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
        {/* Left Column: Official Contact Info + Copy Buttons + Quick Links + FAQ */}
        <div className="lg:col-span-5 space-y-6">
          <section className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-4">
              <div>
                <div className="text-xs font-medium text-slate-500">
                  Thông tin liên hệ chính thức
                </div>
                <h2 className="mt-0.5 text-lg font-bold text-slate-900">
                  {publicContact.adminName}
                </h2>
              </div>
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2.5 py-1 rounded-full">
                <UserCheck className="w-3.5 h-3.5" />
                <span>Sẵn sàng hỗ trợ</span>
              </span>
            </div>

            <div className="space-y-3 text-sm">
              {/* Hotline */}
              <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/80 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[11px] font-medium text-slate-500 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                    <span>Hotline hỗ trợ</span>
                  </div>
                  <a
                    href={`tel:${publicContact.hotline.replace(/\s+/g, '')}`}
                    className="mt-0.5 block font-bold text-slate-900 hover:text-indigo-700 tabular-nums truncate"
                  >
                    {publicContact.hotline}
                  </a>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopyValue('hotline', publicContact.hotline, 'Hotline')}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-white border border-slate-200 text-slate-700 hover:border-indigo-300 hover:text-indigo-700 cursor-pointer shrink-0 transition-colors"
                >
                  {copiedKey === 'hotline' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-700">Đã sao chép</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Sao chép</span>
                    </>
                  )}
                </button>
              </div>

              {/* Direct Phone */}
              <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/80 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[11px] font-medium text-slate-500 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>Di động điều phối trực tiếp</span>
                  </div>
                  <a
                    href={`tel:${publicContact.phone.replace(/\s+/g, '')}`}
                    className="mt-0.5 block font-bold text-indigo-700 hover:text-indigo-800 tabular-nums truncate"
                  >
                    {publicContact.phone}
                  </a>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopyValue('phone', publicContact.phone, 'Số di động')}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-white border border-slate-200 text-slate-700 hover:border-indigo-300 hover:text-indigo-700 cursor-pointer shrink-0 transition-colors"
                >
                  {copiedKey === 'phone' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-700">Đã sao chép</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Sao chép</span>
                    </>
                  )}
                </button>
              </div>

              {/* Email */}
              <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/80 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[11px] font-medium text-slate-500 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                    <span>Email hỗ trợ</span>
                  </div>
                  <a
                    href={`mailto:${publicContact.email}`}
                    className="mt-0.5 block font-bold text-indigo-700 hover:text-indigo-800 truncate"
                  >
                    {publicContact.email}
                  </a>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopyValue('email', publicContact.email, 'Email hỗ trợ')}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-white border border-slate-200 text-slate-700 hover:border-indigo-300 hover:text-indigo-700 cursor-pointer shrink-0 transition-colors"
                >
                  {copiedKey === 'email' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-700">Đã sao chép</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Sao chép</span>
                    </>
                  )}
                </button>
              </div>

              {/* Address & Working Hours */}
              <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/80 space-y-2.5 text-xs text-slate-600">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2.5 min-w-0">
                    <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="text-[11px] font-medium text-slate-500">
                        Địa chỉ / Khu vực hoạt động
                      </div>
                      <div className="mt-0.5 font-medium text-slate-800 leading-relaxed">
                        {publicContact.officeAddress}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      handleCopyValue('address', publicContact.officeAddress, 'Địa chỉ')
                    }
                    className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-indigo-700 hover:border-indigo-300 cursor-pointer shrink-0 transition-colors"
                  >
                    {copiedKey === 'address' ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-600" />
                        <span className="text-emerald-700">Đã sao chép</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Chép</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="pt-2 border-t border-slate-200/70 flex items-start gap-2.5">
                  <Clock className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-[11px] font-medium text-slate-500">Thời gian làm việc</div>
                    <div className="mt-0.5 font-medium text-slate-800">
                      {publicContact.workingHours}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Navigation Links */}
            {(onGoServices || onBookOrganization) && (
              <div className="pt-4 border-t border-slate-100 space-y-2">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Lối tắt thao tác nhanh
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-2.5">
                  {onGoServices && (
                    <button
                      type="button"
                      onClick={onGoServices}
                      className="flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200/80 text-xs font-semibold text-slate-800 cursor-pointer transition-colors"
                    >
                      <span className="inline-flex items-center gap-2 min-w-0">
                        <Layers className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                        <span className="truncate">Xem Dịch vụ EventFlow</span>
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    </button>
                  )}
                  {onBookOrganization && (
                    <button
                      type="button"
                      onClick={onBookOrganization}
                      className="flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-xs font-semibold text-white cursor-pointer transition-colors"
                    >
                      <span className="inline-flex items-center gap-2 min-w-0">
                        <CalendarPlus className="w-3.5 h-3.5 text-orange-300 shrink-0" />
                        <span className="truncate">Đặt tổ chức sự kiện</span>
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                    </button>
                  )}
                </div>
              </div>
            )}
          </section>

          {/* Smooth Accordion FAQ */}
          <section className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 space-y-4">
            <div className="flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-indigo-600" />
              <h2 className="text-base font-bold text-slate-900">Câu hỏi thường gặp (FAQ)</h2>
            </div>

            <div className="divide-y divide-slate-200/80 border border-slate-200/80 rounded-xl overflow-hidden">
              {PUBLIC_CONTACT_FAQS.map((faq, idx) => {
                const isOpen = openFaqIdx === idx;
                return (
                  <div key={faq.question} className="bg-white">
                    <button
                      type="button"
                      onClick={() => setOpenFaqIdx(isOpen ? null : idx)}
                      className="w-full px-4 py-3.5 text-left flex items-center justify-between gap-3 hover:bg-slate-50/80 transition-colors cursor-pointer"
                    >
                      <span className="text-xs sm:text-sm font-semibold text-slate-900">
                        {faq.question}
                      </span>
                      <ChevronDown
                        className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${
                          isOpen ? 'rotate-180 text-indigo-600' : ''
                        }`}
                      />
                    </button>
                    {isOpen && (
                      <div className="px-4 pb-4 text-xs sm:text-sm text-slate-600 leading-relaxed animate-ef-fade-in">
                        {faq.answer}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        {/* Right Column: Consultation Request Form -> Firestore */}
        <div className="lg:col-span-7">
          <section className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-8 space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-indigo-600 shrink-0" />
                  <span>Gửi yêu cầu tư vấn &amp; hỗ trợ</span>
                </h2>
                <p className="mt-1 text-xs sm:text-sm text-slate-500">
                  Mọi yêu cầu được lưu trực tiếp vào <span className="font-mono text-slate-700">contact_inquiries</span> trên Cloud Firestore để Ban quản trị theo dõi và phản hồi.
                </p>
              </div>
              {currentUser && !submittedRecord && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-50 border border-indigo-200/70 text-[11px] font-semibold text-indigo-700">
                  <Sparkles className="w-3 h-3" />
                  <span>Đã tự động điền thông tin tài khoản</span>
                </span>
              )}
            </div>

            {submittedRecord ? (
              <div className="p-5 sm:p-6 rounded-2xl bg-emerald-50/75 border border-emerald-200 space-y-5 animate-ef-fade-in">
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="inline-flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
                        Phiếu xác nhận tiếp nhận
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                        Chờ xử lý · Mới tiếp nhận
                      </span>
                    </div>
                    <h3 className="mt-1 text-base sm:text-lg font-bold text-emerald-950">
                      Đã tiếp nhận yêu cầu tư vấn thành công
                    </h3>
                    <p className="mt-1 text-xs sm:text-sm text-emerald-800 leading-relaxed">
                      Ban quản trị ({publicContact.adminName}) đã nhận được thông tin qua Cloud
                      Firestore và sẽ liên hệ lại với bạn trong thời gian sớm nhất.
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-white border border-emerald-200/90 space-y-3 text-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
                    <span className="text-slate-500 font-medium">Mã phiếu (Firestore ID)</span>
                    <div className="inline-flex items-center gap-2">
                      <code className="font-mono font-bold text-slate-900 bg-slate-100 px-2.5 py-1 rounded-md">
                        {submittedRecord.id}
                      </code>
                      <button
                        type="button"
                        onClick={() =>
                          handleCopyValue('ticket', submittedRecord.id, 'Mã phiếu')
                        }
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-indigo-700 hover:bg-indigo-50 rounded-md cursor-pointer transition-colors"
                      >
                        {copiedKey === 'ticket' ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="text-emerald-700">Đã sao chép</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Sao chép</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <span className="text-slate-400 block">Người gửi</span>
                      <span className="font-semibold text-slate-900">{submittedRecord.fullName}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Chủ đề liên hệ</span>
                      <span className="font-semibold text-indigo-700">{submittedRecord.topic}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Email nhận phản hồi</span>
                      <span className="font-semibold text-slate-900 break-all">
                        {submittedRecord.email || submittedRecord.contactInfo}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Số điện thoại</span>
                      <span className="font-semibold text-slate-900 tabular-nums">
                        {submittedRecord.phone || submittedRecord.contactInfo}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100">
                    <span className="text-slate-400 block mb-1">Tóm tắt nội dung vừa gửi</span>
                    <p className="text-slate-700 bg-slate-50 border border-slate-200/70 rounded-lg p-2.5 leading-relaxed whitespace-pre-line">
                      {submittedRecord.message}
                    </p>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-1 text-[11px] text-slate-500">
                    <span>Thời gian ghi nhận:</span>
                    <span className="font-medium text-slate-700 tabular-nums">
                      {formatDateTimeVN(submittedRecord.createdAt)}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={handleResetForNewMessage}
                    className="ef-btn-tactile min-h-[42px] inline-flex items-center gap-2 px-5 py-2 text-xs sm:text-sm font-semibold text-white bg-slate-950 hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Gửi tin nhắn khác</span>
                  </button>
                  {onBookOrganization && (
                    <button
                      type="button"
                      onClick={onBookOrganization}
                      className="text-xs font-semibold text-emerald-800 hover:text-emerald-950 underline-offset-2 hover:underline cursor-pointer"
                    >
                      Hoặc gửi yêu cầu tổ chức sự kiện trọn gói →
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                {submitError && (
                  <div
                    role="alert"
                    className="flex items-start gap-2.5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 leading-relaxed animate-ef-fade-in"
                  >
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-semibold text-rose-900">
                        Chưa thể gửi yêu cầu liên hệ
                      </div>
                      <p className="mt-0.5">{submitError}</p>
                    </div>
                  </div>
                )}

                {/* Quick Topic Selector */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-2">
                    Chọn nhanh chủ đề liên hệ <span className="text-rose-500">*</span>
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {INQUIRY_TOPICS.map((t) => {
                      const active = topic === t;
                      return (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setTopic(t)}
                          className={`px-3.5 py-2.5 rounded-xl border text-left text-xs font-semibold transition-all cursor-pointer flex items-center justify-between gap-2 ${
                            active
                              ? 'bg-indigo-50/90 border-indigo-600 text-indigo-900 ring-1 ring-indigo-600/20'
                              : 'bg-slate-50/70 border-slate-200 text-slate-700 hover:bg-white hover:border-slate-300'
                          }`}
                        >
                          <span className="leading-snug">{t}</span>
                          {active && <Check className="w-3.5 h-3.5 text-indigo-600 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Họ và tên <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Nguyễn Minh Anh"
                    className="w-full h-11 px-3.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-600 transition-colors"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Email liên hệ <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="ban@congty.vn"
                      className="w-full h-11 px-3.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-600 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Số điện thoại <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="0901 234 567"
                      className="w-full h-11 px-3.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-600 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Nội dung chi tiết <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={5}
                    required
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Mô tả quy mô dự kiến, thời gian, địa điểm dã ngoại/hội thảo, các dịch vụ bạn quan tâm hoặc vấn đề cần hỗ trợ..."
                    className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-600 transition-colors"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="ef-btn-tactile w-full h-11 inline-flex items-center justify-center gap-2 px-5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Đang lưu lên Cloud Firestore...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Gửi yêu cầu tư vấn</span>
                    </>
                  )}
                </button>
              </form>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
