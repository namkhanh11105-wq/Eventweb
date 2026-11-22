import type {
  EventCategory,
  EventStatus,
  GuestCategory,
  GuestRsvpStatus,
  PlanningStatus,
  PublicContactInfo,
  RegistrationItem,
  RegistrationStatus,
  ServiceRequestStatus,
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
    id: 'startup-seminar',
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

export const EVENT_CATEGORIES: EventCategory[] = [
  'Hoạt động ngoại khóa / Teambuilding',
  'Hội thảo / Workshop',
  'Tiệc Gala / Ra mắt sản phẩm',
  'Đào tạo nội bộ',
  'Sự kiện văn hóa / Nghệ thuật / Ca nhạc',
  'Hoạt động tình nguyện / Cộng đồng',
  'Khác',
];

export const STANDARD_EVENT_CATEGORIES: EventCategory[] = EVENT_CATEGORIES.filter(
  (c) => c !== 'Khác'
);

const LEGACY_CATEGORY_MAP: Record<string, EventCategory> = {
  'Hội nghị công nghệ': 'Hội thảo / Workshop',
  'Workshop chuyên đề': 'Hội thảo / Workshop',
  Seminar: 'Hội thảo / Workshop',
  'Gala doanh nghiệp': 'Tiệc Gala / Ra mắt sản phẩm',
};

export function normalizeEventCategory(category: string): EventCategory | string {
  const trimmed = String(category || '').trim();
  if (!trimmed) return 'Hội thảo / Workshop';
  if (LEGACY_CATEGORY_MAP[trimmed]) return LEGACY_CATEGORY_MAP[trimmed];
  return trimmed;
}

export function matchesEventCategoryFilter(
  eventCategory: string,
  filterCategory: string
): boolean {
  if (!filterCategory || filterCategory === 'all') return true;
  const raw = String(eventCategory || '').trim();
  const normalized = normalizeEventCategory(raw);

  if (filterCategory === 'Khác') {
    if (raw === 'Khác') return true;
    return !(STANDARD_EVENT_CATEGORIES as string[]).includes(normalized);
  }

  return raw === filterCategory || normalized === filterCategory;
}

export interface EventCategoryStyleMeta {
  badgeClass: string;
  dotClass: string;
  fallbackGradient: string;
}

export function getEventCategoryMeta(category: string): EventCategoryStyleMeta {
  const normalized = normalizeEventCategory(category);
  switch (normalized) {
    case 'Hoạt động ngoại khóa / Teambuilding':
      return {
        badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
        dotClass: 'bg-emerald-500',
        fallbackGradient: 'from-emerald-600 via-teal-600 to-cyan-700',
      };
    case 'Hội thảo / Workshop':
      return {
        badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200/80',
        dotClass: 'bg-indigo-500',
        fallbackGradient: 'from-indigo-600 via-blue-600 to-slate-800',
      };
    case 'Tiệc Gala / Ra mắt sản phẩm':
      return {
        badgeClass: 'bg-rose-50 text-rose-700 border-rose-200/80',
        dotClass: 'bg-rose-500',
        fallbackGradient: 'from-rose-600 via-orange-500 to-amber-600',
      };
    case 'Đào tạo nội bộ':
      return {
        badgeClass: 'bg-sky-50 text-sky-700 border-sky-200/80',
        dotClass: 'bg-sky-500',
        fallbackGradient: 'from-sky-600 via-indigo-600 to-slate-800',
      };
    case 'Sự kiện văn hóa / Nghệ thuật / Ca nhạc':
      return {
        badgeClass: 'bg-amber-50 text-amber-800 border-amber-200/80',
        dotClass: 'bg-amber-500',
        fallbackGradient: 'from-amber-500 via-rose-500 to-indigo-700',
      };
    case 'Hoạt động tình nguyện / Cộng đồng':
      return {
        badgeClass: 'bg-teal-50 text-teal-700 border-teal-200/80',
        dotClass: 'bg-teal-500',
        fallbackGradient: 'from-teal-600 via-emerald-600 to-sky-700',
      };
    default:
      return {
        badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
        dotClass: 'bg-slate-500',
        fallbackGradient: 'from-slate-800 via-indigo-900 to-rose-900',
      };
  }
}

export type ServiceFilterType =
  | 'all'
  | 'teambuilding'
  | 'workshop'
  | 'gala'
  | 'internal'
  | 'culture'
  | 'community';

export const SERVICE_FILTER_TABS: { key: ServiceFilterType; label: string }[] = [
  { key: 'all', label: 'Tất cả loại hình' },
  { key: 'teambuilding', label: 'Ngoại khóa / Teambuilding' },
  { key: 'workshop', label: 'Hội thảo / Workshop' },
  { key: 'gala', label: 'Tiệc Gala / Ra mắt' },
  { key: 'internal', label: 'Đào tạo nội bộ' },
  { key: 'culture', label: 'Văn hóa / Ca nhạc' },
  { key: 'community', label: 'Tình nguyện / Cộng đồng' },
];

export interface SystemServiceOption {
  key: string;
  name: string;
  shortName: string;
  summary: string;
  recommendationHint: string;
  quantityPlaceholder: string;
  notePlaceholder: string;
  quantityChips: string[];
  noteChips: string[];
  eventTypes: Exclude<ServiceFilterType, 'all'>[];
}

export const SYSTEM_SERVICE_CATALOG: SystemServiceOption[] = [
  {
    key: 'av_stage',
    name: 'Âm thanh, Ánh sáng & Màn hình LED',
    shortName: 'Âm thanh & LED',
    summary: 'Hệ thống PA hội trường hoặc loa di động ngoài trời, micro không dây và kỹ thuật viên trực.',
    recommendationHint: 'Phổ biến',
    quantityPlaceholder: 'Ví dụ: Hội trường 150 khách, 1 LED P3 hoặc loa di động',
    notePlaceholder: 'Yêu cầu micro cài áo, ánh sáng sân khấu, test kỹ thuật...',
    quantityChips: ['Gói 100 khách + 2 mic', 'Âm thanh di động ngoài trời', '1 LED P3 + 4 micro'],
    noteChips: ['Có 2 micro cài áo', 'Chạy thử trước 1 ngày', 'Hỗ trợ pin/điện ngoài trời'],
    eventTypes: ['teambuilding', 'workshop', 'gala', 'internal', 'culture', 'community'],
  },
  {
    key: 'mc_coordinator',
    name: 'MC & Điều phối chương trình',
    shortName: 'MC điều phối',
    summary: 'MC song ngữ/chuyên nghiệp hoặc MC hoạt náo Teambuilding, điều phối kịch bản timeline.',
    recommendationHint: 'Khuyên dùng > 50 khách',
    quantityPlaceholder: 'Ví dụ: 1 MC hoạt náo + 2 điều phối trò chơi',
    notePlaceholder: 'Ngôn ngữ dẫn (Việt / Song ngữ), phong cách trang trọng hay hoạt náo...',
    quantityChips: ['1 MC chuyên nghiệp', '1 MC hoạt náo Teambuilding', '1 MC song ngữ Anh–Việt'],
    noteChips: ['Hoạt náo tương tác đội nhóm', 'Phong cách trang trọng', 'Kèm duyệt kịch bản trước'],
    eventTypes: ['teambuilding', 'workshop', 'gala', 'culture'],
  },
  {
    key: 'teabreak_catering',
    name: 'Tiệc Tea-break & Catering',
    shortName: 'Tiệc Tea-break',
    summary: 'Bàn tiệc trà giữa giờ, bánh ngọt, cà phê và nước uống phục vụ theo số lượng khách.',
    recommendationHint: 'Tăng trải nghiệm',
    quantityPlaceholder: 'Ví dụ: 100 suất, phục vụ 1 hoặc 2 lượt',
    notePlaceholder: 'Ghi chú khẩu vị, món chay, menu ít ngọt hoặc giờ phục vụ...',
    quantityChips: ['50 suất', '100 suất', '200 suất'],
    noteChips: ['Menu ít ngọt', 'Cà phê máy & nước ép', 'Có lựa chọn món chay'],
    eventTypes: ['workshop', 'gala', 'internal', 'community'],
  },
  {
    key: 'checkin_staff',
    name: 'Nhân sự Lễ tân, Điều phối & Check-in QR',
    shortName: 'Điều phối & Check-in',
    summary: 'Đội ngũ đón khách, điều phối hoạt động/trạm chơi, quét mã QR E-Ticket và cấp phát bộ kit.',
    recommendationHint: 'Tiêu chuẩn',
    quantityPlaceholder: 'Ví dụ: 2 Lễ tân + 2 Điều phối Check-in QR',
    notePlaceholder: 'Yêu cầu trang phục, chia đội Teambuilding, quầy VIP hoặc phát áo/quà...',
    quantityChips: ['2 Lễ tân + 2 Check-in QR', '4 nhân sự điều phối', '6 nhân sự + làn VIP'],
    noteChips: ['Có máy quét QR', 'Hỗ trợ điều phối trạm/đội', 'Đón khách VIP riêng'],
    eventTypes: ['teambuilding', 'workshop', 'gala', 'internal', 'culture', 'community'],
  },
  {
    key: 'media_pr',
    name: 'Truyền thông, Quay phim & Chụp ảnh',
    shortName: 'Quay chụp & Media',
    summary: 'Nhiếp ảnh sự kiện, quay recap highlight năng động và truyền thông trước/sau chương trình.',
    recommendationHint: 'Tạo dấu ấn',
    quantityPlaceholder: 'Ví dụ: 2 máy ảnh + 1 quay phim',
    notePlaceholder: 'Yêu cầu video recap, thời hạn trả ảnh nhanh, flycam ngoài trời...',
    quantityChips: ['Chụp ảnh + Video Recap', '2 máy ảnh + 1 quay 4K', '1 thợ ảnh toàn buổi'],
    noteChips: ['Trả ảnh chọn lọc trong 24h', 'Video recap 60–90 giây', 'Ghi hình hoạt động tập thể'],
    eventTypes: ['teambuilding', 'workshop', 'gala', 'culture', 'community'],
  },
  {
    key: 'backdrop_booth',
    name: 'Thiết kế Backdrop & Khu vực Check-in',
    shortName: 'Backdrop & Check-in',
    summary: 'Thiết kế, thi công backdrop, standee định hướng và bàn tiếp đón chuẩn thương hiệu.',
    recommendationHint: 'Ấn tượng đầu tiên',
    quantityPlaceholder: 'Ví dụ: 1 Backdrop 4x2.5m + 4 Standee',
    notePlaceholder: 'Kích thước sảnh/sân khấu, bục chụp ảnh, màu sắc nhận diện thương hiệu...',
    quantityChips: ['Backdrop 4x2.5m + 2 Standee', 'Backdrop 6x3m + Photo Booth', '2 Standee + Bàn đón khách'],
    noteChips: ['Thi công hoàn thiện từ tối hôm trước', 'Theo bộ nhận diện thương hiệu', 'Kèm thảm đỏ & bục chụp ảnh'],
    eventTypes: ['gala', 'internal', 'culture', 'community'],
  },
];

export interface ServiceComboPreset {
  id: string;
  label: string;
  subtitle: string;
  badge: string;
  suggestedCategories: EventCategory[];
  services: Record<string, { quantityOrScope: string; clientNote: string }>;
}

export const SERVICE_COMBO_PRESETS: ServiceComboPreset[] = [
  {
    id: 'teambuilding',
    label: 'Combo Ngoại khóa / Teambuilding',
    subtitle: 'Âm thanh di động • MC hoạt náo • Nhân sự điều phối & Quay chụp',
    badge: '4 hạng mục',
    suggestedCategories: ['Hoạt động ngoại khóa / Teambuilding'],
    services: {
      av_stage: {
        quantityOrScope: 'Âm thanh di động ngoài trời + 2 mic',
        clientNote: 'Loa công suất lớn khu vực sân bãi • Hỗ trợ pin/điện ngoài trời',
      },
      mc_coordinator: {
        quantityOrScope: '1 MC hoạt náo Teambuilding',
        clientNote: 'Hoạt náo tương tác đội nhóm • Kèm duyệt kịch bản trước',
      },
      checkin_staff: {
        quantityOrScope: '4 nhân sự điều phối',
        clientNote: 'Có máy quét QR • Hỗ trợ điều phối trạm/đội',
      },
      media_pr: {
        quantityOrScope: 'Chụp ảnh + Video Recap',
        clientNote: 'Ghi hình hoạt động tập thể • Trả ảnh chọn lọc trong 24h',
      },
    },
  },
  {
    id: 'workshop',
    label: 'Combo Hội thảo / Workshop',
    subtitle: 'Âm thanh LED • Tea-break • Check-in QR',
    badge: '3 hạng mục',
    suggestedCategories: ['Hội thảo / Workshop'],
    services: {
      av_stage: {
        quantityOrScope: 'Gói 100 khách + 2 mic',
        clientNote: 'Có 2 micro cài áo • Chạy thử trước 1 ngày',
      },
      teabreak_catering: {
        quantityOrScope: '100 suất',
        clientNote: 'Menu ít ngọt • Cà phê máy & nước ép',
      },
      checkin_staff: {
        quantityOrScope: '2 Lễ tân + 2 Check-in QR',
        clientNote: 'Có máy quét QR • Đón khách & cấp thẻ đeo',
      },
    },
  },
  {
    id: 'gala',
    label: 'Combo Tiệc Gala / Ra mắt',
    subtitle: 'Trọn gói sân khấu, MC, Backdrop, Media & Tiệc',
    badge: '5 hạng mục',
    suggestedCategories: ['Tiệc Gala / Ra mắt sản phẩm'],
    services: {
      av_stage: {
        quantityOrScope: '1 LED P3 + 4 micro',
        clientNote: 'Chạy thử trước 1 ngày • Ánh sáng sân khấu chuyên nghiệp',
      },
      mc_coordinator: {
        quantityOrScope: '1 MC song ngữ Anh–Việt',
        clientNote: 'Phong cách trang trọng • Kèm duyệt kịch bản trước',
      },
      backdrop_booth: {
        quantityOrScope: 'Backdrop 6x3m + Photo Booth',
        clientNote: 'Theo bộ nhận diện thương hiệu • Kèm thảm đỏ & bục chụp ảnh',
      },
      media_pr: {
        quantityOrScope: '2 máy ảnh + 1 quay 4K',
        clientNote: 'Video recap 60–90 giây • Trả ảnh chọn lọc trong 24h',
      },
      teabreak_catering: {
        quantityOrScope: '200 suất',
        clientNote: 'Cà phê máy & nước ép • Phục vụ khu vực đón khách',
      },
    },
  },
  {
    id: 'culture',
    label: 'Combo Văn hóa / Nghệ thuật / Ca nhạc',
    subtitle: 'Sân khấu ánh sáng • MC • Backdrop • Quay chụp & Check-in',
    badge: '5 hạng mục',
    suggestedCategories: ['Sự kiện văn hóa / Nghệ thuật / Ca nhạc'],
    services: {
      av_stage: {
        quantityOrScope: '1 LED P3 + 4 micro',
        clientNote: 'Hệ thống âm thanh biểu diễn & ánh sáng sân khấu đa điểm',
      },
      mc_coordinator: {
        quantityOrScope: '1 MC chuyên nghiệp',
        clientNote: 'Kèm duyệt kịch bản trước • Điều phối tiết mục biểu diễn',
      },
      backdrop_booth: {
        quantityOrScope: 'Backdrop 6x3m + Photo Booth',
        clientNote: 'Theo bộ nhận diện thương hiệu • Khu vực check-in khán giả',
      },
      media_pr: {
        quantityOrScope: '2 máy ảnh + 1 quay 4K',
        clientNote: 'Video recap 60–90 giây • Ghi hình toàn bộ tiết mục nổi bật',
      },
      checkin_staff: {
        quantityOrScope: '6 nhân sự + làn VIP',
        clientNote: 'Có máy quét QR • Phân luồng khán giả và khách mời VIP',
      },
    },
  },
  {
    id: 'community',
    label: 'Combo Tình nguyện / Cộng đồng',
    subtitle: 'Âm thanh di động • Điều phối hiện trường • Ghi hình lan tỏa',
    badge: '3 hạng mục',
    suggestedCategories: ['Hoạt động tình nguyện / Cộng đồng'],
    services: {
      av_stage: {
        quantityOrScope: 'Âm thanh di động ngoài trời + 2 mic',
        clientNote: 'Hỗ trợ pin/điện ngoài trời • Gọn nhẹ dễ di chuyển',
      },
      checkin_staff: {
        quantityOrScope: '4 nhân sự điều phối',
        clientNote: 'Có máy quét QR • Điểm danh tình nguyện viên & phát bộ kit',
      },
      media_pr: {
        quantityOrScope: 'Chụp ảnh + Video Recap',
        clientNote: 'Ghi hình hoạt động tập thể • Trả ảnh chọn lọc trong 24h',
      },
    },
  },
  {
    id: 'training',
    label: 'Combo Đào tạo nội bộ',
    subtitle: 'Âm thanh trình chiếu • Tiệc trà giữa giờ',
    badge: '2 hạng mục',
    suggestedCategories: ['Đào tạo nội bộ'],
    services: {
      av_stage: {
        quantityOrScope: 'Gói 100 khách + 2 mic',
        clientNote: 'Hỗ trợ kết nối trình chiếu slide và âm thanh rõ',
      },
      teabreak_catering: {
        quantityOrScope: '50 suất',
        clientNote: 'Menu ít ngọt • Cà phê máy & nước ép',
      },
    },
  },
];

export interface ServicePackageHighlight {
  code: string;
  tag: string;
  eventType: Exclude<ServiceFilterType, 'all'>;
  suggestedCategory: EventCategory;
  serviceKeys: string[];
  title: string;
  scale: string;
  idealFor: string;
  description: string;
  included: string[];
}

export const SERVICE_PACKAGE_HIGHLIGHTS: ServicePackageHighlight[] = [
  {
    code: '01',
    tag: 'Gói chủ lực',
    eventType: 'workshop',
    suggestedCategory: 'Hội thảo / Workshop',
    serviceKeys: ['av_stage', 'mc_coordinator', 'checkin_staff', 'teabreak_catering'],
    title: 'Hội thảo & Workshop Chuyên đề',
    scale: '80 – 500+ đại biểu',
    idealFor: 'Hội thảo công nghệ, workshop thực hành, diễn đàn ngành',
    description:
      'Tổ chức trọn gói từ điều phối diễn giả, quản lý lịch trình đa phiên đến tiếp đón hàng trăm đại biểu.',
    included: [
      'Sân khấu, màn hình LED & Âm thanh ánh sáng',
      'Quản lý đại biểu, diễn giả & khách mời VIP',
      'Check-in mã QR tốc độ cao tại sảnh đón khách',
      'Tiệc Tea-break & MC dẫn chương trình',
    ],
  },
  {
    code: '02',
    tag: 'Gắn kết đội ngũ',
    eventType: 'teambuilding',
    suggestedCategory: 'Hoạt động ngoại khóa / Teambuilding',
    serviceKeys: ['av_stage', 'mc_coordinator', 'checkin_staff', 'media_pr'],
    title: 'Hoạt động Ngoại khóa & Teambuilding',
    scale: '30 – 500+ thành viên',
    idealFor: 'Company trip, ngày hội thể thao, hoạt động gắn kết ngoài trời',
    description:
      'Triển khai âm thanh di động ngoài trời, MC hoạt náo khuấy động không khí cùng đội ngũ điều phối trạm chơi.',
    included: [
      'Hệ thống âm thanh di động công suất lớn ngoài trời',
      'MC hoạt náo chuyên nghiệp dẫn dắt trò chơi gắn kết',
      'Nhân sự điều phối chia đội & điểm danh QR nhanh',
      'Quay chụp khoảnh khắc năng động & video recap',
    ],
  },
  {
    code: '03',
    tag: 'Sự kiện trang trọng',
    eventType: 'gala',
    suggestedCategory: 'Tiệc Gala / Ra mắt sản phẩm',
    serviceKeys: ['av_stage', 'mc_coordinator', 'backdrop_booth', 'media_pr', 'teabreak_catering'],
    title: 'Tiệc Gala & Ra mắt Sản phẩm',
    scale: '100 – 1.000+ khách mời',
    idealFor: 'Year End Party, lễ ra mắt sản phẩm, tri ân đối tác',
    description:
      'Điều phối kịch bản trang trọng, phân khu khách mời VIP/Đối tác và đội ngũ lễ tân đón tiếp.',
    included: [
      'MC song ngữ & Kịch bản ra mắt/vinh danh chi tiết',
      'Quay phim, chụp ảnh highlight 4K & truyền thông',
      'Danh sách khách mời VIP & phân luồng RSVP riêng',
      'Thiết kế Backdrop & khu vực check-in thương hiệu',
    ],
  },
  {
    code: '04',
    tag: 'Phát triển năng lực',
    eventType: 'internal',
    suggestedCategory: 'Đào tạo nội bộ',
    serviceKeys: ['av_stage', 'teabreak_catering', 'checkin_staff'],
    title: 'Đào tạo Nội bộ Doanh nghiệp',
    scale: '20 – 150 học viên',
    idealFor: 'Onboarding nhân sự, đào tạo kỹ năng, bootcamp nội bộ',
    description:
      'Không gian tương tác chuyên sâu, kiểm soát sĩ số điểm danh theo buổi và phục vụ tea-break giữa giờ.',
    included: [
      'Hệ thống trình chiếu, micro & hỗ trợ kỹ thuật',
      'Tiệc Tea-break & phục vụ đồ uống giữa giờ',
      'Điểm danh QR & xuất danh sách báo cáo CSV',
      'Bàn đón tiếp & cấp phát bộ tài liệu học viên',
    ],
  },
  {
    code: '05',
    tag: 'Biểu diễn & Thưởng lãm',
    eventType: 'culture',
    suggestedCategory: 'Sự kiện văn hóa / Nghệ thuật / Ca nhạc',
    serviceKeys: ['av_stage', 'mc_coordinator', 'backdrop_booth', 'media_pr', 'checkin_staff'],
    title: 'Sự kiện Văn hóa, Nghệ thuật & Ca nhạc',
    scale: '100 – 1.500+ khán giả',
    idealFor: 'Đêm nhạc acoustic, triển lãm nghệ thuật, lễ hội văn hóa',
    description:
      'Tối ưu chất lượng âm thanh ánh sáng biểu diễn, phân luồng check-in khán giả nhanh và ghi hình 4K.',
    included: [
      'Âm thanh sân khấu biểu diễn & hệ thống ánh sáng',
      'Kiểm soát vé QR nhiều làn & phân khu khách mời',
      'Backdrop Photo Booth & khu vực trưng bày',
      'Đội ngũ quay chụp highlight và truyền thông sự kiện',
    ],
  },
  {
    code: '06',
    tag: 'Lan tỏa giá trị',
    eventType: 'community',
    suggestedCategory: 'Hoạt động tình nguyện / Cộng đồng',
    serviceKeys: ['av_stage', 'checkin_staff', 'media_pr', 'teabreak_catering'],
    title: 'Hoạt động Tình nguyện & Cộng đồng',
    scale: '30 – 400+ tình nguyện viên',
    idealFor: 'Chiến dịch thiện nguyện, trồng cây, hiến máu, ngày hội cộng đồng',
    description:
      'Giải pháp gọn nhẹ, linh hoạt tại hiện trường giúp điểm danh tình nguyện viên và ghi lại hành trình ý nghĩa.',
    included: [
      'Loa di động gọn nhẹ phục vụ điều phối hiện trường',
      'Nhân sự điểm danh QR & cấp phát áo/bộ kit',
      'Nước uống & suất ăn nhẹ tiếp sức tình nguyện viên',
      'Chụp ảnh phóng sự & dựng clip truyền thông cộng đồng',
    ],
  },
];

export const ORGANIZATION_PROCESS_STEPS = [
  {
    step: '01',
    title: 'Tiếp nhận yêu cầu & Tư vấn quy mô',
    description:
      'Khách hàng gửi thông tin sự kiện (thời gian, địa điểm, số lượng khách) và lựa chọn các hạng mục dịch vụ trực tiếp trên hệ thống.',
  },
  {
    step: '02',
    title: 'Lên kế hoạch & Điều phối hạng mục',
    description:
      'Ban quản trị rà soát yêu cầu, xác nhận từng hạng mục (Âm thanh, MC, Tea-break, Lễ tân QR, Truyền thông) và chốt timeline vận hành.',
  },
  {
    step: '03',
    title: 'Mở đăng ký & Quản lý khách mời',
    description:
      'Công bố trang sự kiện công khai để đại biểu đăng ký giữ chỗ trực tuyến, đồng thời quản lý danh sách khách mời VIP và trạng thái RSVP.',
  },
  {
    step: '04',
    title: 'Vận hành thực tế & Check-in QR',
    description:
      'Đội ngũ kỹ thuật và lễ tân trực tiếp vận hành tại địa điểm, quét mã QR E-Ticket và đồng bộ báo cáo tỷ lệ tham dự theo thời gian thực.',
  },
];

export const PUBLIC_CONTACT_FAQS = [
  {
    question: 'Tôi cần chuẩn bị gì để gửi yêu cầu tổ chức sự kiện trên EventFlow?',
    answer:
      'Bạn chỉ cần đăng ký 1 tài khoản EventFlow duy nhất, vào mục Sự kiện của tôi → tab Yêu cầu tổ chức, điền tên sự kiện, thời gian, địa điểm dự kiến, quy mô chỗ ngồi và chọn các dịch vụ đi kèm. Ban quản trị sẽ tiếp nhận trực tiếp qua Cloud Firestore và phản hồi kế hoạch triển khai.',
  },
  {
    question: 'Người dùng có cần tạo tài khoản trước khi đăng ký tham gia sự kiện không?',
    answer:
      'Khách tham khảo có thể xem toàn bộ sự kiện công khai và thông tin dịch vụ mà không cần đăng nhập. Khi muốn đăng ký giữ chỗ hoặc gửi yêu cầu tổ chức, hệ thống yêu cầu đăng nhập tài khoản để cấp mã QR E-Ticket cá nhân và lưu lịch sử trên Firestore.',
  },
  {
    question: 'Hệ thống có hỗ trợ quản lý danh sách khách mời VIP riêng không?',
    answer:
      'Có. Mỗi sự kiện trên EventFlow có không gian điều phối riêng cho Ban quản trị gồm 3 phân hệ: Dịch vụ yêu cầu, Khách mời dự kiến (VIP/Diễn giả/Đại biểu kèm RSVP) và Người tham gia đăng ký online.',
  },
  {
    question: 'Thời gian phản hồi yêu cầu tư vấn từ Ban quản trị là bao lâu?',
    answer:
      'Mọi yêu cầu tư vấn gửi qua biểu mẫu liên hệ hoặc hotline đều được ghi nhận tức thì về cổng quản trị. Đội ngũ điều phối sẽ liên hệ lại trong khung giờ làm việc (Thứ 2 – Thứ 7, 08:00 – 18:00).',
  },
];

export const ENTERPRISE_PARTNERS = [
  { name: 'TechViet Enterprise', sector: 'Hạ tầng Cloud & AI' },
  { name: 'Saigon Innovation Hub', sector: 'Đổi mới sáng tạo' },
  { name: 'FinScale Group', sector: 'Tài chính số' },
  { name: 'DesignCraft Studio', sector: 'Trải nghiệm sản phẩm' },
  { name: 'Mekong Ventures', sector: 'Quỹ đầu tư mạo hiểm' },
];

export const DEFAULT_PUBLIC_CONTACT: PublicContactInfo = {
  organizationName: 'EventFlow Enterprise Platform',
  adminName: 'Nguyễn Minh Quản Trị',
  phone: '0900 000 001',
  hotline: '(028) 3820 8866',
  email: 'admin@eventflow.vn',
  officeAddress: 'Tầng 12, Saigon Innovation Tower, Quận 1, TP.HCM',
  workingHours: 'Thứ 2 – Thứ 7 · 08:00 – 18:00',
  updatedAt: new Date().toISOString(),
};

export function formatDateTimeVN(isoString: string): string {
  try {
    const date = new Date(isoString);
    if (Number.isNaN(date.getTime())) return 'Chưa xác định';
    return new Intl.DateTimeFormat('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  } catch {
    return 'Chưa xác định';
  }
}

export function formatShortDateVN(isoString: string): string {
  try {
    const date = new Date(isoString);
    if (Number.isNaN(date.getTime())) return 'Chưa xác định';
    return new Intl.DateTimeFormat('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(date);
  } catch {
    return 'Chưa xác định';
  }
}

export function toDatetimeLocalValue(isoString: string): string {
  try {
    const d = new Date(isoString);
    if (Number.isNaN(d.getTime())) return '';
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
      d.getHours()
    )}:${pad(d.getMinutes())}`;
  } catch {
    return '';
  }
}

export function generateTicketCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const seg = (len: number) =>
    Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `EF-${seg(4)}-${seg(4)}`;
}

export const EVENT_STATUS_META: Record<
  EventStatus,
  { label: string; textClass: string; bgClass: string }
> = {
  ongoing: {
    label: 'Đang mở đăng ký',
    textClass: 'text-emerald-700',
    bgClass: 'bg-emerald-50 border-emerald-200',
  },
  upcoming: {
    label: 'Sắp diễn ra',
    textClass: 'text-indigo-700',
    bgClass: 'bg-indigo-50 border-indigo-200',
  },
  paused: {
    label: 'Tạm đóng',
    textClass: 'text-amber-700',
    bgClass: 'bg-amber-50 border-amber-200',
  },
  completed: {
    label: 'Đã kết thúc',
    textClass: 'text-slate-600',
    bgClass: 'bg-slate-100 border-slate-200',
  },
  cancelled: {
    label: 'Đã hủy',
    textClass: 'text-rose-700',
    bgClass: 'bg-rose-50 border-rose-200',
  },
};

export const PLANNING_STATUS_META: Record<
  PlanningStatus,
  { label: string; textClass: string; bgClass: string }
> = {
  pending_review: {
    label: 'Chờ duyệt',
    textClass: 'text-amber-700',
    bgClass: 'bg-amber-50 border-amber-200',
  },
  planning: {
    label: 'Đang lên kế hoạch',
    textClass: 'text-indigo-700',
    bgClass: 'bg-indigo-50 border-indigo-200',
  },
  confirmed: {
    label: 'Đã xác nhận',
    textClass: 'text-emerald-700',
    bgClass: 'bg-emerald-50 border-emerald-200',
  },
  rejected: {
    label: 'Từ chối',
    textClass: 'text-rose-700',
    bgClass: 'bg-rose-50 border-rose-200',
  },
};

export const SERVICE_STATUS_META: Record<
  ServiceRequestStatus,
  { label: string; textClass: string; bgClass: string }
> = {
  pending: {
    label: 'Chờ duyệt',
    textClass: 'text-amber-700',
    bgClass: 'bg-amber-50 border-amber-200',
  },
  approved: {
    label: 'Đã duyệt',
    textClass: 'text-indigo-700',
    bgClass: 'bg-indigo-50 border-indigo-200',
  },
  in_progress: {
    label: 'Đang chuẩn bị',
    textClass: 'text-sky-700',
    bgClass: 'bg-sky-50 border-sky-200',
  },
  completed: {
    label: 'Sẵn sàng / Hoàn tất',
    textClass: 'text-emerald-700',
    bgClass: 'bg-emerald-50 border-emerald-200',
  },
  rejected: {
    label: 'Không áp dụng',
    textClass: 'text-rose-700',
    bgClass: 'bg-rose-50 border-rose-200',
  },
};

export const GUEST_TYPE_OPTIONS: GuestCategory[] = [
  'VIP',
  'Đại biểu',
  'Diễn giả',
  'Khách mời',
];

export const GUEST_RSVP_META: Record<
  GuestRsvpStatus,
  { label: string; textClass: string }
> = {
  invited: { label: 'Đã gửi mời', textClass: 'text-slate-600' },
  confirmed: { label: 'Xác nhận tham dự', textClass: 'text-indigo-700' },
  checked_in: { label: 'Đã có mặt', textClass: 'text-emerald-700' },
  declined: { label: 'Từ chối', textClass: 'text-rose-700' },
};

export const REGISTRATION_STATUS_META: Record<
  RegistrationStatus,
  { label: string; textClass: string; bgClass: string }
> = {
  pending: {
    label: 'Chờ duyệt',
    textClass: 'text-amber-700',
    bgClass: 'bg-amber-50 border-amber-200',
  },
  confirmed: {
    label: 'Đã xác nhận',
    textClass: 'text-indigo-700',
    bgClass: 'bg-indigo-50 border-indigo-200',
  },
  attended: {
    label: 'Đã tham dự',
    textClass: 'text-emerald-700',
    bgClass: 'bg-emerald-50 border-emerald-200',
  },
  cancelled: {
    label: 'Đã hủy',
    textClass: 'text-rose-700',
    bgClass: 'bg-rose-50 border-rose-200',
  },
};

export function exportRegistrationsToCSV(
  registrations: RegistrationItem[],
  filename = 'danh-sach-nguoi-tham-gia.csv'
): void {
  const headers = [
    'Mã vé',
    'Sự kiện',
    'Họ và tên',
    'Email',
    'Số điện thoại',
    'Trạng thái',
    'Thời gian đăng ký',
    'Thời gian Check-in',
    'Ghi chú',
  ];

  const escapeCsv = (val: string | number | null | undefined): string => {
    const str = String(val ?? '');
    if (/[",\n\r]/.test(str)) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const rows = registrations.map((r) => [
    r.ticketCode || r.id,
    r.eventTitle,
    r.guestName,
    r.guestEmail,
    r.guestPhone,
    REGISTRATION_STATUS_META[r.status]?.label || r.status,
    formatDateTimeVN(r.registeredAt),
    r.checkedInAt ? formatDateTimeVN(r.checkedInAt) : '',
    r.note || '',
  ]);

  const csvContent =
    '\uFEFF' +
    [headers, ...rows].map((row) => row.map((cell) => escapeCsv(cell)).join(',')).join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
