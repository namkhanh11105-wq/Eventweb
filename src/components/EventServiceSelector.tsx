import { useMemo } from 'react';
import {
  Camera,
  Check,
  Coffee,
  Frame,
  Layers,
  Mic2,
  Presentation,
  QrCode,
  RotateCcw,
  Sparkles,
  Users,
  Volume2,
  X,
  Zap,
} from 'lucide-react';
import {
  SERVICE_COMBO_PRESETS,
  SYSTEM_SERVICE_CATALOG,
  type ServiceComboPreset,
} from '../utils/formatters';

export interface ServiceSelectionItem {
  enabled: boolean;
  quantityOrScope: string;
  clientNote: string;
}

interface EventServiceSelectorProps {
  selectedServices: Record<string, ServiceSelectionItem>;
  customServiceName: string;
  expectedGuestCount: number;
  onChangeSelectedServices: (
    updater: (
      prev: Record<string, ServiceSelectionItem>
    ) => Record<string, ServiceSelectionItem>
  ) => void;
  onChangeCustomServiceName: (value: string) => void;
}

function getServiceIcon(key: string) {
  switch (key) {
    case 'av_stage':
      return Volume2;
    case 'mc_coordinator':
      return Mic2;
    case 'teabreak_catering':
      return Coffee;
    case 'checkin_staff':
      return QrCode;
    case 'media_pr':
      return Camera;
    case 'backdrop_booth':
      return Frame;
    default:
      return Layers;
  }
}

function getComboIcon(comboId: string) {
  switch (comboId) {
    case 'workshop':
      return Presentation;
    case 'gala':
      return Sparkles;
    case 'compact':
      return Zap;
    case 'training':
      return Users;
    default:
      return Layers;
  }
}

