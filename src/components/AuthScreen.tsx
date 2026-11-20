import { useState, type FormEvent } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CalendarDays,
  Lock,
  Mail,
  Phone,
  ShieldCheck,
  User,
  Users,
} from 'lucide-react';
import { loginAccount, loginAsDemo, registerAccount } from '../services/dataService';
import { isFirebaseConfigured } from '../firebase';
import type { PublicContactInfo, UserRole } from '../types';

interface AuthScreenProps {
  initialMode?: 'login' | 'register';
  initialRegisterRole?: 'user' | 'organizer';
  publicContact: PublicContactInfo;
  onSuccess: (message: string) => void;
  onBackPublic: () => void;
}

export function AuthScreen({
  initialMode = 'login',
  initialRegisterRole = 'user',
  publicContact,
  onSuccess,
  onBackPublic,
}: AuthScreenProps) {
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [registerRole, setRegisterRole] = useState<'user' | 'organizer'>(initialRegisterRole);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [organization, setOrganization] = useState('');
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
        const user = await registerAccount({
          fullName,
          email,
          phone,
          password,
          role: registerRole,
          organization,
        });
        const roleText =
          user.role === 'admin'
            ? 'Quản trị viên'
            : user.role === 'organizer'
            ? 'Người đăng ký tổ chức sự kiện'
            : 'Người tham gia sự kiện';
        onSuccess(`Đăng ký thành công với vai trò ${roleText}.`);
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
        user.role === 'admin'
          ? 'Demo Quản trị viên (Admin)'
          : user.role === 'organizer'
          ? 'Demo Khách hàng Tổ chức'
          : 'Demo Người tham gia';
      onSuccess(`Đã đăng nhập nhanh (${label}).`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể đăng nhập tài khoản demo.');
    } finally {
      setDemoLoading(null);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl w-full mx-auto space-y-4">
        <button
          type="button"
          onClick={onBackPublic}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-indigo-600 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Quay lại trang giới thiệu &amp; liên hệ công khai</span>
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          {/* Left editorial intro */}
          <div className="lg:col-span-5 bg-indigo-950 text-white rounded-2xl p-8 sm:p-10 flex flex-col justify-between animate-ef-fade-up">
            <div>
              <div className="flex items-center gap-2.5 text-indigo-200 text-sm font-semibold">
                <CalendarDays className="w-5 h-5" />
                <span>EventFlow Platform</span>
              </div>

              <h1 className="mt-6 text-3xl sm:text-4xl font-bold tracking-tight text-balance leading-tight">
                Vận hành 3 luồng nghiệp vụ sự kiện đồng bộ.
              </h1>

              <p className="mt-4 text-sm text-indigo-200/90 leading-relaxed">
                Một nền tảng thống nhất cho Người tham gia đăng ký sự kiện, Khách hàng gửi yêu cầu
                tổ chức cùng dịch vụ đi kèm, và Quản trị viên điều phối chi tiết từng sự kiện.
              </p>

              <div className="mt-6 space-y-2.5 text-xs text-indigo-100/90">
                <div className="p-3 rounded-xl bg-white/10 border border-white/10">
                  <div className="font-semibold text-white">1. Người tham gia sự kiện</div>
                  <div className="mt-0.5 text-indigo-200">
                    Xem sự kiện đang mở, giữ chỗ và theo dõi trạng thái tham gia.
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-white/10 border border-white/10">
                  <div className="font-semibold text-white">2. Khách hàng đặt tổ chức</div>
                  <div className="mt-0.5 text-indigo-200">
                    Gửi yêu cầu tổ chức, chọn dịch vụ hệ thống và theo dõi tiến độ duyệt.
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-white/10 border border-white/10">
                  <div className="font-semibold text-white">3. Quản trị viên (Admin)</div>
                  <div className="mt-0.5 text-indigo-200">
                    Duyệt dịch vụ, quản lý khách mời VIP và người tham gia theo từng sự kiện.
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-5 border-t border-indigo-800/70 space-y-2 text-xs text-indigo-200">
              <div className="font-semibold text-white">
                Cần tư vấn nhanh trước khi tạo tài khoản?
              </div>
              <div className="tabular-nums">
                SĐT: <strong className="text-white">{publicContact.phone}</strong> · Email:{' '}
                <strong className="text-white">{publicContact.email}</strong>
              </div>
              <div className="text-indigo-300/80">
                {isFirebaseConfigured
                  ? 'Kết nối trực tiếp Cloud Firestore (quan-ly-su-kien-86a89).'
                  : 'Chưa cấu hình Firebase.'}
              </div>
            </div>
          </div>

          {/* Right auth card */}
          <div
            style={{ animationDelay: '70ms' }}
            className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-6 sm:p-10 flex flex-col justify-between animate-ef-fade-up"
          >
            <div>
              <div className="flex items-center justify-between gap-4 border-b border-slate-200 pb-5">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">
                    {mode === 'login' ? 'Đăng nhập hệ thống' : 'Đăng ký tài khoản'}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {mode === 'login'
                      ? 'Đăng nhập bằng tài khoản của bạn hoặc chọn nhanh 1 trong 3 luồng demo.'
                      : 'Chọn mục đích sử dụng phù hợp để mở đúng không gian làm việc.'}
                  </p>
                </div>

                <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setMode('login');
                      setError(null);
                    }}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
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
                    className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
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
                  <>
                    <div>
                      <span className="block text-xs font-semibold text-slate-700 mb-2">
                        Bạn muốn sử dụng EventFlow với vai trò nào?
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => setRegisterRole('user')}
                          className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                            registerRole === 'user'
                              ? 'border-indigo-600 bg-indigo-50/70'
                              : 'border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                            <Users className="w-4 h-4 text-indigo-600" />
                            <span>Người tham gia sự kiện</span>
                          </div>
                          <p className="mt-1 text-[11px] text-slate-500">
                            Đăng ký tham dự và quản lý sự kiện đã đăng ký.
                          </p>
                        </button>

                        <button
                          type="button"
                          onClick={() => setRegisterRole('organizer')}
                          className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                            registerRole === 'organizer'
                              ? 'border-indigo-600 bg-indigo-50/70'
                              : 'border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                            <Building2 className="w-4 h-4 text-indigo-600" />
                            <span>Khách hàng đặt tổ chức</span>
                          </div>
                          <p className="mt-1 text-[11px] text-slate-500">
                            Gửi yêu cầu tổ chức sự kiện &amp; chọn dịch vụ đi kèm.
                          </p>
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label
                          htmlFor="auth-fullname"
                          className="block text-sm font-medium text-slate-700 mb-1.5"
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
                            className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-600"
                          />
                        </div>
                      </div>

                      <div>
                        <label
                          htmlFor="auth-phone"
                          className="block text-sm font-medium text-slate-700 mb-1.5"
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
                            className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-600"
                          />
                        </div>
                      </div>
                    </div>

                    {registerRole === 'organizer' && (
                      <div>
                        <label
                          htmlFor="auth-org"
                          className="block text-sm font-medium text-slate-700 mb-1.5"
                        >
                          Tên doanh nghiệp / Đơn vị tổ chức
                        </label>
                        <div className="relative">
                          <Building2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                          <input
                            id="auth-org"
                            type="text"
                            value={organization}
                            onChange={(e) => setOrganization(e.target.value)}
                            placeholder="Công ty Cổ phần TechNova..."
                            className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-600"
                          />
                        </div>
                      </div>
                    )}
                  </>
                )}

                <div>
                  <label
                    htmlFor="auth-email"
                    className="block text-sm font-medium text-slate-700 mb-1.5"
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
                      placeholder="name@company.vn (chứa 'admin' để vào quyền Admin)"
                      className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-600"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="auth-password"
                    className="block text-sm font-medium text-slate-700 mb-1.5"
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
                      className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-600"
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
              <div className="text-xs font-semibold text-slate-500 mb-3">
                Đăng nhập nhanh 3 luồng kiểm thử trên Cloud Firestore
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <button
                  type="button"
                  disabled={submitting || demoLoading !== null}
                  onClick={() => handleDemoLogin('user')}
                  className="flex items-center justify-center gap-1.5 py-2.5 px-3 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg transition-colors cursor-pointer disabled:opacity-60 whitespace-nowrap"
                >
                  <Users className="w-3.5 h-3.5 shrink-0" />
                  <span>{demoLoading === 'user' ? 'Đang vào...' : 'Demo Người tham gia'}</span>
                </button>

                <button
                  type="button"
                  disabled={submitting || demoLoading !== null}
                  onClick={() => handleDemoLogin('organizer')}
                  className="flex items-center justify-center gap-1.5 py-2.5 px-3 text-xs font-semibold text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded-lg transition-colors cursor-pointer disabled:opacity-60 whitespace-nowrap"
                >
                  <Building2 className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    {demoLoading === 'organizer' ? 'Đang vào...' : 'Demo Khách tổ chức'}
                  </span>
                </button>

                <button
                  type="button"
                  disabled={submitting || demoLoading !== null}
                  onClick={() => handleDemoLogin('admin')}
                  className="flex items-center justify-center gap-1.5 py-2.5 px-3 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors cursor-pointer disabled:opacity-60 whitespace-nowrap"
                >
                  <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                  <span>{demoLoading === 'admin' ? 'Đang vào...' : 'Demo Admin'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
