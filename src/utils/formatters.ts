import type {
  EventCategory,
  EventStatus,
  GuestCategory,
  GuestRsvpStatus,
  PlanningStatus,
  PublicContactInfo,
  RegistrationItem,
  RegistrationStatus,
  ServiceRequestStatus,
} from '../types';

export const EVENT_CATEGORIES: EventCategory[] = [
  'Hội nghị công nghệ',
  'Workshop chuyên đề',
  'Đào tạo nội bộ',
  'Gala doanh nghiệp',
  'Seminar',
];

export interface SystemServiceOption {
  key: string;
  name: string;
  summary: string;
}

export const SYSTEM_SERVICE_CATALOG: SystemServiceOption[] = [
  {
    key: 'av_stage',
    name: 'Âm thanh, Ánh sáng & Màn hình LED',
    summary: 'Hệ thống PA hội trường, micro không dây, ánh sáng sân khấu và kỹ thuật viên trực.',
  },
  {
    key: 'mc_coordinator',
    name: 'MC & Điều phối chương trình',
    summary: 'MC song ngữ/chuyên nghiệp, điều phối kịch bản timeline và hỗ trợ diễn giả.',
  },
  {
    key: 'teabreak_catering',
    name: 'Tiệc Tea-break & Catering',
    summary: 'Bàn tiệc trà giữa giờ, bánh ngọt, cà phê và phục vụ theo số lượng khách.',
  },
  {
    key: 'checkin_staff',
    name: 'Nhân sự Lễ tân & Check-in QR',
    summary: 'Đội ngũ đón khách, quét mã QR E-Ticket và cấp phát thẻ đeo đại biểu.',
  },
  {
    key: 'media_pr',
    name: 'Truyền thông, Quay phim & Chụp ảnh',
    summary: 'Nhiếp ảnh sự kiện, quay recap highlight và truyền thông trước/sau chương trình.',
  },
  {
    key: 'backdrop_booth',
    name: 'Thiết kế Backdrop & Khu vực Check-in',
    summary: 'Thiết kế, thi công backdrop, standee định hướng và bàn tiếp đón chuẩn thương hiệu.',
  },
];

export const SERVICE_PACKAGE_HIGHLIGHTS = [
  {
    code: '01',
    title: 'Hội nghị & Seminar Chuyên đề',
    description:
      'Tổ chức trọn gói từ điều phối diễn giả, quản lý lịch trình đa phiên đến tiếp đón hàng trăm đại biểu.',
    included: ['Sân khấu & Âm thanh ánh sáng', 'Quản lý đại biểu & VIP', 'Check-in mã QR tốc độ cao'],
  },
  {
    code: '02',
    title: 'Workshop & Đào tạo Nội bộ',
    description:
      'Không gian tương tác thực hành, kiểm soát sĩ số theo phòng và theo dõi tỷ lệ tham dự thực tế.',
    included: ['Tiệc Tea-break giữa giờ', 'Tài liệu & Hỗ trợ kỹ thuật', 'Thống kê người tham gia'],
  },
  {
    code: '03',
    title: 'Gala Doanh nghiệp & Vinh danh',
    description:
      'Điều phối kịch bản trang trọng, phân khu khách mời VIP/Đối tác và đội ngũ lễ tân đón tiếp.',
    included: ['MC & Kịch bản chương trình', 'Quay chụp truyền thông', 'Danh sách khách mời VIP riêng'],
  },
];

export const ENTERPRISE_PARTNERS = [
  { name: 'TechViet Enterprise', sector: 'Hạ tầng Cloud & AI' },
  { name: 'Saigon Innovation Hub', sector: 'Đổi mới sáng tạo' },
  { name: 'FinScale Group', sector: 'Tài chính số' },
  { name: 'DesignCraft Studio', sector: 'Trải nghiệm sản phẩm' },
  { name: 'Mekong Ventures', sector: 'Quỹ đầu tư mạo hiểm' },
];

export const DEFAULT_PUBLIC_CONTACT: PublicContactInfo = {
  organizationName: 'EventFlow Enterprise Platform',
  adminName: 'Nguyễn Minh Quản Trị',
  phone: '0900 000 001',
  hotline: '(028) 3820 8866',
  email: 'admin@eventflow.vn',
  officeAddress: 'Tầng 12, Saigon Innovation Tower, Quận 1, TP.HCM',
  workingHours: 'Thứ 2 – Thứ 7 · 08:00 – 18:00',
  updatedAt: new Date().toISOString(),
};

