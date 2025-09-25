import React from 'react';
import { useLanguage } from '../contexts/LanguageContext.js';
import { translations } from '../lib/translations.js';
import XIcon from './icons/XIcon.js';

const ConfirmModal = ({ title, message, onConfirm, onClose, confirmText, cancelText }) => {
  const { language } = useLanguage();
  const t = (key) => translations[key][language];

  return (
    React.createElement('div', { className: "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50", onClick: onClose },
      React.createElement('div', { className: "bg-white rounded-lg shadow-xl w-full max-w-sm m-4", onClick: e => e.stopPropagation() },
        React.createElement('div', { className: "p-4 sm:p-5 border-b flex justify-between items-center" },
          React.createElement('h3', { className: "text-lg font-semibold text-slate-800" }, title),
          React.createElement('button', { onClick: onClose, className: "p-1 rounded-full text-gray-400 hover:bg-gray-200 hover:text-gray-600" },
            React.createElement(XIcon, { className: "w-5 h-5" })
          )
        ),
        React.createElement('div', { className: "p-4 sm:p-5" },
          React.createElement('p', { className: "text-sm text-slate-600" }, message)
        ),
        React.createElement('div', { className: "p-4 bg-slate-50 flex justify-end space-x-3 rounded-b-lg" },
          React.createElement('button', {
            onClick: onClose,
            className: "px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          }, cancelText || t('cancel')),
          React.createElement('button', {
            onClick: onConfirm,
            className: "px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          }, confirmText || t('delete'))
        )
      )
    )
  );
};

export default ConfirmModal;
