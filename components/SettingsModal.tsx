import React from 'react';
import { useLanguage } from '../contexts/LanguageContext.tsx';
import { translations, TranslationKey } from '../lib/translations.ts';

interface SettingsModalProps {
  onClose: () => void;
  holidays: Set<number>;
  setHolidays: React.Dispatch<React.SetStateAction<Set<number>>>;
  columnVisibility: {
    assignee: boolean;
    startDate: boolean;
    endDate: boolean;
    duration: boolean;
    progress: boolean;
    manHours: boolean;
  };
  setColumnVisibility: React.Dispatch<React.SetStateAction<any>>;
  baseColor: string;
  setBaseColor: React.Dispatch<React.SetStateAction<string>>;
  progressColor: string;
  setProgressColor: React.Dispatch<React.SetStateAction<string>>;
  textColor: string;
  setTextColor: React.Dispatch<React.SetStateAction<string>>;
  progressLineColor: string;
  setProgressLineColor: React.Dispatch<React.SetStateAction<string>>;
  rowHeight: number;
  setRowHeight: React.Dispatch<React.SetStateAction<number>>;
  onResetColors: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({
  onClose,
  holidays,
  setHolidays,
  columnVisibility,
  setColumnVisibility,
  baseColor,
  setBaseColor,
  progressColor,
  setProgressColor,
  textColor,
  setTextColor,
  progressLineColor,
  setProgressLineColor,
  rowHeight,
  setRowHeight,
  onResetColors,
}) => {
  const { language } = useLanguage();
  const t = (key: TranslationKey) => translations[key][language];

  const handleHolidayChange = (dayIndex: number) => {
    setHolidays(prev => {
      const newHolidays = new Set(prev);
      if (newHolidays.has(dayIndex)) {
        newHolidays.delete(dayIndex);
      } else {
        newHolidays.add(dayIndex);
      }
      return newHolidays;
    });
  };

  const handleColumnVisibilityChange = (column: keyof typeof columnVisibility) => {
    setColumnVisibility((prev: any) => ({
      ...prev,
      [column]: !prev[column],
    }));
  };
  
  const handleInputFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.select();
  };

  const daysOfWeek: { key: TranslationKey, index: number }[] = [
    { key: 'sun', index: 0 },
    { key: 'mon', index: 1 },
    { key: 'tue', index: 2 },
    { key: 'wed', index: 3 },
    { key: 'thu', index: 4 },
    { key: 'fri', index: 5 },
    { key: 'sat', index: 6 },
  ];

  const columns: (keyof typeof columnVisibility)[] = ['assignee', 'startDate', 'endDate', 'duration', 'progress', 'manHours'];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md m-4" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b">
          <h2 className="text-xl font-bold text-slate-800">{t('settings')}</h2>
        </div>
        <div className="p-6 space-y-6">
          {/* Holiday Settings */}
          <div>
            <h3 className="text-lg font-semibold text-slate-700">{t('holidaySettings')}</h3>
            <p className="text-sm text-slate-500 mb-3">{t('holidaySettingsDesc')}</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {daysOfWeek.map(({ key, index }) => (
                <label key={key} className="flex items-center space-x-2 p-2 rounded-md hover:bg-gray-100 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={holidays.has(index)}
                    onChange={() => handleHolidayChange(index)}
                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-sm text-slate-600">{t(key)}</span>
                </label>
              ))}
            </div>
          </div>
          
          {/* Display Settings */}
          <div>
            <h3 className="text-lg font-semibold text-slate-700">{t('displaySettings')}</h3>
            <p className="text-sm text-slate-500 mb-3">{t('displaySettingsDesc')}</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {columns.map(column => (
                <label key={column} className="flex items-center space-x-2 p-2 rounded-md hover:bg-gray-100 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={columnVisibility[column]}
                    onChange={() => handleColumnVisibilityChange(column)}
                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-sm text-slate-600 capitalize">{t(column as TranslationKey)}</span>
                </label>
              ))}
            </div>
          </div>
          
