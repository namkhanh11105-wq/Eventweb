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
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, isFirebaseConfigured, OperationType } from '../firebase';
import { buildSeedData } from '../data/seedData';
import { generateTicketCode } from '../utils/formatters';
import type {
  AppUser,
  EventFormInput,
  EventItem,
  EventStatus,
  FeedbackItem,
  RegistrationInput,
  RegistrationItem,
  RegistrationStatus,
  UserRole,
} from '../types';

const STORAGE_KEYS = {
  USERS: 'eventflow_users_v2',
  EVENTS: 'eventflow_events_v2',
  REGISTRATIONS: 'eventflow_registrations_v2',
  FEEDBACKS: 'eventflow_feedbacks_v2',
  SESSION_UID: 'eventflow_session_uid_v2',
};

const LOCAL_BUS_EVENT = 'eventflow:local-store-updated';

function emitLocalUpdate() {
  window.dispatchEvent(new CustomEvent(LOCAL_BUS_EVENT));
}

function readLocal<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeLocal<T>(key: string, value: T) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.warn('Không thể lưu localStorage:', err);
  }
}

interface LocalUserRecord extends AppUser {
  password?: string;
}

function ensureDemoAccountsInLocal() {
  const users = readLocal<LocalUserRecord[]>(STORAGE_KEYS.USERS, []);
  if (users.length === 0) {
    const now = new Date().toISOString();
    const initialUsers: LocalUserRecord[] = [
      {
        uid: 'demo-admin-01',
        fullName: 'Nguyễn Minh Quản Trị',
        email: 'admin@eventflow.vn',
        phone: '0900000001',
        role: 'admin',
        password: 'DemoAdmin@2026',
        createdAt: now,
      },
      {
        uid: 'demo-user-01',
        fullName: 'Trần Thu Hà',
        email: 'user@eventflow.vn',
        phone: '0901234567',
        role: 'user',
        password: 'DemoUser@2026',
        createdAt: now,
      },
    ];
    writeLocal(STORAGE_KEYS.USERS, initialUsers);
  }
}

