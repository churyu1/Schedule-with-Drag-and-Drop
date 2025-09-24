import React, { useState, useEffect, useRef, useCallback } from 'react';
import GanttChart from './components/GanttChart';
import { useLanguage } from './contexts/LanguageContext';
import { translations, TranslationKey } from './lib/translations';
import SettingsIcon from './components/icons/SettingsIcon';
import ZoomInIcon from './components/icons/ZoomInIcon';
import ZoomOutIcon from './components/icons/ZoomOutIcon';
import ProgressLineIcon from './components/icons/ProgressLineIcon';
import XIcon from './components/icons/XIcon';
import SettingsModal from './components/SettingsModal';
import Calendar from './components/Calendar';
import { Task } from './types';
import DownloadIcon from './components/icons/DownloadIcon';
import UploadIcon from './components/icons/UploadIcon';
import {
    formatDateUTC,
    addDaysUTC,
    parseUTCDateString,
    addWorkingDays,
    addOrSubtractWorkingDays,
    calculateWorkingDays,
} from './lib/dateUtils';
import ConfirmModal from './components/ConfirmModal';

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


const App: React.FC = () => {
  const { language, setLanguage } = useLanguage();
  const t = useCallback((key: TranslationKey) => {
    return translations[key][language];
  }, [language]);

  // Global app state
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [confirmModalState, setConfirmModalState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });
  const [holidays, setHolidays] = useState<Set<number>>(() => new Set([0, 6]));
  const [columnVisibility, setColumnVisibility] = useState({
    assignee: true,
    startDate: false,
    endDate: false,
    duration: true,
    progress: true,
    manHours: false,
  });
  const [zoomIndex, setZoomIndex] = useState(3);
  const [progressLineDate, setProgressLineDate] = useState<string | null>(null);
  const [isProgressLineCalendarOpen, setIsProgressLineCalendarOpen] = useState(false);
  const importFileRef = useRef<HTMLInputElement>(null);
  const [rowHeight, setRowHeight] = useState<number>(40);


  // State lifted up from GanttChart
  const [projectName, setProjectName] = useState<string>(() => translations.untitledProject.ja);
  const [projectStart, setProjectStart] = useState<string>(getInitialStartDate());
  const [projectEnd, setProjectEnd] = useState<string>(getInitialEndDate());
  const [creationDate, setCreationDate] = useState<string>(getInitialStartDate());
  const [creatorName, setCreatorName] = useState<string>('');
  
  // Color settings
  const [baseColor, setBaseColor] = useState<string>(INITIAL_COLORS.base);
  const [progressColor, setProgressColor] = useState<string>(INITIAL_COLORS.progress);
  const [textColor, setTextColor] = useState<string>(INITIAL_COLORS.text);
  const [progressLineColor, setProgressLineColor] = useState<string>(INITIAL_COLORS.progressLine);

  const [tasks, setTasks] = useState<Task[]>(() => {
    const initialT = (key: TranslationKey) => translations[key]['ja']; // Default to Japanese for initial state
    const now = new Date();
    const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    
    const task1Start = todayUTC;
    const task1End = addDaysUTC(task1Start, 4); // 5 days
    
    const task2Start = addDaysUTC(task1End, 1);
    const task2End = addDaysUTC(task2Start, 9); // 10 days
    
    const task3Start = addDaysUTC(task2End, 1);
    const task3End = addDaysUTC(task3Start, 19); // 20 days
    
    const task4Start = addDaysUTC(task3Start, 5); // Parallel
    const task4End = addDaysUTC(task4Start, 14); // 15 days
    
    const task5Start = addDaysUTC(task3Start, 7); // Parallel
    const task5End = addDaysUTC(task5Start, 17); // 18 days

    const task6Start = addDaysUTC(task4End, -3); // Overlap
    const task6End = addDaysUTC(task6Start, 19); // 20 days

    const task7Start = addDaysUTC(task4End, 1); 
    const task7End = addDaysUTC(task7Start, 9); // 10 days

    const task8Start = addDaysUTC(task6End, 1);
    const task8End = addDaysUTC(task8Start, 4); // 5 days

    return [
        { id: '1', name: initialT('temporaryWorks'), assignee: '', startDate: formatDateUTC(task1Start), endDate: formatDateUTC(task1End), progress: 0, manHours: 20 },
        { id: '2', name: initialT('earthworks'), assignee: '', startDate: formatDateUTC(task2Start), endDate: formatDateUTC(task2End), progress: 0, manHours: 80 },
        { id: '3', name: initialT('structuralWork'), assignee: '', startDate: formatDateUTC(task3Start), endDate: formatDateUTC(task3End), progress: 0, manHours: 200 },
        { id: '4', name: initialT('exteriorWork'), assignee: '', startDate: formatDateUTC(task4Start), endDate: formatDateUTC(task4End), progress: 0, manHours: 150 },
        { id: '5', name: initialT('mepWorks'), assignee: '', startDate: formatDateUTC(task5Start), endDate: formatDateUTC(task5End), progress: 0, manHours: 180 },
        { id: '6', name: initialT('interiorWork'), assignee: '', startDate: formatDateUTC(task6Start), endDate: formatDateUTC(task6End), progress: 0, manHours: 200 },
        { id: '7', name: initialT('landscaping'), assignee: '', startDate: formatDateUTC(task7Start), endDate: formatDateUTC(task7End), progress: 0, manHours: 50 },
        { id: '8', name: initialT('completionHandover'), assignee: '', startDate: formatDateUTC(task8Start), endDate: formatDateUTC(task8End), progress: 0, manHours: 10 },
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

  const handleDeleteTask = (id: string) => {
    setTasks(prev => prev.filter(task => task.id !== id));
  };

  const handleDuplicateTask = (taskId: string) => {
    setTasks(currentTasks => {
      const taskIndex = currentTasks.findIndex(t => t.id === taskId);
      if (taskIndex === -1) {
        return currentTasks;
      }
      const originalTask = currentTasks[taskIndex];
      const newTask: Task = {
        ...originalTask,
        id: Date.now().toString(),
        name: `${originalTask.name}${t('copySuffix')}`,
      };
      const newTasks = [...currentTasks];
      newTasks.splice(taskIndex + 1, 0, newTask);
      return newTasks;
    });
  };

  const handleTaskChange = (id: string, field: keyof Task, value: string | number | undefined) => {
    setTasks(prev => prev.map(task => task.id === id ? { ...task, [field]: value } : task));
  };

  const handleDurationChange = (task: Task, newDurationStr: string) => {
    const newDuration = parseInt(newDurationStr, 10);
    if (isNaN(newDuration) || newDuration < 1) return;

    const startDate = parseUTCDateString(task.startDate);
    if (startDate) {
        const newEndDate = addWorkingDays(startDate, newDuration, holidays);
        handleTaskChange(task.id, 'endDate', formatDateUTC(newEndDate));
    }
  };

  const handleProgressChange = (taskId: string, newProgressStr: string) => {
    let newProgress = parseInt(newProgressStr, 10);
    if (isNaN(newProgress)) {
        newProgress = 0;
    }
    const clampedProgress = Math.max(0, Math.min(100, newProgress));
    handleTaskChange(taskId, 'progress', clampedProgress);
  };

  const handleManHoursChange = (taskId: string, newManHoursStr: string) => {
    let newManHours = parseFloat(newManHoursStr);
    if (isNaN(newManHours)) {
      handleTaskChange(taskId, 'manHours', undefined);
      return;
    }
    const clampedManHours = Math.max(0, newManHours);
    handleTaskChange(taskId, 'manHours', clampedManHours);
  };

  const handleTaskDateSet = (taskId: string, startDateStr: string, endDateStr: string) => {
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
    taskId: string,
    actionType: 'move' | 'resize-start' | 'resize-end',
    initialStartDate: Date,
    initialEndDate: Date,
    dayOffset: number
  ) => {
      const pStart = parseUTCDateString(projectStart);
      const pEnd = parseUTCDateString(projectEnd);
      if (!pStart || !pEnd) return;

      setTasks(currentTasks =>
        currentTasks.map(task => {
          if (task.id === taskId) {
            let newStartDate: Date;
            let newEndDate: Date;

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

  const handleTaskReorder = (draggedTaskId: string, dropIndex: number) => {
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
    const handleClickOutside = (event: MouseEvent) => {
        if (!(event.target as HTMLElement).closest('[data-calendar-popover]') && !(event.target as HTMLElement).closest('[data-calendar-toggle]')) {
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

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
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
    <div className="min-h-screen bg-gray-100 text-gray-800 font-sans">
      {isSettingsModalOpen && (
        <SettingsModal
          onClose={() => setIsSettingsModalOpen(false)}
          holidays={holidays}
          setHolidays={setHolidays}
          columnVisibility={columnVisibility}
          setColumnVisibility={setColumnVisibility}
          baseColor={baseColor}
          setBaseColor={setBaseColor}
          progressColor={progressColor}
          setProgressColor={setProgressColor}
          textColor={textColor}
          setTextColor={setTextColor}
          progressLineColor={progressLineColor}
          setProgressLineColor={setProgressLineColor}
          rowHeight={rowHeight}
          setRowHeight={setRowHeight}
          onResetColors={handleResetColors}
        />
      )}
      {confirmModalState.isOpen && (
        <ConfirmModal
          title={confirmModalState.title}
          message={confirmModalState.message}
          onConfirm={confirmModalState.onConfirm}
          onClose={() => setConfirmModalState({ isOpen: false, title: '', message: '', onConfirm: () => {} })}
          confirmText={t('delete')}
          cancelText={t('cancel')}
        />
      )}
      <header className="bg-white shadow-md sticky top-0 z-40">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-slate-700 tracking-tight">
              {t('ganttChartMaker')}
            </h1>
            <p className="text-slate-500 mt-1">{t('appDescription')}</p>
          </div>
          
          <div className="flex items-center space-x-2 sm:space-x-4">
            <div className="flex items-center justify-end space-x-2 p-1 sm:p-2 rounded-lg bg-slate-100 border border-slate-200">
                <button
                    onClick={() => setIsSettingsModalOpen(true)}
                    className="p-2 rounded-full text-gray-500 hover:bg-gray-200 hover:text-gray-700 transition-colors"
                    title={t('settings')}
                >
                    <SettingsIcon className="w-5 h-5" />
                </button>
                <div className="h-6 border-l border-gray-300"></div>
                <div className="relative">
                    <button
                        data-calendar-toggle
                        onClick={() => setIsProgressLineCalendarOpen(prev => !prev)}
                        className="p-2 rounded-full text-gray-500 hover:bg-gray-200 transition-colors"
                        title={t('progressLine')}
                    >
                        <ProgressLineIcon className="w-5 h-5" />
                    </button>
                    {isProgressLineCalendarOpen && (
                         <Calendar
                            initialDate={progressLineDate || undefined}
                            onSelectDate={(date) => {
                                setProgressLineDate(date);
                                setIsProgressLineCalendarOpen(false);
                            }}
                            onClose={() => setIsProgressLineCalendarOpen(false)}
                            minDate={projectStart}
                            maxDate={projectEnd}
                        />
                    )}
                </div>
                {progressLineDate && (
                    <button 
                        onClick={() => setProgressLineDate(null)}
                        className="p-1 rounded-full text-red-500 bg-red-100 hover:bg-red-200 transition-colors"
                        title={t('clearProgressLine')}
                    >
                        <XIcon className="w-4 h-4" />
                    </button>
                )}
                <div className="h-6 border-l border-gray-300"></div>
                <button
                    onClick={handleZoomOut}
                    disabled={zoomIndex === 0}
                    className="p-2 rounded-full text-gray-500 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    title={t('zoomOut')}
                >
                    <ZoomOutIcon className="w-5 h-5" />
                </button>
                <button
                    onClick={handleZoomIn}
                    disabled={zoomIndex === ZOOM_LEVELS.length - 1}
                    className="p-2 rounded-full text-gray-500 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    title={t('zoomIn')}
                >
                    <ZoomInIcon className="w-5 h-5" />
                </button>
            </div>
            <div className="flex items-center justify-end space-x-2 p-1 sm:p-2 rounded-lg bg-slate-100 border border-slate-200">
                <button onClick={handleImportClick} className="p-2 rounded-full text-gray-500 hover:bg-gray-200 hover:text-gray-700 transition-colors" title={t('importData')}>
                    <UploadIcon className="w-5 h-5" />
                </button>
                <input type="file" ref={importFileRef} onChange={handleFileChange} accept=".json, .gantt.json" className="hidden" />
                <div className="h-6 border-l border-gray-300"></div>
                <button onClick={handleExport} className="p-2 rounded-full text-gray-500 hover:bg-gray-200 hover:text-gray-700 transition-colors" title={t('exportData')}>
                    <DownloadIcon className="w-5 h-5" />
                </button>
            </div>
            <button
              onClick={toggleLanguage}
              className="px-4 py-2 border border-slate-300 rounded-md text-sm font-medium text-slate-600 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
              aria-label={`Switch to ${language === 'ja' ? 'English' : '日本語'}`}
            >
              {language === 'ja' ? 'English' : '日本語'}
            </button>
          </div>
        </div>
      </header>
      <main className="container mx-auto p-4 sm:p-6 lg:p-8">
        <GanttChart 
          projectName={projectName}
          setProjectName={setProjectName}
          projectStart={projectStart}
          setProjectStart={setProjectStart}
          projectEnd={projectEnd}
          setProjectEnd={setProjectEnd}
          creationDate={creationDate}
          setCreationDate={setCreationDate}
          creatorName={creatorName}
          setCreatorName={setCreatorName}
          tasks={tasks}
          holidays={holidays}
          columnVisibility={columnVisibility}
          zoomIndex={zoomIndex}
          progressLineDate={progressLineDate}
          baseColor={baseColor}
          progressColor={progressColor}
          textColor={textColor}
          progressLineColor={progressLineColor}
          rowHeight={rowHeight}
          onDeleteAllTasks={handleDeleteAllTasks}
          onAddTask={handleAddTask}
          onDeleteTask={handleDeleteTask}
          onDuplicateTask={handleDuplicateTask}
          onTaskChange={handleTaskChange}
          onDurationChange={handleDurationChange}
          onProgressChange={handleProgressChange}
          onManHoursChange={handleManHoursChange}
          onTaskDateSet={handleTaskDateSet}
          onTaskDragUpdate={handleTaskDragUpdate}
          onTaskReorder={handleTaskReorder}
        />
      </main>
    </div>
  );
};

export default App;