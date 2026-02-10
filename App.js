
import React, { useState, useEffect, useRef, useCallback } from 'react';
import GanttChart from './components/GanttChart.js';
import { useLanguage } from './contexts/LanguageContext.js';
import { translations } from './lib/translations.js';
import SettingsIcon from './components/icons/SettingsIcon.js';
import ZoomInIcon from './components/icons/ZoomInIcon.js';
import ZoomOutIcon from './components/icons/ZoomOutIcon.js';
import ProgressLineIcon from './components/icons/ProgressLineIcon.js';
import XIcon from './components/icons/XIcon.js';
import SettingsModal from './components/SettingsModal.js';
import Calendar from './components/Calendar.js';
import DownloadIcon from './components/icons/DownloadIcon.js';
import UploadIcon from './components/icons/UploadIcon.js';
import {
    formatDateUTC,
    addDaysUTC,
    parseUTCDateString,
    addWorkingDays,
    addOrSubtractWorkingDays,
    calculateWorkingDays,
} from './lib/dateUtils.js';
import ConfirmModal from './components/ConfirmModal.js';

const ZOOM_LEVELS = [8, 12, 18, 24, 40, 64];

const getInitialStartDate = () => {
    const now = new Date();
    const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    return formatDateUTC(todayUTC);
};

const getInitialEndDate = () => {
    const now = new Date();
    const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const futureDate = addDaysUTC(todayUTC, 60);
    return formatDateUTC(futureDate);
};

const INITIAL_COLORS = {
    base: '#fef08a',
    progress: '#bae6fd',
    text: '#000000',
    progressLine: '#ff0000',
};