          {/* Color Settings */}
          <div>
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-slate-700">{t('colorSettings')}</h3>
              <button
                onClick={onResetColors}
                className="text-xs font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
              >
                {t('resetToDefaults')}
              </button>
            </div>
            <div className="mt-3 space-y-4">
              <div className="flex items-center justify-between">
                <label htmlFor="baseColorText" className="text-sm text-slate-600">{t('baseColor')}</label>
                <div className="flex items-center gap-2">
                  <input
                    id="baseColorText"
                    type="text"
                    value={baseColor}
                    onChange={(e) => setBaseColor(e.target.value)}
                    onFocus={handleInputFocus}
                    className="w-24 px-2 py-1 border border-gray-300 rounded-md shadow-sm text-sm focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  <input
                    type="color"
                    aria-label={t('baseColor')}
                    value={baseColor}
                    onChange={(e) => setBaseColor(e.target.value)}
                    className="p-1 h-8 w-10 block bg-white border border-gray-300 rounded-md cursor-pointer"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <label htmlFor="progressColorText" className="text-sm text-slate-600">{t('progressColor')}</label>
                <div className="flex items-center gap-2">
                  <input
                    id="progressColorText"
                    type="text"
                    value={progressColor}
                    onChange={(e) => setProgressColor(e.target.value)}
                    onFocus={handleInputFocus}
                    className="w-24 px-2 py-1 border border-gray-300 rounded-md shadow-sm text-sm focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  <input
                    type="color"
                    aria-label={t('progressColor')}
                    value={progressColor}
                    onChange={(e) => setProgressColor(e.target.value)}
                    className="p-1 h-8 w-10 block bg-white border border-gray-300 rounded-md cursor-pointer"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <label htmlFor="textColorText" className="text-sm text-slate-600">{t('textColor')}</label>
                <div className="flex items-center gap-2">
                  <input
                    id="textColorText"
                    type="text"
                    value={textColor}
                    onChange={(e) => setTextColor(e.target.value)}
                    onFocus={handleInputFocus}
                    className="w-24 px-2 py-1 border border-gray-300 rounded-md shadow-sm text-sm focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  <input
                    type="color"
                    aria-label={t('textColor')}
                    value={textColor}
                    onChange={(e) => setTextColor(e.target.value)}
                    className="p-1 h-8 w-10 block bg-white border border-gray-300 rounded-md cursor-pointer"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <label htmlFor="progressLineColorText" className="text-sm text-slate-600">{t('progressLineColor')}</label>
                <div className="flex items-center gap-2">
                  <input
                    id="progressLineColorText"
                    type="text"
                    value={progressLineColor}
                    onChange={(e) => setProgressLineColor(e.target.value)}
                    onFocus={handleInputFocus}
                    className="w-24 px-2 py-1 border border-gray-300 rounded-md shadow-sm text-sm focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  <input
                    type="color"
                    aria-label={t('progressLineColor')}
                    value={progressLineColor}
                    onChange={(e) => setProgressLineColor(e.target.value)}
                    className="p-1 h-8 w-10 block bg-white border border-gray-300 rounded-md cursor-pointer"
                  />
                </div>
              </div>
            </div>
          </div>
          
          {/* Row Height Settings */}
          <div>
            <h3 className="text-lg font-semibold text-slate-700">{t('rowHeightSettings')}</h3>
            <p className="text-sm text-slate-500 mb-3">{t('rowHeightSettingsDesc')}</p>
            <div className="flex items-center space-x-4">
               <label htmlFor="rowHeight" className="text-sm text-slate-600">{t('rowHeight')}</label>
              <input
                id="rowHeight"
                type="range"
                min="40"
                max="80"
                value={rowHeight}
                onChange={(e) => setRowHeight(Number(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              <span className="text-sm font-medium text-slate-600 w-12 text-center">{rowHeight}px</span>
            </div>
          </div>

        </div>
        <div className="p-4 bg-slate-50 text-right rounded-b-lg">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            {t('close')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;