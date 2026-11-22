import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, isFirebaseConfigured, OperationType } from '../firebase';
import { DEFAULT_PUBLIC_CONTACT, generateTicketCode } from '../utils/formatters';
import type {
  AppUser,
  ContactInquiry,
  ContactInquiryInput,
  ContactInquiryStatus,
  EventFormInput,
  EventGuest,
  EventItem,
  EventServiceRequest,
  EventStatus,
  FeedbackItem,
  OrganizerEventRequestInput,
  PlanningStatus,
  PublicContactInfo,
  RegistrationInput,
  RegistrationItem,
  RegistrationStatus,
  UserRole,
} from '../types';

function requireFirebase() {
  if (!isFirebaseConfigured || !auth || !db) {
    throw new Error(
      'Kết nối Firebase chưa sẵn sàng. Vui lòng kiểm tra cấu hình dự án quan-ly-su-kien-86a89.'
    );
  }
  return { auth, db };
}

const ADMIN_EMAIL = 'admin@eventflow.vn';

function isAdminEmail(email: string): boolean {
  return email.trim().toLowerCase() === ADMIN_EMAIL;
}

function resolveUserRole(email: string, storedRole?: unknown): UserRole {
  if (isAdminEmail(email) || storedRole === 'admin') {
    return 'admin';
  }
  return 'user';
}

function toSafeIsoDate(
  value: string | undefined | null,
  fallback: string = new Date().toISOString()
): string {
  if (!value || !String(value).trim()) {
    return fallback;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return fallback;
  }
  return parsed.toISOString();
}

/**
 * Recursively strip `undefined` values from objects and arrays before writing to Firestore.
 * Converts NaN/Infinity numbers to 0 and Date instances to ISO strings.
 */
export function sanitizeForFirestore<T>(value: T): T {
  if (value === null || value === undefined) {
    return value;
  }
  if (value instanceof Date) {
    return (Number.isNaN(value.getTime())
      ? new Date().toISOString()
      : value.toISOString()) as unknown as T;
  }
  if (typeof value === 'number') {
    return (Number.isFinite(value) ? value : 0) as unknown as T;
  }
  if (Array.isArray(value)) {
    const cleaned = value
      .filter((item) => item !== undefined)
      .map((item) => sanitizeForFirestore(item));
    return cleaned as unknown as T;
  }
  if (typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      if (val !== undefined) {
        result[key] = sanitizeForFirestore(val);
      }
    }
    return result as T;
  }
  return value;
}

function normalizeServiceRequests(
  services?: EventServiceRequest[]
): EventServiceRequest[] {
  if (!Array.isArray(services)) return [];
  return services
    .filter((srv) => Boolean(srv && (srv.serviceName || srv.serviceKey)))
    .map((srv, idx) => ({
      id: String(srv.id || `srv-${Date.now()}-${idx}`),
      serviceKey: String(srv.serviceKey || 'custom'),
      serviceName: String(srv.serviceName ?? '').trim(),
      quantityOrScope: String(srv.quantityOrScope ?? '').trim(),
      clientNote: String(srv.clientNote ?? '').trim(),
      adminNote: String(srv.adminNote ?? '').trim(),
      status: srv.status || 'pending',
    }));
}

function normalizeInvitedGuests(guests?: EventGuest[]): EventGuest[] {
  if (!Array.isArray(guests)) return [];
  return guests
    .filter((g) => Boolean(g && g.fullName))
    .map((g, idx) => ({
      id: String(g.id || `guest-${Date.now()}-${idx}`),
      fullName: String(g.fullName ?? '').trim(),
      title: String(g.title ?? '').trim(),
      organization: String(g.organization ?? '').trim(),
      email: String(g.email ?? '').trim(),
      phone: String(g.phone ?? '').trim(),
      guestType: g.guestType || 'Khách mời',
      rsvpStatus: g.rsvpStatus || 'invited',
      note: String(g.note ?? '').trim(),
    }));
}

