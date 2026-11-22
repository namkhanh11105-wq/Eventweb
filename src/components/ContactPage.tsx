import { useState, type FormEvent } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  Clock,
  HelpCircle,
  Mail,
  MapPin,
  Phone,
  Send,
  UserCheck,
} from 'lucide-react';
import { createContactInquiry } from '../services/dataService';
import { PUBLIC_CONTACT_FAQS } from '../utils/formatters';
import type { AppUser, PublicContactInfo } from '../types';

interface ContactPageProps {
  currentUser: AppUser | null;
  publicContact: PublicContactInfo;
  onNotify: (message: string, type?: 'success' | 'error') => void;
}

const INQUIRY_TOPICS = [
  'Tư vấn tổ chức sự kiện doanh nghiệp',
  'Đặt gói dịch vụ & điều phối hạng mục',
  'Hỗ trợ đăng ký tham gia & mã QR',
  'Hợp tác đối tác / Khác',
];

export function ContactPage({
  currentUser,
  publicContact,
  onNotify,
}: ContactPageProps) {
  const [openFaqIdx, setOpenFaqIdx] = useState<number | null>(0);

  const [fullName, setFullName] = useState(currentUser?.fullName || '');
  const [contactInfo, setContactInfo] = useState(
    currentUser?.phone || currentUser?.email || ''
  );
  const [topic, setTopic] = useState(INQUIRY_TOPICS[0]);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submittedId, setSubmittedId] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    const cleanName = fullName.trim();
    const cleanContact = contactInfo.trim();
    const cleanMessage = message.trim();

    if (!cleanName || !cleanContact || !cleanMessage) {
      const msg = 'Vui lòng điền đầy đủ họ tên, SĐT/Email và nội dung cần tư vấn.';
      setSubmitError(msg);
      onNotify(msg, 'error');
      return;
    }

    const looksLikeEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanContact);
    const digitsOnly = cleanContact.replace(/[^\d]/g, '');
    const looksLikePhone = digitsOnly.length >= 8 && digitsOnly.length <= 15;
    if (!looksLikeEmail && !looksLikePhone) {
      const msg = 'Vui lòng nhập đúng định dạng Số điện thoại hoặc Email liên hệ.';
      setSubmitError(msg);
      onNotify(msg, 'error');
      return;
    }

    setSubmitting(true);
    try {
      const saved = await createContactInquiry({
        fullName: cleanName,
        contactInfo: cleanContact,
        topic,
        message: cleanMessage,
        userId: currentUser?.uid,
      });
      setSubmittedId(saved.id);
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
          <div className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-700 bg-indigo-50/70 border border-indigo-200/60 px-2.5 py-1 rounded-md">
            <Phone className="w-3.5 h-3.5" />
            <span>Kênh Liên hệ &amp; Tư vấn Trực tiếp</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight text-balance">
            Kết nối với Ban quản trị {publicContact.organizationName}
          </h1>
          <p className="text-sm text-slate-600 leading-relaxed">
            Liên hệ trực tiếp qua số điện thoại/email công khai bên dưới hoặc gửi yêu cầu tư vấn
            nhanh để được đội ngũ điều phối phản hồi trực tiếp từ hệ thống.
          </p>
        </div>
      </section>

      {/* Modern 2-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Direct Admin Contact + Smooth Accordion FAQ */}
        <div className="lg:col-span-6 space-y-6">
          <section className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-6 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-4">
              <div>
                <div className="text-xs font-medium text-slate-500">
                  Thông tin Ban quản trị (Đồng bộ Firestore)
                </div>
                <h2 className="mt-0.5 text-lg font-bold text-slate-900">
                  {publicContact.adminName}
                </h2>
              </div>
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                <UserCheck className="w-4 h-4" />
                <span>Sẵn sàng hỗ trợ</span>
              </span>
            </div>

            <div className="space-y-2.5 text-sm">
              <a
                href={`tel:${publicContact.phone.replace(/\s+/g, '')}`}
                className="flex flex-wrap items-center justify-between gap-2 p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/80 hover:border-indigo-300 hover:bg-white transition-colors"
              >
                <span className="inline-flex items-center gap-2.5 text-slate-600 font-medium">
                  <Phone className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span>Di động trực tiếp</span>
                </span>
                <strong className="font-semibold text-indigo-700 tabular-nums">
                  {publicContact.phone}
                </strong>
              </a>

              <div className="flex flex-wrap items-center justify-between gap-2 p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/80">
                <span className="inline-flex items-center gap-2.5 text-slate-600 font-medium">
                  <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>Tổng đài tư vấn</span>
                </span>
                <strong className="font-semibold text-slate-900 tabular-nums">
                  {publicContact.hotline}
                </strong>
              </div>

              <a
                href={`mailto:${publicContact.email}`}
                className="flex flex-wrap items-center justify-between gap-2 p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/80 hover:border-indigo-300 hover:bg-white transition-colors"
              >
                <span className="inline-flex items-center gap-2.5 text-slate-600 font-medium shrink-0">
                  <Mail className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span>Email Ban quản trị</span>
                </span>
                <strong className="font-semibold text-indigo-700 break-all sm:truncate">
                  {publicContact.email}
                </strong>
              </a>

              <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/80 space-y-2 text-xs text-slate-600">
                <div className="flex items-start gap-2.5">
                  <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  <span>{publicContact.officeAddress}</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>{publicContact.workingHours}</span>
                </div>
              </div>
            </div>
          </section>

          {/* Smooth Accordion FAQ */}
          <section className="bg-white border border-slate-200/80 rounded-2xl p-6 space-y-4">
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

        {/* Right Column: Quick Consultation Request Form -> Firestore */}
        <div className="lg:col-span-6">
          <section className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-8 space-y-5">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Gửi yêu cầu tư vấn nhanh</h2>
              <p className="mt-1 text-xs sm:text-sm text-slate-500">
                Thông tin của bạn sẽ được lưu trực tiếp lên Cloud Firestore và chuyển tới Ban
                quản trị xử lý.
              </p>
            </div>

            {submittedId ? (
              <div className="p-6 rounded-xl bg-emerald-50/70 border border-emerald-200 space-y-4 animate-ef-fade-in">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-bold text-emerald-900">
                      Đã tiếp nhận yêu cầu tư vấn thành công
                    </h3>
                    <p className="mt-1 text-xs text-emerald-800 leading-relaxed">
                      Mã yêu cầu <span className="font-mono font-semibold">{submittedId}</span> đã
                      được ghi nhận trên Cloud Firestore. Quản trị viên ({publicContact.adminName})
                      sẽ liên hệ lại với bạn trong thời gian sớm nhất.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSubmittedId(null)}
                  className="px-4 py-2 text-xs font-semibold text-emerald-800 bg-white hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors cursor-pointer"
                >
                  Gửi thêm yêu cầu khác
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {submitError && (
                  <div
                    role="alert"
                    className="flex items-start gap-2.5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 leading-relaxed animate-ef-fade-in"
                  >
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-semibold text-rose-900">Không thể ghi dữ liệu lên Cloud Firestore</div>
                      <p className="mt-0.5">{submitError}</p>
                    </div>
                  </div>
                )}
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

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Số điện thoại hoặc Email liên hệ <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={contactInfo}
                    onChange={(e) => setContactInfo(e.target.value)}
                    placeholder="0901 234 567 hoặc email@congty.vn"
                    className="w-full h-11 px-3.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-600 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Chủ đề cần hỗ trợ
                  </label>
                  <select
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    className="w-full h-11 px-3.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-600 cursor-pointer transition-colors"
                  >
                    {INQUIRY_TOPICS.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Nội dung cần tư vấn <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={5}
                    required
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Mô tả quy mô dự kiến, thời gian tổ chức, các dịch vụ bạn quan tâm hoặc vấn đề cần Ban quản trị hỗ trợ..."
                    className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-600 transition-colors"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full h-11 inline-flex items-center justify-center gap-2 px-5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all duration-150 active:scale-[0.99] cursor-pointer disabled:opacity-60"
                >
                  <Send className="w-4 h-4" />
                  <span>{submitting ? 'Đang gửi lên Firestore...' : 'Gửi yêu cầu tư vấn'}</span>
                </button>
              </form>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
