import type { EventItem, RegistrationItem } from '../types';

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
    label: 'Workshop Thiết kế UI/UX',
    url: '/src/assets/images/event_design_workshop_1795132977362.jpg',
  },
  {
    id: 'startup-demo',
    label: 'Startup Demo Day',
    url: '/src/assets/images/event_startup_demo_1795132977076.jpg',
  },
  {
    id: 'music-festival',
    label: 'Đêm nhạc & Giao lưu',
    url: '/src/assets/images/event_music_festival_1795132976683.jpg',
  },
  {
    id: 'ai-hackathon',
    label: 'Hackathon Sáng tạo',
    url: '/src/assets/images/event_ai_hackathon_1795132976875.jpg',
  },
];

function isoOffsetDays(daysFromNow: number, hour: number, minute = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

export function buildSeedData(): {
  events: EventItem[];
  registrations: RegistrationItem[];
} {
  const nowIso = new Date().toISOString();

  const rawEvents: Omit<EventItem, 'registeredCount'>[] = [
    {
      id: 'evt-tech-summit-2026',
      title: 'Vietnam Tech Forward Summit 2026',
      description:
        'Hội nghị thường niên quy tụ hơn 40 diễn giả từ các tập đoàn công nghệ hàng đầu, chia sẻ về kiến trúc Cloud Native, bảo mật hệ thống phân tán và xu hướng phát triển phần mềm thực chiến.',
      bannerUrl: DEFAULT_EVENT_BANNERS[0].url,
      location: 'Trung tâm Hội nghị GEM Center, Quận 1, TP.HCM',
      startTime: isoOffsetDays(7, 8, 30),
      endTime: isoOffsetDays(7, 17, 0),
      maxSlots: 120,
      status: 'upcoming',
      createdAt: nowIso,
    },
    {
      id: 'evt-ux-system-workshop',
      title: 'Workshop: Thiết kế Design System cho Sản phẩm SaaS',
      description:
        'Buổi thực hành chuyên sâu giúp Product Designer và Frontend Engineer đồng bộ token màu sắc, typography và component library giữa Figma và React + Tailwind CSS.',
      bannerUrl: DEFAULT_EVENT_BANNERS[1].url,
      location: 'Toong Co-working Space, Hoàn Kiếm, Hà Nội',
      startTime: isoOffsetDays(3, 13, 30),
      endTime: isoOffsetDays(3, 17, 30),
      maxSlots: 35,
      status: 'upcoming',
      createdAt: nowIso,
    },
    {
      id: 'evt-startup-demo-day',
      title: 'Saigon Innovation Startup Demo Day',
      description:
        'Ngày hội trình diễn sản phẩm của 12 đội khởi nghiệp công nghệ xuất sắc trước hội đồng quỹ đầu tư trong nước và khu vực Đông Nam Á.',
      bannerUrl: DEFAULT_EVENT_BANNERS[2].url,
      location: 'Thiskyhall Sala, Thủ Đức, TP.HCM',
      startTime: isoOffsetDays(0, 9, 0),
      endTime: isoOffsetDays(0, 18, 0),
      maxSlots: 80,
      status: 'ongoing',
      createdAt: nowIso,
    },
    {
      id: 'evt-acoustic-networking',
      title: 'Đêm nhạc Acoustic & Kết nối Cộng đồng Sáng tạo',
      description:
        'Không gian giao lưu ngoài trời nhẹ nhàng dành cho cộng đồng thiết kế, lập trình viên và nhà sáng lập, kết hợp trình diễn âm nhạc mộc mạc và chia sẻ nghề nghiệp.',
      bannerUrl: DEFAULT_EVENT_BANNERS[3].url,
      location: 'Sân vườn Phố Bên Đồi, Quận 3, TP.HCM',
      startTime: isoOffsetDays(14, 18, 0),
      endTime: isoOffsetDays(14, 21, 30),
      maxSlots: 60,
      status: 'upcoming',
      createdAt: nowIso,
    },
    {
      id: 'evt-fullstack-hackathon',
      title: 'Hackathon 48h: Giải pháp Đô thị Thông minh',
      description:
        'Cuộc thi lập trình 48 giờ liên tục xây dựng ứng dụng web/mobile giải quyết bài toán giao thông, năng lượng và quản trị đô thị bền vững.',
      bannerUrl: DEFAULT_EVENT_BANNERS[4].url,
      location: 'Khu Công nghệ Cao Hòa Lạc, Hà Nội',
      startTime: isoOffsetDays(-6, 8, 0),
      endTime: isoOffsetDays(-4, 17, 0),
      maxSlots: 90,
      status: 'completed',
      createdAt: nowIso,
    },
    {
      id: 'evt-cloud-bootcamp',
      title: 'Bootcamp Kiến trúc Cloud & Serverless Thực chiến',
      description:
        'Chương trình đào tạo ngắn hạn về triển khai hệ thống không máy chủ, tối ưu chi phí vận hành và giám sát hiệu năng ứng dụng trên nền tảng đám mây.',
      bannerUrl: DEFAULT_EVENT_BANNERS[0].url,
      location: 'Khu Phần mềm Quang Trung, Quận 12, TP.HCM',
      startTime: isoOffsetDays(10, 9, 0),
      endTime: isoOffsetDays(10, 16, 30),
      maxSlots: 50,
      status: 'cancelled',
      createdAt: nowIso,
    },
  ];

  const registrations: RegistrationItem[] = [
    {
      id: 'reg-001',
      eventId: 'evt-tech-summit-2026',
      eventTitle: 'Vietnam Tech Forward Summit 2026',
      userId: 'demo-user-01',
      guestName: 'Trần Thu Hà',
      guestEmail: 'user@eventflow.vn',
      guestPhone: '0901234567',
      note: 'Quan tâm chủ đề Cloud Native & Kubernetes.',
      status: 'confirmed',
      registeredAt: isoOffsetDays(-2, 10, 15),
    },
    {
      id: 'reg-002',
      eventId: 'evt-tech-summit-2026',
      eventTitle: 'Vietnam Tech Forward Summit 2026',
      userId: 'seed-user-02',
      guestName: 'Lê Hoàng Minh',
      guestEmail: 'minh.le@techcorp.vn',
      guestPhone: '0912345678',
      note: 'Đăng ký vé tham dự cả ngày.',
      status: 'confirmed',
      registeredAt: isoOffsetDays(-2, 14, 20),
    },
    {
      id: 'reg-003',
      eventId: 'evt-tech-summit-2026',
      eventTitle: 'Vietnam Tech Forward Summit 2026',
      userId: 'seed-user-03',
      guestName: 'Phạm Gia Bảo',
      guestEmail: 'bao.pham@studio.vn',
      guestPhone: '0987654321',
      note: 'Đề nghị xuất hóa đơn điện tử công ty.',
      status: 'pending',
      registeredAt: isoOffsetDays(-1, 9, 40),
    },
    {
      id: 'reg-004',
      eventId: 'evt-tech-summit-2026',
      eventTitle: 'Vietnam Tech Forward Summit 2026',
      userId: 'seed-user-04',
      guestName: 'Võ Ngọc Linh',
      guestEmail: 'linh.vo@designhub.vn',
      guestPhone: '0938112233',
      note: 'Tham dự phiên buổi chiều.',
      status: 'cancelled',
      registeredAt: isoOffsetDays(-3, 16, 5),
    },
    {
      id: 'reg-005',
      eventId: 'evt-ux-system-workshop',
      eventTitle: 'Workshop: Thiết kế Design System cho Sản phẩm SaaS',
      userId: 'demo-user-01',
      guestName: 'Trần Thu Hà',
      guestEmail: 'user@eventflow.vn',
      guestPhone: '0901234567',
      note: 'Mang theo laptop cá nhân có Figma.',
      status: 'confirmed',
      registeredAt: isoOffsetDays(-1, 11, 30),
    },
    {
      id: 'reg-006',
      eventId: 'evt-ux-system-workshop',
      eventTitle: 'Workshop: Thiết kế Design System cho Sản phẩm SaaS',
      userId: 'seed-user-05',
      guestName: 'Đặng Khánh Vy',
      guestEmail: 'vy.dang@product.vn',
      guestPhone: '0977445566',
      note: 'Tìm hiểu Tailwind v4 design tokens.',
      status: 'confirmed',
      registeredAt: isoOffsetDays(-1, 15, 10),
    },
    {
      id: 'reg-007',
      eventId: 'evt-ux-system-workshop',
      eventTitle: 'Workshop: Thiết kế Design System cho Sản phẩm SaaS',
      userId: 'seed-user-06',
      guestName: 'Bùi Đức Anh',
      guestEmail: 'anh.bui@fintech.vn',
      guestPhone: '0944556677',
      note: '',
      status: 'pending',
      registeredAt: isoOffsetDays(0, 8, 45),
    },
    {
      id: 'reg-008',
      eventId: 'evt-startup-demo-day',
      eventTitle: 'Saigon Innovation Startup Demo Day',
      userId: 'seed-user-07',
      guestName: 'Hoàng Quốc Việt',
      guestEmail: 'viet.hoang@ventures.vn',
      guestPhone: '0909887766',
      note: 'Đại diện quỹ đầu tư hạt giống.',
      status: 'attended',
      registeredAt: isoOffsetDays(-5, 9, 0),
    },
    {
      id: 'reg-009',
      eventId: 'evt-startup-demo-day',
      eventTitle: 'Saigon Innovation Startup Demo Day',
      userId: 'seed-user-08',
      guestName: 'Nguyễn Thảo My',
      guestEmail: 'my.nguyen@startup.vn',
      guestPhone: '0918223344',
      note: 'Quan tâm các đội EdTech & SaaS.',
      status: 'attended',
      registeredAt: isoOffsetDays(-4, 13, 25),
    },
    {
      id: 'reg-010',
      eventId: 'evt-startup-demo-day',
      eventTitle: 'Saigon Innovation Startup Demo Day',
      userId: 'seed-user-09',
      guestName: 'Trịnh Công Sơn',
      guestEmail: 'son.trinh@cloudlab.vn',
      guestPhone: '0966332211',
      note: 'Đã check-in tại quầy lễ tân.',
      status: 'confirmed',
      registeredAt: isoOffsetDays(-2, 17, 50),
    },
    {
      id: 'reg-011',
      eventId: 'evt-acoustic-networking',
      eventTitle: 'Đêm nhạc Acoustic & Kết nối Cộng đồng Sáng tạo',
      userId: 'seed-user-10',
      guestName: 'Phan Thanh Trúc',
      guestEmail: 'truc.phan@creative.vn',
      guestPhone: '0933998877',
      note: 'Đăng ký khu vực ngồi gần sân khấu.',
      status: 'confirmed',
      registeredAt: isoOffsetDays(-1, 19, 10),
    },
    {
      id: 'reg-012',
      eventId: 'evt-acoustic-networking',
      eventTitle: 'Đêm nhạc Acoustic & Kết nối Cộng đồng Sáng tạo',
      userId: 'demo-user-01',
      guestName: 'Trần Thu Hà',
      guestEmail: 'user@eventflow.vn',
      guestPhone: '0901234567',
      note: 'Giao lưu cùng nhóm Frontend.',
      status: 'pending',
      registeredAt: isoOffsetDays(0, 10, 5),
    },
    {
      id: 'reg-013',
      eventId: 'evt-fullstack-hackathon',
      eventTitle: 'Hackathon 48h: Giải pháp Đô thị Thông minh',
      userId: 'seed-user-11',
      guestName: 'Đỗ Hải Đăng',
      guestEmail: 'dang.do@uni.edu.vn',
      guestPhone: '0922113344',
      note: 'Đội trưởng nhóm SmartTraffic.',
      status: 'attended',
      registeredAt: isoOffsetDays(-10, 14, 0),
    },
    {
      id: 'reg-014',
      eventId: 'evt-fullstack-hackathon',
      eventTitle: 'Hackathon 48h: Giải pháp Đô thị Thông minh',
      userId: 'seed-user-12',
      guestName: 'Ngô Minh Tâm',
      guestEmail: 'tam.ngo@devteam.vn',
      guestPhone: '0955667788',
      note: 'Phụ trách Backend & Cơ sở dữ liệu.',
      status: 'attended',
      registeredAt: isoOffsetDays(-9, 16, 40),
    },
    {
      id: 'reg-015',
      eventId: 'evt-fullstack-hackathon',
      eventTitle: 'Hackathon 48h: Giải pháp Đô thị Thông minh',
      userId: 'seed-user-13',
      guestName: 'Lý Quang Huy',
      guestEmail: 'huy.ly@iot.vn',
      guestPhone: '0911998822',
      note: 'Không sắp xếp được lịch di chuyển.',
      status: 'cancelled',
      registeredAt: isoOffsetDays(-8, 12, 10),
    },
  ];

  const events: EventItem[] = rawEvents.map((ev) => {
    const activeRegs = registrations.filter(
      (r) => r.eventId === ev.id && r.status !== 'cancelled'
    ).length;
    return {
      ...ev,
      registeredCount: activeRegs,
    };
  });

  return { events, registrations };
}