export function EventServiceSelector({
  selectedServices,
  customServiceName,
  expectedGuestCount,
  onChangeSelectedServices,
  onChangeCustomServiceName,
}: EventServiceSelectorProps) {
  const selectedItems = useMemo(() => {
    return SYSTEM_SERVICE_CATALOG.filter((s) => selectedServices[s.key]?.enabled);
  }, [selectedServices]);

  const totalSelectedCount =
    selectedItems.length + (customServiceName.trim() ? 1 : 0);

  // Determine if the currently enabled service keys match one of the combo presets
  const activeComboId = useMemo(() => {
    const enabledKeys = selectedItems
      .map((s) => s.key)
      .sort()
      .join('|');
    if (!enabledKeys) return null;
    for (const preset of SERVICE_COMBO_PRESETS) {
      const presetKeys = Object.keys(preset.services).sort().join('|');
      if (enabledKeys === presetKeys) {
        return preset.id;
      }
    }
    return null;
  }, [selectedItems]);

  function applyComboPreset(preset: ServiceComboPreset) {
    onChangeSelectedServices((prev) => {
      const next: Record<string, ServiceSelectionItem> = {};
      for (const srv of SYSTEM_SERVICE_CATALOG) {
        const presetCfg = preset.services[srv.key];
        if (presetCfg) {
          // Adapt guest-scale phrasing lightly if teabreak and user set expectedGuestCount
          let suggestedQty = presetCfg.quantityOrScope;
          if (
            srv.key === 'teabreak_catering' &&
            expectedGuestCount >= 20 &&
            expectedGuestCount <= 2000 &&
            preset.id !== 'gala'
          ) {
            suggestedQty = `${expectedGuestCount} suất`;
          }
          next[srv.key] = {
            enabled: true,
            quantityOrScope: suggestedQty,
            clientNote: presetCfg.clientNote,
          };
        } else {
          next[srv.key] = {
            enabled: false,
            quantityOrScope: prev[srv.key]?.quantityOrScope || '',
            clientNote: prev[srv.key]?.clientNote || '',
          };
        }
      }
      return next;
    });
  }

  function clearAllServices() {
    onChangeSelectedServices((prev) => {
      const next: Record<string, ServiceSelectionItem> = {};
      for (const srv of SYSTEM_SERVICE_CATALOG) {
        next[srv.key] = {
          enabled: false,
          quantityOrScope: prev[srv.key]?.quantityOrScope || '',
          clientNote: prev[srv.key]?.clientNote || '',
        };
      }
      return next;
    });
    onChangeCustomServiceName('');
  }

  function toggleService(key: string) {
    onChangeSelectedServices((prev) => {
      const current = prev[key] || {
        enabled: false,
        quantityOrScope: '',
        clientNote: '',
      };
      return {
        ...prev,
        [key]: {
          ...current,
          enabled: !current.enabled,
        },
      };
    });
  }

  function updateField(
    key: string,
    field: 'quantityOrScope' | 'clientNote',
    value: string
  ) {
    onChangeSelectedServices((prev) => {
      const current = prev[key] || {
        enabled: true,
        quantityOrScope: '',
        clientNote: '',
      };
      return {
        ...prev,
        [key]: {
          ...current,
          [field]: value,
        },
      };
    });
  }

  function handleNoteChipClick(key: string, chip: string) {
    const currentText = (selectedServices[key]?.clientNote || '').trim();
    const parts = currentText
      ? currentText
          .split('•')
          .map((p) => p.trim())
          .filter(Boolean)
      : [];

    const exists = parts.some((p) => p.toLowerCase() === chip.toLowerCase());
    const nextParts = exists
      ? parts.filter((p) => p.toLowerCase() !== chip.toLowerCase())
      : [...parts, chip];

    updateField(key, 'clientNote', nextParts.join(' • '));
  }

  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-slate-50/90 border border-slate-200 space-y-5">
      {/* Section Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900">
            Chọn dịch vụ đi kèm từ EventFlow
          </h3>
          <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
            Chọn nhanh theo combo sự kiện hoặc tùy chỉnh từng hạng mục bên dưới (chưa
            thu phí trực tuyến ở bước này).
          </p>
        </div>

        {totalSelectedCount > 0 && (
          <button
            type="button"
            onClick={clearAllServices}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-medium text-slate-600 hover:text-slate-900 bg-white border border-slate-200 hover:border-slate-300 rounded-lg cursor-pointer transition-colors whitespace-nowrap shrink-0"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Bỏ chọn tất cả</span>
          </button>
        )}
      </div>

      {/* Quick Combo Suggestions Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-600">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            <span>Gợi ý Combo nhanh theo loại sự kiện</span>
          </div>
          {activeComboId && (
            <span className="text-[11px] font-medium text-indigo-700">
              Đang áp dụng gói gợi ý • Có thể tùy chỉnh tự do bên dưới
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {SERVICE_COMBO_PRESETS.map((preset) => {
            const ComboIcon = getComboIcon(preset.id);
            const isActive = activeComboId === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => applyComboPreset(preset)}
                className={`group text-left p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 ${
                  isActive
                    ? 'bg-slate-950 border-slate-950 text-white shadow-sm'
                    : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/70 text-slate-900'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span
                    className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                      isActive
                        ? 'bg-white/15 text-amber-300'
                        : 'bg-indigo-50 text-indigo-600 group-hover:bg-indigo-100'
                    }`}
                  >
                    <ComboIcon className="w-3.5 h-3.5" />
                  </span>
                  <span
                    className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md tabular-nums whitespace-nowrap shrink-0 ${
                      isActive
                        ? 'bg-white/15 text-slate-100'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {preset.badge}
                  </span>
                </div>

                <div>
                  <div className="text-xs font-bold leading-snug">
                    {preset.label}
                  </div>
                  <div
                    className={`text-[11px] mt-0.5 leading-snug line-clamp-2 ${
                      isActive ? 'text-slate-300' : 'text-slate-500'
                    }`}
                  >
                    {preset.subtitle}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Detailed Service Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {SYSTEM_SERVICE_CATALOG.map((srv) => {
          const state = selectedServices[srv.key];
          const enabled = Boolean(state?.enabled);
          const Icon = getServiceIcon(srv.key);
          const currentQty = state?.quantityOrScope || '';
          const currentNote = state?.clientNote || '';

          return (
            <div
              key={srv.key}
              className={`rounded-xl border transition-all duration-200 ${
                enabled
                  ? 'bg-gradient-to-b from-indigo-50/45 via-white to-white border-slate-900/60 shadow-xs ring-1 ring-slate-900/5'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              {/* Card Header Toggle */}
              <button
                type="button"
                role="checkbox"
                aria-checked={enabled}
                onClick={() => toggleService(srv.key)}
                className="w-full p-3.5 text-left flex items-start gap-3 cursor-pointer rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
              >
                <span
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                    enabled
                      ? 'bg-slate-950 text-white'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </span>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <span className="block text-xs font-bold text-slate-900 leading-snug">
                        {srv.name}
                      </span>
                      <span
                        className={`inline-block mt-1 px-1.5 py-0.5 text-[10px] font-semibold rounded border ${
                          enabled
                            ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                            : 'bg-slate-50 border-slate-200 text-slate-500'
                        }`}
                      >
                        {srv.recommendationHint}
                      </span>
                    </div>

                    <span
                      className={`mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                        enabled
                          ? 'bg-slate-950 border-slate-950 text-white'
                          : 'bg-white border-slate-300 text-transparent'
                      }`}
                    >
                      <Check className="w-3 h-3" />
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">
                    {srv.summary}
                  </p>
                </div>
              </button>

              {/* Smooth Expandable Details Area */}
              <div className="ef-expand-grid" data-expanded={enabled ? 'true' : 'false'}>
                <div className="ef-expand-inner">
                  <div className="px-3.5 pb-3.5 pt-2.5 border-t border-slate-200/70 space-y-3">
                    {/* Field 1: Quy mô / Số lượng */}
                    <div>
                      <label
                        htmlFor={`srv-qty-${srv.key}`}
                        className="block text-[11px] font-semibold text-slate-700 mb-1"
                      >
                        Quy mô / Số lượng
                      </label>
                      <input
                        id={`srv-qty-${srv.key}`}
                        type="text"
                        tabIndex={enabled ? 0 : -1}
                        value={currentQty}
                        onChange={(e) =>
                          updateField(srv.key, 'quantityOrScope', e.target.value)
                        }
                        placeholder={srv.quantityPlaceholder}
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-slate-900"
                      />
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {srv.quantityChips.map((chip) => {
                          const chipActive =
                            currentQty.trim().toLowerCase() === chip.toLowerCase();
                          return (
                            <button
                              key={chip}
                              type="button"
                              tabIndex={enabled ? 0 : -1}
                              onClick={() =>
                                updateField(
                                  srv.key,
                                  'quantityOrScope',
                                  chipActive ? '' : chip
                                )
                              }
                              className={`px-2 py-0.5 text-[11px] font-medium rounded-md border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                                chipActive
                                  ? 'bg-slate-900 border-slate-900 text-white'
                                  : 'bg-slate-100/80 border-slate-200 text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
                              }`}
                            >
                              {chip}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Field 2: Ghi chú yêu cầu riêng */}
                    <div>
                      <label
                        htmlFor={`srv-note-${srv.key}`}
                        className="block text-[11px] font-semibold text-slate-700 mb-1"
                      >
                        Ghi chú yêu cầu riêng
                      </label>
                      <input
                        id={`srv-note-${srv.key}`}
                        type="text"
                        tabIndex={enabled ? 0 : -1}
                        value={currentNote}
                        onChange={(e) =>
                          updateField(srv.key, 'clientNote', e.target.value)
                        }
                        placeholder={srv.notePlaceholder}
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-slate-900"
                      />
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {srv.noteChips.map((chip) => {
                          const chipActive = currentNote
                            .toLowerCase()
                            .includes(chip.toLowerCase());
                          return (
                            <button
                              key={chip}
                              type="button"
                              tabIndex={enabled ? 0 : -1}
                              onClick={() => handleNoteChipClick(srv.key, chip)}
                              className={`px-2 py-0.5 text-[11px] font-medium rounded-md border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                                chipActive
                                  ? 'bg-indigo-600 border-indigo-600 text-white'
                                  : 'bg-slate-100/80 border-slate-200 text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
                              }`}
                            >
                              {chipActive ? `✓ ${chip}` : `+ ${chip}`}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Custom Additional Service Input */}
      <div>
        <label
          htmlFor="srv-custom-other"
          className="block text-xs font-semibold text-slate-700 mb-1"
        >
          Dịch vụ bổ sung khác (tùy chọn)
        </label>
        <input
          id="srv-custom-other"
          type="text"
          value={customServiceName}
          onChange={(e) => onChangeCustomServiceName(e.target.value)}
          placeholder="Ví dụ: Phiên dịch cabin song ngữ, khu trưng bày sản phẩm..."
          className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-slate-900"
        />
      </div>

      {/* Compact Selected Services Summary Strip */}
      <div className="rounded-xl bg-white border border-slate-200 px-3.5 py-3 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
            <Layers className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
            <span>
              Dịch vụ đã chọn:{' '}
              <span className="tabular-nums text-indigo-700">
                {totalSelectedCount}
              </span>{' '}
              hạng mục
            </span>
          </div>
          <span className="text-[11px] text-slate-500">
            Ban quản trị sẽ xác nhận chi tiết từng hạng mục sau khi gửi
          </span>
        </div>

        {totalSelectedCount === 0 ? (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200/80 rounded-lg px-2.5 py-2">
            Bạn chưa chọn hạng mục nào. Hãy bấm vào một Combo gợi ý phía trên hoặc
            chọn ít nhất 1 dịch vụ trước khi gửi yêu cầu.
          </p>
        ) : (
          <div className="flex flex-wrap gap-1.5 pt-0.5">
            {selectedItems.map((srv) => {
              const qty = selectedServices[srv.key]?.quantityOrScope?.trim();
              return (
                <span
                  key={srv.key}
                  className="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 text-[11px] bg-slate-100 border border-slate-200 text-slate-800 rounded-lg"
                >
                  <span className="font-semibold text-slate-900">
                    {srv.shortName}
                  </span>
                  {qty && (
                    <span className="text-slate-500 border-l border-slate-300 pl-1.5 max-w-[160px] truncate">
                      {qty}
                    </span>
                  )}
                  <button
                    type="button"
                    aria-label={`Bỏ chọn ${srv.name}`}
                    onClick={() => toggleService(srv.key)}
                    className="p-0.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded cursor-pointer transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              );
            })}

            {customServiceName.trim() && (
              <span className="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 text-[11px] bg-indigo-50 border border-indigo-200 text-indigo-900 rounded-lg">
                <span className="font-semibold">{customServiceName.trim()}</span>
                <span className="text-indigo-600 border-l border-indigo-200 pl-1.5">
                  Tùy chỉnh
                </span>
                <button
                  type="button"
                  aria-label="Xóa dịch vụ bổ sung"
                  onClick={() => onChangeCustomServiceName('')}
                  className="p-0.5 text-indigo-400 hover:text-rose-600 hover:bg-rose-50 rounded cursor-pointer transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
