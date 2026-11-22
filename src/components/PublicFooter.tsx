import { CalendarDays, Mail, MapPin, Phone } from 'lucide-react';
import type { PublicContactInfo, PublicPage } from '../types';

interface PublicFooterProps {
  publicContact: PublicContactInfo;
  activePage?: PublicPage;
  onNavigatePage: (page: 'discover' | 'services' | 'contact' | 'tickets') => void;
  onBookOrganization: () => void;
}

export function PublicFooter({
  publicContact,
  activePage,
  onNavigatePage,
  onBookOrganization,
}: PublicFooterProps) {
  return (
    <footer className="bg-white border-t border-slate-200/80 mt-14">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand & Platform Summary */}
          <div>
            <button
              type="button"
              onClick={() => onNavigatePage('discover')}
              className="inline-flex items-center gap-2.5 text-[15px] font-bold text-slate-900 cursor-pointer hover:opacity-85 transition-opacity"
            >
              <span className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
                <CalendarDays className="w-4 h-4" />
              </span>
              <span>{publicContact.organizationName}</span>
            </button>
            <p className="mt-3 text-xs text-slate-500 leading-relaxed">
              Nền tảng tổ chức, điều phối dịch vụ và check-in sự kiện tập trung cho Người tham gia,
              Khách hàng doanh nghiệp và Ban quản trị.
            </p>
          </div>

          {/* Quick Multi-Page Navigation */}
          <div>
            <h3 className="text-xs font-bold text-slate-900">Điều hướng trang</h3>
            <ul className="mt-3 space-y-2 text-xs">
              <li>
                <button
                  type="button"
                  onClick={() => onNavigatePage('discover')}
                  className={`cursor-pointer transition-colors ${
                    activePage === 'discover'
                      ? 'text-indigo-600 font-semibold'
                      : 'text-slate-600 hover:text-indigo-600'
                  }`}
                >
                  Khám phá sự kiện
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigatePage('services')}
                  className={`cursor-pointer transition-colors ${
                    activePage === 'services'
                      ? 'text-indigo-600 font-semibold'
                      : 'text-slate-600 hover:text-indigo-600'
                  }`}
                >
                  Dịch vụ tổ chức sự kiện
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigatePage('contact')}
                  className={`cursor-pointer transition-colors ${
                    activePage === 'contact'
                      ? 'text-indigo-600 font-semibold'
                      : 'text-slate-600 hover:text-indigo-600'
                  }`}
                >
                  Liên hệ &amp; Tư vấn
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={onBookOrganization}
                  className="text-slate-600 hover:text-indigo-600 cursor-pointer transition-colors"
                >
                  Đặt dịch vụ / Đăng ký tổ chức
                </button>
              </li>
            </ul>
          </div>

          {/* System Capabilities */}
          <div>
            <h3 className="text-xs font-bold text-slate-900">Phân hệ vận hành</h3>
            <ul className="mt-3 space-y-2 text-xs text-slate-600">
              <li>Đăng ký tham gia &amp; cấp mã QR E-Ticket</li>
              <li>Quản lý khách mời VIP &amp; trạng thái RSVP</li>
              <li>Điều phối 6 hạng mục dịch vụ sự kiện</li>
              <li>Đồng bộ dữ liệu thời gian thực Firestore</li>
            </ul>
          </div>

          {/* Admin Public Contact */}
          <div>
            <h3 className="text-xs font-bold text-slate-900">Thông tin liên hệ</h3>
            <ul className="mt-3 space-y-2 text-xs text-slate-600">
              <li className="font-medium text-slate-700">
                Phụ trách: {publicContact.adminName}
              </li>
              <li className="flex items-center gap-2 tabular-nums">
                <Phone className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                <a
                  href={`tel:${publicContact.phone.replace(/\s+/g, '')}`}
                  className="hover:text-indigo-600 transition-colors"
                >
                  {publicContact.phone}
                </a>
                <span className="text-slate-300">/</span>
                <span>{publicContact.hotline}</span>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                <a
                  href={`mailto:${publicContact.email}`}
                  className="hover:text-indigo-600 transition-colors truncate"
                >
                  {publicContact.email}
                </a>
              </li>
              <li className="flex items-start gap-2">
                <MapPin className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
                <span>{publicContact.officeAddress}</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
          <span>© 2026 EventFlow Platform. Bảo lưu mọi quyền.</span>
          <span>{publicContact.workingHours}</span>
        </div>
      </div>
    </footer>
  );
}