function normalizeEventDoc(id: string, raw: Record<string, unknown>): EventItem {
  return {
    id,
    title: String(raw.title ?? ''),
    description: String(raw.description ?? ''),
    bannerUrl: String(raw.bannerUrl ?? ''),
    location: String(raw.location ?? ''),
    startTime: String(raw.startTime ?? new Date().toISOString()),
    endTime: String(raw.endTime ?? new Date().toISOString()),
    maxSlots: Number(raw.maxSlots ?? 50),
    registeredCount: Number(raw.registeredCount ?? 0),
    checkedInCount: Number(raw.checkedInCount ?? 0),
    status: (raw.status as EventStatus) || 'upcoming',
    planningStatus: (raw.planningStatus as PlanningStatus) || 'confirmed',
    isPublic: raw.isPublic !== false,
    category: String(raw.category ?? 'Hội nghị công nghệ'),
    organizer: String(raw.organizer ?? 'EventFlow Enterprise'),
    organizerVerified: raw.organizerVerified !== false,
    featured: Boolean(raw.featured),
    clientUserId: raw.clientUserId ? String(raw.clientUserId) : '',
    clientName: raw.clientName ? String(raw.clientName) : '',
    clientEmail: raw.clientEmail ? String(raw.clientEmail) : '',
    clientPhone: raw.clientPhone ? String(raw.clientPhone) : '',
    requestedServices: Array.isArray(raw.requestedServices)
      ? normalizeServiceRequests(raw.requestedServices as EventServiceRequest[])
      : [],
    invitedGuests: Array.isArray(raw.invitedGuests)
      ? normalizeInvitedGuests(raw.invitedGuests as EventGuest[])
      : [],
    speakers: Array.isArray(raw.speakers) ? (raw.speakers as EventItem['speakers']) : [],
    agenda: Array.isArray(raw.agenda) ? (raw.agenda as EventItem['agenda']) : [],
    faqs: Array.isArray(raw.faqs) ? (raw.faqs as EventItem['faqs']) : [],
    rules: String(raw.rules ?? 'Vui lòng mang theo mã QR xác nhận khi tham dự.'),
    createdAt: String(raw.createdAt ?? new Date().toISOString()),
  };
}

function normalizeRegistrationDoc(id: string, raw: Record<string, unknown>): RegistrationItem {
  return {
    id,
    eventId: String(raw.eventId ?? ''),
    eventTitle: String(raw.eventTitle ?? ''),
    userId: String(raw.userId ?? ''),
    guestName: String(raw.guestName ?? ''),
    guestEmail: String(raw.guestEmail ?? ''),
    guestPhone: String(raw.guestPhone ?? ''),
    note: String(raw.note ?? ''),
    ticketCode: String(raw.ticketCode ?? `EF-${id.slice(-6).toUpperCase()}`),
    status: (raw.status as RegistrationStatus) || 'confirmed',
    registeredAt: String(raw.registeredAt ?? new Date().toISOString()),
    checkedInAt: (raw.checkedInAt as string | null | undefined) ?? null,
  };
}

function mapFirebaseAuthError(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err);
  if (message.includes('auth/email-already-in-use')) {
    return 'Email này đã được đăng ký. Vui lòng đăng nhập.';
  }
  if (message.includes('auth/invalid-credential') || message.includes('auth/wrong-password')) {
    return 'Email hoặc mật khẩu không chính xác.';
  }
  if (message.includes('auth/user-not-found')) {
    return 'Không tìm thấy tài khoản với email này.';
  }
  if (message.includes('auth/weak-password')) {
    return 'Mật khẩu cần tối thiểu 6 ký tự.';
  }
  if (message.includes('auth/operation-not-allowed')) {
    return 'Phương thức đăng nhập Email/Password chưa được bật trong Firebase Console.';
  }
  if (message.includes('auth/invalid-email')) {
    return 'Địa chỉ email không hợp lệ.';
  }
  return message || 'Đã xảy ra lỗi xác thực.';
}

export function subscribeAuthUser(callback: (user: AppUser | null) => void): () => void {
  const { auth: firebaseAuth, db: firestore } = requireFirebase();
  return onAuthStateChanged(firebaseAuth, async (fbUser) => {
    if (!fbUser) {
      callback(null);
      return;
    }
    const email = (fbUser.email || '').trim().toLowerCase();
    const fallbackRole = resolveUserRole(email);
    const fallbackProfile: AppUser = {
      uid: fbUser.uid,
      fullName: fbUser.displayName || email.split('@')[0] || 'Thành viên',
      email,
      phone: '',
      role: fallbackRole,
      createdAt: new Date().toISOString(),
    };
    try {
      const userRef = doc(firestore, 'users', fbUser.uid);
      const snap = await getDoc(userRef);
      if (snap.exists()) {
        const data = snap.data() as AppUser;
        const resolvedRole = resolveUserRole(email, data.role);
        if (isAdminEmail(email) && data.role !== 'admin') {
          try {
            await setDoc(userRef, { role: 'admin' }, { merge: true });
          } catch {
            // Ignore if rules restrict profile update
          }
        }
        callback({
          ...data,
          role: resolvedRole,
        });
      } else {
        const role = resolveUserRole(email);
        const profile: AppUser = { ...fallbackProfile, role };
        try {
          await setDoc(userRef, profile);
        } catch {
          // Ignore if Firestore rules restrict profile auto-write
        }
        callback(profile);
      }
    } catch {
      callback(fallbackProfile);
    }
  });
}

