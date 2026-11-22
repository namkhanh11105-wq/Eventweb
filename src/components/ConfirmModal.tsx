import { useEffect, useState } from 'react';
import { AlertTriangle, HelpCircle, Loader2, Trash2, X } from 'lucide-react';
import { AnimatedModal } from './MotionPrimitives';

export type ConfirmModalTone = 'danger' | 'warning' | 'primary';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: ConfirmModalTone;
  loading?: boolean;
  noteLabel?: string;
  notePlaceholder?: string;
  defaultNote?: string;
  onConfirm: (noteValue?: string) => void | Promise<void>;
  onCancel: () => void;
}

export function ConfirmModal({
  isOpen,
  title,
  description,
  confirmLabel = 'Xác nhận',
  cancelLabel = 'Hủy bỏ',
  tone = 'danger',
  loading = false,
  noteLabel,
  notePlaceholder,
  defaultNote = '',
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const [noteValue, setNoteValue] = useState(defaultNote);

  useEffect(() => {
    if (isOpen) {
      setNoteValue(defaultNote);
    }
  }, [isOpen, defaultNote]);

  const iconBgClass =
    tone === 'danger'
      ? 'bg-rose-50 text-rose-600 border-rose-200/80'
      : tone === 'warning'
      ? 'bg-amber-50 text-amber-600 border-amber-200/80'
      : 'bg-indigo-50 text-indigo-600 border-indigo-200/80';

  const confirmBtnClass =
    tone === 'danger'
      ? 'bg-rose-600 hover:bg-rose-700 text-white'
      : tone === 'warning'
      ? 'bg-amber-600 hover:bg-amber-700 text-white'
      : 'bg-slate-950 hover:bg-slate-800 text-white';

  const Icon =
    tone === 'danger' ? Trash2 : tone === 'warning' ? AlertTriangle : HelpCircle;

  return (
    <AnimatedModal
      isOpen={isOpen}
      onClose={() => {
        if (!loading) onCancel();
      }}
      maxWidthClassName="max-w-md"
      backdropClassName="bg-slate-900/50 backdrop-blur-xs p-4"
      panelClassName="bg-white border border-slate-200/90 rounded-2xl w-full p-5 sm:p-6 shadow-2xl space-y-4"
    >
      <div className="flex items-start gap-3.5">
        <div
          className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${iconBgClass}`}
        >
          <Icon className="w-5 h-5" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h2 className="text-base font-bold text-slate-900 leading-snug">{title}</h2>
            <button
              type="button"
              disabled={loading}
              aria-label="Đóng hộp thoại"
              onClick={onCancel}
              className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="mt-1.5 text-xs sm:text-sm text-slate-600 leading-relaxed">
            {description}
          </p>
        </div>
      </div>

      {noteLabel && (
        <div className="space-y-1.5 pt-1">
          <label className="block text-xs font-semibold text-slate-700">{noteLabel}</label>
          <textarea
            rows={3}
            disabled={loading}
            value={noteValue}
            onChange={(e) => setNoteValue(e.target.value)}
            placeholder={notePlaceholder || 'Nhập ghi chú phản hồi (không bắt buộc)...'}
            className="w-full px-3.5 py-2 text-xs sm:text-sm bg-slate-50/70 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:border-slate-900 transition-colors"
          />
        </div>
      )}

      <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2 pt-2 border-t border-slate-100">
        <button
          type="button"
          disabled={loading}
          onClick={onCancel}
          className="w-full sm:w-auto min-h-[40px] px-4 py-2 text-xs sm:text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer disabled:opacity-60"
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={() => onConfirm(noteLabel ? noteValue : undefined)}
          className={`ef-btn-tactile w-full sm:w-auto min-h-[40px] inline-flex items-center justify-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl transition-colors cursor-pointer disabled:opacity-60 ${confirmBtnClass}`}
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          <span>{loading ? 'Đang xử lý...' : confirmLabel}</span>
        </button>
      </div>
    </AnimatedModal>
  );
}