function determineRole(email: string, existingUsersCount: number): UserRole {
  if (existingUsersCount === 0 || email.toLowerCase().includes('admin')) {
    return 'admin';
  }
  return 'user';
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
    status: (raw.status as EventStatus) || 'upcoming',
    category: (raw.category as EventItem['category']) || 'Công nghệ',
    price: Number(raw.price ?? 0),
    vipPrice: raw.vipPrice ? Number(raw.vipPrice) : undefined,
    organizer: String(raw.organizer ?? 'EventFlow Organizer'),
    speakers: Array.isArray(raw.speakers) ? (raw.speakers as EventItem['speakers']) : [],
    agenda: Array.isArray(raw.agenda) ? (raw.agenda as EventItem['agenda']) : [],
    rules: String(raw.rules ?? 'Vui lòng mang theo vé điện tử QR Code khi tham dự.'),
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
    ticketTier: (raw.ticketTier as RegistrationItem['ticketTier']) || 'standard',
    ticketPrice: Number(raw.ticketPrice ?? 0),
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

async function safeGetExistingUsersCount(): Promise<number> {
  if (!db) return 1;
  try {
    const existingSnap = await getDocs(query(collection(db, 'users'), limit(1)));
    return existingSnap.size;
  } catch {
    return 1;
  }
}

export function subscribeAuthUser(callback: (user: AppUser | null) => void): () => void {
  if (isFirebaseConfigured && auth && db) {
    const firebaseAuth = auth;
    const firestore = db;
    return onAuthStateChanged(firebaseAuth, async (fbUser) => {
      if (!fbUser) {
        callback(null);
        return;
      }
      const email = fbUser.email || '';
      const fallbackProfile: AppUser = {
        uid: fbUser.uid,
        fullName: fbUser.displayName || email.split('@')[0] || 'Thành viên',
        email,
        phone: '',
        role: email.toLowerCase().includes('admin') ? 'admin' : 'user',
        createdAt: new Date().toISOString(),
      };
      try {
        const userRef = doc(firestore, 'users', fbUser.uid);
        const snap = await getDoc(userRef);
        if (snap.exists()) {
          callback(snap.data() as AppUser);
        } else {
          const existingCount = await safeGetExistingUsersCount();
          const role = determineRole(email, existingCount);
          const profile: AppUser = { ...fallbackProfile, role };
          try {
            await setDoc(userRef, profile);
          } catch {
            // Ignore if rules block auto-write
          }
          callback(profile);
        }
      } catch {
        callback(fallbackProfile);
      }
    });
  }

  ensureDemoAccountsInLocal();
  const notify = () => {
    const sessionUid = localStorage.getItem(STORAGE_KEYS.SESSION_UID);
    if (!sessionUid) {
      callback(null);
      return;
    }
    const users = readLocal<LocalUserRecord[]>(STORAGE_KEYS.USERS, []);
    const found = users.find((u) => u.uid === sessionUid) || null;
    if (found) {
      const { password: _pw, ...safeUser } = found;
      callback(safeUser);
    } else {
      callback(null);
    }
  };

  notify();
  window.addEventListener(LOCAL_BUS_EVENT, notify);
  return () => window.removeEventListener(LOCAL_BUS_EVENT, notify);
}

export async function registerAccount(params: {
  fullName: string;
  email: string;
  phone: string;
  password: string;
}): Promise<AppUser> {
  const email = params.email.trim().toLowerCase();
  const fullName = params.fullName.trim();
  const phone = params.phone.trim();

  if (!fullName || !email || params.password.length < 6) {
    throw new Error('Vui lòng nhập đầy đủ họ tên, email và mật khẩu từ 6 ký tự.');
  }

  if (isFirebaseConfigured && auth && db) {
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, params.password);
      const existingCount = await safeGetExistingUsersCount();
      const role = determineRole(email, existingCount);
      const profile: AppUser = {
        uid: cred.user.uid,
        fullName,
        email,
        phone,
        role,
        createdAt: new Date().toISOString(),
      };
      try {
        await setDoc(doc(db, 'users', cred.user.uid), profile);
      } catch {
        // Ignore if rules block profile write
      }
      return profile;
    } catch (err) {
      throw new Error(mapFirebaseAuthError(err));
    }
  }

  ensureDemoAccountsInLocal();
  const users = readLocal<LocalUserRecord[]>(STORAGE_KEYS.USERS, []);
  if (users.some((u) => u.email.toLowerCase() === email)) {
    throw new Error('Email này đã tồn tại trong hệ thống.');
  }

  const nonDemoUsers = users.filter((u) => !u.uid.startsWith('demo-'));
  const role = determineRole(email, nonDemoUsers.length);
  const newUser: LocalUserRecord = {
    uid: `user-${Date.now()}`,
    fullName,
    email,
    phone,
    role,
    password: params.password,
    createdAt: new Date().toISOString(),
  };

  writeLocal(STORAGE_KEYS.USERS, [...users, newUser]);
  localStorage.setItem(STORAGE_KEYS.SESSION_UID, newUser.uid);
  emitLocalUpdate();

  const { password: _pw, ...safeUser } = newUser;
  return safeUser;
}