export async function registerAccount(params: {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  organization?: string;
}): Promise<AppUser> {
  const { auth: firebaseAuth, db: firestore } = requireFirebase();
  const email = params.email.trim().toLowerCase();
  const fullName = params.fullName.trim();
  const phone = params.phone.trim();
  const organization = params.organization?.trim() || '';

  if (!fullName || !email || params.password.length < 6) {
    throw new Error('Vui lòng nhập đầy đủ họ tên, email và mật khẩu từ 6 ký tự.');
  }

  try {
    const cred = await createUserWithEmailAndPassword(firebaseAuth, email, params.password);
    const role: UserRole = isAdminEmail(email) ? 'admin' : 'user';
    const profile: AppUser = {
      uid: cred.user.uid,
      fullName,
      email,
      phone,
      role,
      ...(organization ? { organization } : {}),
      createdAt: new Date().toISOString(),
    };
    try {
      await setDoc(doc(firestore, 'users', cred.user.uid), sanitizeForFirestore(profile));
    } catch (writeErr) {
      handleFirestoreError(writeErr, OperationType.CREATE, `users/${cred.user.uid}`, false);
    }
    return profile;
  } catch (err) {
    throw new Error(mapFirebaseAuthError(err));
  }
}

export async function loginAccount(emailInput: string, password: string): Promise<AppUser> {
  const { auth: firebaseAuth, db: firestore } = requireFirebase();
  const email = emailInput.trim().toLowerCase();
  if (!email || !password) {
    throw new Error('Vui lòng nhập email và mật khẩu.');
  }

  try {
    const cred = await signInWithEmailAndPassword(firebaseAuth, email, password);
    const fallbackRole = resolveUserRole(email);
    const fallbackProfile: AppUser = {
      uid: cred.user.uid,
      fullName: email.split('@')[0],
      email,
      phone: '',
      role: fallbackRole,
      createdAt: new Date().toISOString(),
    };
    try {
      const userRef = doc(firestore, 'users', cred.user.uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const data = userSnap.data() as AppUser;
        const resolvedRole = resolveUserRole(email, data.role);
        if (isAdminEmail(email) && data.role !== 'admin') {
          try {
            await setDoc(userRef, { role: 'admin' }, { merge: true });
          } catch {
            // Ignore
          }
        }
        return {
          ...data,
          role: resolvedRole,
        };
      }
      const profile: AppUser = { ...fallbackProfile, role: fallbackRole };
      try {
        await setDoc(userRef, profile);
      } catch {
        // Ignore
      }
      return profile;
    } catch {
      return fallbackProfile;
    }
  } catch (err) {
    throw new Error(mapFirebaseAuthError(err));
  }
}

export async function logoutAccount(): Promise<void> {
  const { auth: firebaseAuth } = requireFirebase();
  await signOut(firebaseAuth);
}

export function subscribePublicContact(
  callback: (contact: PublicContactInfo) => void
): () => void {
  const { db: firestore } = requireFirebase();
  const ref = doc(firestore, 'site_settings', 'public_contact');
  return onSnapshot(
    ref,
    (snap) => {
      if (snap.exists()) {
        const raw = snap.data() as Partial<PublicContactInfo>;
        callback({
          ...DEFAULT_PUBLIC_CONTACT,
          ...raw,
        });
      } else {
        callback(DEFAULT_PUBLIC_CONTACT);
      }
    },
    () => {
      // Gracefully keep default contact if unauthenticated rules block site_settings
      callback(DEFAULT_PUBLIC_CONTACT);
    }
  );
}

