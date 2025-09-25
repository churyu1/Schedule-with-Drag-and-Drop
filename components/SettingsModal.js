import React from 'react';
import { useLanguage } from '../contexts/LanguageContext.js';
import { translations } from '../lib/translations.js';

const SettingsModal = ({
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
  const t = (key) => translations[key][language];

  const handleHolidayChange = (dayIndex) => {
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

  const handleColumnVisibilityChange = (column) => {
    setColumnVisibility((prev) => ({
      ...prev,
      [column]: !prev[column],
    }));
  };
  
  const handleInputFocus = (e) => {
    e.target.select();
  };

  const daysOfWeek = [
    { key: 'sun', index: 0 },
    { key: 'mon', index: 1 },
    { key: 'tue', index: 2 },
    { key: 'wed', index: 3 },
    { key: 'thu', index: 4 },
    { key: 'fri', index: 5 },
    { key: 'sat', index: 6 },
  ];

  const columns = ['assignee', 'startDate', 'endDate', 'duration', 'progress', 'manHours'];

  return (
    React.createElement('div', { className: "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50", onClick: onClose },
      React.createElement('div', { className: "bg-white rounded-lg shadow-xl w-full max-w-md m-4", onClick: e => e.stopPropagation() },
        React.createElement('div', { className: "p-6 border-b" },
          React.createElement('h2', { className: "text-xl font-bold text-slate-800" }, t('settings'))
        ),
        React.createElement('div', { className: "p-6 space-y-6" },
          React.createElement('div', null,
            React.createElement('h3', { className: "text-lg font-semibold text-slate-700" }, t('holidaySettings')),
            React.createElement('p', { className: "text-sm text-slate-500 mb-3" }, t('holidaySettingsDesc')),
            React.createElement('div', { className: "grid grid-cols-2 sm:grid-cols-4 gap-3" },
              daysOfWeek.map(({ key, index }) => {
                const dayColorClass = index === 0 ? 'text-red-600' : index === 6 ? 'text-blue-600' : 'text-slate-600';
                return (
                  React.createElement('label', { key: key, className: "flex items-center space-x-2 p-2 rounded-md hover:bg-gray-100 cursor-pointer" },
                    React.createElement('input', {
                      type: "checkbox",
                      checked: holidays.has(index),
                      onChange: () => handleHolidayChange(index),
                      className: "h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    }),
                    React.createElement('span', { className: `text-sm ${dayColorClass}` }, t(key))
                  )
                );
              })
            )
          ),
          React.createElement('div', null,
            React.createElement('h3', { className: "text-lg font-semibold text-slate-700" }, t('displaySettings')),
            React.createElement('p', { className: "text-sm text-slate-500 mb-3" }, t('displaySettingsDesc')),
            React.createElement('div', { className: "grid grid-cols-2 sm:grid-cols-3 gap-3" },
              columns.map(column => (
                React.createElement('label', { key: column, className: "flex items-center space-x-2 p-2 rounded-md hover:bg-gray-100 cursor-pointer" },
                  React.createElement('input', {
                    type: "checkbox",
                    checked: columnVisibility[column],
                    onChange: () => handleColumnVisibilityChange(column),
                    className: "h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  }),
                  React.createElement('span', { className: "text-sm text-slate-600 capitalize" }, t(column))
                )
              ))
            )
          ),
          React.createElement('div', null,
            React.createElement('div', { className: "flex justify-between items-center" },
              React.createElement('h3', { className: "text-lg font-semibold text-slate-700" }, t('colorSettings')),
              React.createElement('button', {
                onClick: onResetColors,
                className: "text-xs font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
              }, t('resetToDefaults'))
            ),
            React.createElement('div', { className: "mt-3 space-y-4" },
              React.createElement('div', { className: "flex items-center justify-between" },
                React.createElement('label', { htmlFor: "baseColorText", className: "text-sm text-slate-600" }, t('baseColor')),
                React.createElement('div', { className: "flex items-center gap-2" },
                  React.createElement('input', {
                    id: "baseColorText",
                    type: "text",
                    value: baseColor,
                    onChange: (e) => setBaseColor(e.target.value),
                    onFocus: handleInputFocus,
                    className: "w-24 px-2 py-1 border border-gray-300 rounded-md shadow-sm text-sm focus:ring-indigo-500 focus:border-indigo-500"
                  }),
                  React.createElement('input', {
                    type: "color",
                    'aria-label': t('baseColor'),
                    value: baseColor,
                    onChange: (e) => setBaseColor(e.target.value),
                    className: "p-1 h-8 w-10 block bg-white border border-gray-300 rounded-md cursor-pointer"
                  })
                )
              ),
              React.createElement('div', { className: "flex items-center justify-between" },
                React.createElement('label', { htmlFor: "progressColorText", className: "text-sm text-slate-600" }, t('progressColor')),
                React.createElement('div', { className: "flex items-center gap-2" },
                  React.createElement('input', {
                    id: "progressColorText",
                    type: "text",
                    value: progressColor,
                    onChange: (e) => setProgressColor(e.target.value),
                    onFocus: handleInputFocus,
                    className: "w-24 px-2 py-1 border border-gray-300 rounded-md shadow-sm text-sm focus:ring-indigo-500 focus:border-indigo-500"
                  }),
                  React.createElement('input', {
                    type: "color",
                    'aria-label': t('progressColor'),
                    value: progressColor,
                    onChange: (e) => setProgressColor(e.target.value),
                    className: "p-1 h-8 w-10 block bg-white border border-gray-300 rounded-md cursor-pointer"
                  })
                )
              ),
              React.createElement('div', { className: "flex items-center justify-between" },
                React.createElement('label', { htmlFor: "textColorText", className: "text-sm text-slate-600" }, t('textColor')),
                React.createElement('div', { className: "flex items-center gap-2" },
                  React.createElement('input', {
                    id: "textColorText",
                    type: "text",
                    value: textColor,
                    onChange: (e) => setTextColor(e.target.value),
                    onFocus: handleInputFocus,
                    className: "w-24 px-2 py-1 border border-gray-300 rounded-md shadow-sm text-sm focus:ring-indigo-500 focus:border-indigo-500"
                  }),
                  React.createElement('input', {
                    type: "color",
                    'aria-label': t('textColor'),
                    value: textColor,
                    onChange: (e) => setTextColor(e.target.value),
                    className: "p-1 h-8 w-10 block bg-white border border-gray-300 rounded-md cursor-pointer"
                  })
                )
              ),
              React.createElement('div', { className: "flex items-center justify-between" },
                React.createElement('label', { htmlFor: "progressLineColorText", className: "text-sm text-slate-600" }, t('progressLineColor')),
                React.createElement('div', { className: "flex items-center gap-2" },
                  React.createElement('input', {
                    id: "progressLineColorText",
                    type: "text",
                    value: progressLineColor,
                    onChange: (e) => setProgressLineColor(e.target.value),
                    onFocus: handleInputFocus,
                    className: "w-24 px-2 py-1 border border-gray-300 rounded-md shadow-sm text-sm focus:ring-indigo-500 focus:border-indigo-500"
                  }),
                  React.createElement('input', {
                    type: "color",
                    'aria-label': t('progressLineColor'),
                    value: progressLineColor,
                    onChange: (e) => setProgressLineColor(e.target.value),
                    className: "p-1 h-8 w-10 block bg-white border border-gray-300 rounded-md cursor-pointer"
                  })
                )
              )
            )
          ),
          React.createElement('div', null,
            React.createElement('h3', { className: "text-lg font-semibold text-slate-700" }, t('rowHeightSettings')),
            React.createElement('p', { className: "text-sm text-slate-500 mb-3" }, t('rowHeightSettingsDesc')),
            React.createElement('div', { className: "flex items-center space-x-4" },
               React.createElement('label', { htmlFor: "rowHeight", className: "text-sm text-slate-600" }, t('rowHeight')),
              React.createElement('input', {
                id: "rowHeight",
                type: "range",
                min: "40",
                max: "80",
                value: rowHeight,
                onChange: (e) => setRowHeight(Number(e.target.value)),
                className: "w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              }),
              React.createElement('span', { className: "text-sm font-medium text-slate-600 w-12 text-center" }, `${rowHeight}px`)
            )
          )
        ),
        React.createElement('div', { className: "p-4 bg-slate-50 text-right rounded-b-lg" },
          React.createElement('button', {
            onClick: onClose,
            className: "px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          }, t('close'))
        )
      )
    )
  );
};

export default SettingsModal;
