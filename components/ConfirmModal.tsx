import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { translations, TranslationKey } from '../lib/translations';
import XIcon from './icons/XIcon';

interface ConfirmModalProps {
  title: string;
  message: string;
  onConfirm: () => void;
  onClose: () => void;
  confirmText?: string;
  cancelText?: string;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({ title, message, onConfirm, onClose, confirmText, cancelText }) => {
  const { language } = useLanguage();
  const t = (key: TranslationKey) => translations[key][language];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-sm m-4" onClick={e => e.stopPropagation()}>
        <div className="p-4 sm:p-5 border-b flex justify-between items-center">
          <h3 className="text-lg font-semibold text-slate-800">{title}</h3>
          <button onClick={onClose} className="p-1 rounded-full text-gray-400 hover:bg-gray-200 hover:text-gray-600">
            <XIcon className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 sm:p-5">
          <p className="text-sm text-slate-600">{message}</p>
        </div>
        <div className="p-4 bg-slate-50 flex justify-end space-x-3 rounded-b-lg">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            {cancelText || t('cancel')}
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            {confirmText || t('delete')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
