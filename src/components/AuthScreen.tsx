import { useState, type FormEvent } from 'react';
import { CalendarDays, Lock, Mail, Phone, ShieldCheck, User, ArrowRight } from 'lucide-react';
import { loginAccount, loginAsDemo, registerAccount } from '../services/dataService';
import { isFirebaseConfigured } from '../firebase';
import type { UserRole } from '../types';

interface AuthScreenProps {
  onSuccess: (message: string) => void;
  onBrowseGuest?: () => void;
}

export function AuthScreen({ onSuccess, onBrowseGuest }: AuthScreenProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [demoLoading, setDemoLoading] = useState<UserRole | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (mode === 'login') {
        const user = await loginAccount(email, password);
        onSuccess(`Chào mừng ${user.fullName} quay trở lại.`);
      } else {
        const user = await registerAccount({ fullName, email, phone, password });
        onSuccess(
          `Đăng ký thành công với vai trò ${
            user.role === 'admin' ? 'Quản trị viên' : 'Người dùng'
          }.`
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
      onSuccess(
        `Đã đăng nhập nhanh (${user.role === 'admin' ? 'Demo Admin' : 'Demo User'}).`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể đăng nhập tài khoản demo.');
    } finally {
      setDemoLoading(null);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        {/* Left editorial intro */}
        <div className="lg:col-span-5 bg-indigo-950 text-white rounded-2xl p-8 sm:p-10 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2.5 text-indigo-200 text-sm font-semibold">
              <CalendarDays className="w-5 h-5" />
              <span>EventFlow Platform</span>
            </div>

            <h1 className="mt-6 text-3xl sm:text-4xl font-bold tracking-tight text-balance leading-tight">
              Tổ chức và quản lý sự kiện tập trung, mạch lạc.
            </h1>

            <p className="mt-4 text-sm sm:text-base text-indigo-200/90 leading-relaxed">
              Theo dõi lịch trình, kiểm soát số lượng chỗ ngồi theo thời gian thực và điều phối
              khách tham dự trên một giao diện thống nhất cho cả Ban tổ chức và Người tham gia.
            </p>
          </div>

          <div className="mt-10 pt-6 border-t border-indigo-800/70 space-y-3 text-xs sm:text-sm text-indigo-200">
            <div className="flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-indigo-300 mt-0.5 shrink-0" />
              <span>
                Tài khoản đầu tiên hoặc email chứa từ khóa <strong className="text-white">admin</strong>{' '}
                tự động nhận quyền Quản trị viên.
              </span>
            </div>
            <div className="text-indigo-300/90">
              {isFirebaseConfigured
                ? 'Đang kết nối trực tiếp Firebase Authentication & Cloud Firestore.'
                : 'Chế độ xem trước cục bộ (chưa điền VITE_FIREBASE_* trong .env) — mọi thao tác vẫn hoạt động đầy đủ.'}
            </div>
          </div>
        </div>

        {/* Right auth card */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-6 sm:p-10 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-4 border-b border-slate-200 pb-5">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  {mode === 'login' ? 'Đăng nhập hệ thống' : 'Tạo tài khoản mới'}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {mode === 'login'
                    ? 'Sử dụng email đã đăng ký hoặc chọn đăng nhập nhanh bên dưới.'
                    : 'Điền thông tin cá nhân để đăng ký tham dự hoặc quản trị sự kiện.'}
                </p>
              </div>

              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setError(null);
                  }}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                    mode === 'login'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Đăng nhập
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode('register');
                    setError(null);
                  }}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                    mode === 'register'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Đăng ký
                </button>
              </div>
            </div>

            {error && (
              <div
                role="alert"
                className="mt-5 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"
              >
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              {mode === 'register' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="auth-fullname" className="block text-sm font-medium text-slate-700 mb-1.5">
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
                        className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="auth-phone" className="block text-sm font-medium text-slate-700 mb-1.5">
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
                        className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label htmlFor="auth-email" className="block text-sm font-medium text-slate-700 mb-1.5">
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
                    placeholder="name@company.vn (chứa 'admin' để nhận quyền Admin)"
                    className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="auth-password" className="block text-sm font-medium text-slate-700 mb-1.5">
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
                    className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting || demoLoading !== null}
                className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 rounded-lg transition-colors cursor-pointer"
              >
                <span>
                  {submitting
                    ? 'Đang xử lý...'
                    : mode === 'login'
                    ? 'Đăng nhập'
                    : 'Hoàn tất đăng ký'}
                </span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-200">
            <div className="flex items-center justify-between gap-2 mb-3">
              <span className="text-xs font-semibold text-slate-500">
                Đăng nhập nhanh phục vụ kiểm thử
              </span>
              {onBrowseGuest && (
                <button
                  type="button"
                  onClick={onBrowseGuest}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 cursor-pointer whitespace-nowrap"
                >
                  Xem danh sách sự kiện không cần đăng nhập
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                disabled={submitting || demoLoading !== null}
                onClick={() => handleDemoLogin('admin')}
                className="flex items-center justify-center gap-2 py-2.5 px-4 text-sm font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors cursor-pointer disabled:opacity-60 whitespace-nowrap"
              >
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>{demoLoading === 'admin' ? 'Đang vào Admin...' : 'Demo Admin'}</span>
              </button>

              <button
                type="button"
                disabled={submitting || demoLoading !== null}
                onClick={() => handleDemoLogin('user')}
                className="flex items-center justify-center gap-2 py-2.5 px-4 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg transition-colors cursor-pointer disabled:opacity-60 whitespace-nowrap"
              >
                <User className="w-4 h-4 shrink-0" />
                <span>{demoLoading === 'user' ? 'Đang vào User...' : 'Demo User'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
