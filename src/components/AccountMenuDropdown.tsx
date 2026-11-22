import { useEffect, useRef, useState } from 'react';
import {
  ChevronDown,
  ExternalLink,
  LogOut,
  Settings,
  ShieldCheck,
  Ticket,
  User as UserIcon,
} from 'lucide-react';
import type { AppUser } from '../types';

interface AccountMenuDropdownProps {
  currentUser: AppUser;
  variant?: 'public' | 'admin';
  adminBadgeCount?: number;
  userNotificationDot?: boolean;
  onOpenProfileSettings: () => void;
  onOpenMyEvents?: () => void;
  onOpenAdminPortal?: () => void;
  onOpenPublicSite?: () => void;
  onLogout: () => void;
}

export function AccountMenuDropdown({
  currentUser,
  variant = 'public',
  adminBadgeCount = 0,
  userNotificationDot = false,
  onOpenProfileSettings,
  onOpenMyEvents,
  onOpenAdminPortal,
  onOpenPublicSite,
  onLogout,
}: AccountMenuDropdownProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setOpen(false);
      }
    }

    document.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  const initial = currentUser.fullName.trim().charAt(0).toUpperCase() || 'U';
  const isAdmin = currentUser.role === 'admin';

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        className={`group inline-flex items-center gap-2 h-9 pl-1.5 pr-2.5 rounded-full border transition-all duration-200 cursor-pointer ${
          open
            ? 'bg-slate-100/90 border-slate-300 shadow-xs'
            : 'bg-white hover:bg-slate-50 border-slate-200/80 hover:border-slate-300'
        }`}
      >
        <span
          className={`w-6 h-6 rounded-full text-[11px] font-bold flex items-center justify-center shrink-0 ${
            isAdmin
              ? 'bg-indigo-600 text-white'
              : 'bg-slate-900 text-white'
          }`}
        >
          {initial}
        </span>

        <span className="text-xs font-semibold text-slate-900 truncate max-w-[135px]">
          {currentUser.fullName}
        </span>

        {isAdmin && variant === 'public' && (
          <span className="hidden lg:inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/80 rounded-full whitespace-nowrap">
            <ShieldCheck className="w-2.5 h-2.5" />
            <span>Admin</span>
          </span>
        )}

        {((isAdmin && adminBadgeCount > 0) || (!isAdmin && userNotificationDot)) && (
          <span
            aria-label="Có cập nhật mới"
            className="w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white shrink-0"
          />
        )}

        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
            open ? 'rotate-180 text-slate-700' : ''
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      <div
        role="menu"
        aria-label="Menu tài khoản"
        className={`absolute right-0 mt-2 w-72 origin-top-right rounded-2xl border border-slate-200/90 bg-white/98 backdrop-blur-md shadow-[0_20px_48px_-14px_rgba(15,23,42,0.18)] p-1.5 z-50 transition-[opacity,transform] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${
          open
            ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto'
            : 'opacity-0 scale-95 -translate-y-1.5 pointer-events-none'
        }`}
      >
        {/* Account Summary Header */}
        <div className="px-3 py-2.5 rounded-xl bg-slate-50/90 border border-slate-100 mb-1">
          <div className="flex items-start gap-2.5">
            <div
              className={`w-9 h-9 rounded-xl text-sm font-bold flex items-center justify-center shrink-0 ${
                isAdmin
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-900 text-white'
              }`}
            >
              {initial}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold text-slate-900 truncate">
                {currentUser.fullName}
              </div>
              <div className="text-[11px] text-slate-500 truncate mt-0.5">
                {currentUser.email}
              </div>
              <div className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-semibold">
                {isAdmin ? (
                  <span className="inline-flex items-center gap-1 text-indigo-700">
                    <ShieldCheck className="w-3 h-3" />
                    <span>Quản trị viên</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-slate-600">
                    <UserIcon className="w-3 h-3" />
                    <span>Thành viên</span>
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Menu Items */}
        <div className="space-y-0.5 py-0.5">
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onOpenProfileSettings();
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:text-slate-950 hover:bg-slate-100/80 transition-colors cursor-pointer text-left"
          >
            <Settings className="w-4 h-4 text-slate-500 shrink-0" />
            <span>Cài đặt tài khoản</span>
          </button>

          {isAdmin ? (
            <>
              {onOpenAdminPortal && (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setOpen(false);
                    onOpenAdminPortal();
                  }}
                  className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-indigo-700 hover:bg-indigo-50/90 transition-colors cursor-pointer text-left"
                >
                  <span className="inline-flex items-center gap-2.5">
                    <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0" />
                    <span>Không gian Quản trị</span>
                  </span>
                  {adminBadgeCount > 0 && (
                    <span className="px-1.5 py-0.5 text-[10px] font-bold bg-rose-500 text-white rounded-full tabular-nums">
                      {adminBadgeCount > 99 ? '99+' : adminBadgeCount}
                    </span>
                  )}
                </button>
              )}
              {variant === 'admin' && onOpenPublicSite && (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setOpen(false);
                    onOpenPublicSite();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:text-slate-950 hover:bg-slate-100/80 transition-colors cursor-pointer text-left"
                >
                  <ExternalLink className="w-4 h-4 text-slate-500 shrink-0" />
                  <span>Trang sự kiện công khai</span>
                </button>
              )}
            </>
          ) : (
            onOpenMyEvents && (
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  onOpenMyEvents();
                }}
                className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:text-slate-950 hover:bg-slate-100/80 transition-colors cursor-pointer text-left"
              >
                <span className="inline-flex items-center gap-2.5">
                  <Ticket className="w-4 h-4 text-slate-500 shrink-0" />
                  <span>Sự kiện của tôi</span>
                </span>
                {userNotificationDot && (
                  <span
                    title="Có phản hồi hoặc cập nhật mới từ Ban quản trị"
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-bold bg-rose-50 text-rose-600 border border-rose-200 rounded-full"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                    <span>Mới</span>
                  </span>
                )}
              </button>
            )
          )}
        </div>

        <div className="my-1 border-t border-slate-100" />

        <button
          type="button"
          role="menuitem"
          onClick={() => {
            setOpen(false);
            onLogout();
          }}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50/80 transition-colors cursor-pointer text-left"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          <span>Đăng xuất</span>
        </button>
      </div>
    </div>
  );
}