export function formatDateTimeVN(isoString: string): string {
  try {
    const date = new Date(isoString);
    if (Number.isNaN(date.getTime())) return 'Chưa xác định';
    return new Intl.DateTimeFormat('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  } catch {
    return 'Chưa xác định';
  }
}

export function formatShortDateVN(isoString: string): string {
  try {
    const date = new Date(isoString);
    if (Number.isNaN(date.getTime())) return 'Chưa xác định';
    return new Intl.DateTimeFormat('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(date);
  } catch {
    return 'Chưa xác định';
  }
}

export function toDatetimeLocalValue(isoString: string): string {
  try {
    const d = new Date(isoString);
    if (Number.isNaN(d.getTime())) return '';
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
      d.getHours()
    )}:${pad(d.getMinutes())}`;
  } catch {
    return '';
  }
}

export function generateTicketCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const seg = (len: number) =>
    Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `EF-${seg(4)}-${seg(4)}`;
}

export const EVENT_STATUS_META: Record<
  EventStatus,
  { label: string; textClass: string; bgClass: string }
> = {
  ongoing: {
    label: 'Mở đăng ký',
    textClass: 'text-emerald-700',
    bgClass: 'bg-emerald-50 border-emerald-200',
  },
  upcoming: {
    label: 'Sắp diễn ra',
    textClass: 'text-indigo-700',
    bgClass: 'bg-indigo-50 border-indigo-200',
  },
  paused: {
    label: 'Tạm đóng',
    textClass: 'text-amber-700',
    bgClass: 'bg-amber-50 border-amber-200',
  },
  completed: {
    label: 'Đã kết thúc',
    textClass: 'text-slate-600',
    bgClass: 'bg-slate-100 border-slate-200',
  },
  cancelled: {
    label: 'Đã hủy',
    textClass: 'text-rose-700',
    bgClass: 'bg-rose-50 border-rose-200',
  },
};

export const PLANNING_STATUS_META: Record<
  PlanningStatus,
  { label: string; textClass: string; bgClass: string }
> = {
  pending_review: {
    label: 'Chờ duyệt',
    textClass: 'text-amber-700',
    bgClass: 'bg-amber-50 border-amber-200',
  },
  planning: {
    label: 'Đang lên kế hoạch',
    textClass: 'text-indigo-700',
    bgClass: 'bg-indigo-50 border-indigo-200',
  },
  confirmed: {
    label: 'Đã xác nhận',
    textClass: 'text-emerald-700',
    bgClass: 'bg-emerald-50 border-emerald-200',
  },
  rejected: {
    label: 'Từ chối',
    textClass: 'text-rose-700',
    bgClass: 'bg-rose-50 border-rose-200',
  },
};

export const SERVICE_STATUS_META: Record<
  ServiceRequestStatus,
  { label: string; textClass: string; bgClass: string }
> = {
  pending: {
    label: 'Chờ duyệt',
    textClass: 'text-amber-700',
    bgClass: 'bg-amber-50 border-amber-200',
  },
  approved: {
    label: 'Đã duyệt',
    textClass: 'text-indigo-700',
    bgClass: 'bg-indigo-50 border-indigo-200',
  },
  in_progress: {
    label: 'Đang chuẩn bị',
    textClass: 'text-sky-700',
    bgClass: 'bg-sky-50 border-sky-200',
  },
  completed: {
    label: 'Sẵn sàng / Hoàn tất',
    textClass: 'text-emerald-700',
    bgClass: 'bg-emerald-50 border-emerald-200',
  },
  rejected: {
    label: 'Không áp dụng',
    textClass: 'text-rose-700',
    bgClass: 'bg-rose-50 border-rose-200',
  },
};

export const GUEST_TYPE_OPTIONS: GuestCategory[] = [
  'VIP',
  'Đại biểu',
  'Diễn giả',
  'Khách mời',
];

export const GUEST_RSVP_META: Record<
  GuestRsvpStatus,
  { label: string; textClass: string }
> = {
  invited: { label: 'Đã gửi mời', textClass: 'text-slate-600' },
  confirmed: { label: 'Xác nhận tham dự', textClass: 'text-indigo-700' },
  checked_in: { label: 'Đã có mặt', textClass: 'text-emerald-700' },
  declined: { label: 'Từ chối', textClass: 'text-rose-700' },
};

export const REGISTRATION_STATUS_META: Record<
  RegistrationStatus,
  { label: string; textClass: string; bgClass: string }
> = {
  pending: {
    label: 'Chờ duyệt',
    textClass: 'text-amber-700',
    bgClass: 'bg-amber-50 border-amber-200',
  },
  confirmed: {
    label: 'Đã xác nhận',
    textClass: 'text-indigo-700',
    bgClass: 'bg-indigo-50 border-indigo-200',
  },
  attended: {
    label: 'Đã tham dự',
    textClass: 'text-emerald-700',
    bgClass: 'bg-emerald-50 border-emerald-200',
  },
  cancelled: {
    label: 'Đã hủy',
    textClass: 'text-rose-700',
    bgClass: 'bg-rose-50 border-rose-200',
  },
};

export function exportRegistrationsToCSV(
  registrations: RegistrationItem[],
  filename = 'danh-sach-nguoi-tham-gia.csv'
): void {
  const headers = [
    'Mã vé',
    'Sự kiện',
    'Họ và tên',
    'Email',
    'Số điện thoại',
    'Trạng thái',
    'Thời gian đăng ký',
    'Thời gian Check-in',
    'Ghi chú',
  ];

  const escapeCsv = (val: string | number | null | undefined): string => {
    const str = String(val ?? '');
    if (/[",\n\r]/.test(str)) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const rows = registrations.map((r) => [
    r.ticketCode || r.id,
    r.eventTitle,
    r.guestName,
    r.guestEmail,
    r.guestPhone,
    REGISTRATION_STATUS_META[r.status]?.label || r.status,
    formatDateTimeVN(r.registeredAt),
    r.checkedInAt ? formatDateTimeVN(r.checkedInAt) : '',
    r.note || '',
  ]);

  const csvContent =
    '\uFEFF' +
    [headers, ...rows].map((row) => row.map((cell) => escapeCsv(cell)).join(',')).join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
