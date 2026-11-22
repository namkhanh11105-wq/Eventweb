import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';
import { AuthScreen } from './components/AuthScreen';
import { TopProgressBar, prefersReducedMotion, triggerPageProgress } from './components/MotionPrimitives';
import { ProfileSettingsModal } from './components/ProfileSettingsModal';
import { UserLayout } from './components/UserLayout';
import { AdminLayout } from './components/AdminLayout';
import {
  logoutAccount,
  subscribeAuthUser,
  subscribeContactInquiries,
  subscribeEventRegistrationCounts,
  subscribeEvents,
  subscribeFeedbacks,
  subscribePublicContact,
  subscribeRegistrations,
  subscribeUsers,
} from './services/dataService';
import { DEFAULT_PUBLIC_CONTACT } from './utils/formatters';
import {
  getPathForPublicPage,
  parseRouteFromLocation,
  pushBrowserPath,
} from './utils/routes';
import type {
  AppUser,
  ContactInquiry,
  EventItem,
  FeedbackItem,
  PreselectedServiceBooking,
  PublicContactInfo,
  PublicPage,
  RegistrationItem,
} from './types';

interface ToastState {
  id: number;
  message: string;
  type: 'success' | 'error';
}

interface AuthViewState {
  mode: 'login' | 'register';
}