export async function updatePublicContact(
  input: Omit<PublicContactInfo, 'updatedAt'>
): Promise<PublicContactInfo> {
  const { db: firestore } = requireFirebase();
  const payload: PublicContactInfo = {
    organizationName: input.organizationName.trim() || DEFAULT_PUBLIC_CONTACT.organizationName,
    adminName: input.adminName.trim() || DEFAULT_PUBLIC_CONTACT.adminName,
    phone: input.phone.trim() || DEFAULT_PUBLIC_CONTACT.phone,
    hotline: input.hotline.trim() || DEFAULT_PUBLIC_CONTACT.hotline,
    email: input.email.trim() || DEFAULT_PUBLIC_CONTACT.email,
    officeAddress: input.officeAddress.trim() || DEFAULT_PUBLIC_CONTACT.officeAddress,
    workingHours: input.workingHours.trim() || DEFAULT_PUBLIC_CONTACT.workingHours,
    updatedAt: new Date().toISOString(),
  };

  try {
    await setDoc(
      doc(firestore, 'site_settings', 'public_contact'),
      sanitizeForFirestore(payload),
      { merge: true }
    );
    return payload;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'site_settings/public_contact');
    throw err;
  }
}

export function subscribeEvents(
  callback: (events: EventItem[]) => void,
  onPermissionError?: (msg: string) => void
): () => void {
  const { db: firestore } = requireFirebase();
  const q = query(collection(firestore, 'events'), orderBy('createdAt', 'desc'));
  return onSnapshot(
    q,
    (snapshot) => {
      const list = snapshot.docs.map((d) =>
        normalizeEventDoc(d.id, d.data() as Record<string, unknown>)
      );
      callback(list);
    },
    (err) => {
      onPermissionError?.(
        err instanceof Error ? err.message : 'Không đủ quyền đọc collection events.'
      );
      callback([]);
    }
  );
}

export function subscribeRegistrations(
  options: { userId: string; role: UserRole },
  callback: (registrations: RegistrationItem[]) => void,
  onPermissionError?: (msg: string) => void
): () => void {
  const { db: firestore } = requireFirebase();
  const q =
    options.role === 'admin'
      ? query(collection(firestore, 'registrations'), orderBy('registeredAt', 'desc'))
      : query(collection(firestore, 'registrations'), where('userId', '==', options.userId));

  return onSnapshot(
    q,
    (snapshot) => {
      const list = snapshot.docs
        .map((d) => normalizeRegistrationDoc(d.id, d.data() as Record<string, unknown>))
        .sort((a, b) => b.registeredAt.localeCompare(a.registeredAt));
      callback(list);
    },
    (err) => {
      onPermissionError?.(
        err instanceof Error ? err.message : 'Không đủ quyền đọc collection registrations.'
      );
      callback([]);
    }
  );
}

export function subscribeUsers(
  callback: (users: AppUser[]) => void,
  onPermissionError?: (msg: string) => void
): () => void {
  const { db: firestore } = requireFirebase();
  const q = query(collection(firestore, 'users'), orderBy('createdAt', 'desc'));
  return onSnapshot(
    q,
    (snapshot) => {
      const list = snapshot.docs.map((d) => d.data() as AppUser);
      callback(list);
    },
    (err) => {
      onPermissionError?.(
        err instanceof Error ? err.message : 'Không đủ quyền đọc collection users.'
      );
      callback([]);
    }
  );
}

export function subscribeFeedbacks(
  callback: (feedbacks: FeedbackItem[]) => void,
  onPermissionError?: (msg: string) => void
): () => void {
  const { db: firestore } = requireFirebase();
  const q = query(collection(firestore, 'feedbacks'), orderBy('createdAt', 'desc'));
  return onSnapshot(
    q,
    (snapshot) => {
      const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as FeedbackItem);
      callback(list);
    },
    (err) => {
      onPermissionError?.(
        err instanceof Error ? err.message : 'Không đủ quyền đọc collection feedbacks.'
      );
      callback([]);
    }
  );
}