const App = () => {
  const { language, setLanguage } = useLanguage();
  const t = useCallback((key) => {
    return translations[key][language];
  }, [language]);

  // Global app state
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [confirmModalState, setConfirmModalState] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });
  const [holidays, setHolidays] = useState(() => new Set([0, 6]));
  const [columnVisibility, setColumnVisibility] = useState({
    assignee: true,
    startDate: false,
    endDate: false,
    duration: true,
    progress: true,
    manHours: false,
  });
  const [zoomIndex, setZoomIndex] = useState(3);
  const [progressLineDate, setProgressLineDate] = useState(null);
  const [isProgressLineCalendarOpen, setIsProgressLineCalendarOpen] = useState(false);
  const importFileRef = useRef(null);
  const [rowHeight, setRowHeight] = useState(40);


  // State lifted up from GanttChart
  const [projectName, setProjectName] = useState(() => translations.untitledProject.ja);
  const [projectStart, setProjectStart] = useState(getInitialStartDate());
  const [projectEnd, setProjectEnd] = useState(getInitialEndDate());
  const [creationDate, setCreationDate] = useState(getInitialStartDate());
  const [creatorName, setCreatorName] = useState('');
  
  // Color settings
  const [baseColor, setBaseColor] = useState(INITIAL_COLORS.base);
  const [progressColor, setProgressColor] = useState(INITIAL_COLORS.progress);
  const [textColor, setTextColor] = useState(INITIAL_COLORS.text);
  const [progressLineColor, setProgressLineColor] = useState(INITIAL_COLORS.progressLine);

  const [tasks, setTasks] = useState(() => {
    const initialT = (key) => translations[key]['ja']; // Default to Japanese for initial state
    return [
      { id: '1', name: `${initialT('newTaskName')} 1`, assignee: '', startDate: '', endDate: '', progress: 0, manHours: 0 },
      { id: '2', name: `${initialT('newTaskName')} 2`, assignee: '', startDate: '', endDate: '', progress: 0, manHours: 0 },
      { id: '3', name: `${initialT('newTaskName')} 3`, assignee: '', startDate: '', endDate: '', progress: 0, manHours: 0 },
    ];
  });

  const handleZoomIn = () => setZoomIndex(prev => Math.min(prev + 1, ZOOM_LEVELS.length - 1));
  const handleZoomOut = () => setZoomIndex(prev => Math.max(prev - 1, 0));

  const toggleLanguage = () => {
    setLanguage(lang => (lang === 'ja' ? 'en' : 'ja'));
  };

  const handleResetColors = () => {
    setBaseColor(INITIAL_COLORS.base);
    setProgressColor(INITIAL_COLORS.progress);
    setTextColor(INITIAL_COLORS.text);
    setProgressLineColor(INITIAL_COLORS.progressLine);
  };
  
  // --- Task Manipulation Logic ---

  const handleDeleteAllTasks = () => {
    if (tasks.length === 0) return;
    setConfirmModalState({
        isOpen: true,
        title: t('deleteAllTasks'),
        message: t('confirmDeleteAllTasks'),
        onConfirm: () => {
            setTasks([]);
            setConfirmModalState({ isOpen: false, title: '', message: '', onConfirm: () => {} });
        },
    });
  };

  const handleAddTask = () => {
    const newId = Date.now().toString();
    setTasks(prev => [...prev, { id: newId, name: `${t('newTaskName')} ${prev.length + 1}`, assignee: '', startDate: '', endDate: '', progress: 0, manHours: 0 }]);
  };

  const handleDeleteTask = (id) => {
    setTasks(prev => prev.filter(task => task.id !== id));
  };

  const handleDuplicateTask = (taskId) => {
    setTasks(currentTasks => {
      const taskIndex = currentTasks.findIndex(t => t.id === taskId);
      if (taskIndex === -1) {
        return currentTasks;
      }
      const originalTask = currentTasks[taskIndex];
      const newTask = {
        ...originalTask,
        id: Date.now().toString(),
        name: `${originalTask.name}${t('copySuffix')}`,
      };
      const newTasks = [...currentTasks];
      newTasks.splice(taskIndex + 1, 0, newTask);
      return newTasks;
    });
  };

  const handleTaskChange = (id, field, value) => {
    setTasks(prev => prev.map(task => task.id === id ? { ...task, [field]: value } : task));
  };

  const handleDurationChange = (task, newDurationStr) => {
    const newDuration = parseInt(newDurationStr, 10);
    if (isNaN(newDuration) || newDuration < 1) return;

    const startDate = parseUTCDateString(task.startDate);
    if (startDate) {
        const newEndDate = addWorkingDays(startDate, newDuration, holidays);
        handleTaskChange(task.id, 'endDate', formatDateUTC(newEndDate));
    }
  };

  const handleProgressChange = (taskId, newProgressStr) => {
    let newProgress = parseInt(newProgressStr, 10);
    if (isNaN(newProgress)) {
        newProgress = 0;
    }
    const clampedProgress = Math.max(0, Math.min(100, newProgress));
    handleTaskChange(taskId, 'progress', clampedProgress);
  };

  const handleManHoursChange = (taskId, newManHoursStr) => {
    let newManHours = parseFloat(newManHoursStr);
    if (isNaN(newManHours)) {
      handleTaskChange(taskId, 'manHours', undefined);
      return;
    }
    const clampedManHours = Math.max(0, newManHours);
    handleTaskChange(taskId, 'manHours', clampedManHours);
  };

  const handleTaskDateSet = (taskId, startDateStr, endDateStr) => {
      const d1 = parseUTCDateString(startDateStr);
      const d2 = parseUTCDateString(endDateStr);
      if (d1 && d2) {
          const finalStartDate = d1.getTime() < d2.getTime() ? startDateStr : endDateStr;
          const finalEndDate = d1.getTime() < d2.getTime() ? endDateStr : startDateStr;
          
          setTasks(prev => prev.map(task => 
              task.id === taskId 
              ? { ...task, startDate: finalStartDate, endDate: finalEndDate } 
              : task
          ));
      }
  };

  const handleTaskDragUpdate = (
    taskId,
    actionType,
    initialStartDate,
    initialEndDate,
    dayOffset
  ) => {
      const pStart = parseUTCDateString(projectStart);
      const pEnd = parseUTCDateString(projectEnd);
      if (!pStart || !pEnd) return;

      setTasks(currentTasks =>
        currentTasks.map(task => {
          if (task.id === taskId) {
            let newStartDate;
            let newEndDate;

            switch (actionType) {
              case 'move': {
                const durationInWorkingDays = calculateWorkingDays(initialStartDate, initialEndDate, holidays) || 1;
                let potentialStartDate = addDaysUTC(initialStartDate, dayOffset);

                if (potentialStartDate.getTime() < pStart.getTime()) {
                  potentialStartDate = pStart;
                }
                let potentialEndDate = addWorkingDays(potentialStartDate, durationInWorkingDays, holidays);

                if (potentialEndDate.getTime() > pEnd.getTime()) {
                  potentialEndDate = pEnd;
                  potentialStartDate = addOrSubtractWorkingDays(potentialEndDate, -(durationInWorkingDays - 1), holidays);
                  if (potentialStartDate.getTime() < pStart.getTime()) {
                    potentialStartDate = pStart;
                  }
                }
                newStartDate = potentialStartDate;
                newEndDate = addWorkingDays(newStartDate, durationInWorkingDays, holidays);
                if (newEndDate.getTime() > pEnd.getTime()) newEndDate = pEnd;
                if (newEndDate < newStartDate) newEndDate = newStartDate;
                break;
              }
              case 'resize-start': {
                newStartDate = addDaysUTC(initialStartDate, dayOffset);
                newEndDate = initialEndDate;
                if (newStartDate.getTime() < pStart.getTime()) newStartDate = pStart;
                if (newStartDate.getTime() > newEndDate.getTime()) [newStartDate, newEndDate] = [newEndDate, newStartDate];
                break;
              }
              case 'resize-end': {
                newStartDate = initialStartDate;
                newEndDate = addDaysUTC(initialEndDate, dayOffset);
                if (newEndDate.getTime() > pEnd.getTime()) newEndDate = pEnd;
                if (newEndDate.getTime() < newStartDate.getTime()) [newEndDate, newStartDate] = [newStartDate, newEndDate];
                break;
              }
            }
            return { ...task, startDate: formatDateUTC(newStartDate), endDate: formatDateUTC(newEndDate) };
          }
          return task;
        })
      );
  };

  const handleTaskReorder = (draggedTaskId, dropIndex) => {
      setTasks(currentTasks => {
          const newTasks = [...currentTasks];
          const draggedTask = newTasks.find(t => t.id === draggedTaskId);
          if (!draggedTask) return currentTasks;

          const draggedIndex = newTasks.indexOf(draggedTask);
          newTasks.splice(draggedIndex, 1);
          const adjustedDropIndex = dropIndex > draggedIndex ? dropIndex - 1 : dropIndex;
          newTasks.splice(adjustedDropIndex, 0, draggedTask);

          return newTasks;
      });
  };

  // --- End of Task Manipulation Logic ---


  useEffect(() => {
    if (!isProgressLineCalendarOpen) return;
    const handleClickOutside = (event) => {
        if (!event.target.closest('[data-calendar-popover]') && !event.target.closest('[data-calendar-toggle]')) {
             setIsProgressLineCalendarOpen(false);
        }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
        document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isProgressLineCalendarOpen]);

  const handleExport = () => {
    const dataToSave = {
        projectName,
        projectStart,
        projectEnd,
        creationDate,
        creatorName,
        tasks,
        settings: {
            holidays: Array.from(holidays),
            columnVisibility,
            baseColor,
            progressColor,
            textColor,
            rowHeight,
            progressLineColor,
        }
    };
    const jsonString = JSON.stringify(dataToSave, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;

    const today = new Date();
    const year = today.getFullYear();
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    const day = today.getDate().toString().padStart(2, '0');
    const formattedDate = `${year}-${month}-${day}`;

    a.download = `Schedule_${formattedDate}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportClick = () => {
      importFileRef.current?.click();
  };

  const handleFileChange = (event) => {
      const file = event.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (e) => {
          try {
              const text = e.target?.result;
              if (typeof text !== 'string') throw new Error("File content is not a string");
              const data = JSON.parse(text);

              // Basic validation
              if (!data.projectName || !data.projectStart || !data.projectEnd || !Array.isArray(data.tasks)) {
                  throw new Error("Invalid file format");
              }
              
              setProjectName(data.projectName);
              setProjectStart(data.projectStart);
              setProjectEnd(data.projectEnd);
              if (data.creationDate) setCreationDate(data.creationDate);
              if (data.creatorName) setCreatorName(data.creatorName);
              setTasks(data.tasks);

              if (data.settings) {
                if (data.settings.holidays) {
                    setHolidays(new Set(data.settings.holidays));
                }
                if (data.settings.columnVisibility) {
                    // Merge to handle newly added columns gracefully
                    setColumnVisibility(prev => ({...prev, ...data.settings.columnVisibility}));
                }
                if (data.settings.baseColor) {
                    setBaseColor(data.settings.baseColor);
                }
                if (data.settings.progressColor) {
                    setProgressColor(data.settings.progressColor);
                }
                if (data.settings.textColor) {
                    setTextColor(data.settings.textColor);
                }
                if (data.settings.rowHeight) {
                    setRowHeight(data.settings.rowHeight);
                }
                if (data.settings.progressLineColor) {
                    setProgressLineColor(data.settings.progressLineColor);
                }
              }

          } catch (error) {
              console.error("Failed to import file:", error);
              alert(t('importError'));
          }
      };
      reader.readAsText(file);
      event.target.value = ''; // Reset input to allow re-importing the same file
  };

  return (
    React.createElement('div', { className: "min-h-screen bg-gray-100 text-gray-800 font-sans" },
      isSettingsModalOpen && React.createElement(SettingsModal, {
        onClose: () => setIsSettingsModalOpen(false),
        holidays: holidays,
        setHolidays: setHolidays,
        columnVisibility: columnVisibility,
        setColumnVisibility: setColumnVisibility,
        baseColor: baseColor,
        setBaseColor: setBaseColor,
        progressColor: progressColor,
        setProgressColor: setProgressColor,
        textColor: textColor,
        setTextColor: setTextColor,
        progressLineColor: progressLineColor,
        setProgressLineColor: setProgressLineColor,
        rowHeight: rowHeight,
        setRowHeight: setRowHeight,
        onResetColors: handleResetColors,
      }),
      confirmModalState.isOpen && React.createElement(ConfirmModal, {
        title: confirmModalState.title,
        message: confirmModalState.message,
        onConfirm: confirmModalState.onConfirm,
        onClose: () => setConfirmModalState({ isOpen: false, title: '', message: '', onConfirm: () => {} }),
        confirmText: t('delete'),
        cancelText: t('cancel'),
      }),
      React.createElement('header', { className: "bg-white shadow-md sticky top-0 z-40" },
        React.createElement('div', { className: "w-full px-4 py-4 flex justify-between items-center" },
          React.createElement('div', null,
            React.createElement('h1', { className: "text-2xl font-bold text-slate-700 tracking-tight" }, t('ganttChartMaker')),
            React.createElement('p', { className: "text-slate-500 mt-1" }, t('appDescription'))
          ),
          React.createElement('div', { className: "flex items-center space-x-2 sm:space-x-4" },
            React.createElement('div', { className: "flex items-center justify-end space-x-2 p-1 sm:p-2 rounded-lg bg-slate-100 border border-slate-200" },
              React.createElement('button', {
                onClick: () => setIsSettingsModalOpen(true),
                className: "p-2 rounded-full text-gray-500 hover:bg-gray-200 hover:text-gray-700 transition-colors",
                title: t('settings'),
              }, React.createElement(SettingsIcon, { className: "w-5 h-5" })),
              React.createElement('div', { className: "h-6 border-l border-gray-300" }),
              React.createElement('div', { className: "relative" },
                React.createElement('button', {
                  'data-calendar-toggle': true,
                  onClick: () => setIsProgressLineCalendarOpen(prev => !prev),
                  className: "p-2 rounded-full text-gray-500 hover:bg-gray-200 transition-colors",
                  title: t('progressLine'),
                }, React.createElement(ProgressLineIcon, { className: "w-5 h-5" })),
                isProgressLineCalendarOpen && React.createElement(Calendar, {
                  initialDate: progressLineDate || undefined,
                  onSelectDate: (date) => {
                    setProgressLineDate(date);
                    setIsProgressLineCalendarOpen(false);
                  },
                  onClose: () => setIsProgressLineCalendarOpen(false),
                  minDate: projectStart,
                  maxDate: projectEnd,
                })
              ),
              progressLineDate && React.createElement('button', {
                onClick: () => setProgressLineDate(null),
                className: "p-1 rounded-full text-red-500 bg-red-100 hover:bg-red-200 transition-colors",
                title: t('clearProgressLine'),
              }, React.createElement(XIcon, { className: "w-4 h-4" })),
              React.createElement('div', { className: "h-6 border-l border-gray-300" }),
              React.createElement('button', {
                onClick: handleZoomOut,
                disabled: zoomIndex === 0,
                className: "p-2 rounded-full text-gray-500 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors",
                title: t('zoomOut'),
              }, React.createElement(ZoomOutIcon, { className: "w-5 h-5" })),
              React.createElement('button', {
                onClick: handleZoomIn,
                disabled: zoomIndex === ZOOM_LEVELS.length - 1,
                className: "p-2 rounded-full text-gray-500 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors",
                title: t('zoomIn'),
              }, React.createElement(ZoomInIcon, { className: "w-5 h-5" }))
            ),
            React.createElement('div', { className: "flex items-center justify-end space-x-2 p-1 sm:p-2 rounded-lg bg-slate-100 border border-slate-200" },
              React.createElement('button', { onClick: handleImportClick, className: "p-2 rounded-full text-gray-500 hover:bg-gray-200 hover:text-gray-700 transition-colors", title: t('importData') },
                React.createElement(UploadIcon, { className: "w-5 h-5" })
              ),
              React.createElement('input', { type: "file", ref: importFileRef, onChange: handleFileChange, accept: ".json, .gantt.json", className: "hidden" }),
              React.createElement('div', { className: "h-6 border-l border-gray-300" }),
              React.createElement('button', { onClick: handleExport, className: "p-2 rounded-full text-gray-500 hover:bg-gray-200 hover:text-gray-700 transition-colors", title: t('exportData') },
                React.createElement(DownloadIcon, { className: "w-5 h-5" })
              )
            ),
            React.createElement('button', {
              onClick: toggleLanguage,
              className: "px-4 py-2 border border-slate-300 rounded-md text-sm font-medium text-slate-600 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors",
              'aria-label': `Switch to ${language === 'ja' ? 'English' : '日本語'}`,
            }, language === 'ja' ? 'English' : '日本語')
          )
        )
      ),
      React.createElement('main', { className: "w-full p-2" },
        React.createElement(GanttChart, {
          projectName: projectName,
          setProjectName: setProjectName,
          projectStart: projectStart,
          setProjectStart: setProjectStart,
          projectEnd: projectEnd,
          setProjectEnd: setProjectEnd,
          creationDate: creationDate,
          setCreationDate: setCreationDate,
          creatorName: creatorName,
          setCreatorName: setCreatorName,
          tasks: tasks,
          holidays: holidays,
          columnVisibility: columnVisibility,
          zoomIndex: zoomIndex,
          progressLineDate: progressLineDate,
          baseColor: baseColor,
          progressColor: progressColor,
          textColor: textColor,
          progressLineColor: progressLineColor,
          rowHeight: rowHeight,
          onDeleteAllTasks: handleDeleteAllTasks,
          onAddTask: handleAddTask,
          onDeleteTask: handleDeleteTask,
          onDuplicateTask: handleDuplicateTask,
          onTaskChange: handleTaskChange,
          onDurationChange: handleDurationChange,
          onProgressChange: handleProgressChange,
          onManHoursChange: handleManHoursChange,
          onTaskDateSet: handleTaskDateSet,
          onTaskDragUpdate: handleTaskDragUpdate,
          onTaskReorder: handleTaskReorder,
        })
      )
    )
  );
};

export default App;