export default function App() {
  const initialRoute =
    typeof window !== 'undefined'
      ? parseRouteFromLocation(window.location.pathname, window.location.search)
      : { view: 'public' as const, page: 'discover' as const };

  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authView, setAuthView] = useState<AuthViewState | null>(
    initialRoute.view === 'auth' ? { mode: initialRoute.mode } : null
  );
  const [portalView, setPortalView] = useState<'admin' | 'public'>(
    initialRoute.view === 'admin' ? 'admin' : 'public'
  );
  const [publicPage, setPublicPage] = useState<PublicPage>(
    initialRoute.view === 'public' ? initialRoute.page : 'discover'
  );
  const [myEventsTab, setMyEventsTab] = useState<'registered' | 'requests'>(
    initialRoute.view === 'public' && initialRoute.page === 'tickets' && initialRoute.tab
      ? initialRoute.tab
      : 'registered'
  );
  const [selectedEventId, setSelectedEventId] = useState<string | null>(
    initialRoute.view === 'public' && initialRoute.page === 'event_detail'
      ? initialRoute.eventId
      : null
  );

  const [events, setEvents] = useState<EventItem[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [registrations, setRegistrations] = useState<RegistrationItem[]>([]);
  const [regCountsByEvent, setRegCountsByEvent] = useState<Record<string, number>>({});
  const [regCountsAvailable, setRegCountsAvailable] = useState(false);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [contactInquiries, setContactInquiries] = useState<ContactInquiry[]>([]);
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
  const [publicContact, setPublicContact] = useState<PublicContactInfo>(DEFAULT_PUBLIC_CONTACT);
  const [permissionWarning, setPermissionWarning] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [isRootTransitioningOut, setIsRootTransitioningOut] = useState(false);
  const rootTransitionTimerRef = useRef<number | null>(null);
  const [profileModalOpen, setProfileModalOpen] = useState(false);

  const [pendingServiceBooking, setPendingServiceBooking] =
    useState<PreselectedServiceBooking | null>(null);
  const pendingServiceBookingRef = useRef<PreselectedServiceBooking | null>(null);
  const [openCreateRequestSignal, setOpenCreateRequestSignal] = useState(0);

  useEffect(() => {
    pendingServiceBookingRef.current = pendingServiceBooking;
  }, [pendingServiceBooking]);

  useEffect(() => {
    return () => {
      if (rootTransitionTimerRef.current !== null) {
        window.clearTimeout(rootTransitionTimerRef.current);
      }
    };
  }, []);

  function runRootTransition(action: () => void) {
    triggerPageProgress();
    if (prefersReducedMotion()) {
      action();
      return;
    }
    if (rootTransitionTimerRef.current !== null) {
      window.clearTimeout(rootTransitionTimerRef.current);
    }
    setIsRootTransitioningOut(true);
    rootTransitionTimerRef.current = window.setTimeout(() => {
      action();
      setIsRootTransitioningOut(false);
      rootTransitionTimerRef.current = null;
    }, 140);
  }

  function showToast(message: string, type: 'success' | 'error' = 'success') {
    const id = Date.now();
    setToast({ id, message, type });
    window.setTimeout(() => {
      setToast((prev) => (prev?.id === id ? null : prev));
    }, 4500);
  }

  function navigatePublicPage(
    page: 'discover' | 'services' | 'contact' | 'tickets',
    tab?: 'registered' | 'requests'
  ) {
    const apply = () => {
      setAuthView(null);
      setPortalView('public');
      setPublicPage(page);
      if (page === 'tickets' && tab) {
        setMyEventsTab(tab);
      }
      setSelectedEventId(null);
      pushBrowserPath(
        getPathForPublicPage(page, undefined, page === 'tickets' ? tab || myEventsTab : undefined)
      );
      window.scrollTo({ top: 0, behavior: 'auto' });
    };

    if (authView !== null || portalView !== 'public') {
      runRootTransition(apply);
    } else {
      apply();
    }
  }

  function navigateToEventDetail(eventId: string) {
    const apply = () => {
      setAuthView(null);
      setPortalView('public');
      setPublicPage('event_detail');
      setSelectedEventId(eventId);
      pushBrowserPath(getPathForPublicPage('event_detail', eventId));
      window.scrollTo({ top: 0, behavior: 'auto' });
    };

    if (authView !== null || portalView !== 'public') {
      runRootTransition(apply);
    } else {
      apply();
    }
  }

  function openAuthScreen(mode: 'login' | 'register' = 'login') {
    const apply = () => {
      setAuthView({ mode });
      const path = mode === 'register' ? '/dang-ky' : '/dang-nhap';
      pushBrowserPath(path);
      window.scrollTo({ top: 0, behavior: 'auto' });
    };

    if (authView === null) {
      runRootTransition(apply);
    } else {
      apply();
    }
  }

  function handleRequestServiceBooking(preset?: PreselectedServiceBooking) {
    const normalized: PreselectedServiceBooking = preset || {
      serviceKeys: ['av_stage', 'checkin_staff'],
    };
    setPendingServiceBooking(normalized);
    pendingServiceBookingRef.current = normalized;
    openAuthScreen('register');
  }

  function switchToAdminPortal() {
    runRootTransition(() => {
      setAuthView(null);
      setPortalView('admin');
      pushBrowserPath('/quan-tri');
      window.scrollTo({ top: 0, behavior: 'auto' });
    });
  }

  useEffect(() => {
    function handlePopState() {
      triggerPageProgress();
      const next = parseRouteFromLocation(window.location.pathname, window.location.search);
      if (next.view === 'auth') {
        setAuthView({ mode: next.mode });
      } else if (next.view === 'admin') {
        setAuthView(null);
        setPortalView(currentUser?.role === 'admin' ? 'admin' : 'public');
      } else {
        setAuthView(null);
        setPortalView('public');
        setPublicPage(next.page);
        if (next.page === 'tickets' && next.tab) {
          setMyEventsTab(next.tab);
        }
        setSelectedEventId(next.page === 'event_detail' ? next.eventId : null);
      }
    }

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [currentUser]);

  useEffect(() => {
    const unsubContact = subscribePublicContact(setPublicContact);
    return () => unsubContact();
  }, []);

  useEffect(() => {
    const unsubAuth = subscribeAuthUser((user) => {
      setCurrentUser(user);
      setAuthReady(true);
      setPermissionWarning(null);

      const currentRoute = parseRouteFromLocation(window.location.pathname, window.location.search);

      if (user) {
        setAuthView(null);
        if (user.role === 'admin') {
          setPendingServiceBooking(null);
          pendingServiceBookingRef.current = null;
          setPortalView('admin');
          pushBrowserPath('/quan-tri');
        } else {
          setPortalView('public');
          if (pendingServiceBookingRef.current) {
            setPublicPage('tickets');
            setMyEventsTab('requests');
            setSelectedEventId(null);
            setOpenCreateRequestSignal((prev) => prev + 1);
            pushBrowserPath(getPathForPublicPage('tickets', undefined, 'requests'));
          } else if (currentRoute.view === 'public') {
            setPublicPage(currentRoute.page);
            if (currentRoute.page === 'tickets' && currentRoute.tab) {
              setMyEventsTab(currentRoute.tab);
            }
            setSelectedEventId(
              currentRoute.page === 'event_detail' ? currentRoute.eventId : null
            );
          } else {
            setPublicPage('discover');
            setSelectedEventId(null);
            pushBrowserPath('/');
          }
        }
      } else {
        setPortalView('public');
        setRegistrations([]);
        setUsers([]);
        setContactInquiries([]);
        if (currentRoute.view === 'admin') {
          setPublicPage('discover');
          setSelectedEventId(null);
          pushBrowserPath('/');
        }
      }
    });
    return () => unsubAuth();
  }, []);

  useEffect(() => {
    if (!authReady) return;

    setEventsLoading(true);

    const handlePermissionError = (msg: string) => {
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
    const unsubRegCounts = subscribeEventRegistrationCounts((counts, available) => {
      setRegCountsByEvent(counts);
      setRegCountsAvailable(available);
    });

    let unsubRegs: (() => void) | undefined;
    let unsubUsers: (() => void) | undefined;
    let unsubInquiries: (() => void) | undefined;

    if (currentUser) {
      unsubRegs = subscribeRegistrations(
        { userId: currentUser.uid, role: currentUser.role },
        setRegistrations,
        handlePermissionError
      );
      if (currentUser.role === 'admin') {
        unsubUsers = subscribeUsers(setUsers, handlePermissionError);
        unsubInquiries = subscribeContactInquiries(setContactInquiries, handlePermissionError);
      } else {
        setUsers([]);
        setContactInquiries([]);
      }
    } else {
      setRegistrations([]);
      setUsers([]);
      setContactInquiries([]);
    }

    return () => {
      unsubEvents();
      unsubFeedbacks();
      unsubRegCounts();
      unsubRegs?.();
      unsubUsers?.();
      unsubInquiries?.();
    };
  }, [authReady, currentUser]);

  async function handleLogout() {
    try {
      await logoutAccount();
      setProfileModalOpen(false);
      runRootTransition(() => {
        setAuthView(null);
        setPortalView('public');
        setPublicPage('discover');
        setMyEventsTab('registered');
        setSelectedEventId(null);
        setPendingServiceBooking(null);
        pendingServiceBookingRef.current = null;
        setPermissionWarning(null);
        pushBrowserPath('/');
      });
      showToast('Đã đăng xuất khỏi hệ thống.');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Lỗi khi đăng xuất.', 'error');
    }
  }

  const rootViewKey = !authReady
    ? 'loading'
    : authView !== null && !currentUser
    ? 'auth'
    : currentUser?.role === 'admin' && portalView === 'admin'
    ? 'admin'
    : 'public';

  return (
    <>
      <TopProgressBar />
      <div
        className={`min-h-screen transition-[opacity,transform] duration-150 ease-out motion-reduce:transition-none motion-reduce:transform-none ${
          isRootTransitioningOut ? 'opacity-0 scale-[0.985] pointer-events-none' : 'opacity-100'
        }`}
      >
        <div key={rootViewKey} className={rootViewKey === 'loading' ? '' : 'animate-ef-page-enter'}>
      {!authReady ? (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
          <div className="bg-white border border-slate-200 rounded-xl px-6 py-5 text-sm font-medium text-slate-600">
            Đang khởi tạo hệ thống EventFlow...
          </div>
        </div>
      ) : authView !== null && !currentUser ? (
        <AuthScreen
          mode={authView.mode}
          publicContact={publicContact}
          onSwitchMode={(nextMode) => openAuthScreen(nextMode)}
          onSuccess={(msg) => {
            triggerPageProgress();
            setAuthView(null);
            showToast(msg, 'success');
          }}
          onBackPublic={() => navigatePublicPage('discover')}
        />
      ) : currentUser?.role === 'admin' && portalView === 'admin' ? (
        <AdminLayout
          currentUser={currentUser}
          events={events}
          registrations={registrations}
          users={users}
          contactInquiries={contactInquiries}
          publicContact={publicContact}
          permissionWarning={permissionWarning}
          onSwitchToUser={() => navigatePublicPage('discover')}
          onOpenProfileSettings={() => setProfileModalOpen(true)}
          onLogout={handleLogout}
          onNotify={showToast}
        />
      ) : (
        <UserLayout
          currentUser={currentUser}
          activePage={publicPage}
          activeMyEventsTab={myEventsTab}
          openCreateRequestSignal={openCreateRequestSignal}
          selectedEventId={selectedEventId}
          events={events}
          eventsLoading={eventsLoading}
          registrations={registrations}
          regCountsByEvent={regCountsByEvent}
          regCountsAvailable={regCountsAvailable}
          pendingServiceBooking={pendingServiceBooking}
          feedbacks={feedbacks}
          publicContact={publicContact}
          permissionWarning={permissionWarning}
          onNavigatePage={navigatePublicPage}
          onOpenEventDetail={navigateToEventDetail}
          onRequestServiceBooking={handleRequestServiceBooking}
          onConsumePendingBooking={() => {
            setPendingServiceBooking(null);
            pendingServiceBookingRef.current = null;
          }}
          onSwitchToAdmin={
            currentUser?.role === 'admin' ? switchToAdminPortal : undefined
          }
          onOpenAuth={openAuthScreen}
          onOpenProfileSettings={() => setProfileModalOpen(true)}
          onLogout={handleLogout}
          onNotify={showToast}
        />
      )}
        </div>
      </div>

      <ProfileSettingsModal
        isOpen={profileModalOpen}
        currentUser={currentUser}
        onClose={() => setProfileModalOpen(false)}
        onUserUpdated={(updatedUser) => setCurrentUser(updatedUser)}
        onNotify={showToast}
      />

      {/* Toast notification */}
      {toast && (
        <div
          key={toast.id}
          role="status"
          className={`fixed bottom-4 left-4 right-4 sm:left-auto sm:bottom-5 sm:right-5 z-50 sm:max-w-sm flex items-start gap-3 px-4 py-3 rounded-xl border shadow-lg bg-white animate-ef-toast-in ${
            toast.type === 'error' ? 'border-rose-200' : 'border-indigo-200'
          }`}
        >
          {toast.type === 'error' ? (
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          ) : (
            <CheckCircle2 className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
          )}
          <p className="text-sm font-medium text-slate-800 flex-1">{toast.message}</p>
          <button
            type="button"
            aria-label="Đóng thông báo"
            onClick={() => setToast(null)}
            className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </>
  );
}
