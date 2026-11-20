export type UserRole = 'admin' | 'user';

export interface AppUser {
  uid: string;
  fullName: string;
  email: string;
  phone: string;
  role: UserRole;
  createdAt: string;
}

export type EventStatus = 'upcoming' | 'ongoing' | 'completed' | 'cancelled';

export interface EventItem {
  id: string;
  title: string;
  description: string;
  bannerUrl: string;
  location: string;
  startTime: string;
  endTime: string;
  maxSlots: number;
  registeredCount: number;
  status: EventStatus;
  createdAt: string;
}

export type RegistrationStatus = 'pending' | 'confirmed' | 'attended' | 'cancelled';

export interface RegistrationItem {
  id: string;
  eventId: string;
  eventTitle: string;
  userId: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  note: string;
  status: RegistrationStatus;
  registeredAt: string;
}

export interface EventFormInput {
  title: string;
  description: string;
  bannerUrl: string;
  location: string;
  startTime: string;
  endTime: string;
  maxSlots: number;
  status: EventStatus;
}

export interface RegistrationInput {
  eventId: string;
  eventTitle: string;
  userId: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  note: string;
}
