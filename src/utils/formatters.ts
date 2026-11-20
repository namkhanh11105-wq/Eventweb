import type { EventStatus, RegistrationStatus } from '../types';

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

export const EVENT_STATUS_META: Record<
  EventStatus,
  { label: string; textClass: string }
> = {
  upcoming: {
    label: 'Sắp diễn ra',
    textClass: 'text-indigo-700',
  },
  ongoing: {
    label: 'Đang diễn ra',
    textClass: 'text-emerald-700',
  },
  completed: {
    label: 'Đã kết thúc',
    textClass: 'text-slate-600',
  },
  cancelled: {
    label: 'Đã hủy',
    textClass: 'text-rose-700',
  },
};

export const REGISTRATION_STATUS_META: Record<
  RegistrationStatus,
  { label: string; textClass: string }
> = {
  pending: {
    label: 'Chờ duyệt',
    textClass: 'text-amber-700',
  },
  confirmed: {
    label: 'Đã xác nhận',
    textClass: 'text-indigo-700',
  },
  attended: {
    label: 'Đã tham dự',
    textClass: 'text-emerald-700',
  },
  cancelled: {
    label: 'Đã hủy',
    textClass: 'text-rose-700',
  },
};
