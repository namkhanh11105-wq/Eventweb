import { useEffect, useState, type FormEvent } from 'react';
import {
  AlertCircle,
  BadgeCheck,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Mail,
  Phone,
  Save,
  ShieldCheck,
  User as UserIcon,
  X,
} from 'lucide-react';
import { changeUserPassword, updateUserProfileInfo } from '../services/dataService';
import { AnimatedModal } from './MotionPrimitives';
import type { AppUser } from '../types';

interface ProfileSettingsModalProps {
  isOpen: boolean;
  currentUser: AppUser | null;
  onClose: () => void;
  onUserUpdated: (updated: AppUser) => void;
  onNotify: (message: string, type?: 'success' | 'error') => void;
}

export function ProfileSettingsModal({
  isOpen,
  currentUser,
  onClose,
  onUserUpdated,
  onNotify,
}: ProfileSettingsModalProps) {
  // Part A: Personal info state
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);

  // Part B: Change password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && currentUser) {
      setFullName(currentUser.fullName || '');
      setPhone(currentUser.phone || '');
      setProfileError(null);
      setProfileSuccess(null);
      setPasswordError(null);
      setPasswordSuccess(null);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowCurrentPw(false);
      setShowNewPw(false);
      setShowConfirmPw(false);
    }
  }, [isOpen, currentUser]);

  async function handleSaveProfile(e: FormEvent) {
    e.preventDefault();
    if (!currentUser || savingProfile) return;

    setProfileError(null);
    setProfileSuccess(null);

    const cleanName = fullName.trim();
    const cleanPhone = phone.trim();

    if (!cleanName) {
      const msg = 'Vui lòng nhập họ và tên hiển thị.';
      setProfileError(msg);
      return;
    }

    if (cleanPhone) {
      const digitsCount = cleanPhone.replace(/[^\d]/g, '').length;
      if (digitsCount < 8 || digitsCount > 15) {
        setProfileError('Số điện thoại liên hệ chưa hợp lệ (cần từ 8 đến 15 chữ số).');
        return;
      }
    }

    setSavingProfile(true);
    try {
      const result = await updateUserProfileInfo({
        uid: currentUser.uid,
        fullName: cleanName,
        phone: cleanPhone,
      });

      onUserUpdated({
        ...currentUser,
        fullName: result.fullName,
        phone: result.phone,
      });

      const okMsg =
        'Đã lưu thông tin cá nhân lên Firebase Auth & Cloud Firestore. Hệ thống sẽ tự động điền sẵn vào các biểu mẫu.';
      setProfileSuccess(okMsg);
      onNotify('Đã cập nhật thông tin tài khoản thành công.');
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Không thể cập nhật thông tin cá nhân.';
      setProfileError(msg);
      onNotify(msg, 'error');
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleChangePassword(e: FormEvent) {
    e.preventDefault();
    if (!currentUser || savingPassword) return;

    setPasswordError(null);
    setPasswordSuccess(null);

    if (!currentPassword) {
      setPasswordError('Vui lòng nhập mật khẩu hiện tại.');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError('Mật khẩu mới phải có tối thiểu 6 ký tự.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Xác nhận mật khẩu mới không khớp. Vui lòng nhập lại.');
      return;
    }
    if (newPassword === currentPassword) {
      setPasswordError('Mật khẩu mới cần khác với mật khẩu hiện tại.');
      return;
    }

    setSavingPassword(true);
    try {
      await changeUserPassword({
        currentPassword,
        newPassword,
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowCurrentPw(false);
      setShowNewPw(false);
      setShowConfirmPw(false);
      setPasswordSuccess('Đã đổi mật khẩu thành công trên Firebase Authentication.');
      onNotify('Đã cập nhật mật khẩu mới thành công.');
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Không thể đổi mật khẩu lúc này.';
      setPasswordError(msg);
      onNotify(msg, 'error');
    } finally {
      setSavingPassword(false);
    }
  }

  const initial = currentUser?.fullName.trim().charAt(0).toUpperCase() || 'U';
  const isAdmin = currentUser?.role === 'admin';

  return (
    <AnimatedModal
      isOpen={isOpen && Boolean(currentUser)}
      onClose={onClose}
      maxWidthClassName="max-w-xl"
      labelledBy="profile-settings-title"
      backdropClassName="bg-slate-900/50 backdrop-blur-sm p-3 sm:p-5"
      panelClassName="bg-white border border-slate-200/90 rounded-2xl w-full max-h-[92vh] overflow-y-auto shadow-2xl"
    >
      {currentUser && (
        <div>
          {/* Sticky Header */}
          <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-md px-5 sm:px-6 py-4 border-b border-slate-200/80 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={`w-10 h-10 rounded-xl text-sm font-bold flex items-center justify-center shrink-0 ${
                  isAdmin ? 'bg-indigo-600 text-white' : 'bg-slate-900 text-white'
                }`}
              >
                {initial}
              </div>
              <div className="min-w-0">
                <h2
                  id="profile-settings-title"
                  className="text-base sm:text-lg font-bold text-slate-900 truncate"
                >
                  Cài đặt tài khoản
                </h2>
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  {isAdmin ? (
                    <>
                      <ShieldCheck className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                      <span className="font-medium text-indigo-700">Quản trị viên</span>
                    </>
                  ) : (
                    <>
                      <UserIcon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>Thành viên EventFlow</span>
                    </>
                  )}
                  <span aria-hidden="true">·</span>
                  <span className="truncate">{currentUser.email}</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              aria-label="Đóng cài đặt tài khoản"
              onClick={onClose}
              className="min-w-[40px] min-h-[40px] inline-flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-5 sm:p-6 space-y-8">
            {/* Phần A: Thông tin cá nhân */}
            <section aria-labelledby="profile-section-info" className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3
                    id="profile-section-info"
                    className="text-sm font-bold text-slate-900 flex items-center gap-2"
                  >
                    <UserIcon className="w-4 h-4 text-indigo-600" />
                    <span>Thông tin cá nhân</span>
                  </h3>
                  <p className="mt-0.5 text-xs text-slate-500 leading-relaxed">
                    Họ tên và số điện thoại sẽ được đồng bộ Cloud Firestore và tự động điền sẵn
                    vào các biểu mẫu đăng ký, tổ chức sự kiện và liên hệ.
                  </p>
                </div>
              </div>

              {profileError && (
                <div
                  role="alert"
                  className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 animate-ef-fade-in"
                >
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{profileError}</span>
                </div>
              )}

              {profileSuccess && (
                <div
                  role="status"
                  className="flex items-start gap-2.5 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 animate-ef-fade-in"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{profileSuccess}</span>
                </div>
              )}

              <form onSubmit={handleSaveProfile} className="space-y-4">
                {/* Read-only Email + Verified Badge */}
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <label
                      htmlFor="profile-email"
                      className="block text-xs font-semibold text-slate-700"
                    >
                      Email đăng nhập
                    </label>
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-full">
                      <BadgeCheck className="w-3 h-3 text-emerald-600" />
                      <span>Đã xác nhận</span>
                    </span>
                  </div>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      id="profile-email"
                      type="email"
                      readOnly
                      value={currentUser.email}
                      className="w-full h-11 pl-10 pr-3.5 text-sm bg-slate-50 border border-slate-200/90 rounded-xl text-slate-500 cursor-not-allowed focus:outline-none"
                    />
                  </div>
                </div>

                {/* Display Name & Phone */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="profile-fullname"
                      className="block text-xs font-semibold text-slate-700 mb-1.5"
                    >
                      Họ và tên hiển thị <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        id="profile-fullname"
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => {
                          setFullName(e.target.value);
                          setProfileSuccess(null);
                        }}
                        placeholder="Nguyễn Văn An"
                        className="w-full h-11 pl-10 pr-3.5 text-sm bg-white border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-900 transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="profile-phone"
                      className="block text-xs font-semibold text-slate-700 mb-1.5"
                    >
                      Số điện thoại liên hệ
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        id="profile-phone"
                        type="tel"
                        value={phone}
                        onChange={(e) => {
                          setPhone(e.target.value);
                          setProfileSuccess(null);
                        }}
                        placeholder="0901 234 567"
                        className="w-full h-11 pl-10 pr-3.5 text-sm bg-white border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 tabular-nums focus:outline-none focus:border-slate-900 transition-colors"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    disabled={savingProfile}
                    className="ef-btn-tactile w-full sm:w-auto min-h-[42px] inline-flex items-center justify-center gap-2 px-5 py-2 text-xs sm:text-sm font-semibold text-white bg-slate-950 hover:bg-slate-800 rounded-full cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {savingProfile ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Đang lưu đồng bộ...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        <span>Lưu thay đổi</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </section>

            {/* Hairline Divider */}
            <div className="border-t border-slate-200/80" />

            {/* Phần B: Đổi mật khẩu */}
            <section aria-labelledby="profile-section-password" className="space-y-4">
              <div>
                <h3
                  id="profile-section-password"
                  className="text-sm font-bold text-slate-900 flex items-center gap-2"
                >
                  <KeyRound className="w-4 h-4 text-indigo-600" />
                  <span>Đổi mật khẩu</span>
                </h3>
                <p className="mt-0.5 text-xs text-slate-500 leading-relaxed">
                  Xác thực lại mật khẩu hiện tại trước khi thiết lập mật khẩu mới (tối thiểu 6
                  ký tự).
                </p>
              </div>

              {passwordError && (
                <div
                  role="alert"
                  className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 animate-ef-fade-in"
                >
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{passwordError}</span>
                </div>
              )}

              {passwordSuccess && (
                <div
                  role="status"
                  className="flex items-start gap-2.5 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 animate-ef-fade-in"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{passwordSuccess}</span>
                </div>
              )}

              <form onSubmit={handleChangePassword} className="space-y-4">
                <div>
                  <label
                    htmlFor="profile-current-pw"
                    className="block text-xs font-semibold text-slate-700 mb-1.5"
                  >
                    Mật khẩu hiện tại
                  </label>
                  <div className="relative">
                    <input
                      id="profile-current-pw"
                      type={showCurrentPw ? 'text' : 'password'}
                      autoComplete="current-password"
                      value={currentPassword}
                      onChange={(e) => {
                        setCurrentPassword(e.target.value);
                        setPasswordError(null);
                        setPasswordSuccess(null);
                      }}
                      placeholder="Nhập mật khẩu hiện tại"
                      className="w-full h-11 pl-3.5 pr-11 text-sm bg-white border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-900 transition-colors"
                    />
                    <button
                      type="button"
                      aria-label={showCurrentPw ? 'Ẩn mật khẩu hiện tại' : 'Hiện mật khẩu hiện tại'}
                      onClick={() => setShowCurrentPw((v) => !v)}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 w-9 h-9 inline-flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                    >
                      {showCurrentPw ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="profile-new-pw"
                      className="block text-xs font-semibold text-slate-700 mb-1.5"
                    >
                      Mật khẩu mới
                    </label>
                    <div className="relative">
                      <input
                        id="profile-new-pw"
                        type={showNewPw ? 'text' : 'password'}
                        autoComplete="new-password"
                        minLength={6}
                        value={newPassword}
                        onChange={(e) => {
                          setNewPassword(e.target.value);
                          setPasswordError(null);
                          setPasswordSuccess(null);
                        }}
                        placeholder="Tối thiểu 6 ký tự"
                        className="w-full h-11 pl-3.5 pr-11 text-sm bg-white border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-900 transition-colors"
                      />
                      <button
                        type="button"
                        aria-label={showNewPw ? 'Ẩn mật khẩu mới' : 'Hiện mật khẩu mới'}
                        onClick={() => setShowNewPw((v) => !v)}
                        className="absolute right-1.5 top-1/2 -translate-y-1/2 w-9 h-9 inline-flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                      >
                        {showNewPw ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="profile-confirm-pw"
                      className="block text-xs font-semibold text-slate-700 mb-1.5"
                    >
                      Xác nhận mật khẩu mới
                    </label>
                    <div className="relative">
                      <input
                        id="profile-confirm-pw"
                        type={showConfirmPw ? 'text' : 'password'}
                        autoComplete="new-password"
                        minLength={6}
                        value={confirmPassword}
                        onChange={(e) => {
                          setConfirmPassword(e.target.value);
                          setPasswordError(null);
                          setPasswordSuccess(null);
                        }}
                        placeholder="Nhập lại mật khẩu mới"
                        className="w-full h-11 pl-3.5 pr-11 text-sm bg-white border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-900 transition-colors"
                      />
                      <button
                        type="button"
                        aria-label={
                          showConfirmPw ? 'Ẩn xác nhận mật khẩu' : 'Hiện xác nhận mật khẩu'
                        }
                        onClick={() => setShowConfirmPw((v) => !v)}
                        className="absolute right-1.5 top-1/2 -translate-y-1/2 w-9 h-9 inline-flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                      >
                        {showConfirmPw ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    disabled={savingPassword}
                    className="ef-btn-tactile w-full sm:w-auto min-h-[42px] inline-flex items-center justify-center gap-2 px-5 py-2 text-xs sm:text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-full cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {savingPassword ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Đang xác thực &amp; cập nhật...</span>
                      </>
                    ) : (
                      <>
                        <KeyRound className="w-4 h-4" />
                        <span>Đổi mật khẩu</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </section>
          </div>
        </div>
      )}
    </AnimatedModal>
  );
}
