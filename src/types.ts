export type UserRole = 'admin' | 'user';

export interface AppUser {
  uid: string;
  fullName: string;
  email: string;
  phone: string;
  role: UserRole;
  createdAt: string;
}

export type EventCategory =
  | 'Hội nghị công nghệ'
  | 'Workshop chuyên đề'
  | 'Đào tạo nội bộ'
  | 'Gala doanh nghiệp'
  | 'Seminar';

export type EventStatus = 'ongoing' | 'upcoming' | 'paused' | 'completed' | 'cancelled';

export interface AgendaItem {
  time: string;
  title: string;
  speaker?: string;
}

export interface SpeakerInfo {
  name: string;
  role: string;
  company?: string;
}

export interface FaqItem {
  question: string;
  answer: string;
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
  checkedInCount?: number;
  status: EventStatus;
  category: EventCategory | string;
  price: number;
  vipPrice?: number;
  organizer: string;
  organizerVerified?: boolean;
  featured?: boolean;
  speakers: SpeakerInfo[];
  agenda: AgendaItem[];
  faqs?: FaqItem[];
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
  category: EventCategory | string;
  price: number;
  vipPrice?: number;
  organizer: string;
  organizerVerified?: boolean;
  featured?: boolean;
  speakers: SpeakerInfo[];
  agenda: AgendaItem[];
  faqs: FaqItem[];
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
