export type UserRole = 'admin' | 'organizer' | 'user';

export interface AppUser {
  uid: string;
  fullName: string;
  email: string;
  phone: string;
  role: UserRole;
  organization?: string;
  createdAt: string;
}

export type EventCategory =
  | 'Hội nghị công nghệ'
  | 'Workshop chuyên đề'
  | 'Đào tạo nội bộ'
  | 'Gala doanh nghiệp'
  | 'Seminar';

export type EventStatus = 'ongoing' | 'upcoming' | 'paused' | 'completed' | 'cancelled';

export type PlanningStatus = 'pending_review' | 'planning' | 'confirmed' | 'rejected';

export type ServiceRequestStatus =
  | 'pending'
  | 'approved'
  | 'in_progress'
  | 'completed'
  | 'rejected';

export interface EventServiceRequest {
  id: string;
  serviceKey: string;
  serviceName: string;
  quantityOrScope?: string;
  clientNote?: string;
  adminNote?: string;
  status: ServiceRequestStatus;
}

export type GuestCategory = 'VIP' | 'Đại biểu' | 'Diễn giả' | 'Khách mời';
export type GuestRsvpStatus = 'invited' | 'confirmed' | 'checked_in' | 'declined';

export interface EventGuest {
  id: string;
  fullName: string;
  title?: string;
  organization?: string;
  email?: string;
  phone?: string;
  guestType: GuestCategory;
  rsvpStatus: GuestRsvpStatus;
  note?: string;
}

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
  planningStatus: PlanningStatus;
  isPublic: boolean;
  category: EventCategory | string;
  organizer: string;
  organizerVerified?: boolean;
  featured?: boolean;
  clientUserId?: string;
  clientName?: string;
  clientEmail?: string;
  clientPhone?: string;
  requestedServices: EventServiceRequest[];
  invitedGuests: EventGuest[];
  speakers: SpeakerInfo[];
  agenda: AgendaItem[];
  faqs?: FaqItem[];
  rules: string;
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
  ticketCode: string;
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

export interface PublicContactInfo {
  organizationName: string;
  adminName: string;
  phone: string;
  hotline: string;
  email: string;
  officeAddress: string;
  workingHours: string;
  updatedAt: string;
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
  planningStatus?: PlanningStatus;
  isPublic?: boolean;
  category: EventCategory | string;
  organizer: string;
  organizerVerified?: boolean;
  featured?: boolean;
  clientUserId?: string;
  clientName?: string;
  clientEmail?: string;
  clientPhone?: string;
  requestedServices?: EventServiceRequest[];
  invitedGuests?: EventGuest[];
  speakers: SpeakerInfo[];
  agenda: AgendaItem[];
  faqs: FaqItem[];
  rules: string;
}

export interface OrganizerEventRequestInput {
  title: string;
  category: EventCategory | string;
  startTime: string;
  endTime: string;
  location: string;
  maxSlots: number;
  description: string;
  bannerUrl: string;
  organizerName: string;
  clientUserId: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  requestedServices: EventServiceRequest[];
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

export type PublicPage = 'discover' | 'services' | 'contact' | 'tickets' | 'event_detail';

export type ContactInquiryStatus = 'new' | 'reviewed' | 'resolved';

export interface ContactInquiry {
  id: string;
  fullName: string;
  contactInfo: string;
  topic: string;
  message: string;
  status: ContactInquiryStatus;
  userId?: string;
  createdAt: string;
}

export interface ContactInquiryInput {
  fullName: string;
  contactInfo: string;
  topic: string;
  message: string;
  userId?: string;
}