export async function createEvent(input: EventFormInput): Promise<EventItem> {
  const { db: firestore } = requireFirebase();
  const newId = `evt-${Date.now()}`;
  const nowIso = new Date().toISOString();
  const parsedMaxSlots = Number(input.maxSlots);
  const eventDoc: EventItem = sanitizeForFirestore({
    id: newId,
    title: String(input.title ?? '').trim(),
    description: String(input.description ?? '').trim(),
    bannerUrl: String(input.bannerUrl ?? '').trim(),
    location: String(input.location ?? '').trim(),
    startTime: toSafeIsoDate(input.startTime, nowIso),
    endTime: toSafeIsoDate(input.endTime, nowIso),
    maxSlots: Number.isFinite(parsedMaxSlots) && parsedMaxSlots > 0 ? Math.round(parsedMaxSlots) : 50,
    registeredCount: 0,
    checkedInCount: 0,
    status: input.status || 'upcoming',
    planningStatus: input.planningStatus || 'confirmed',
    isPublic: input.isPublic !== false,
    category: String(input.category || 'Hội nghị công nghệ'),
    organizer: String(input.organizer ?? '').trim() || 'EventFlow Enterprise',
    organizerVerified: input.organizerVerified !== false,
    featured: Boolean(input.featured),
    clientUserId: String(input.clientUserId ?? '').trim(),
    clientName: String(input.clientName ?? '').trim(),
    clientEmail: String(input.clientEmail ?? '').trim(),
    clientPhone: String(input.clientPhone ?? '').trim(),
    requestedServices: normalizeServiceRequests(input.requestedServices),
    invitedGuests: normalizeInvitedGuests(input.invitedGuests),
    speakers: (input.speakers || [])
      .filter((s) => s.name?.trim())
      .map((s) => ({
        name: s.name.trim(),
        role: String(s.role ?? '').trim(),
        company: String(s.company ?? '').trim(),
      })),
    agenda: (input.agenda || [])
      .filter((a) => a.time?.trim() || a.title?.trim())
      .map((a) => ({
        time: String(a.time ?? '').trim(),
        title: String(a.title ?? '').trim(),
        speaker: String(a.speaker ?? '').trim(),
      })),
    faqs: (input.faqs || [])
      .filter((f) => f.question?.trim() && f.answer?.trim())
      .map((f) => ({
        question: f.question.trim(),
        answer: f.answer.trim(),
      })),
    rules: String(input.rules ?? '').trim(),
    createdAt: nowIso,
  });

  try {
    await setDoc(doc(firestore, 'events', newId), eventDoc);
    return eventDoc;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `events/${newId}`);
    throw err;
  }
}

export async function createOrganizerEventRequest(
  input: OrganizerEventRequestInput
): Promise<EventItem> {
  const { db: firestore } = requireFirebase();
  const newId = `evt-req-${Date.now()}`;
  const nowIso = new Date().toISOString();
  const parsedMaxSlots = Number(input.maxSlots);
  const safeClientName = String(input.clientName ?? '').trim() || 'Thành viên EventFlow';

  const eventDoc: EventItem = sanitizeForFirestore({
    id: newId,
    title: String(input.title ?? '').trim(),
    description: String(input.description ?? '').trim(),
    bannerUrl: String(input.bannerUrl ?? '').trim(),
    location: String(input.location ?? '').trim(),
    startTime: toSafeIsoDate(input.startTime, nowIso),
    endTime: toSafeIsoDate(input.endTime, nowIso),
    maxSlots: Number.isFinite(parsedMaxSlots) && parsedMaxSlots > 0 ? Math.round(parsedMaxSlots) : 60,
    registeredCount: 0,
    checkedInCount: 0,
    status: 'upcoming',
    planningStatus: 'pending_review',
    isPublic: false,
    category: String(input.category || 'Hội nghị công nghệ'),
    organizer: String(input.organizerName ?? '').trim() || safeClientName,
    organizerVerified: false,
    featured: false,
    clientUserId: String(input.clientUserId ?? '').trim(),
    clientName: safeClientName,
    clientEmail: String(input.clientEmail ?? '').trim(),
    clientPhone: String(input.clientPhone ?? '').trim(),
    requestedServices: normalizeServiceRequests(input.requestedServices),
    invitedGuests: [],
    speakers: [],
    agenda: [
      { time: '08:30 - 09:00', title: 'Đón khách & Check-in QR', speaker: '' },
      { time: '09:00 - 11:30', title: 'Chương trình chính thức', speaker: '' },
    ],
    faqs: [],
    rules: 'Vui lòng mang theo mã QR xác nhận khi tham dự sự kiện.',
    createdAt: nowIso,
  });

  try {
    await setDoc(doc(firestore, 'events', newId), eventDoc);
    return eventDoc;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `events/${newId}`);
    throw err;
  }
}

