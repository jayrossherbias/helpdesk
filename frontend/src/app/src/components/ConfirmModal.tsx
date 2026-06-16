import React from 'react';
import { createPortal } from 'react-dom';

interface ConfirmModalProps {
  open: boolean;
  title: string;
  body: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'primary' | 'warning' | 'danger';
  confirmDisabled?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  isDark: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  open, title, body, confirmLabel = 'Confirm', cancelLabel = 'Cancel',
  variant = 'primary', confirmDisabled = false, onConfirm, onCancel, isDark,
}) => {
  if (!open) return null;

  const btnClass =
    variant === 'warning' ? 'bg-orange-600 hover:bg-orange-700 text-white' :
    variant === 'danger'  ? 'bg-red-600 hover:bg-red-700 text-white' :
                            'bg-blue-600 hover:bg-blue-700 text-white';

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      <div className={`relative z-10 w-full max-w-sm rounded-2xl border shadow-2xl p-6 space-y-4 ${
        isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-gray-200'
      }`}>
        <h2 className={`text-base font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
          {title}
        </h2>
        <div className={`text-sm ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>
          {body}
        </div>
        <div className="flex gap-3 justify-end pt-2">
          <button
            onClick={onCancel}
            className={`px-4 py-2 text-sm rounded-lg transition-colors ${
              isDark ? 'text-slate-400 hover:bg-slate-800' : 'text-gray-500 hover:bg-gray-100'
            }`}
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={confirmDisabled}
            className={`px-4 py-2 text-sm rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${btnClass}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
};
