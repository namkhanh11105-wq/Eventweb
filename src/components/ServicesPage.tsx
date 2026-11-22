import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Layers,
  Phone,
  ShieldCheck,
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
  return (
    <div className="space-y-12 animate-ef-fade-up">
      {/* Page Hero: Capability Overview */}
      <section className="bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-7 space-y-4">
            <div className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-700 bg-indigo-50/70 border border-indigo-200/60 px-2.5 py-1 rounded-md">
              <Building2 className="w-3.5 h-3.5" />
              <span>Giải pháp Tổ chức Sự kiện Doanh nghiệp</span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-[2.25rem] font-bold text-slate-900 tracking-tight text-balance leading-[1.2]">
              Từ ý tưởng kịch bản đến vận hành check-in{' '}
              <span className="text-indigo-600">chỉ trên một quy trình chuẩn hóa</span>
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
                className="inline-flex items-center gap-2 h-10 px-5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all duration-150 active:scale-[0.98] cursor-pointer whitespace-nowrap"
              >
                <span>Đặt dịch vụ / Đăng ký tổ chức</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={onGoContact}
                className="inline-flex items-center gap-2 h-10 px-4 text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200/90 rounded-xl transition-colors cursor-pointer whitespace-nowrap"
              >
                <Phone className="w-4 h-4 text-indigo-600" />
                <span>Nhận tư vấn trực tiếp</span>
              </button>
            </div>
          </div>

          <div className="lg:col-span-5 grid grid-cols-2 gap-3">
            <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200/80">
              <div className="text-xs text-slate-500">Quy mô đáp ứng</div>
              <div className="mt-1 text-xl font-bold text-slate-900 tabular-nums">20 – 1.000+</div>
              <div className="mt-1 text-[11px] text-slate-500">Khách mời / sự kiện</div>
            </div>
            <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200/80">
              <div className="text-xs text-slate-500">Tốc độ Check-in QR</div>
              <div className="mt-1 text-xl font-bold text-indigo-600 tabular-nums">&lt; 2 giây</div>
              <div className="mt-1 text-[11px] text-slate-500">Đồng bộ Firestore tức thì</div>
            </div>
            <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200/80">
              <div className="text-xs text-slate-500">Hạng mục tích hợp</div>
              <div className="mt-1 text-xl font-bold text-slate-900 tabular-nums">6 nhóm</div>
              <div className="mt-1 text-[11px] text-slate-500">Thiết bị, nhân sự, truyền thông</div>
            </div>
            <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200/80">
              <div className="text-xs text-slate-500">Điều phối độc lập</div>
              <div className="mt-1 text-xl font-bold text-slate-900 tabular-nums">3 phân hệ</div>
              <div className="mt-1 text-[11px] text-slate-500">Dịch vụ · VIP · Đăng ký</div>
            </div>
          </div>
        </div>
      </section>

      {/* Detailed Service Packages Grid */}
      <section className="space-y-5">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Các gói dịch vụ tổ chức tiêu chuẩn
            </h2>
            <p className="mt-1 text-sm text-slate-600 max-w-2xl">
              Lựa chọn mô hình tổ chức phù hợp với mục tiêu chương trình và quy mô khách mời của
              doanh nghiệp.
            </p>
          </div>
          <span className="text-xs text-slate-500">
            Hỗ trợ tùy chỉnh hạng mục khi gửi yêu cầu tổ chức
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {SERVICE_PACKAGE_HIGHLIGHTS.map((pkg, idx) => (
            <RevealBlock key={pkg.code} delayMs={idx * 65}>
              <div className="bg-white border border-slate-200/80 rounded-2xl p-6 h-full flex flex-col justify-between transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-[0_12px_28px_-14px_rgba(15,23,42,0.12)]">
                <div>
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-mono font-semibold text-indigo-600">
                      {pkg.code}. Gói giải pháp
                    </span>
                    <span className="inline-flex items-center gap-1 font-semibold text-slate-700 tabular-nums">
                      <Users className="w-3.5 h-3.5 text-slate-400" />
                      {pkg.scale}
                    </span>
                  </div>

                  <h3 className="mt-2.5 text-lg font-bold text-slate-900">{pkg.title}</h3>
                  <p className="mt-1 text-xs font-medium text-slate-500">
                    Phù hợp: {pkg.idealFor}
                  </p>
                  <p className="mt-2.5 text-sm text-slate-600 leading-relaxed">{pkg.description}</p>

                  <ul className="mt-5 pt-4 border-t border-slate-100 space-y-2.5 text-xs text-slate-700">
                    {pkg.included.map((item) => (
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
                    className="w-full h-10 px-4 inline-flex items-center justify-center gap-2 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200/70 rounded-xl transition-colors cursor-pointer"
                  >
                    <span>Đặt gói dịch vụ này</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </RevealBlock>
          ))}
        </div>
      </section>

      {/* Modular System Services Catalog */}
      <RevealBlock>
        <section className="bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-8 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="inline-flex items-center gap-2 text-xs font-semibold text-indigo-600">
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
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 cursor-pointer whitespace-nowrap"
            >
              <span>Chọn dịch vụ &amp; gửi yêu cầu</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {SYSTEM_SERVICE_CATALOG.map((srv, idx) => (
              <div
                key={srv.key}
                className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/80 transition-colors duration-150 hover:bg-white hover:border-indigo-200"
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
                <div className="bg-white border border-slate-200/80 rounded-2xl p-5 h-full flex flex-col justify-between">
                  <div>
                    <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-700 font-mono text-xs font-bold flex items-center justify-center">
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
        <section className="bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-8 space-y-6">
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
                className="inline-flex items-center gap-2 h-11 px-5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all duration-150 active:scale-[0.98] cursor-pointer whitespace-nowrap"
              >
                <span>Đặt dịch vụ / Đăng ký tổ chức</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={onGoContact}
                className="inline-flex items-center gap-2 h-11 px-4 text-sm font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200/80 rounded-xl transition-colors cursor-pointer whitespace-nowrap"
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
