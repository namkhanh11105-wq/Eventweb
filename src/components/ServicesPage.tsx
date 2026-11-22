import { useMemo, useState } from 'react';
import {
  ArrowRight,
  Building2,
  Camera,
  CheckCircle2,
  Coffee,
  Frame,
  Layers,
  Mic,
  Phone,
  QrCode,
  ShieldCheck,
  Sparkles,
  Users,
  Volume2,
} from 'lucide-react';
import {
  DirectionalTabPanel,
  handle3DTiltLeave,
  handle3DTiltMove,
  RevealBlock,
  useSlidingIndicator,
  useTabDirection,
} from './MotionPrimitives';
import {
  ENTERPRISE_PARTNERS,
  ORGANIZATION_PROCESS_STEPS,
  SERVICE_FILTER_TABS,
  SERVICE_PACKAGE_HIGHLIGHTS,
  SYSTEM_SERVICE_CATALOG,
  type ServiceFilterType,
} from '../utils/formatters';
import type { PreselectedServiceBooking, PublicContactInfo } from '../types';

interface ServicesPageProps {
  publicContact: PublicContactInfo;
  onBookOrganization: (preset?: PreselectedServiceBooking) => void;
  onGoContact: () => void;
}

const SERVICE_ICON_MAP: Record<
  string,
  { icon: typeof Volume2; bgClass: string; colorClass: string }
> = {
  av_stage: {
    icon: Volume2,
    bgClass: 'bg-indigo-50 border-indigo-200/80',
    colorClass: 'text-indigo-600',
  },
  mc_coordinator: {
    icon: Mic,
    bgClass: 'bg-rose-50 border-rose-200/80',
    colorClass: 'text-rose-600',
  },
  teabreak_catering: {
    icon: Coffee,
    bgClass: 'bg-amber-50 border-amber-200/80',
    colorClass: 'text-amber-600',
  },
  checkin_staff: {
    icon: QrCode,
    bgClass: 'bg-emerald-50 border-emerald-200/80',
    colorClass: 'text-emerald-600',
  },
  media_pr: {
    icon: Camera,
    bgClass: 'bg-sky-50 border-sky-200/80',
    colorClass: 'text-sky-600',
  },
  backdrop_booth: {
    icon: Frame,
    bgClass: 'bg-orange-50 border-orange-200/80',
    colorClass: 'text-orange-600',
  },
};

const SERVICE_TAB_ORDER = SERVICE_FILTER_TABS.map((t) => t.key);

