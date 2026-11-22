import { useEffect, useRef, useState, type CSSProperties, type FormEvent } from 'react';
import {
  ArrowRight,
  Building2,
  CalendarDays,
  Lock,
  Mail,
  Phone,
  QrCode,
  ShieldCheck,
  Sparkles,
  Ticket,
  User,
} from 'lucide-react';
import { loginAccount, loginAsDemo, registerAccount } from '../services/dataService';
import { triggerPageProgress } from './MotionPrimitives';
import type { PublicContactInfo, UserRole } from '../types';

interface AuthScreenProps {
  mode: 'login' | 'register';
  publicContact: PublicContactInfo;
  onSwitchMode: (nextMode: 'login' | 'register') => void;
  onSuccess: (message: string) => void;
  onBackPublic: () => void;
}

export function AuthScreen({
  mode,
  publicContact,
  onSwitchMode,
  onSuccess,
  onBackPublic,
}: AuthScreenProps) {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [organization, setOrganization] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [demoLoading, setDemoLoading] = useState<UserRole | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSwitching, setIsSwitching] = useState(false);
  const switchTimerRef = useRef<number | null>(null);

  useEffect(() => {
    setError(null);
  }, [mode]);

  useEffect(() => {
    return () => {
      if (switchTimerRef.current !== null) {
        window.clearTimeout(switchTimerRef.current);
      }
    };
  }, []);

  function handleSmoothSwitchMode(nextMode: 'login' | 'register') {
    if (nextMode === mode) return;
    triggerPageProgress();

    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    if (reduced) {
      setError(null);
      onSwitchMode(nextMode);
      return;
    }

    if (switchTimerRef.current !== null) {
      window.clearTimeout(switchTimerRef.current);
    }

    setIsSwitching(true);
    switchTimerRef.current = window.setTimeout(() => {
      setError(null);
      onSwitchMode(nextMode);
      setIsSwitching(false);
      switchTimerRef.current = null;
    }, 140);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (mode === 'login') {
        const user = await loginAccount(email, password);
        onSuccess(
          user.role === 'admin'
            ? `Chào mừng Quản trị viên ${user.fullName}.`
            : `Chào mừng ${user.fullName} quay trở lại.`
        );
      } else {
        const user = await registerAccount({
          fullName,
          email,
          phone,
          password,
          organization,
        });
        onSuccess(
          user.role === 'admin'
            ? 'Đăng ký thành công tài khoản Quản trị viên.'
            : 'Đăng ký tài khoản thành công. Bạn có thể tham gia hoặc gửi yêu cầu tổ chức sự kiện ngay.'
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể xử lý yêu cầu.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDemoLogin(role: UserRole) {
    setError(null);
    setDemoLoading(role);
    try {
      const user = await loginAsDemo(role);
      const label =
        user.role === 'admin' ? 'Demo Quản trị viên (Admin)' : 'Demo Người dùng (User)';
      onSuccess(`Đã đăng nhập nhanh (${label}).`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể đăng nhập tài khoản demo.');
    } finally {
      setDemoLoading(null);
    }
  }

  const inputClass =
    'w-full h-11 pl-10 pr-3.5 text-sm bg-white border border-slate-200/90 rounded-xl text-slate-900 placeholder:text-slate-400 transition-all duration-150 focus:outline-none focus:border-slate-900 focus:ring-4 focus:ring-slate-900/5';

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#FAFAFC] flex flex-col justify-between px-4 py-8 sm:px-6">
      {/* Ambient Drifting Mesh Gradient Blobs */}
      <div
        aria-hidden="true"
        className="ef-blob-drift-a pointer-events-none absolute -top-32 -left-24 h-[28rem] w-[28rem] rounded-full bg-gradient-to-br from-rose-200/55 via-orange-100/55 to-amber-100/40 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="ef-blob-drift-b pointer-events-none absolute -bottom-36 -right-24 h-[30rem] w-[30rem] rounded-full bg-gradient-to-tr from-indigo-200/50 via-sky-100/50 to-rose-100/35 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-1/2 h-80 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full bg-orange-100/35 blur-3xl"
      />

      {/* Subtle Floating Background Event Cards & Icons */}
      <div aria-hidden="true" className="hidden md:block pointer-events-none select-none">
        <div
          style={{ '--ef-rot': '-7deg', animationDelay: '0ms' } as CSSProperties}
          className="ef-float-a absolute top-24 left-[6%] lg:left-[10%] w-44 rounded-2xl border border-white/90 bg-white/75 p-2 shadow-[0_14px_34px_-12px_rgba(15,23,42,0.12)] backdrop-blur-md opacity-80"
        >
          <div className="aspect-[16/10] w-full overflow-hidden rounded-xl bg-slate-100">
            <img
              src="/src/assets/images/event_design_workshop_1795132977362.jpg"
              alt=""
              className="h-full w-full object-cover"
            />
          </div>
          <div className="px-1 pt-2 pb-0.5">
            <div className="text-[11px] font-bold text-slate-800 truncate">Design Workshop</div>
            <div className="text-[10px] text-slate-500">Thứ Bảy · 14:00</div>
          </div>
        </div>

        <div
          style={{ '--ef-rot': '6deg', animationDelay: '400ms' } as CSSProperties}
          className="ef-float-b absolute top-28 right-[6%] lg:right-[10%] w-44 rounded-2xl border border-white/90 bg-white/75 p-2 shadow-[0_14px_34px_-12px_rgba(15,23,42,0.12)] backdrop-blur-md opacity-80"
        >
          <div className="aspect-[16/10] w-full overflow-hidden rounded-xl bg-slate-100">
            <img
              src="/src/assets/images/event_music_festival_1795132976683.jpg"
              alt=""
              className="h-full w-full object-cover"
            />
          </div>
          <div className="px-1 pt-2 pb-0.5">
            <div className="text-[11px] font-bold text-slate-800 truncate">Live Acoustic Night</div>
            <div className="text-[10px] text-slate-500">Sân khấu mở · 19:30</div>
          </div>
        </div>

        <div
          style={{ '--ef-rot': '5deg', animationDelay: '700ms' } as CSSProperties}
          className="ef-float-c absolute bottom-24 left-[8%] lg:left-[13%] flex items-center gap-2.5 rounded-2xl border border-white/90 bg-white/80 px-3.5 py-2.5 shadow-[0_14px_30px_-12px_rgba(15,23,42,0.1)] backdrop-blur-md opacity-75"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-50 text-rose-500">
            <QrCode className="h-4 w-4" />
          </span>
          <div>
            <div className="text-[11px] font-bold text-slate-800">Check-in QR</div>
            <div className="text-[10px] text-slate-500">Tức thì &lt; 2 giây</div>
          </div>
        </div>

        <div
          style={{ '--ef-rot': '-5deg', animationDelay: '950ms' } as CSSProperties}
          className="ef-float-a absolute bottom-24 right-[8%] lg:right-[13%] flex items-center gap-2.5 rounded-2xl border border-white/90 bg-white/80 px-3.5 py-2.5 shadow-[0_14px_30px_-12px_rgba(15,23,42,0.1)] backdrop-blur-md opacity-75"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-orange-50 text-orange-500">
            <Ticket className="h-4 w-4" />
          </span>
          <div>
            <div className="text-[11px] font-bold text-slate-800">E-Ticket trực tuyến</div>
            <div className="text-[10px] text-slate-500">Đồng bộ Firestore</div>
          </div>
        </div>
      </div>

      {/* Top Minimal Brand Header -> Click to return Home */}
      <header className="relative z-10 flex items-center justify-center">
        <button
          type="button"
          onClick={onBackPublic}
          className="inline-flex items-center gap-2.5 rounded-full border border-slate-200/80 bg-white/85 px-4 py-2 text-sm font-bold tracking-tight text-slate-900 shadow-xs backdrop-blur-md transition-all duration-150 hover:-translate-y-0.5 hover:border-slate-300 hover:bg-white cursor-pointer"
        >
          <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-gradient-to-br from-rose-500 to-orange-500 text-white">
            <CalendarDays className="h-3.5 w-3.5" />
          </span>
          <span>EventFlow</span>
        </button>
      </header>

      {/* Centered Single Auth Card */}
      <main className="relative z-10 my-8 flex items-center justify-center">
        <div
          className={`w-full transition-[opacity,transform] duration-150 ease-out motion-reduce:transition-none motion-reduce:transform-none ${
            mode === 'register' ? 'max-w-[29rem]' : 'max-w-[26rem]'
          } ${
            isSwitching
              ? 'opacity-0 scale-[0.982] pointer-events-none'
              : 'opacity-100'
          }`}
        >
          <div
            key={mode}
            className="animate-ef-page-enter rounded-3xl border border-slate-200/85 bg-white/95 p-6 sm:p-8 shadow-[0_24px_60px_-18px_rgba(15,23,42,0.12)] backdrop-blur-md"
          >
            {/* Card Header */}
            <div className="text-center">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                {mode === 'login' ? 'Đăng nhập EventFlow' : 'Tạo tài khoản mới'}
              </h1>
              <p className="mt-1.5 text-sm text-slate-500">
                {mode === 'login'
                  ? 'Truy cập sự kiện đã đăng ký, mã QR và yêu cầu tổ chức sự kiện.'
                  : 'Một tài khoản thống nhất để vừa tham gia vừa đặt tổ chức sự kiện.'}
              </p>
            </div>

            {error && (
              <div
                role="alert"
                className="mt-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs sm:text-sm text-rose-800 animate-ef-fade-in"
              >
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              {mode === 'register' && (
                <>
                  {/* Full Name & Phone */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label
                        htmlFor="auth-fullname"
                        className="block text-xs font-semibold text-slate-700 mb-1.5"
                      >
                        Họ và tên
                      </label>
                      <div className="relative">
                        <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          id="auth-fullname"
                          type="text"
                          required
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="Nguyễn Văn An"
                          className={inputClass}
                        />
                      </div>
                    </div>

                    <div>
                      <label
                        htmlFor="auth-phone"
                        className="block text-xs font-semibold text-slate-700 mb-1.5"
                      >
                        Số điện thoại
                      </label>
                      <div className="relative">
                        <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          id="auth-phone"
                          type="tel"
                          required
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="0901 234 567"
                          className={inputClass}
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="auth-org"
                      className="block text-xs font-semibold text-slate-700 mb-1.5"
                    >
                      Đơn vị / Công ty (tùy chọn)
                    </label>
                    <div className="relative">
                      <Building2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        id="auth-org"
                        type="text"
                        value={organization}
                        onChange={(e) => setOrganization(e.target.value)}
                        placeholder="Công ty / Tổ chức của bạn..."
                        className={inputClass}
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Email */}
              <div>
                <label
                  htmlFor="auth-email"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="auth-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.vn"
                    className={inputClass}
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label
                  htmlFor="auth-password"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  Mật khẩu
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="auth-password"
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Tối thiểu 6 ký tự"
                    className={inputClass}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting || demoLoading !== null}
                className="w-full h-11 inline-flex items-center justify-center gap-2 px-5 text-sm font-semibold text-white bg-slate-950 hover:bg-slate-800 disabled:opacity-60 rounded-full shadow-sm transition-all duration-200 ease-[cubic-bezier(0.34,1.32,0.64,1)] hover:-translate-y-0.5 active:scale-[0.98] cursor-pointer"
              >
                <span>
                  {submitting
                    ? 'Đang xác thực...'
                    : mode === 'login'
                    ? 'Đăng nhập'
                    : 'Hoàn tất đăng ký'}
                </span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            {/* Quick Demo Login Strip on Login Page (2 unified roles) */}
            {mode === 'login' && (
              <div className="mt-6 pt-5 border-t border-slate-100">
                <div className="flex items-center justify-center gap-1.5 text-[11px] font-medium text-slate-400 mb-2.5">
                  <Sparkles className="w-3 h-3 text-orange-400" />
                  <span>Hoặc trải nghiệm nhanh tài khoản Demo</span>
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    disabled={submitting || demoLoading !== null}
                    onClick={() => handleDemoLogin('user')}
                    className="inline-flex items-center justify-center gap-1.5 py-2.5 px-3 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200/80 rounded-xl transition-colors cursor-pointer disabled:opacity-60 whitespace-nowrap"
                  >
                    <User className="w-3.5 h-3.5 shrink-0" />
                    <span>{demoLoading === 'user' ? 'Đang vào...' : 'Người dùng'}</span>
                  </button>
                  <button
                    type="button"
                    disabled={submitting || demoLoading !== null}
                    onClick={() => handleDemoLogin('admin')}
                    className="inline-flex items-center justify-center gap-1.5 py-2.5 px-3 text-xs font-semibold text-indigo-700 bg-indigo-50/70 hover:bg-indigo-100/80 border border-indigo-200/70 rounded-xl transition-colors cursor-pointer disabled:opacity-60 whitespace-nowrap"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                    <span>{demoLoading === 'admin' ? 'Đang vào...' : 'Quản trị viên'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Footer Page Switch Link */}
            <div className="mt-6 pt-5 border-t border-slate-100 text-center text-xs sm:text-sm text-slate-500">
              {mode === 'login' ? (
                <>
                  <span>Chưa có tài khoản? </span>
                  <button
                    type="button"
                    onClick={() => handleSmoothSwitchMode('register')}
                    className="font-semibold text-slate-900 hover:text-rose-600 underline underline-offset-4 transition-colors cursor-pointer"
                  >
                    Đăng ký ngay
                  </button>
                </>
              ) : (
                <>
                  <span>Đã có tài khoản? </span>
                  <button
                    type="button"
                    onClick={() => handleSmoothSwitchMode('login')}
                    className="font-semibold text-slate-900 hover:text-rose-600 underline underline-offset-4 transition-colors cursor-pointer"
                  >
                    Đăng nhập
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Quiet Support Line */}
      <footer className="relative z-10 text-center text-[11px] text-slate-400">
        <span>Hỗ trợ nhanh: {publicContact.phone} · {publicContact.email}</span>
      </footer>
    </div>
  );
}
