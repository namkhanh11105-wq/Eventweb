import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Layers,
  Phone,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react';
import { RevealBlock } from './MotionPrimitives';
import {
  ENTERPRISE_PARTNERS,
  ORGANIZATION_PROCESS_STEPS,
  SERVICE_PACKAGE_HIGHLIGHTS,
  SYSTEM_SERVICE_CATALOG,
} from '../utils/formatters';
import type { PublicContactInfo } from '../types';

interface ServicesPageProps {
  publicContact: PublicContactInfo;
  onBookOrganization: () => void;
  onGoContact: () => void;
}

export function ServicesPage({
  publicContact,
  onBookOrganization,
  onGoContact,
}: ServicesPageProps) {
  const pkg1 = SERVICE_PACKAGE_HIGHLIGHTS[0];
  const pkg2 = SERVICE_PACKAGE_HIGHLIGHTS[1];
  const pkg3 = SERVICE_PACKAGE_HIGHLIGHTS[2];

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

            <div className="pt-2 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={onBookOrganization}
                className="inline-flex items-center gap-2 h-11 px-6 text-sm font-semibold text-white bg-slate-950 hover:bg-slate-800 rounded-full shadow-sm transition-all duration-200 ease-[cubic-bezier(0.34,1.32,0.64,1)] hover:-translate-y-0.5 active:scale-[0.98] cursor-pointer whitespace-nowrap"
              >
                <span>Đặt dịch vụ / Đăng ký tổ chức</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={onGoContact}
                className="inline-flex items-center gap-2 h-11 px-5 text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200/90 rounded-full transition-colors cursor-pointer whitespace-nowrap"
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

      {/* Bento Grid Service Packages */}
      <section className="space-y-5">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Các gói dịch vụ tổ chức theo mô hình Bento Grid
            </h2>
            <p className="mt-1 text-sm text-slate-600 max-w-2xl">
              Lựa chọn mô hình tổ chức phù hợp với mục tiêu chương trình và quy mô khách mời của
              doanh nghiệp.
            </p>
          </div>
          <span className="text-xs text-slate-500">
            Tùy chỉnh hạng mục linh hoạt khi gửi yêu cầu tổ chức
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Bento Card 01 (Wide 7 cols) */}
          <RevealBlock className="lg:col-span-7" delayMs={0}>
            <div className="ef-card-sheen bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-7 h-full flex flex-col justify-between transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-1 hover:border-orange-200 hover:shadow-[0_18px_36px_-14px_rgba(15,23,42,0.12)]">
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="font-mono font-semibold text-rose-600">
                    {pkg1.code}. Gói chủ lực
                  </span>
                  <span className="inline-flex items-center gap-1 font-semibold text-slate-700 tabular-nums">
                    <Users className="w-3.5 h-3.5 text-slate-400" />
                    {pkg1.scale}
                  </span>
                </div>

                <h3 className="mt-3 text-xl font-bold text-slate-900">{pkg1.title}</h3>
                <p className="mt-1 text-xs font-medium text-slate-500">
                  Phù hợp: {pkg1.idealFor}
                </p>
                <p className="mt-2.5 text-sm text-slate-600 leading-relaxed">{pkg1.description}</p>

                <ul className="mt-5 pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs text-slate-700">
                  {pkg1.included.map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
                <span className="text-xs text-slate-500">Hỗ trợ đồng bộ đại biểu &amp; diễn giả</span>
                <button
                  type="button"
                  onClick={onBookOrganization}
                  className="inline-flex items-center gap-1.5 h-10 px-4 text-xs font-semibold text-white bg-slate-950 hover:bg-slate-800 rounded-full transition-colors cursor-pointer whitespace-nowrap"
                >
                  <span>Đặt gói dịch vụ này</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </RevealBlock>

          {/* Bento Card 02 (5 cols) */}
          <RevealBlock className="lg:col-span-5" delayMs={60}>
            <div className="ef-card-sheen bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-7 h-full flex flex-col justify-between transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-1 hover:border-indigo-200 hover:shadow-[0_18px_36px_-14px_rgba(15,23,42,0.12)]">
              <div>
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="font-mono font-semibold text-indigo-600">
                    {pkg2.code}. Tương tác chuyên sâu
                  </span>
                  <span className="inline-flex items-center gap-1 font-semibold text-slate-700 tabular-nums">
                    <Users className="w-3.5 h-3.5 text-slate-400" />
                    {pkg2.scale}
                  </span>
                </div>

                <h3 className="mt-3 text-lg font-bold text-slate-900">{pkg2.title}</h3>
                <p className="mt-1 text-xs font-medium text-slate-500">
                  Phù hợp: {pkg2.idealFor}
                </p>
                <p className="mt-2.5 text-sm text-slate-600 leading-relaxed">{pkg2.description}</p>

                <ul className="mt-5 pt-4 border-t border-slate-100 space-y-2 text-xs text-slate-700">
                  {pkg2.included.map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={onBookOrganization}
                  className="w-full h-10 px-4 inline-flex items-center justify-center gap-2 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors cursor-pointer"
                >
                  <span>Đặt gói Workshop</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </RevealBlock>

          {/* Bento Card 03 (5 cols) */}
          <RevealBlock className="lg:col-span-5" delayMs={110}>
            <div className="ef-card-sheen bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-7 h-full flex flex-col justify-between transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-1 hover:border-rose-200 hover:shadow-[0_18px_36px_-14px_rgba(15,23,42,0.12)]">
              <div>
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="font-mono font-semibold text-orange-600">
                    {pkg3.code}. Sự kiện trang trọng
                  </span>
                  <span className="inline-flex items-center gap-1 font-semibold text-slate-700 tabular-nums">
                    <Users className="w-3.5 h-3.5 text-slate-400" />
                    {pkg3.scale}
                  </span>
                </div>

                <h3 className="mt-3 text-lg font-bold text-slate-900">{pkg3.title}</h3>
                <p className="mt-1 text-xs font-medium text-slate-500">
                  Phù hợp: {pkg3.idealFor}
                </p>
                <p className="mt-2.5 text-sm text-slate-600 leading-relaxed">{pkg3.description}</p>

                <ul className="mt-5 pt-4 border-t border-slate-100 space-y-2 text-xs text-slate-700">
                  {pkg3.included.map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={onBookOrganization}
                  className="w-full h-10 px-4 inline-flex items-center justify-center gap-2 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors cursor-pointer"
                >
                  <span>Đặt gói Gala &amp; Vinh danh</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </RevealBlock>

          {/* Bento Card 04: Custom Enterprise Contrast Tile (7 cols) */}
          <RevealBlock className="lg:col-span-7" delayMs={150}>
            <div className="ef-card-sheen relative overflow-hidden bg-slate-950 text-white rounded-3xl p-6 sm:p-8 h-full flex flex-col justify-between transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-1 hover:shadow-[0_20px_42px_-12px_rgba(15,23,42,0.35)]">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-12 -top-12 h-52 w-52 rounded-full bg-gradient-to-br from-rose-500/25 via-orange-500/20 to-transparent blur-2xl"
              />
              <div className="relative space-y-3">
                <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-orange-300">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>04. Tùy chỉnh theo yêu cầu doanh nghiệp</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-bold tracking-tight">
                  Thiết kế tổ hợp dịch vụ riêng cho sự kiện của bạn
                </h3>
                <p className="text-sm text-slate-300 leading-relaxed max-w-xl">
                  Chọn tự do từng hạng mục âm thanh, ánh sáng LED, MC song ngữ, tiệc tea-break,
                  đội ngũ check-in QR hoặc truyền thông ngay trong biểu mẫu gửi yêu cầu tổ chức.
                </p>
              </div>

              <div className="relative mt-6 pt-5 border-t border-white/10 flex flex-wrap items-center justify-between gap-4">
                <div className="text-xs text-slate-300">
                  Phản hồi kế hoạch trực tiếp qua cổng Tổ chức
                </div>
                <button
                  type="button"
                  onClick={onBookOrganization}
                  className="inline-flex items-center gap-2 h-11 px-6 text-xs sm:text-sm font-semibold text-slate-950 bg-white hover:bg-slate-100 rounded-full transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] cursor-pointer whitespace-nowrap"
                >
                  <span>Đặt dịch vụ / Đăng ký tổ chức</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </RevealBlock>
        </div>
      </section>

      {/* Modular System Services Catalog */}
      <RevealBlock>
        <section className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="inline-flex items-center gap-2 text-xs font-semibold text-rose-600">
                <Layers className="w-4 h-4" />
                <span>Danh mục hạng mục dịch vụ đi kèm</span>
              </div>
              <h2 className="mt-1 text-lg font-bold text-slate-900">
                Tùy chọn linh hoạt từng hạng mục khi gửi yêu cầu tổ chức
              </h2>
            </div>
            <button
              type="button"
              onClick={onBookOrganization}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-900 hover:text-rose-600 cursor-pointer whitespace-nowrap transition-colors"
            >
              <span>Chọn dịch vụ &amp; gửi yêu cầu</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {SYSTEM_SERVICE_CATALOG.map((srv, idx) => (
              <div
                key={srv.key}
                className="ef-card-sheen p-4 rounded-2xl bg-slate-50/70 border border-slate-200/80 transition-all duration-200 hover:-translate-y-0.5 hover:bg-white hover:border-orange-200"
              >
                <div className="text-[11px] font-mono font-semibold text-slate-400">
                  0{idx + 1}
                </div>
                <h3 className="mt-1 text-sm font-bold text-slate-900">{srv.name}</h3>
                <p className="mt-1.5 text-xs text-slate-600 leading-relaxed">{srv.summary}</p>
              </div>
            ))}
          </div>
        </section>
      </RevealBlock>

      {/* 4-Step Process */}
      <RevealBlock>
        <section className="space-y-5">
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Quy trình 4 bước từ tiếp nhận đến vận hành thực tế
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Mọi tiến độ duyệt yêu cầu, chuẩn bị dịch vụ và kiểm soát khách mời đều được cập nhật
              minh bạch giữa Khách hàng và Ban quản trị.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {ORGANIZATION_PROCESS_STEPS.map((item, idx) => (
              <RevealBlock key={item.step} delayMs={idx * 60}>
                <div className="bg-white border border-slate-200/80 rounded-2xl p-5 h-full flex flex-col justify-between transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300">
                  <div>
                    <div className="w-9 h-9 rounded-xl bg-orange-50 text-orange-700 font-mono text-xs font-bold flex items-center justify-center">
                      {item.step}
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
            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={onBookOrganization}
                className="inline-flex items-center gap-2 h-11 px-6 text-sm font-semibold text-white bg-slate-950 hover:bg-slate-800 rounded-full transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.98] cursor-pointer whitespace-nowrap"
              >
                <span>Đặt dịch vụ / Đăng ký tổ chức</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={onGoContact}
                className="inline-flex items-center gap-2 h-11 px-5 text-sm font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200/80 rounded-full transition-colors cursor-pointer whitespace-nowrap"
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
