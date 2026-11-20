import { DEFAULT_PUBLIC_CONTACT } from '../utils/formatters';
import type {
  AppUser,
  EventItem,
  FeedbackItem,
  PublicContactInfo,
  RegistrationItem,
} from '../types';

export interface BannerPreset {
  id: string;
  label: string;
  url: string;
}

export const DEFAULT_EVENT_BANNERS: BannerPreset[] = [
  {
    id: 'tech-summit',
    label: 'Hội nghị Công nghệ',
    url: '/src/assets/images/event_tech_summit_1795132976833.jpg',
  },
  {
    id: 'design-workshop',
    label: 'Workshop Chuyên đề',
    url: '/src/assets/images/event_design_workshop_1795132977362.jpg',
  },
  {
    id: 'startup-demo',
    label: 'Seminar & Hội thảo',
    url: '/src/assets/images/event_startup_demo_1795132977076.jpg',
  },
  {
    id: 'music-festival',
    label: 'Gala Doanh nghiệp',
    url: '/src/assets/images/event_music_festival_1795132976683.jpg',
  },
  {
    id: 'ai-hackathon',
    label: 'Đào tạo Nội bộ',
    url: '/src/assets/images/event_ai_hackathon_1795132976875.jpg',
  },
  {
    id: 'sports-marathon',
    label: 'Hoạt động Gắn kết',
    url: '/src/assets/images/event_sports_marathon_1795139559931.jpg',
  },
];