export function ServicesPage({
  publicContact,
  onBookOrganization,
  onGoContact,
}: ServicesPageProps) {
  const [eventTypeFilter, setEventTypeFilter] = useState<ServiceFilterType>('all');
  const filterDirection = useTabDirection(eventTypeFilter, SERVICE_TAB_ORDER);
  const {
    containerRef: filterTabRef,
    setItemRef: setFilterTabRef,
    rect: filterTabPill,
  } = useSlidingIndicator(eventTypeFilter);

  const filteredPackages = useMemo(() => {
    if (eventTypeFilter === 'all') return SERVICE_PACKAGE_HIGHLIGHTS;
    return SERVICE_PACKAGE_HIGHLIGHTS.filter((pkg) => pkg.eventType === eventTypeFilter);
  }, [eventTypeFilter]);

  const filteredServices = useMemo(() => {
    if (eventTypeFilter === 'all') return SYSTEM_SERVICE_CATALOG;
    return SYSTEM_SERVICE_CATALOG.filter((srv) => srv.eventTypes.includes(eventTypeFilter));
  }, [eventTypeFilter]);

  return (
    <div className="space-y-12">
      {/* Page Hero: Capability Overview */}
      <section className="relative overflow-hidden bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-10">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-20 right-0 h-64 w-96 rounded-full bg-gradient-to-l from-orange-100/60 via-rose-100/40 to-transparent blur-3xl"
        />
        <div className="relative grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-7 space-y-4">
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-orange-700 bg-orange-50/80 border border-orange-200/70 px-3 py-1 rounded-full">
              <Building2 className="w-3.5 h-3.5 text-rose-500" />
              <span>Giải pháp Tổ chức Sự kiện Doanh nghiệp</span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-[2.35rem] font-bold text-slate-900 tracking-tight text-balance leading-[1.18]">
              Từ ý tưởng kịch bản đến vận hành check-in{' '}
              <span className="bg-gradient-to-r from-rose-500 via-orange-500 to-amber-500 bg-clip-text text-transparent">
                trên một quy trình chuẩn hóa
              </span>
            </h1>

            <p className="text-sm sm:text-[15px] text-slate-600 leading-relaxed max-w-2xl">
              EventFlow cung cấp trọn gói hạ tầng điều phối sự kiện, đội ngũ kỹ thuật, lễ tân QR và
              hệ thống quản lý khách mời đồng bộ theo thời gian thực dành cho doanh nghiệp và tổ
              chức.
            </p>

            <div className="pt-2 flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3">
              <button
                type="button"
                onClick={() => onBookOrganization()}
                className="ef-btn-tactile w-full sm:w-auto inline-flex items-center justify-center gap-2 h-11 px-6 text-sm font-semibold text-white bg-slate-950 hover:bg-slate-800 rounded-full shadow-sm hover:-translate-y-0.5 cursor-pointer whitespace-nowrap"
              >
                <span>Đặt dịch vụ / Đăng ký tổ chức</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={onGoContact}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 h-11 px-5 text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200/90 rounded-full transition-colors cursor-pointer whitespace-nowrap"
              >
                <Phone className="w-4 h-4 text-rose-500" />
                <span>Nhận tư vấn trực tiếp</span>
              </button>
            </div>
          </div>

          <div className="lg:col-span-5 grid grid-cols-2 gap-3">
            <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/80 transition-transform duration-200 hover:-translate-y-0.5">
              <div className="text-xs text-slate-500">Quy mô đáp ứng</div>
              <div className="mt-1 text-xl font-bold text-slate-900 tabular-nums">20 – 1.000+</div>
              <div className="mt-1 text-[11px] text-slate-500">Khách mời / sự kiện</div>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/80 transition-transform duration-200 hover:-translate-y-0.5">
              <div className="text-xs text-slate-500">Tốc độ Check-in QR</div>
              <div className="mt-1 text-xl font-bold text-rose-600 tabular-nums">&lt; 2 giây</div>
              <div className="mt-1 text-[11px] text-slate-500">Đồng bộ Firestore tức thì</div>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/80 transition-transform duration-200 hover:-translate-y-0.5">
              <div className="text-xs text-slate-500">Hạng mục tích hợp</div>
              <div className="mt-1 text-xl font-bold text-slate-900 tabular-nums">6 nhóm</div>
              <div className="mt-1 text-[11px] text-slate-500">Thiết bị, nhân sự, truyền thông</div>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/80 transition-transform duration-200 hover:-translate-y-0.5">
              <div className="text-xs text-slate-500">Điều phối độc lập</div>
              <div className="mt-1 text-xl font-bold text-slate-900 tabular-nums">3 phân hệ</div>
              <div className="mt-1 text-[11px] text-slate-500">Dịch vụ · VIP · Đăng ký</div>
            </div>
          </div>
        </div>
      </section>

      {/* Filter Bar by Event Type + Bento Service Packages */}
      <section className="space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Gói dịch vụ tổ chức theo quy mô &amp; loại hình sự kiện
            </h2>
            <p className="mt-1 text-sm text-slate-600 max-w-2xl">
              Lọc theo loại sự kiện để chọn nhanh gói giải pháp hoặc bấm đặt trực tiếp từng hạng mục
              dịch vụ đi kèm.
            </p>
          </div>

          <div className="overflow-x-auto max-w-full">
            <div
              ref={filterTabRef}
              role="tablist"
              aria-label="Lọc dịch vụ theo loại hình sự kiện"
              className="relative inline-flex items-center gap-1 p-1 bg-slate-100/90 border border-slate-200/80 rounded-full"
            >
              <span
                aria-hidden="true"
                className="ef-sliding-pill pointer-events-none absolute top-0 left-0 rounded-full bg-slate-950 shadow-xs transition-[transform,width,opacity] duration-[280ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
                style={{
                  width: `${filterTabPill.width}px`,
                  height: `${filterTabPill.height}px`,
                  transform: `translate3d(${filterTabPill.x}px, ${filterTabPill.y}px, 0)`,
                  opacity: filterTabPill.ready ? 1 : 0,
                }}
              />
              {SERVICE_FILTER_TABS.map((tab) => {
                const active = eventTypeFilter === tab.key;
                return (
                  <button
                    key={tab.key}
                    ref={setFilterTabRef(tab.key)}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setEventTypeFilter(tab.key)}
                    className={`relative z-10 min-h-[36px] px-3.5 py-1.5 text-xs font-semibold rounded-full transition-colors duration-200 whitespace-nowrap shrink-0 cursor-pointer ${
                      active ? 'text-white' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <DirectionalTabPanel
          activeKey={eventTypeFilter}
          direction={filterDirection}
          className="space-y-12"
        >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {filteredPackages.map((pkg, idx) => {
            const isWide = filteredPackages.length > 1 && idx === 0;
            const colClass =
              filteredPackages.length === 1
                ? 'lg:col-span-7'
                : idx === 0
                ? 'lg:col-span-7'
                : idx === 1
                ? 'lg:col-span-5'
                : 'lg:col-span-6';
            const pkgIconCfg = SERVICE_ICON_MAP[pkg.serviceKeys[0]] || SERVICE_ICON_MAP.av_stage;
            const PkgIcon = pkgIconCfg.icon;
            return (
              <RevealBlock key={pkg.code} className={colClass} delayMs={idx * 60}>
                <div
                  onMouseMove={(e) => handle3DTiltMove(e, 4, true)}
                  onMouseLeave={handle3DTiltLeave}
                  className="ef-spotlight-card ef-service-3d bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-7 h-full flex flex-col justify-between hover:border-orange-200"
                >
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2.5">
                        <span
                          className={`ef-3d-icon-pop w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${pkgIconCfg.bgClass} ${pkgIconCfg.colorClass}`}
                        >
                          <PkgIcon className="w-4 h-4" />
                        </span>
                        <span className="font-mono font-semibold text-rose-600">
                          {pkg.code}. {pkg.tag}
                        </span>
                      </div>
                      <span className="inline-flex items-center gap-1 font-semibold text-slate-700 tabular-nums">
                        <Users className="w-3.5 h-3.5 text-slate-400" />
                        {pkg.scale}
                      </span>
                    </div>

                    <h3 className="mt-3.5 text-xl font-bold text-slate-900">{pkg.title}</h3>
                    <p className="mt-1 text-xs font-medium text-slate-500">
                      Phù hợp: {pkg.idealFor}
                    </p>
                    <p className="mt-2.5 text-sm text-slate-600 leading-relaxed">
                      {pkg.description}
                    </p>

                    <ul
                      className={`mt-5 pt-4 border-t border-slate-100 grid grid-cols-1 ${
                        isWide ? 'sm:grid-cols-2' : ''
                      } gap-2.5 text-xs text-slate-700`}
                    >
                      {pkg.included.map((item) => (
                        <li key={item} className="flex items-start gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <span className="text-xs text-slate-500 tabular-nums">
                      Tự động chọn sẵn {pkg.serviceKeys.length} hạng mục tiêu chuẩn
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        onBookOrganization({
                          serviceKeys: pkg.serviceKeys,
                          suggestedCategory: pkg.suggestedCategory,
                          packageTitle: pkg.title,
                        })
                      }
                      className="ef-btn-tactile w-full sm:w-auto min-h-[42px] inline-flex items-center justify-center gap-1.5 px-4 text-xs font-semibold text-white bg-slate-950 hover:bg-slate-800 rounded-full cursor-pointer whitespace-nowrap"
                    >
                      <span>Đặt tổ chức với dịch vụ này</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </RevealBlock>
            );
          })}

          {/* Custom Enterprise Contrast Tile */}
          <RevealBlock
            className={
              filteredPackages.length === 1
                ? 'lg:col-span-5'
                : filteredPackages.length % 2 === 0
                ? 'lg:col-span-12'
                : 'lg:col-span-6'
            }
            delayMs={filteredPackages.length * 60}
          >
            <div
              onMouseMove={(e) => handle3DTiltMove(e, 4, true)}
              onMouseLeave={handle3DTiltLeave}
              className="ef-spotlight-card-dark ef-service-3d relative bg-slate-950 text-white rounded-3xl p-6 sm:p-8 h-full flex flex-col justify-between"
            >
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 rounded-[inherit] overflow-hidden"
              >
                <div className="absolute -right-12 -top-12 h-52 w-52 rounded-full bg-gradient-to-br from-rose-500/25 via-orange-500/20 to-transparent blur-2xl" />
              </div>
              <div className="relative space-y-3">
                <div className="flex items-center gap-2.5">
                  <span className="ef-3d-icon-pop w-9 h-9 rounded-xl bg-white/10 border border-white/15 text-orange-300 flex items-center justify-center shrink-0">
                    <Sparkles className="w-4 h-4" />
                  </span>
                  <span className="text-xs font-semibold text-orange-300">
                    0{filteredPackages.length + 1}. Tùy chỉnh theo yêu cầu doanh nghiệp
                  </span>
                </div>
                <h3 className="text-xl sm:text-2xl font-bold tracking-tight">
                  Thiết kế tổ hợp dịch vụ riêng cho sự kiện của bạn
                </h3>
                <p className="text-sm text-slate-300 leading-relaxed max-w-xl">
                  Chọn tự do từng hạng mục âm thanh, ánh sáng LED, MC song ngữ, tiệc tea-break,
                  đội ngũ check-in QR hoặc truyền thông ngay trong biểu mẫu gửi yêu cầu tổ chức.
                </p>
              </div>

              <div className="relative mt-6 pt-5 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="text-xs text-slate-300">
                  Phản hồi kế hoạch trực tiếp qua cổng Tổ chức
                </div>
                <button
                  type="button"
                  onClick={() => onBookOrganization()}
                  className="ef-btn-tactile w-full sm:w-auto inline-flex items-center justify-center gap-2 h-11 px-6 text-xs sm:text-sm font-semibold text-slate-950 bg-white hover:bg-slate-100 rounded-full hover:scale-[1.02] cursor-pointer whitespace-nowrap"
                >
                  <span>Tự chọn dịch vụ &amp; Đặt tổ chức</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </RevealBlock>
        </div>

      {/* Modular System Services Catalog with direct per-service booking */}
        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="inline-flex items-center gap-2 text-xs font-semibold text-rose-600">
                <Layers className="w-4 h-4" />
                <span>Danh mục hạng mục dịch vụ đi kèm ({filteredServices.length})</span>
              </div>
              <h2 className="mt-1 text-lg font-bold text-slate-900">
                Chọn trực tiếp từng hạng mục để mở sẵn trong biểu mẫu tổ chức
              </h2>
            </div>
            <button
              type="button"
              onClick={() =>
                onBookOrganization({
                  serviceKeys: filteredServices.map((s) => s.key),
                  packageTitle:
                    eventTypeFilter === 'all'
                      ? 'Toàn bộ hạng mục EventFlow'
                      : SERVICE_FILTER_TABS.find((t) => t.key === eventTypeFilter)?.label,
                })
              }
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-900 hover:text-rose-600 cursor-pointer whitespace-nowrap transition-colors"
            >
              <span>Chọn toàn bộ {filteredServices.length} hạng mục đang hiển thị</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredServices.map((srv, idx) => {
              const iconCfg = SERVICE_ICON_MAP[srv.key] || {
                icon: Layers,
                bgClass: 'bg-slate-100 border-slate-200',
                colorClass: 'text-slate-700',
              };
              const SrvIcon = iconCfg.icon;
              return (
                <div
                  key={srv.key}
                  style={{ animationDelay: `${Math.min(idx, 11) * 60}ms` }}
                  className="animate-ef-fade-up h-full"
                >
                  <div
                    onMouseMove={(e) => handle3DTiltMove(e, 4, true)}
                    onMouseLeave={handle3DTiltLeave}
                    className="ef-spotlight-card ef-service-3d h-full p-5 rounded-2xl bg-slate-50/70 border border-slate-200/80 flex flex-col justify-between gap-4 hover:bg-white hover:border-orange-200"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <div
                          className={`ef-3d-icon-pop w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${iconCfg.bgClass} ${iconCfg.colorClass}`}
                        >
                          <SrvIcon className="w-5 h-5" />
                        </div>
                        <div className="text-right">
                          <span className="font-mono text-[11px] font-semibold text-slate-400 block">
                            0{idx + 1}
                          </span>
                          <span className="text-[11px] font-medium text-indigo-700">
                            {srv.recommendationHint}
                          </span>
                        </div>
                      </div>
                      <h3 className="mt-3.5 text-sm font-bold text-slate-900">{srv.name}</h3>
                      <p className="mt-1.5 text-xs text-slate-600 leading-relaxed">{srv.summary}</p>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        onBookOrganization({
                          serviceKeys: [srv.key],
                          packageTitle: srv.name,
                        })
                      }
                      className="ef-btn-tactile w-full min-h-[38px] inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-900 bg-white hover:bg-slate-950 hover:text-white border border-slate-200 hover:border-slate-950 rounded-full cursor-pointer"
                    >
                      <span>Đặt tổ chức với dịch vụ này</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        </DirectionalTabPanel>
      </section>

      {/* 4-Step Visual Coordination Process */}
      <RevealBlock>
        <section className="space-y-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Quy trình phối hợp 4 bước từ tiếp nhận đến vận hành thực tế
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Mọi tiến độ duyệt yêu cầu, chuẩn bị dịch vụ và kiểm soát khách mời đều được cập nhật
              minh bạch giữa Khách hàng và Ban quản trị theo thời gian thực trên Firestore.
            </p>
          </div>

          <div className="relative grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {ORGANIZATION_PROCESS_STEPS.map((item, idx) => (
              <RevealBlock key={item.step} delayMs={idx * 60}>
                <div className="relative bg-white border border-slate-200/80 rounded-2xl p-5 h-full flex flex-col justify-between transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300">
                  <div>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-slate-950 text-white font-mono text-xs font-bold flex items-center justify-center shrink-0">
                        {item.step}
                      </div>
                      {idx < ORGANIZATION_PROCESS_STEPS.length - 1 && (
                        <div
                          aria-hidden="true"
                          className="hidden lg:block flex-1 h-px bg-gradient-to-r from-slate-200 to-transparent"
                        />
                      )}
                    </div>
                    <h3 className="mt-4 text-sm font-bold text-slate-900">{item.title}</h3>
                    <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                </div>
              </RevealBlock>
            ))}
          </div>
        </section>
      </RevealBlock>

      {/* Enterprise Partners & Bottom CTA */}
      <RevealBlock>
        <section className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                <ShieldCheck className="w-4 h-4" />
                <span>Đơn vị vận hành: {publicContact.organizationName}</span>
              </div>
              <h2 className="text-xl font-bold text-slate-900">
                Sẵn sàng triển khai sự kiện tiếp theo cùng EventFlow?
              </h2>
              <p className="text-sm text-slate-600">
                Gửi thông tin sự kiện trực tuyến để Ban quản trị lên kế hoạch hạng mục, hoặc liên
                hệ trực tiếp qua số {publicContact.phone} để được tư vấn nhanh.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={() => onBookOrganization()}
                className="ef-btn-tactile w-full sm:w-auto inline-flex items-center justify-center gap-2 h-11 px-6 text-sm font-semibold text-white bg-slate-950 hover:bg-slate-800 rounded-full hover:-translate-y-0.5 cursor-pointer whitespace-nowrap"
              >
                <span>Đặt dịch vụ / Đăng ký tổ chức</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={onGoContact}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 h-11 px-5 text-sm font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200/80 rounded-full transition-colors cursor-pointer whitespace-nowrap"
              >
                <span>Trang Liên hệ</span>
              </button>
            </div>
          </div>

          <div className="pt-5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
            <span>Đồng hành cùng nhiều đơn vị tổ chức:</span>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 font-medium text-slate-700">
              {ENTERPRISE_PARTNERS.map((p) => (
                <span key={p.name}>{p.name}</span>
              ))}
            </div>
          </div>
        </section>
      </RevealBlock>
    </div>
  );
}
