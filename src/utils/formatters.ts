import type {
  EventCategory,
  EventStatus,
  RegistrationItem,
  RegistrationStatus,
} from '../types';

export const EVENT_CATEGORIES: EventCategory[] = [
  'Hội nghị công nghệ',
  'Workshop chuyên đề',
  'Đào tạo nội bộ',
  'Gala doanh nghiệp',
  'Seminar',
];

export const ENTERPRISE_PARTNERS = [
  { name: 'TechViet Enterprise', sector: 'Hạ tầng Cloud & AI' },
  { name: 'Saigon Innovation Hub', sector: 'Đổi mới sáng tạo' },
  { name: 'FinScale Group', sector: 'Tài chính số' },
  { name: 'DesignCraft Studio', sector: 'Trải nghiệm sản phẩm' },
  { name: 'Mekong Ventures', sector: 'Quỹ đầu tư mạo hiểm' },
];

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

export function formatCurrencyVN(amount?: number): string {
  if (!amount || amount <= 0) return 'Miễn phí';
  return `${new Intl.NumberFormat('vi-VN').format(amount)} đ`;
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
  filename = 'danh-sach-khach-tham-du.csv'
): void {
  const headers = [
    'Mã vé',
    'Sự kiện',
    'Họ và tên',
    'Email',
    'Số điện thoại',
    'Loại vé',
    'Giá vé (VNĐ)',
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
    r.ticketTier === 'vip' ? 'VIP' : 'Tiêu chuẩn',
    r.ticketPrice || 0,
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