function isoOffsetDays(daysFromNow: number, hour: number, minute = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

export function buildSeedData(): {
  users: AppUser[];
  events: EventItem[];
  registrations: RegistrationItem[];
  feedbacks: FeedbackItem[];
  publicContact: PublicContactInfo;
} {
  const nowIso = new Date().toISOString();

  const users: AppUser[] = [
    {
      uid: 'demo-admin-01',
      fullName: 'Nguyễn Minh Quản Trị',
      email: 'admin@eventflow.vn',
      phone: '0900000001',
      role: 'admin',
      organization: 'EventFlow Enterprise',
      createdAt: isoOffsetDays(-20, 9, 0),
    },
    {
      uid: 'demo-organizer-01',
      fullName: 'Hoàng Minh Khôi',
      email: 'organizer@eventflow.vn',
      phone: '0908889999',
      role: 'organizer',
      organization: 'TechNova Solutions',
      createdAt: isoOffsetDays(-18, 10, 0),
    },
    {
      uid: 'demo-user-01',
      fullName: 'Trần Thu Hà',
      email: 'user@eventflow.vn',
      phone: '0901234567',
      role: 'user',
      organization: 'Product Studio',
      createdAt: isoOffsetDays(-16, 10, 30),
    },
    {
      uid: 'seed-user-02',
      fullName: 'Lê Hoàng Minh',
      email: 'minh.le@techcorp.vn',
      phone: '0912345678',
      role: 'user',
      organization: 'TechCorp Vietnam',
      createdAt: isoOffsetDays(-14, 14, 15),
    },
    {
      uid: 'seed-user-03',
      fullName: 'Phạm Gia Bảo',
      email: 'bao.pham@studio.vn',
      phone: '0987654321',
      role: 'organizer',
      organization: 'DesignCraft Studio',
      createdAt: isoOffsetDays(-12, 11, 20),
    },
    {
      uid: 'seed-user-04',
      fullName: 'Võ Ngọc Linh',
      email: 'linh.vo@designhub.vn',
      phone: '0938112233',
      role: 'user',
      createdAt: isoOffsetDays(-10, 16, 45),
    },
  ];

  const rawEvents: Omit<EventItem, 'registeredCount' | 'checkedInCount'>[] = [
    {
      id: 'evt-tech-summit-2026',
      title: 'Vietnam Enterprise Cloud & AI Summit 2026',
      description:
        'Hội nghị công nghệ cấp doanh nghiệp quy tụ hơn 40 kiến trúc sư hệ thống, CTO và lãnh đạo kỹ thuật chia sẻ về hạ tầng Cloud Native, bảo mật Zero-Trust và triển khai AI quy mô lớn.',
      bannerUrl: DEFAULT_EVENT_BANNERS[0].url,
      location: 'Trung tâm Hội nghị GEM Center, 8 Nguyễn Bỉnh Khiêm, Quận 1, TP.HCM',
      startTime: isoOffsetDays(7, 8, 30),
      endTime: isoOffsetDays(7, 17, 0),
      maxSlots: 150,
      status: 'ongoing',
      planningStatus: 'confirmed',
      isPublic: true,
      category: 'Hội nghị công nghệ',
      organizer: 'TechNova Solutions',
      organizerVerified: true,
      featured: true,
      clientUserId: 'demo-organizer-01',
      clientName: 'Hoàng Minh Khôi',
      clientEmail: 'organizer@eventflow.vn',
      clientPhone: '0908889999',
      requestedServices: [
        {
          id: 'srv-001',
          serviceKey: 'av_stage',
          serviceName: 'Âm thanh, Ánh sáng & Màn hình LED',
          quantityOrScope: 'Hội trường 150 khách + 2 màn hình LED phụ',
          clientNote: 'Cần 4 micro không dây cho phiên thảo luận bàn tròn.',
          adminNote: 'Đã điều phối gói âm thanh hội nghị cao cấp.',
          status: 'completed',
        },
        {
          id: 'srv-002',
          serviceKey: 'checkin_staff',
          serviceName: 'Nhân sự Lễ tân & Check-in QR',
          quantityOrScope: '4 nhân sự check-in + 2 quầy đón VIP',
          clientNote: 'Hỗ trợ quét QR và phát thẻ đại biểu từ 08:00.',
          adminNote: 'Đã phân công team lễ tân trực sảnh chính.',
          status: 'approved',
        },
        {
          id: 'srv-003',
          serviceKey: 'teabreak_catering',
          serviceName: 'Tiệc Tea-break & Catering',
          quantityOrScope: '150 suất sáng & chiều',
          clientNote: 'Ưu tiên thực đơn ít đường và cà phê máy.',
          adminNote: 'Đang chốt thực đơn với đơn vị bếp đối tác.',
          status: 'in_progress',
        },
      ],
      invitedGuests: [
        {
          id: 'gst-001',
          fullName: 'Ông Nguyễn Thành Trung',
          title: 'Phó Tổng Giám đốc Công nghệ',
          organization: 'TechViet Enterprise',
          email: 'trung.nguyen@techviet.vn',
          phone: '0901112233',
          guestType: 'VIP',
          rsvpStatus: 'confirmed',
          note: 'Bố trí hàng ghế đầu và phòng chờ VIP.',
        },
        {
          id: 'gst-002',
          fullName: 'TS. Trần Quang Hải',
          title: 'Principal Cloud Architect',
          organization: 'TechViet Enterprise',
          email: 'hai.tran@techviet.vn',
          phone: '0902223344',
          guestType: 'Diễn giả',
          rsvpStatus: 'confirmed',
          note: 'Phiên Keynote 09:15.',
        },
        {
          id: 'gst-003',
          fullName: 'Bà Lê Minh Châu',
          title: 'Đại diện Hiệp hội Chuyển đổi số',
          organization: 'DX Association',
          email: 'chau.le@dxa.vn',
          phone: '0903334455',
          guestType: 'Đại biểu',
          rsvpStatus: 'invited',
          note: 'Đã gửi thư mời điện tử.',
        },
      ],
      speakers: [
        {
          name: 'TS. Trần Quang Hải',
          role: 'Principal Cloud Architect',
          company: 'TechViet Enterprise',
        },
        {
          name: 'Chị Nguyễn Lan Phương',
          role: 'VP of Engineering',
          company: 'FinScale Group',
        },
      ],
      agenda: [
        {
          time: '08:30 - 09:15',
          title: 'Đón khách doanh nghiệp & Check-in QR Code',
          speaker: 'Ban tổ chức',
        },
        {
          time: '09:15 - 10:45',
          title: 'Keynote: Kiến trúc Microservices & Multi-Region Cloud',
          speaker: 'TS. Trần Quang Hải',
        },
        {
          time: '11:00 - 12:15',
          title: 'Bảo mật Zero-Trust cho hệ thống tài chính thời gian thực',
          speaker: 'Chị Nguyễn Lan Phương',
        },
        {
          time: '14:00 - 16:30',
          title: 'Thảo luận bàn tròn CTO & Networking Lounge',
        },
      ],
      faqs: [
        {
          question: 'Quy trình check-in tại hội trường diễn ra như thế nào?',
          answer:
            'Bạn chỉ cần mở mã QR trong mục Sự kiện đã đăng ký để nhân viên lễ tân quét trong 2 giây.',
        },
      ],
      rules:
        'Mang theo mã QR xác nhận để check-in tại quầy. Có mặt trước giờ khai mạc 20 phút.',
      createdAt: nowIso,
    },
    {
      id: 'evt-ux-system-workshop',
      title: 'Workshop Chuyên đề: Kiến trúc Design System Doanh nghiệp',
      description:
        'Chương trình thực hành chuyên sâu giúp đội ngũ Product Design và Frontend Engineer đồng bộ hóa Design Tokens, bộ component chuẩn WCAG AA và quy trình phát hành đa sản phẩm.',
      bannerUrl: DEFAULT_EVENT_BANNERS[1].url,
      location: 'Toong Co-working Space, 8 Tràng Thi, Hoàn Kiếm, Hà Nội',
      startTime: isoOffsetDays(3, 13, 30),
      endTime: isoOffsetDays(3, 17, 30),
      maxSlots: 40,
      status: 'ongoing',
      planningStatus: 'confirmed',
      isPublic: true,
      category: 'Workshop chuyên đề',
      organizer: 'DesignCraft Studio',
      organizerVerified: true,
      requestedServices: [
        {
          id: 'srv-101',
          serviceKey: 'teabreak_catering',
          serviceName: 'Tiệc Tea-break & Catering',
          quantityOrScope: '40 suất bánh ngọt & trà trái cây',
          status: 'approved',
        },
        {
          id: 'srv-102',
          serviceKey: 'checkin_staff',
          serviceName: 'Nhân sự Lễ tân & Check-in QR',
          quantityOrScope: '2 nhân sự',
          status: 'approved',
        },
      ],
      invitedGuests: [
        {
          id: 'gst-101',
          fullName: 'Anh Vũ Đức Thịnh',
          title: 'Head of Design Systems',
          organization: 'DesignCraft Studio',
          email: 'thinh.vu@designcraft.vn',
          guestType: 'Diễn giả',
          rsvpStatus: 'confirmed',
        },
        {
          id: 'gst-102',
          fullName: 'Chị Nguyễn Mai Anh',
          title: 'Product Director',
          organization: 'Saigon Innovation Hub',
          email: 'maianh@sihub.vn',
          guestType: 'Khách mời',
          rsvpStatus: 'confirmed',
        },
      ],
      speakers: [
        {
          name: 'Anh Vũ Đức Thịnh',
          role: 'Head of Design Systems',
          company: 'DesignCraft Studio',
        },
      ],
      agenda: [
        { time: '13:30 - 14:00', title: 'Check-in & Thiết lập môi trường thực hành' },
        {
          time: '14:00 - 15:30',
          title: 'Chuẩn hóa Semantic Color Tokens & Typography',
          speaker: 'Anh Vũ Đức Thịnh',
        },
        { time: '15:45 - 17:30', title: 'Xây dựng thư viện UI React + Tailwind CSS' },
      ],
      faqs: [
        {
          question: 'Người tham dự cần chuẩn bị gì trước khi đến workshop?',
          answer: 'Vui lòng mang theo laptop cá nhân và cài sẵn Figma hoặc Node.js.',
        },
      ],
      rules: 'Học viên mang theo laptop cá nhân để thực hành trực tiếp.',
      createdAt: nowIso,
    },
    {
      id: 'evt-internal-engineering-training',
      title: 'Đào tạo Nội bộ: Vận hành Hệ thống High-Availability & SRE',
      description:
        'Khóa huấn luyện nội bộ dành cho kỹ sư hệ thống, DevOps và Tech Lead về thiết kế SLO/SLI, diễn tập xử lý sự cố Production và tối ưu vận hành Cloud.',
      bannerUrl: DEFAULT_EVENT_BANNERS[4].url,
      location: 'Tòa nhà Innovation Campus, Khu Công nghệ Cao, TP. Thủ Đức',
      startTime: isoOffsetDays(5, 9, 0),
      endTime: isoOffsetDays(5, 16, 30),
      maxSlots: 60,
      status: 'ongoing',
      planningStatus: 'confirmed',
      isPublic: true,
      category: 'Đào tạo nội bộ',
      organizer: 'EventFlow Enterprise',
      organizerVerified: true,
      requestedServices: [
        {
          id: 'srv-201',
          serviceKey: 'av_stage',
          serviceName: 'Âm thanh, Ánh sáng & Màn hình LED',
          quantityOrScope: 'Phòng Lab 60 chỗ + Máy chiếu laser 4K',
          status: 'completed',
        },
      ],
      invitedGuests: [
        {
          id: 'gst-201',
          fullName: 'Anh Nguyễn Duy Kiên',
          title: 'Director of Site Reliability',
          organization: 'TechViet Enterprise',
          guestType: 'Diễn giả',
          rsvpStatus: 'confirmed',
        },
      ],
      speakers: [
        {
          name: 'Anh Nguyễn Duy Kiên',
          role: 'Director of Site Reliability',
          company: 'TechViet Enterprise',
        },
      ],
      agenda: [
        { time: '09:00 - 10:30', title: 'Nguyên lý Observability & Distributed Tracing' },
        { time: '10:45 - 12:00', title: 'Diễn tập mô phỏng sự cố (GameDay Drill)' },
        { time: '13:30 - 16:30', title: 'Tối ưu hiệu năng cơ sở dữ liệu' },
      ],
      faqs: [],
      rules: 'Check-in bằng mã QR cá nhân khi vào phòng đào tạo.',
      createdAt: nowIso,
    },
    {
      id: 'evt-enterprise-gala-2026',
      title: 'Gala Doanh nghiệp & Vinh danh Đối tác Chiến lược 2026',
      description:
        'Đêm tiệc tri ân khách hàng doanh nghiệp, đối tác chiến lược và ban điều hành trong không gian ngoài trời sang trọng kết hợp âm nhạc giao hưởng nhẹ nhàng.',
      bannerUrl: DEFAULT_EVENT_BANNERS[3].url,
      location: 'Riverside Executive Pavilion, Thảo Điền, TP. Thủ Đức, TP.HCM',
      startTime: isoOffsetDays(14, 18, 0),
      endTime: isoOffsetDays(14, 21, 30),
      maxSlots: 120,
      status: 'upcoming',
      planningStatus: 'confirmed',
      isPublic: true,
      category: 'Gala doanh nghiệp',
      organizer: 'Saigon Innovation Hub',
      organizerVerified: true,
      requestedServices: [
        {
          id: 'srv-301',
          serviceKey: 'mc_coordinator',
          serviceName: 'MC & Điều phối chương trình',
          quantityOrScope: 'MC song ngữ Anh - Việt + Đạo diễn sân khấu',
          status: 'approved',
        },
        {
          id: 'srv-302',
          serviceKey: 'media_pr',
          serviceName: 'Truyền thông, Quay phim & Chụp ảnh',
          quantityOrScope: '2 nhiếp ảnh + 1 quay recap 4K',
          status: 'approved',
        },
      ],
      invitedGuests: [
        {
          id: 'gst-301',
          fullName: 'Ông Phạm Quốc Khánh',
          title: 'Chủ tịch Hội đồng Điều hành',
          organization: 'Mekong Ventures',
          guestType: 'VIP',
          rsvpStatus: 'confirmed',
        },
        {
          id: 'gst-302',
          fullName: 'Bà Đỗ Minh Châu',
          title: 'Giám đốc Đối ngoại',
          organization: 'Saigon Innovation Hub',
          guestType: 'Đại biểu',
          rsvpStatus: 'confirmed',
        },
      ],
      speakers: [
        {
          name: 'Ông Phạm Quốc Khánh',
          role: 'Chủ tịch Hội đồng Điều hành',
          company: 'Mekong Ventures',
        },
      ],
      agenda: [
        { time: '18:00 - 18:45', title: 'Đón tiếp khách mời VIP & Thảm đỏ' },
        { time: '19:00 - 20:00', title: 'Lễ vinh danh đối tác tiêu biểu 2026' },
        { time: '20:00 - 21:30', title: 'Tiệc tối ngoài trời & Hòa tấu Acoustic' },
      ],
      faqs: [],
      rules: 'Trang phục Business Formal / Smart Elegant.',
      createdAt: nowIso,
    },
    {
      id: 'evt-client-req-planning',
      title: 'TechNova Partner Day & Ra mắt Giải pháp Tự động hóa 2026',
      description:
        'Sự kiện tri ân và giới thiệu bộ giải pháp chuyển đổi số mới của TechNova Solutions tới 100 đại lý và khách hàng doanh nghiệp khu vực phía Nam.',
      bannerUrl: DEFAULT_EVENT_BANNERS[2].url,
      location: 'Khách sạn Sheraton Saigon, 88 Đồng Khởi, Quận 1, TP.HCM',
      startTime: isoOffsetDays(18, 8, 30),
      endTime: isoOffsetDays(18, 12, 30),
      maxSlots: 100,
      status: 'upcoming',
      planningStatus: 'planning',
      isPublic: false,
      category: 'Seminar',
      organizer: 'TechNova Solutions',
      organizerVerified: true,
      clientUserId: 'demo-organizer-01',
      clientName: 'Hoàng Minh Khôi',
      clientEmail: 'organizer@eventflow.vn',
      clientPhone: '0908889999',
      requestedServices: [
        {
          id: 'srv-req-1',
          serviceKey: 'av_stage',
          serviceName: 'Âm thanh, Ánh sáng & Màn hình LED',
          clientNote: 'Cần màn hình LED 5m x 3m và đường truyền livestream ổn định.',
          adminNote: 'Đã khảo sát sảnh tầng 3 Sheraton, đang báo lịch lắp đặt.',
          status: 'in_progress',
        },
        {
          id: 'srv-req-2',
          serviceKey: 'mc_coordinator',
          serviceName: 'MC & Điều phối chương trình',
          clientNote: 'Ưu tiên MC có kinh nghiệm dẫn sự kiện B2B công nghệ.',
          adminNote: 'Đã duyệt nhân sự MC Minh Trang.',
          status: 'approved',
        },
        {
          id: 'srv-req-3',
          serviceKey: 'teabreak_catering',
          serviceName: 'Tiệc Tea-break & Catering',
          clientNote: '100 suất tea-break đầu giờ và giữa buổi.',
          status: 'pending',
        },
      ],
      invitedGuests: [
        {
          id: 'gst-req-1',
          fullName: 'Ông Trần Bảo Long',
          title: 'Tổng Giám đốc',
          organization: 'Long An Logistics',
          email: 'long.tran@lalogistics.vn',
          phone: '0919888777',
          guestType: 'VIP',
          rsvpStatus: 'invited',
        },
      ],
      speakers: [
        {
          name: 'Hoàng Minh Khôi',
          role: 'Giám đốc Điều hành',
          company: 'TechNova Solutions',
        },
      ],
      agenda: [
        { time: '08:30 - 09:00', title: 'Đón tiếp đại biểu & Tea-break' },
        { time: '09:00 - 11:30', title: 'Giới thiệu giải pháp & Ký kết đối tác' },
      ],
      faqs: [],
      rules: 'Sự kiện đang trong giai đoạn chuẩn bị trước khi mở cổng đăng ký công khai.',
      createdAt: nowIso,
    },
    {
      id: 'evt-client-req-pending',
      title: 'Hội thảo Nội bộ: Đổi mới Quy trình Vận hành Chuỗi cung ứng',
      description:
        'Chương trình đào tạo & chia sẻ kinh nghiệm thực chiến cho 60 quản lý cấp trung và chuyên viên vận hành của khối doanh nghiệp sản xuất.',
      bannerUrl: DEFAULT_EVENT_BANNERS[4].url,
      location: 'Khu vực TP. Thủ Đức (dự kiến dự trù hội trường 60–80 chỗ)',
      startTime: isoOffsetDays(26, 13, 30),
      endTime: isoOffsetDays(26, 17, 0),
      maxSlots: 70,
      status: 'upcoming',
      planningStatus: 'pending_review',
      isPublic: false,
      category: 'Đào tạo nội bộ',
      organizer: 'TechNova Solutions',
      organizerVerified: false,
      clientUserId: 'demo-organizer-01',
      clientName: 'Hoàng Minh Khôi',
      clientEmail: 'organizer@eventflow.vn',
      clientPhone: '0908889999',
      requestedServices: [
        {
          id: 'srv-req-4',
          serviceKey: 'backdrop_booth',
          serviceName: 'Thiết kế Backdrop & Khu vực Check-in',
          clientNote: 'Backdrop theo bộ nhận diện TechNova.',
          status: 'pending',
        },
        {
          id: 'srv-req-5',
          serviceKey: 'checkin_staff',
          serviceName: 'Nhân sự Lễ tân & Check-in QR',
          clientNote: 'Cần 2 bạn lễ tân hỗ trợ quét mã.',
          status: 'pending',
        },
        {
          id: 'srv-req-6',
          serviceKey: 'media_pr',
          serviceName: 'Truyền thông, Quay phim & Chụp ảnh',
          clientNote: 'Chụp ảnh tư liệu nội bộ.',
          status: 'pending',
        },
      ],
      invitedGuests: [],
      speakers: [],
      agenda: [
        { time: '13:30 - 14:00', title: 'Đón khách & Check-in' },
        { time: '14:00 - 17:00', title: 'Phiên hội thảo & Thảo luận nhóm' },
      ],
      faqs: [],
      rules: 'Đang chờ Ban quản trị duyệt yêu cầu tổ chức.',
      createdAt: nowIso,
    },
    {
      id: 'evt-fullstack-hackathon',
      title: 'Hackathon 48h: Giải pháp Đô thị Thông minh & Bền vững',
      description:
        'Cuộc thi lập trình 48 giờ liên tục giải quyết bài toán giao thông xanh, quản lý năng lượng và hạ tầng đô thị.',
      bannerUrl: DEFAULT_EVENT_BANNERS[4].url,
      location: 'Khu Công nghệ Cao Hòa Lạc, Thạch Thất, Hà Nội',
      startTime: isoOffsetDays(-6, 8, 0),
      endTime: isoOffsetDays(-4, 17, 0),
      maxSlots: 90,
      status: 'completed',
      planningStatus: 'confirmed',
      isPublic: true,
      category: 'Hội nghị công nghệ',
      organizer: 'TechViet Enterprise',
      organizerVerified: true,
      requestedServices: [
        {
          id: 'srv-401',
          serviceKey: 'av_stage',
          serviceName: 'Âm thanh, Ánh sáng & Màn hình LED',
          status: 'completed',
        },
      ],
      invitedGuests: [
        {
          id: 'gst-401',
          fullName: 'PGS.TS Hoàng Anh Tuấn',
          title: 'Trưởng ban Giám khảo',
          organization: 'Đại học Bách Khoa',
          guestType: 'VIP',
          rsvpStatus: 'checked_in',
        },
      ],
      speakers: [{ name: 'PGS.TS Hoàng Anh Tuấn', role: 'Trưởng ban Giám khảo' }],
      agenda: [
        { time: 'Ngày 1 - 08:00', title: 'Khai mạc & Công bố đề bài' },
        { time: 'Ngày 3 - 14:00', title: 'Demo sản phẩm & Trao giải Chung kết' },
      ],
      faqs: [],
      rules: 'Sự kiện đã kết thúc tốt đẹp.',
      createdAt: nowIso,
    },
  ];

  const registrations: RegistrationItem[] = [
    {
      id: 'reg-001',
      eventId: 'evt-tech-summit-2026',
      eventTitle: 'Vietnam Enterprise Cloud & AI Summit 2026',
      userId: 'demo-user-01',
      guestName: 'Trần Thu Hà',
      guestEmail: 'user@eventflow.vn',
      guestPhone: '0901234567',
      note: 'Tham dự phiên Cloud Native buổi sáng.',
      ticketCode: 'EF-8421-TECH',
      status: 'confirmed',
      registeredAt: isoOffsetDays(-3, 10, 15),
      checkedInAt: null,
    },
    {
      id: 'reg-002',
      eventId: 'evt-tech-summit-2026',
      eventTitle: 'Vietnam Enterprise Cloud & AI Summit 2026',
      userId: 'seed-user-02',
      guestName: 'Lê Hoàng Minh',
      guestEmail: 'minh.le@techcorp.vn',
      guestPhone: '0912345678',
      note: 'Tham dự phiên CTO Roundtable buổi chiều.',
      ticketCode: 'EF-3910-TECH',
      status: 'confirmed',
      registeredAt: isoOffsetDays(-2, 14, 20),
      checkedInAt: null,
    },
    {
      id: 'reg-003',
      eventId: 'evt-tech-summit-2026',
      eventTitle: 'Vietnam Enterprise Cloud & AI Summit 2026',
      userId: 'seed-user-04',
      guestName: 'Võ Ngọc Linh',
      guestEmail: 'linh.vo@designhub.vn',
      guestPhone: '0938112233',
      note: 'Đăng ký nhóm thiết kế sản phẩm.',
      ticketCode: 'EF-5521-TECH',
      status: 'pending',
      registeredAt: isoOffsetDays(-1, 9, 40),
      checkedInAt: null,
    },
    {
      id: 'reg-004',
      eventId: 'evt-ux-system-workshop',
      eventTitle: 'Workshop Chuyên đề: Kiến trúc Design System Doanh nghiệp',
      userId: 'demo-user-01',
      guestName: 'Trần Thu Hà',
      guestEmail: 'user@eventflow.vn',
      guestPhone: '0901234567',
      note: 'Mang theo laptop cá nhân có Figma.',
      ticketCode: 'EF-2048-UXDS',
      status: 'confirmed',
      registeredAt: isoOffsetDays(-2, 11, 30),
      checkedInAt: null,
    },
    {
      id: 'reg-005',
      eventId: 'evt-ux-system-workshop',
      eventTitle: 'Workshop Chuyên đề: Kiến trúc Design System Doanh nghiệp',
      userId: 'seed-user-02',
      guestName: 'Lê Hoàng Minh',
      guestEmail: 'minh.le@techcorp.vn',
      guestPhone: '0912345678',
      note: 'Tìm hiểu Tailwind CSS v4 tokens.',
      ticketCode: 'EF-7741-UXDS',
      status: 'attended',
      registeredAt: isoOffsetDays(-1, 15, 10),
      checkedInAt: isoOffsetDays(0, 13, 20),
    },
    {
      id: 'reg-006',
      eventId: 'evt-internal-engineering-training',
      eventTitle: 'Đào tạo Nội bộ: Vận hành Hệ thống High-Availability & SRE',
      userId: 'seed-user-04',
      guestName: 'Võ Ngọc Linh',
      guestEmail: 'linh.vo@designhub.vn',
      guestPhone: '0938112233',
      note: 'Tham dự dự thính nhóm Platform.',
      ticketCode: 'EF-9012-SRED',
      status: 'attended',
      registeredAt: isoOffsetDays(-5, 9, 0),
      checkedInAt: isoOffsetDays(0, 8, 55),
    },
    {
      id: 'reg-007',
      eventId: 'evt-enterprise-gala-2026',
      eventTitle: 'Gala Doanh nghiệp & Vinh danh Đối tác Chiến lược 2026',
      userId: 'seed-user-02',
      guestName: 'Lê Hoàng Minh',
      guestEmail: 'minh.le@techcorp.vn',
      guestPhone: '0912345678',
      note: 'Đại diện TechCorp Vietnam.',
      ticketCode: 'EF-7124-GALA',
      status: 'confirmed',
      registeredAt: isoOffsetDays(0, 10, 5),
      checkedInAt: null,
    },
    {
      id: 'reg-008',
      eventId: 'evt-fullstack-hackathon',
      eventTitle: 'Hackathon 48h: Giải pháp Đô thị Thông minh & Bền vững',
      userId: 'demo-user-01',
      guestName: 'Trần Thu Hà',
      guestEmail: 'user@eventflow.vn',
      guestPhone: '0901234567',
      note: 'Nhóm SmartTraffic - UI/UX.',
      ticketCode: 'EF-2201-HACK',
      status: 'attended',
      registeredAt: isoOffsetDays(-10, 14, 0),
      checkedInAt: isoOffsetDays(-6, 8, 15),
    },
  ];

  const feedbacks: FeedbackItem[] = [
    {
      id: 'fb-001',
      eventId: 'evt-fullstack-hackathon',
      eventTitle: 'Hackathon 48h: Giải pháp Đô thị Thông minh & Bền vững',
      userId: 'demo-user-01',
      userName: 'Trần Thu Hà',
      rating: 5,
      comment:
        'Công tác tổ chức cực kỳ bài bản, hệ thống check-in QR nhanh gọn và đội ngũ điều phối hỗ trợ rất tận tâm.',
      createdAt: isoOffsetDays(-3, 10, 0),
    },
    {
      id: 'fb-002',
      eventId: 'evt-internal-engineering-training',
      eventTitle: 'Đào tạo Nội bộ: Vận hành Hệ thống High-Availability & SRE',
      userId: 'seed-user-04',
      userName: 'Võ Ngọc Linh',
      rating: 5,
      comment:
        'Buổi diễn tập GameDay giúp toàn bộ team kỹ thuật tự tin hơn hẳn khi xử lý sự cố thực tế.',
      createdAt: isoOffsetDays(0, 14, 0),
    },
  ];

  const events: EventItem[] = rawEvents.map((ev) => {
    const activeRegs = registrations.filter(
      (r) => r.eventId === ev.id && r.status !== 'cancelled'
    ).length;
    const checkedInRegs = registrations.filter(
      (r) => r.eventId === ev.id && r.status === 'attended'
    ).length;
    return {
      ...ev,
      registeredCount: activeRegs,
      checkedInCount: checkedInRegs,
    };
  });

  return {
    users,
    events,
    registrations,
    feedbacks,
    publicContact: {
      ...DEFAULT_PUBLIC_CONTACT,
      updatedAt: nowIso,
    },
  };
}