export async function loginAccount(emailInput: string, password: string): Promise<AppUser> {
  const email = emailInput.trim().toLowerCase();
  if (!email || !password) {
    throw new Error('Vui lòng nhập email và mật khẩu.');
  }

  if (isFirebaseConfigured && auth && db) {
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const fallbackProfile: AppUser = {
        uid: cred.user.uid,
        fullName: email.split('@')[0],
        email,
        phone: '',
        role: email.toLowerCase().includes('admin') ? 'admin' : 'user',
        createdAt: new Date().toISOString(),
      };
      try {
        const userSnap = await getDoc(doc(db, 'users', cred.user.uid));
        if (userSnap.exists()) {
          return userSnap.data() as AppUser;
        }
        const existingCount = await safeGetExistingUsersCount();
        const role = determineRole(email, existingCount);
        const profile: AppUser = { ...fallbackProfile, role };
        try {
          await setDoc(doc(db, 'users', cred.user.uid), profile);
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

  ensureDemoAccountsInLocal();
  const users = readLocal<LocalUserRecord[]>(STORAGE_KEYS.USERS, []);
  const found = users.find((u) => u.email.toLowerCase() === email);
  if (!found || (found.password && found.password !== password)) {
    throw new Error('Email hoặc mật khẩu không chính xác.');
  }
  localStorage.setItem(STORAGE_KEYS.SESSION_UID, found.uid);
  emitLocalUpdate();

  const { password: _pw, ...safeUser } = found;
  return safeUser;
}

export async function loginAsDemo(role: UserRole): Promise<AppUser> {
  const demoEmail = role === 'admin' ? 'admin@eventflow.vn' : 'user@eventflow.vn';
  const demoPassword = role === 'admin' ? 'DemoAdmin@2026' : 'DemoUser@2026';
  const demoName = role === 'admin' ? 'Nguyễn Minh Quản Trị' : 'Trần Thu Hà';
  const demoPhone = role === 'admin' ? '0900000001' : '0901234567';

  if (isFirebaseConfigured && auth && db) {
    try {
      return await loginAccount(demoEmail, demoPassword);
    } catch {
      try {
        const cred = await createUserWithEmailAndPassword(auth, demoEmail, demoPassword);
        const profile: AppUser = {
          uid: cred.user.uid,
          fullName: demoName,
          email: demoEmail,
          phone: demoPhone,
          role,
          createdAt: new Date().toISOString(),
        };
        try {
          await setDoc(doc(db, 'users', cred.user.uid), profile);
        } catch {
          // Ignore
        }
        return profile;
      } catch (createErr) {
        throw new Error(mapFirebaseAuthError(createErr));
      }
    }
  }

  ensureDemoAccountsInLocal();
  const users = readLocal<LocalUserRecord[]>(STORAGE_KEYS.USERS, []);
  const target = users.find((u) => u.email === demoEmail) || users.find((u) => u.role === role);
  if (!target) {
    throw new Error('Không tìm thấy tài khoản demo.');
  }
  localStorage.setItem(STORAGE_KEYS.SESSION_UID, target.uid);
  emitLocalUpdate();
  const { password: _pw, ...safeUser } = target;
  return safeUser;
}

export async function logoutAccount(): Promise<void> {
  if (isFirebaseConfigured && auth) {
    await signOut(auth);
    return;
  }
  localStorage.removeItem(STORAGE_KEYS.SESSION_UID);
  emitLocalUpdate();
}

export function subscribeEvents(
  callback: (events: EventItem[]) => void,
  onPermissionError?: (msg: string) => void
): () => void {
  if (isFirebaseConfigured && db) {
    const q = query(collection(db, 'events'), orderBy('createdAt', 'desc'));
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

  const notify = () => {
    const events = readLocal<EventItem[]>(STORAGE_KEYS.EVENTS, []);
    callback(events);
  };
  notify();
  window.addEventListener(LOCAL_BUS_EVENT, notify);
  return () => window.removeEventListener(LOCAL_BUS_EVENT, notify);
}

export function subscribeRegistrations(
  options: { userId: string; role: UserRole },
  callback: (registrations: RegistrationItem[]) => void,
  onPermissionError?: (msg: string) => void
): () => void {
  if (isFirebaseConfigured && db) {
    const q =
      options.role === 'admin'
        ? query(collection(db, 'registrations'), orderBy('registeredAt', 'desc'))
        : query(collection(db, 'registrations'), where('userId', '==', options.userId));

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

  const notify = () => {
    const regs = readLocal<RegistrationItem[]>(STORAGE_KEYS.REGISTRATIONS, []);
    const filtered =
      options.role === 'admin' ? regs : regs.filter((r) => r.userId === options.userId);
    callback(filtered);
  };
  notify();
  window.addEventListener(LOCAL_BUS_EVENT, notify);
  return () => window.removeEventListener(LOCAL_BUS_EVENT, notify);
}

export function subscribeUsers(
  callback: (users: AppUser[]) => void,
  onPermissionError?: (msg: string) => void
): () => void {
  if (isFirebaseConfigured && db) {
    const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
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

  ensureDemoAccountsInLocal();
  const notify = () => {
    const users = readLocal<LocalUserRecord[]>(STORAGE_KEYS.USERS, []).map(
      ({ password: _pw, ...safe }) => safe
    );
    callback(users);
  };
  notify();
  window.addEventListener(LOCAL_BUS_EVENT, notify);
  return () => window.removeEventListener(LOCAL_BUS_EVENT, notify);
}

export function subscribeFeedbacks(
  callback: (feedbacks: FeedbackItem[]) => void,
  onPermissionError?: (msg: string) => void
): () => void {
  if (isFirebaseConfigured && db) {
    const q = query(collection(db, 'feedbacks'), orderBy('createdAt', 'desc'));
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

  const notify = () => {
    const fbs = readLocal<FeedbackItem[]>(STORAGE_KEYS.FEEDBACKS, []);
    callback(fbs);
  };
  notify();
  window.addEventListener(LOCAL_BUS_EVENT, notify);
  return () => window.removeEventListener(LOCAL_BUS_EVENT, notify);
}

export async function seedSampleData(): Promise<{
  usersCount: number;
  eventsCount: number;
  registrationsCount: number;
  feedbacksCount: number;
}> {
  const { users, events, registrations, feedbacks } = buildSeedData();

  if (isFirebaseConfigured && db) {
    try {
      const batch = writeBatch(db);
      for (const u of users) {
        batch.set(doc(db, 'users', u.uid), u, { merge: true });
      }
      for (const ev of events) {
        batch.set(doc(db, 'events', ev.id), ev);
      }
      for (const reg of registrations) {
        batch.set(doc(db, 'registrations', reg.id), reg);
      }
      for (const fb of feedbacks) {
        batch.set(doc(db, 'feedbacks', fb.id), fb);
      }
      await batch.commit();
      return {
        usersCount: users.length,
        eventsCount: events.length,
        registrationsCount: registrations.length,
        feedbacksCount: feedbacks.length,
      };
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'users+events+registrations+feedbacks');
    }
  }

  const existingLocalUsers = readLocal<LocalUserRecord[]>(STORAGE_KEYS.USERS, []);
  const mergedUsers = [...existingLocalUsers];
  for (const seedUser of users) {
    if (!mergedUsers.some((u) => u.uid === seedUser.uid)) {
      mergedUsers.push(seedUser);
    }
  }
  writeLocal(STORAGE_KEYS.USERS, mergedUsers);
  writeLocal(STORAGE_KEYS.EVENTS, events);
  writeLocal(STORAGE_KEYS.REGISTRATIONS, registrations);
  writeLocal(STORAGE_KEYS.FEEDBACKS, feedbacks);
  emitLocalUpdate();
  return {
    usersCount: users.length,
    eventsCount: events.length,
    registrationsCount: registrations.length,
    feedbacksCount: feedbacks.length,
  };
}

export async function createEvent(input: EventFormInput): Promise<EventItem> {
  const newId = `evt-${Date.now()}`;
  const eventDoc: EventItem = {
    id: newId,
    title: input.title.trim(),
    description: input.description.trim(),
    bannerUrl: input.bannerUrl.trim(),
    location: input.location.trim(),
    startTime: new Date(input.startTime).toISOString(),
    endTime: new Date(input.endTime).toISOString(),
    maxSlots: Number(input.maxSlots) || 50,
    registeredCount: 0,
    status: input.status,
    category: input.category,
    price: Number(input.price) || 0,
    ...(input.vipPrice && input.vipPrice > 0 ? { vipPrice: Number(input.vipPrice) } : {}),
    organizer: input.organizer.trim() || 'Ban tổ chức EventFlow',
    speakers: input.speakers.filter((s) => s.name.trim()),
    agenda: input.agenda.filter((a) => a.time.trim() || a.title.trim()),
    rules: input.rules.trim(),
    createdAt: new Date().toISOString(),
  };

  if (isFirebaseConfigured && db) {
    try {
      await setDoc(doc(db, 'events', newId), eventDoc);
      return eventDoc;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `events/${newId}`);
    }
  }

  const events = readLocal<EventItem[]>(STORAGE_KEYS.EVENTS, []);
  writeLocal(STORAGE_KEYS.EVENTS, [eventDoc, ...events]);
  emitLocalUpdate();
  return eventDoc;
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
    category: source.category,
    price: source.price,
    vipPrice: source.vipPrice,
    organizer: source.organizer,
    speakers: source.speakers,
    agenda: source.agenda,
    rules: source.rules,
  });
}

export async function updateEvent(id: string, input: Partial<EventFormInput>): Promise<void> {
  const updates: Record<string, unknown> = {
    ...(input.title !== undefined ? { title: input.title.trim() } : {}),
    ...(input.description !== undefined ? { description: input.description.trim() } : {}),
    ...(input.bannerUrl !== undefined ? { bannerUrl: input.bannerUrl.trim() } : {}),
    ...(input.location !== undefined ? { location: input.location.trim() } : {}),
    ...(input.startTime !== undefined ? { startTime: new Date(input.startTime).toISOString() } : {}),
    ...(input.endTime !== undefined ? { endTime: new Date(input.endTime).toISOString() } : {}),
    ...(input.maxSlots !== undefined ? { maxSlots: Number(input.maxSlots) } : {}),
    ...(input.status !== undefined ? { status: input.status } : {}),
    ...(input.category !== undefined ? { category: input.category } : {}),
    ...(input.price !== undefined ? { price: Number(input.price) || 0 } : {}),
    ...(input.vipPrice !== undefined
      ? { vipPrice: input.vipPrice > 0 ? Number(input.vipPrice) : 0 }
      : {}),
    ...(input.organizer !== undefined ? { organizer: input.organizer.trim() } : {}),
    ...(input.speakers !== undefined
      ? { speakers: input.speakers.filter((s) => s.name.trim()) }
      : {}),
    ...(input.agenda !== undefined
      ? { agenda: input.agenda.filter((a) => a.time.trim() || a.title.trim()) }
      : {}),
    ...(input.rules !== undefined ? { rules: input.rules.trim() } : {}),
  };

  if (isFirebaseConfigured && db) {
    try {
      await updateDoc(doc(db, 'events', id), updates);
      return;
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `events/${id}`);
    }
  }

  const events = readLocal<EventItem[]>(STORAGE_KEYS.EVENTS, []);
  writeLocal(
    STORAGE_KEYS.EVENTS,
    events.map((ev) => (ev.id === id ? { ...ev, ...updates } : ev))
  );
  emitLocalUpdate();
}

export async function deleteEvent(id: string): Promise<void> {
  if (isFirebaseConfigured && db) {
    try {
      await deleteDoc(doc(db, 'events', id));
      return;
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `events/${id}`);
    }
  }

  const events = readLocal<EventItem[]>(STORAGE_KEYS.EVENTS, []);
  const regs = readLocal<RegistrationItem[]>(STORAGE_KEYS.REGISTRATIONS, []);
  writeLocal(
    STORAGE_KEYS.EVENTS,
    events.filter((ev) => ev.id !== id)
  );
  writeLocal(
    STORAGE_KEYS.REGISTRATIONS,
    regs.filter((r) => r.eventId !== id)
  );
  emitLocalUpdate();
}

export async function createRegistration(input: RegistrationInput): Promise<RegistrationItem> {
  const newId = `reg-${Date.now()}`;
  const ticketCode = generateTicketCode();
  const regDoc: RegistrationItem = {
    id: newId,
    eventId: input.eventId,
    eventTitle: input.eventTitle,
    userId: input.userId,
    guestName: input.guestName.trim(),
    guestEmail: input.guestEmail.trim(),
    guestPhone: input.guestPhone.trim(),
    note: input.note.trim(),
    ticketCode,
    ticketTier: input.ticketTier,
    ticketPrice: input.ticketPrice,
    status: 'confirmed',
    registeredAt: new Date().toISOString(),
    checkedInAt: null,
  };

  if (isFirebaseConfigured && db) {
    const firestore = db;
    try {
      // Kiểm tra trùng lặp đăng ký trên cùng sự kiện
      const dupSnap = await getDocs(
        query(
          collection(firestore, 'registrations'),
          where('userId', '==', input.userId)
        )
      );
      const alreadyRegistered = dupSnap.docs.some((d) => {
        const data = d.data() as RegistrationItem;
        return data.eventId === input.eventId && data.status !== 'cancelled';
      });
      if (alreadyRegistered) {
        throw new Error('Bạn đã đăng ký sự kiện này trước đó rồi. Vui lòng kiểm tra mục Sự kiện của tôi.');
      }

      // Sử dụng Firestore Transaction để kiểm tra và cập nhật chỗ trống nguyên tử
      await runTransaction(firestore, async (transaction) => {
        const eventRef = doc(firestore, 'events', input.eventId);
        const eventSnap = await transaction.get(eventRef);
        if (!eventSnap.exists()) {
          throw new Error('Sự kiện không tồn tại hoặc đã bị xóa.');
        }
        const evData = eventSnap.data() as EventItem;
        if (evData.status === 'cancelled' || evData.status === 'completed') {
          throw new Error('Sự kiện này hiện đã đóng đăng ký.');
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
          err.message.includes('đã đóng') ||
          err.message.includes('không tồn tại'))
      ) {
        throw err;
      }
      handleFirestoreError(err, OperationType.CREATE, `registrations/${newId}`);
    }
  }

  const regs = readLocal<RegistrationItem[]>(STORAGE_KEYS.REGISTRATIONS, []);
  if (regs.some((r) => r.eventId === input.eventId && r.userId === input.userId && r.status !== 'cancelled')) {
    throw new Error('Bạn đã đăng ký sự kiện này trước đó rồi.');
  }
  const events = readLocal<EventItem[]>(STORAGE_KEYS.EVENTS, []);
  const targetEvent = events.find((ev) => ev.id === input.eventId);
  if (!targetEvent || targetEvent.registeredCount >= targetEvent.maxSlots) {
    throw new Error('Sự kiện đã hết chỗ trống.');
  }

  writeLocal(STORAGE_KEYS.REGISTRATIONS, [regDoc, ...regs]);
  writeLocal(
    STORAGE_KEYS.EVENTS,
    events.map((ev) =>
      ev.id === input.eventId ? { ...ev, registeredCount: ev.registeredCount + 1 } : ev
    )
  );
  emitLocalUpdate();
  return regDoc;
}

export async function updateRegistrationStatus(
  registration: RegistrationItem,
  nextStatus: RegistrationStatus
): Promise<void> {
  const wasActive = registration.status !== 'cancelled';
  const willBeActive = nextStatus !== 'cancelled';
  const delta = wasActive === willBeActive ? 0 : willBeActive ? 1 : -1;
  const checkedInAt =
    nextStatus === 'attended'
      ? registration.checkedInAt || new Date().toISOString()
      : nextStatus === 'cancelled'
      ? null
      : registration.checkedInAt ?? null;

  if (isFirebaseConfigured && db) {
    const firestore = db;
    try {
      await runTransaction(firestore, async (transaction) => {
        const regRef = doc(firestore, 'registrations', registration.id);
        const eventRef = doc(firestore, 'events', registration.eventId);

        let nextEventCount: number | null = null;
        if (delta !== 0) {
          const eventSnap = await transaction.get(eventRef);
          if (eventSnap.exists()) {
            const evData = eventSnap.data() as EventItem;
            nextEventCount = Math.max(0, (evData.registeredCount || 0) + delta);
          }
        }

        transaction.update(regRef, {
          status: nextStatus,
          checkedInAt,
        });

        if (nextEventCount !== null) {
          transaction.update(eventRef, {
            registeredCount: nextEventCount,
          });
        }
      });
      return;
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `registrations/${registration.id}`);
    }
  }

  const regs = readLocal<RegistrationItem[]>(STORAGE_KEYS.REGISTRATIONS, []);
  const events = readLocal<EventItem[]>(STORAGE_KEYS.EVENTS, []);
  writeLocal(
    STORAGE_KEYS.REGISTRATIONS,
    regs.map((r) =>
      r.id === registration.id ? { ...r, status: nextStatus, checkedInAt } : r
    )
  );
  if (delta !== 0) {
    writeLocal(
      STORAGE_KEYS.EVENTS,
      events.map((ev) =>
        ev.id === registration.eventId
          ? { ...ev, registeredCount: Math.max(0, ev.registeredCount + delta) }
          : ev
      )
    );
  }
  emitLocalUpdate();
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
    throw new Error(`Không tìm thấy vé có mã "${code}" trong hệ thống.`);
  }
  if (found.status === 'cancelled') {
    throw new Error(`Vé ${found.ticketCode} (${found.guestName}) đã bị hủy trước đó.`);
  }
  if (found.status === 'attended') {
    throw new Error(`Vé ${found.ticketCode} (${found.guestName}) đã được check-in rồi.`);
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
  const fbId = `fb-${params.eventId}-${params.userId}`;
  const feedback: FeedbackItem = {
    id: fbId,
    eventId: params.eventId,
    eventTitle: params.eventTitle,
    userId: params.userId,
    userName: params.userName,
    rating: Math.min(5, Math.max(1, Math.round(params.rating))),
    comment: params.comment.trim(),
    createdAt: new Date().toISOString(),
  };

  if (isFirebaseConfigured && db) {
    try {
      await setDoc(doc(db, 'feedbacks', fbId), feedback);
      return feedback;
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `feedbacks/${fbId}`);
    }
  }

  const list = readLocal<FeedbackItem[]>(STORAGE_KEYS.FEEDBACKS, []);
  const filtered = list.filter((f) => f.id !== fbId);
  writeLocal(STORAGE_KEYS.FEEDBACKS, [feedback, ...filtered]);
  emitLocalUpdate();
  return feedback;
}