export async function duplicateEvent(source: EventItem): Promise<EventItem> {
  return createEvent({
    title: `${source.title} (Bản sao)`,
    description: source.description,
    bannerUrl: source.bannerUrl,
    location: source.location,
    startTime: source.startTime,
    endTime: source.endTime,
    maxSlots: source.maxSlots,
    status: 'upcoming',
    planningStatus: 'planning',
    isPublic: false,
    category: source.category,
    organizer: source.organizer,
    organizerVerified: source.organizerVerified,
    featured: false,
    requestedServices: source.requestedServices.map((s) => ({
      ...s,
      id: `srv-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      status: 'pending',
    })),
    invitedGuests: [],
    speakers: source.speakers,
    agenda: source.agenda,
    faqs: source.faqs || [],
    rules: source.rules,
  });
}

export async function updateEvent(id: string, input: Partial<EventFormInput>): Promise<void> {
  const { db: firestore } = requireFirebase();
  const updates = sanitizeForFirestore<Record<string, unknown>>({
    ...(input.title !== undefined ? { title: input.title.trim() } : {}),
    ...(input.description !== undefined ? { description: input.description.trim() } : {}),
    ...(input.bannerUrl !== undefined ? { bannerUrl: input.bannerUrl.trim() } : {}),
    ...(input.location !== undefined ? { location: input.location.trim() } : {}),
    ...(input.startTime !== undefined ? { startTime: toSafeIsoDate(input.startTime) } : {}),
    ...(input.endTime !== undefined ? { endTime: toSafeIsoDate(input.endTime) } : {}),
    ...(input.maxSlots !== undefined ? { maxSlots: Number(input.maxSlots) || 50 } : {}),
    ...(input.status !== undefined ? { status: input.status } : {}),
    ...(input.planningStatus !== undefined ? { planningStatus: input.planningStatus } : {}),
    ...(input.isPublic !== undefined ? { isPublic: input.isPublic } : {}),
    ...(input.category !== undefined ? { category: input.category } : {}),
    ...(input.organizer !== undefined ? { organizer: input.organizer.trim() } : {}),
    ...(input.organizerVerified !== undefined
      ? { organizerVerified: input.organizerVerified }
      : {}),
    ...(input.featured !== undefined ? { featured: input.featured } : {}),
    ...(input.requestedServices !== undefined
      ? { requestedServices: normalizeServiceRequests(input.requestedServices) }
      : {}),
    ...(input.invitedGuests !== undefined
      ? { invitedGuests: normalizeInvitedGuests(input.invitedGuests) }
      : {}),
    ...(input.speakers !== undefined
      ? {
          speakers: input.speakers
            .filter((s) => s.name?.trim())
            .map((s) => ({
              name: s.name.trim(),
              role: String(s.role ?? '').trim(),
              company: String(s.company ?? '').trim(),
            })),
        }
      : {}),
    ...(input.agenda !== undefined
      ? {
          agenda: input.agenda
            .filter((a) => a.time?.trim() || a.title?.trim())
            .map((a) => ({
              time: String(a.time ?? '').trim(),
              title: String(a.title ?? '').trim(),
              speaker: String(a.speaker ?? '').trim(),
            })),
        }
      : {}),
    ...(input.faqs !== undefined
      ? {
          faqs: input.faqs
            .filter((f) => f.question?.trim() && f.answer?.trim())
            .map((f) => ({
              question: f.question.trim(),
              answer: f.answer.trim(),
            })),
        }
      : {}),
    ...(input.rules !== undefined ? { rules: input.rules.trim() } : {}),
  });

  try {
    await updateDoc(doc(firestore, 'events', id), updates);
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `events/${id}`);
  }
}

export async function updateEventServices(
  eventId: string,
  requestedServices: EventServiceRequest[]
): Promise<void> {
  const { db: firestore } = requireFirebase();
  const safeServices = sanitizeForFirestore(normalizeServiceRequests(requestedServices));
  try {
    await updateDoc(doc(firestore, 'events', eventId), { requestedServices: safeServices });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `events/${eventId}`);
  }
}

export async function updateEventInvitedGuests(
  eventId: string,
  invitedGuests: EventGuest[]
): Promise<void> {
  const { db: firestore } = requireFirebase();
  const safeGuests = sanitizeForFirestore(normalizeInvitedGuests(invitedGuests));
  try {
    await updateDoc(doc(firestore, 'events', eventId), { invitedGuests: safeGuests });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `events/${eventId}`);
  }
}

export async function deleteEvent(id: string): Promise<void> {
  const { db: firestore } = requireFirebase();
  try {
    await deleteDoc(doc(firestore, 'events', id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `events/${id}`);
  }
}

export async function createRegistration(input: RegistrationInput): Promise<RegistrationItem> {
  const { db: firestore } = requireFirebase();
  const newId = `reg-${Date.now()}`;
  const ticketCode = generateTicketCode();
  const regDoc: RegistrationItem = sanitizeForFirestore({
    id: newId,
    eventId: String(input.eventId ?? '').trim(),
    eventTitle: String(input.eventTitle ?? '').trim(),
    userId: String(input.userId ?? '').trim(),
    guestName: String(input.guestName ?? '').trim(),
    guestEmail: String(input.guestEmail ?? '').trim(),
    guestPhone: String(input.guestPhone ?? '').trim(),
    note: String(input.note ?? '').trim(),
    ticketCode,
    status: 'confirmed',
    registeredAt: new Date().toISOString(),
    checkedInAt: null,
  });

  try {
    const dupSnap = await getDocs(
      query(collection(firestore, 'registrations'), where('userId', '==', input.userId))
    );
    const alreadyRegistered = dupSnap.docs.some((d) => {
      const data = d.data() as RegistrationItem;
      return data.eventId === input.eventId && data.status !== 'cancelled';
    });
    if (alreadyRegistered) {
      throw new Error(
        'Bạn đã đăng ký sự kiện này trước đó rồi. Vui lòng kiểm tra mục Sự kiện đã đăng ký.'
      );
    }

    await runTransaction(firestore, async (transaction) => {
      const eventRef = doc(firestore, 'events', input.eventId);
      const eventSnap = await transaction.get(eventRef);
      if (!eventSnap.exists()) {
        throw new Error('Sự kiện không tồn tại hoặc đã bị xóa.');
      }
      const evData = eventSnap.data() as EventItem;
      if (
        evData.status === 'cancelled' ||
        evData.status === 'completed' ||
        evData.status === 'paused'
      ) {
        throw new Error('Sự kiện này hiện đang tạm đóng hoặc đã kết thúc đăng ký.');
      }
      if ((evData.registeredCount || 0) >= (evData.maxSlots || 0)) {
        throw new Error('Rất tiếc, sự kiện đã hết chỗ trống.');
      }

      transaction.update(eventRef, {
        registeredCount: (evData.registeredCount || 0) + 1,
      });
      transaction.set(doc(firestore, 'registrations', newId), regDoc);
    });

    return regDoc;
  } catch (err) {
    if (
      err instanceof Error &&
      (err.message.includes('đã đăng ký') ||
        err.message.includes('hết chỗ') ||
        err.message.includes('tạm đóng') ||
        err.message.includes('không tồn tại'))
    ) {
      throw err;
    }
    handleFirestoreError(err, OperationType.CREATE, `registrations/${newId}`);
    throw err;
  }
}

export async function updateRegistrationStatus(
  registration: RegistrationItem,
  nextStatus: RegistrationStatus
): Promise<void> {
  const { db: firestore } = requireFirebase();
  const wasActive = registration.status !== 'cancelled';
  const willBeActive = nextStatus !== 'cancelled';
  const regDelta = wasActive === willBeActive ? 0 : willBeActive ? 1 : -1;

  const wasAttended = registration.status === 'attended';
  const willBeAttended = nextStatus === 'attended';
  const checkInDelta = wasAttended === willBeAttended ? 0 : willBeAttended ? 1 : -1;

  const checkedInAt =
    nextStatus === 'attended'
      ? registration.checkedInAt || new Date().toISOString()
      : nextStatus === 'cancelled'
      ? null
      : registration.checkedInAt ?? null;

  try {
    await runTransaction(firestore, async (transaction) => {
      const regRef = doc(firestore, 'registrations', registration.id);
      const eventRef = doc(firestore, 'events', registration.eventId);

      const eventUpdates: Record<string, number> = {};
      if (regDelta !== 0 || checkInDelta !== 0) {
        const eventSnap = await transaction.get(eventRef);
        if (eventSnap.exists()) {
          const evData = eventSnap.data() as EventItem;
          if (regDelta !== 0) {
            eventUpdates.registeredCount = Math.max(0, (evData.registeredCount || 0) + regDelta);
          }
          if (checkInDelta !== 0) {
            eventUpdates.checkedInCount = Math.max(0, (evData.checkedInCount || 0) + checkInDelta);
          }
        }
      }

      transaction.update(regRef, {
        status: nextStatus,
        checkedInAt,
      });

      if (Object.keys(eventUpdates).length > 0) {
        transaction.update(eventRef, eventUpdates);
      }
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `registrations/${registration.id}`);
  }
}

export async function checkInByTicketCode(
  ticketCodeInput: string,
  registrations: RegistrationItem[]
): Promise<RegistrationItem> {
  const code = ticketCodeInput.trim().toUpperCase();
  if (!code) {
    throw new Error('Vui lòng nhập hoặc quét mã vé hợp lệ.');
  }
  const found = registrations.find(
    (r) => r.ticketCode.toUpperCase() === code || r.id.toUpperCase() === code
  );
  if (!found) {
    throw new Error(`Không tìm thấy mã xác nhận "${code}" trong sự kiện này.`);
  }
  if (found.status === 'cancelled') {
    throw new Error(`Mã ${found.ticketCode} (${found.guestName}) đã bị hủy trước đó.`);
  }
  if (found.status === 'attended') {
    throw new Error(`Mã ${found.ticketCode} (${found.guestName}) đã được check-in rồi.`);
  }

  await updateRegistrationStatus(found, 'attended');
  return {
    ...found,
    status: 'attended',
    checkedInAt: new Date().toISOString(),
  };
}

export async function submitFeedback(params: {
  eventId: string;
  eventTitle: string;
  userId: string;
  userName: string;
  rating: number;
  comment: string;
}): Promise<FeedbackItem> {
  const { db: firestore } = requireFirebase();
  const fbId = `fb-${params.eventId}-${params.userId}`;
  const feedback: FeedbackItem = sanitizeForFirestore({
    id: fbId,
    eventId: params.eventId,
    eventTitle: params.eventTitle,
    userId: params.userId,
    userName: params.userName,
    rating: Math.min(5, Math.max(1, Math.round(params.rating))),
    comment: String(params.comment ?? '').trim(),
    createdAt: new Date().toISOString(),
  });

  try {
    await setDoc(doc(firestore, 'feedbacks', fbId), feedback);
    return feedback;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `feedbacks/${fbId}`);
    throw err;
  }
}

export async function createContactInquiry(
  input: ContactInquiryInput
): Promise<ContactInquiry> {
  const { db: firestore } = requireFirebase();
  const inquiryId = `inq-${Date.now()}`;
  const docData: ContactInquiry = sanitizeForFirestore({
    id: inquiryId,
    fullName: String(input.fullName ?? '').trim(),
    contactInfo: String(input.contactInfo ?? '').trim(),
    topic: String(input.topic ?? '').trim() || 'Tư vấn tổ chức sự kiện',
    message: String(input.message ?? '').trim(),
    status: 'new',
    ...(input.userId ? { userId: input.userId } : {}),
    createdAt: new Date().toISOString(),
  });

  try {
    await setDoc(doc(firestore, 'contact_inquiries', inquiryId), docData);
    return docData;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `contact_inquiries/${inquiryId}`);
    throw err;
  }
}

export function subscribeContactInquiries(
  callback: (inquiries: ContactInquiry[]) => void,
  onPermissionError?: (msg: string) => void
): () => void {
  const { db: firestore } = requireFirebase();
  const q = query(collection(firestore, 'contact_inquiries'), orderBy('createdAt', 'desc'));
  return onSnapshot(
    q,
    (snapshot) => {
      const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as ContactInquiry);
      callback(list);
    },
    (err) => {
      onPermissionError?.(
        err instanceof Error ? err.message : 'Không đủ quyền đọc collection contact_inquiries.'
      );
      callback([]);
    }
  );
}

export async function updateContactInquiryStatus(
  id: string,
  status: ContactInquiryStatus
): Promise<void> {
  const { db: firestore } = requireFirebase();
  try {
    await updateDoc(doc(firestore, 'contact_inquiries', id), { status });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `contact_inquiries/${id}`);
  }
}

