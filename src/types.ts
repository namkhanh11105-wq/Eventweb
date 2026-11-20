export type UserRole = 'admin' | 'user';

export interface AppUser {
  uid: string;
  fullName: string;
  email: string;
  phone: string;
  role: UserRole;
  createdAt: string;
}

export type EventCategory = 'Công nghệ' | 'Workshop' | 'Âm nhạc' | 'Hội thảo' | 'Thể thao';

export type EventStatus = 'upcoming' | 'ongoing' | 'completed' | 'cancelled';

export interface AgendaItem {
  time: string;
  title: string;
  speaker?: string;
}

export interface SpeakerInfo {
  name: string;
  role: string;
}

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
  category: EventCategory;
  price: number;
  vipPrice?: number;
  organizer: string;
  speakers: SpeakerInfo[];
  agenda: AgendaItem[];
  rules: string;
  createdAt: string;
}

export type TicketTier = 'standard' | 'vip';

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
  ticketCode: string;
  ticketTier: TicketTier;
  ticketPrice: number;
  status: RegistrationStatus;
  registeredAt: string;
  checkedInAt?: string | null;
}

export interface FeedbackItem {
  id: string;
  eventId: string;
  eventTitle: string;
  userId: string;
  userName: string;
  rating: number;
  comment: string;
  createdAt: string;
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
  category: EventCategory;
  price: number;
  vipPrice?: number;
  organizer: string;
  speakers: SpeakerInfo[];
  agenda: AgendaItem[];
  rules: string;
}

export interface RegistrationInput {
  eventId: string;
  eventTitle: string;
  userId: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  note: string;
  ticketTier: TicketTier;
  ticketPrice: number;
}
