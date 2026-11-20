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
  increment,
  limit,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, isFirebaseConfigured, OperationType } from '../firebase';
import { buildSeedData } from '../data/seedData';
import type {
  AppUser,
  EventFormInput,
  EventItem,
  RegistrationInput,
  RegistrationItem,
  RegistrationStatus,
  UserRole,
} from '../types';

const STORAGE_KEYS = {
  USERS: 'eventflow_users_v1',
  EVENTS: 'eventflow_events_v1',
  REGISTRATIONS: 'eventflow_registrations_v1',
  SESSION_UID: 'eventflow_session_uid_v1',
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
  if (isFirebaseConfigured && auth && db) {
    const firebaseAuth = auth;
    const firestore = db;
    return onAuthStateChanged(firebaseAuth, async (fbUser) => {
      if (!fbUser) {
        callback(null);
        return;
      }
      try {
        const userRef = doc(firestore, 'users', fbUser.uid);
        const snap = await getDoc(userRef);
        if (snap.exists()) {
          callback(snap.data() as AppUser);
        } else {
          const existingSnap = await getDocs(query(collection(firestore, 'users'), limit(1)));
          const email = fbUser.email || '';
          const role = determineRole(email, existingSnap.size);
          const profile: AppUser = {
            uid: fbUser.uid,
            fullName: fbUser.displayName || email.split('@')[0] || 'Thành viên',
            email,
            phone: '',
            role,
            createdAt: new Date().toISOString(),
          };
          await setDoc(userRef, profile);
          callback(profile);
        }
      } catch (err) {
        console.error('Lỗi tải hồ sơ người dùng:', err);
        callback(null);
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
      const existingSnap = await getDocs(query(collection(db, 'users'), limit(1)));
      const role = determineRole(email, existingSnap.size);
      const cred = await createUserWithEmailAndPassword(auth, email, params.password);
      const profile: AppUser = {
        uid: cred.user.uid,
        fullName,
        email,
        phone,
        role,
        createdAt: new Date().toISOString(),
      };
      await setDoc(doc(db, 'users', cred.user.uid), profile);
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
      const userSnap = await getDoc(doc(db, 'users', cred.user.uid));
      if (userSnap.exists()) {
        return userSnap.data() as AppUser;
      }
      const existingSnap = await getDocs(query(collection(db, 'users'), limit(1)));
      const role = determineRole(email, existingSnap.size);
      const profile: AppUser = {
        uid: cred.user.uid,
        fullName: email.split('@')[0],
        email,
        phone: '',
        role,
        createdAt: new Date().toISOString(),
      };
      await setDoc(doc(db, 'users', cred.user.uid), profile);
      return profile;
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
        await setDoc(doc(db, 'users', cred.user.uid), profile);
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

export function subscribeEvents(callback: (events: EventItem[]) => void): () => void {
  if (isFirebaseConfigured && db) {
    const q = query(collection(db, 'events'), orderBy('createdAt', 'desc'));
    return onSnapshot(
      q,
      (snapshot) => {
        const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as EventItem);
        callback(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'events')
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
  callback: (registrations: RegistrationItem[]) => void
): () => void {
  if (isFirebaseConfigured && db) {
    const q = query(collection(db, 'registrations'), orderBy('registeredAt', 'desc'));
    return onSnapshot(
      q,
      (snapshot) => {
        const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as RegistrationItem);
        callback(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'registrations')
    );
  }

  const notify = () => {
    const regs = readLocal<RegistrationItem[]>(STORAGE_KEYS.REGISTRATIONS, []);
    callback(regs);
  };
  notify();
  window.addEventListener(LOCAL_BUS_EVENT, notify);
  return () => window.removeEventListener(LOCAL_BUS_EVENT, notify);
}

export function subscribeUsers(callback: (users: AppUser[]) => void): () => void {
  if (isFirebaseConfigured && db) {
    const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
    return onSnapshot(
      q,
      (snapshot) => {
        const list = snapshot.docs.map((d) => d.data() as AppUser);
        callback(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'users')
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

export async function seedSampleData(): Promise<{ eventsCount: number; registrationsCount: number }> {
  const { events, registrations } = buildSeedData();

  if (isFirebaseConfigured && db) {
    try {
      const batch = writeBatch(db);
      for (const ev of events) {
        batch.set(doc(db, 'events', ev.id), ev);
      }
      for (const reg of registrations) {
        batch.set(doc(db, 'registrations', reg.id), reg);
      }
      await batch.commit();
      return { eventsCount: events.length, registrationsCount: registrations.length };
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'events+registrations');
    }
  }

  writeLocal(STORAGE_KEYS.EVENTS, events);
  writeLocal(STORAGE_KEYS.REGISTRATIONS, registrations);
  emitLocalUpdate();
  return { eventsCount: events.length, registrationsCount: registrations.length };
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

export async function updateEvent(id: string, input: Partial<EventFormInput>): Promise<void> {
  const updates: Partial<EventItem> = {
    ...(input.title !== undefined ? { title: input.title.trim() } : {}),
    ...(input.description !== undefined ? { description: input.description.trim() } : {}),
    ...(input.bannerUrl !== undefined ? { bannerUrl: input.bannerUrl.trim() } : {}),
    ...(input.location !== undefined ? { location: input.location.trim() } : {}),
    ...(input.startTime !== undefined ? { startTime: new Date(input.startTime).toISOString() } : {}),
    ...(input.endTime !== undefined ? { endTime: new Date(input.endTime).toISOString() } : {}),
    ...(input.maxSlots !== undefined ? { maxSlots: Number(input.maxSlots) } : {}),
    ...(input.status !== undefined ? { status: input.status } : {}),
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
  const regDoc: RegistrationItem = {
    id: newId,
    eventId: input.eventId,
    eventTitle: input.eventTitle,
    userId: input.userId,
    guestName: input.guestName.trim(),
    guestEmail: input.guestEmail.trim(),
    guestPhone: input.guestPhone.trim(),
    note: input.note.trim(),
    status: 'confirmed',
    registeredAt: new Date().toISOString(),
  };

  if (isFirebaseConfigured && db) {
    try {
      const batch = writeBatch(db);
      batch.set(doc(db, 'registrations', newId), regDoc);
      batch.update(doc(db, 'events', input.eventId), {
        registeredCount: increment(1),
      });
      await batch.commit();
      return regDoc;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `registrations/${newId}`);
    }
  }

  const regs = readLocal<RegistrationItem[]>(STORAGE_KEYS.REGISTRATIONS, []);
  const events = readLocal<EventItem[]>(STORAGE_KEYS.EVENTS, []);
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

  if (isFirebaseConfigured && db) {
    try {
      const batch = writeBatch(db);
      batch.update(doc(db, 'registrations', registration.id), { status: nextStatus });
      if (delta !== 0) {
        batch.update(doc(db, 'events', registration.eventId), {
          registeredCount: increment(delta),
        });
      }
      await batch.commit();
      return;
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `registrations/${registration.id}`);
    }
  }

  const regs = readLocal<RegistrationItem[]>(STORAGE_KEYS.REGISTRATIONS, []);
  const events = readLocal<EventItem[]>(STORAGE_KEYS.EVENTS, []);
  writeLocal(
    STORAGE_KEYS.REGISTRATIONS,
    regs.map((r) => (r.id === registration.id ? { ...r, status: nextStatus } : r))
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
