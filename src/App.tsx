import { useEffect, useState } from 'react';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';
import { AuthScreen } from './components/AuthScreen';
import { UserLayout } from './components/UserLayout';
import { OrganizerLayout } from './components/OrganizerLayout';
import { AdminLayout } from './components/AdminLayout';
import {
  logoutAccount,
  subscribeAuthUser,
  subscribeEvents,
  subscribeFeedbacks,
  subscribePublicContact,
  subscribeRegistrations,
  subscribeUsers,
} from './services/dataService';
import { DEFAULT_PUBLIC_CONTACT } from './utils/formatters';
import type {
  AppUser,
  EventItem,
  FeedbackItem,
  PublicContactInfo,
  RegistrationItem,
} from './types';

interface ToastState {
  id: number;
  message: string;
  type: 'success' | 'error';
}

interface AuthViewState {
  mode: 'login' | 'register';
  role: 'user' | 'organizer';
}

export default function App() {
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authView, setAuthView] = useState<AuthViewState | null>(null);
  const [portalView, setPortalView] = useState<'admin' | 'organizer' | 'public'>('public');

  const [events, setEvents] = useState<EventItem[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [registrations, setRegistrations] = useState<RegistrationItem[]>([]);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
  const [publicContact, setPublicContact] = useState<PublicContactInfo>(DEFAULT_PUBLIC_CONTACT);
  const [permissionWarning, setPermissionWarning] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);

  function showToast(message: string, type: 'success' | 'error' = 'success') {
    const id = Date.now();
    setToast({ id, message, type });
    window.setTimeout(() => {
      setToast((prev) => (prev?.id === id ? null : prev));
    }, 4500);
  }

  useEffect(() => {
    const unsubContact = subscribePublicContact(setPublicContact);
    return () => unsubContact();
  }, []);

  useEffect(() => {
    const unsubAuth = subscribeAuthUser((user) => {
      setCurrentUser(user);
      setAuthReady(true);
      setPermissionWarning(null);
      if (user) {
        setAuthView(null);
        setPortalView(
          user.role === 'admin'
            ? 'admin'
            : user.role === 'organizer'
            ? 'organizer'
            : 'public'
        );
      } else {
        setPortalView('public');
        setRegistrations([]);
        setUsers([]);
      }
    });
    return () => unsubAuth();
  }, []);

  useEffect(() => {
    if (!authReady) return;

    setEventsLoading(true);

    const handlePermissionError = (msg: string) => {
      // Only show permission warning banner when user is signed in
      if (currentUser) {
        setPermissionWarning(msg);
      }
      setEventsLoading(false);
    };

    const unsubEvents = subscribeEvents((items) => {
      setEvents(items);
      setEventsLoading(false);
    }, handlePermissionError);

    const unsubFeedbacks = subscribeFeedbacks(setFeedbacks);

    let unsubRegs: (() => void) | undefined;
    let unsubUsers: (() => void) | undefined;

    if (currentUser) {
      unsubRegs = subscribeRegistrations(
        { userId: currentUser.uid, role: currentUser.role },
        setRegistrations,
        handlePermissionError
      );
      if (currentUser.role === 'admin') {
        unsubUsers = subscribeUsers(setUsers, handlePermissionError);
      } else {
        setUsers([]);
      }
    } else {
      setRegistrations([]);
      setUsers([]);
    }

    return () => {
      unsubEvents();
      unsubFeedbacks();
      unsubRegs?.();
      unsubUsers?.();
    };
  }, [authReady, currentUser]);

  async function handleLogout() {
    try {
      await logoutAccount();
      setAuthView(null);
      setPortalView('public');
      setPermissionWarning(null);
      showToast('Đã đăng xuất khỏi hệ thống.');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Lỗi khi đăng xuất.', 'error');
    }
  }

  return (
    <>
      {!authReady ? (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
          <div className="bg-white border border-slate-200 rounded-xl px-6 py-5 text-sm font-medium text-slate-600">
            Đang khởi tạo hệ thống EventFlow...
          </div>
        </div>
      ) : authView !== null && !currentUser ? (
        <AuthScreen
          initialMode={authView.mode}
          initialRegisterRole={authView.role}
          publicContact={publicContact}
          onSuccess={(msg) => {
            setAuthView(null);
            showToast(msg, 'success');
          }}
          onBackPublic={() => setAuthView(null)}
        />
      ) : currentUser?.role === 'admin' && portalView === 'admin' ? (
        <AdminLayout
          currentUser={currentUser}
          events={events}
          registrations={registrations}
          users={users}
          publicContact={publicContact}
          permissionWarning={permissionWarning}
          onSwitchToUser={() => setPortalView('public')}
          onLogout={handleLogout}
          onNotify={showToast}
        />
      ) : currentUser?.role === 'organizer' && portalView === 'organizer' ? (
        <OrganizerLayout
          currentUser={currentUser}
          events={events}
          registrations={registrations}
          feedbacks={feedbacks}
          publicContact={publicContact}
          permissionWarning={permissionWarning}
          onViewPublicLanding={() => setPortalView('public')}
          onLogout={handleLogout}
          onNotify={showToast}
        />
      ) : (
        <UserLayout
          currentUser={currentUser}
          events={events}
          eventsLoading={eventsLoading}
          registrations={registrations}
          feedbacks={feedbacks}
          publicContact={publicContact}
          permissionWarning={permissionWarning}
          onSwitchToAdmin={
            currentUser?.role === 'admin' ? () => setPortalView('admin') : undefined
          }
          onSwitchToOrganizer={
            currentUser?.role === 'organizer' ? () => setPortalView('organizer') : undefined
          }
          onOpenAuth={(mode = 'login', role = 'user') => setAuthView({ mode, role })}
          onLogout={handleLogout}
          onNotify={showToast}
        />
      )}

      {/* Toast notification */}
      {toast && (
        <div
          key={toast.id}
          role="status"
          className={`fixed bottom-5 right-5 z-50 max-w-sm flex items-start gap-3 px-4 py-3 rounded-xl border shadow-lg bg-white animate-ef-toast-in ${
            toast.type === 'error' ? 'border-rose-200' : 'border-indigo-200'
          }`}
        >
          {toast.type === 'error' ? (
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          ) : (
            <CheckCircle2 className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
          )}
          <p className="text-sm font-medium text-slate-800">{toast.message}</p>
          <button
            type="button"
            aria-label="Đóng thông báo"
            onClick={() => setToast(null)}
            className="p-0.5 text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </>
  );
}
