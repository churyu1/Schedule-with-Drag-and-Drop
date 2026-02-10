
import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import type { Task } from '../types.ts';
import PlusIcon from './icons/PlusIcon.tsx';
import TrashIcon from './icons/TrashIcon.tsx';
import CalendarIcon from './icons/CalendarIcon.tsx';
import Calendar from './Calendar.tsx';
import { useLanguage } from '../contexts/LanguageContext.tsx';
import { translations, TranslationKey } from '../lib/translations.ts';
import GripVerticalIcon from './icons/GripVerticalIcon.tsx';
import DuplicateIcon from './icons/DuplicateIcon.tsx';
import { 
    parseUTCDateString, 
    formatDateUTC, 
    addDaysUTC, 
    getDatesInRange,
    calculateWorkingDays,
} from '../lib/dateUtils.ts';


const ZOOM_LEVELS = [8, 12, 18, 24, 40, 64];

type DragActionType = 'move' | 'resize-start' | 'resize-end';

const getReactEventCoords = (e: React.MouseEvent | React.TouchEvent) => {
    if ('touches' in e) {
        return { clientX: e.touches[0].clientX, clientY: e.touches[0].clientY };
    }
    return { clientX: e.clientX, clientY: e.clientY };
};

const getNativeEventCoords = (e: MouseEvent | TouchEvent) => {
    if (e.type.startsWith('touch')) {
        const touch = (e as TouchEvent).touches[0] || (e as TouchEvent).changedTouches[0];
        if (touch) {
            return { clientX: touch.clientX, clientY: touch.clientY };
        }
    }
    const mouseEvent = e as MouseEvent;
    return { clientX: mouseEvent.clientX, clientY: mouseEvent.clientY };
};

interface GanttChartProps {
  projectName: string;
  setProjectName: React.Dispatch<React.SetStateAction<string>>;
  projectStart: string;
  setProjectStart: React.Dispatch<React.SetStateAction<string>>;
  projectEnd: string;
  setProjectEnd: React.Dispatch<React.SetStateAction<string>>;
  creationDate: string;
  setCreationDate: React.Dispatch<React.SetStateAction<string>>;
  creatorName: string;
  setCreatorName: React.Dispatch<React.SetStateAction<string>>;
  tasks: Task[];
  holidays: Set<number>;
  columnVisibility: {
    assignee: boolean;
    startDate: boolean;
    endDate: boolean;
    duration: boolean;
    progress: boolean;
    manHours: boolean;
  };
  zoomIndex: number;
  progressLineDate: string | null;
  baseColor: string;
  progressColor: string;
  textColor: string;
  progressLineColor: string;
  rowHeight: number;
  onDeleteAllTasks: () => void;
  onAddTask: () => void;
  onDeleteTask: (id: string) => void;
  onDuplicateTask: (id: string) => void;
  onTaskChange: (id: string, field: keyof Task, value: string | number | undefined) => void;
  onDurationChange: (task: Task, newDurationStr: string) => void;
  onProgressChange: (taskId: string, newProgressStr: string) => void;
  onManHoursChange: (taskId: string, newManHoursStr: string) => void;
  onTaskDateSet: (taskId: string, startDate: string, endDate: string) => void;
  onTaskDragUpdate: (
    taskId: string,
    actionType: DragActionType,
    initialStartDate: Date,
    initialEndDate: Date,
    dayOffset: number
  ) => void;
  onTaskReorder: (draggedTaskId: string, dropIndex: number) => void;
}

const GanttChart: React.FC<GanttChartProps> = ({
  projectName,
  setProjectName,
  projectStart,
  setProjectStart,
  projectEnd,
  setProjectEnd,
  creationDate,
  setCreationDate,
  creatorName,
  setCreatorName,
  tasks,
  holidays,
  columnVisibility,
  zoomIndex,
  progressLineDate,
  baseColor,
  progressColor,
  textColor,
  progressLineColor,
  rowHeight,
  onDeleteAllTasks,
  onAddTask,
  onDeleteTask,
  onDuplicateTask,
  onTaskChange,
  onDurationChange,
  onProgressChange,
  onManHoursChange,
  onTaskDateSet,
  onTaskDragUpdate,
  onTaskReorder,
}) => {
  const { language } = useLanguage();
  const t = useCallback((key: TranslationKey) => {
    return translations[key][language];
  }, [language]);

  const [activeCalendar, setActiveCalendar] = useState<{ type: string; taskId?: string, position: 'top' | 'bottom' } | null>(null);
  
  const timelineHeaderRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const taskRowRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const taskDetailsHeaderRef = useRef<HTMLDivElement>(null);
  const ganttGridRef = useRef<HTMLDivElement>(null);

  const [dragPreview, setDragPreview] = useState<{ taskId: string; start: string; end: string; } | null>(null);
  const [tooltip, setTooltip] = useState<{ visible: boolean; x: number; y: number; content: string } | null>(null);
  
  const [dragAction, setDragAction] = useState<{
    type: DragActionType;
    taskId: string;
    initialX: number;
    initialStartDate: Date;
    initialEndDate: Date;
  } | null>(null);

  const [reorderState, setReorderState] = useState<{ draggedTaskId: string; dropIndex: number | null } | null>(null);
  const [totalGridWidth, setTotalGridWidth] = useState(0);

  const handleInputFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.select();
  };

  useEffect(() => {
    const gridElement = ganttGridRef.current;
    if (gridElement) {
        const observer = new ResizeObserver((entries) => {
            if (entries[0]) {
                setTotalGridWidth(entries[0].target.scrollWidth);
            }
        });
        observer.observe(gridElement);
        return () => {
            if (gridElement) {
                observer.unobserve(gridElement);
            }
        };
    }
  }, []);

  const dayWidth = useMemo(() => ZOOM_LEVELS[zoomIndex], [zoomIndex]);

  const openCalendar = useCallback((e: React.MouseEvent, type: string, taskId?: string) => {
    // Per user request, force task-related calendars to always open downwards.
    if (type === 'taskStartDate' || type === 'taskEndDate') {
      setActiveCalendar(prev => {
        const isActive = prev?.type === type && prev?.taskId === taskId;
        return isActive ? null : { type, taskId, position: 'bottom' };
      });
      return;
    }
    
    // For other calendars (project header), use dynamic positioning to avoid clipping.
    const button = e.currentTarget;
    const buttonRect = button.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const spaceBelow = viewportHeight - buttonRect.bottom;
    const spaceAbove = buttonRect.top;
    const calendarHeight = 320; // Estimated height of the calendar popover

    let position: 'top' | 'bottom' = 'bottom'; // Default to bottom

    // Prioritize opening downwards if there's enough space.
    if (spaceBelow >= calendarHeight) {
        position = 'bottom';
    } 
    // Otherwise, try opening upwards if there's enough space.
    else if (spaceAbove >= calendarHeight) {
        position = 'top';
    } 
    // If not enough space either way, open where there is more space to minimize clipping.
    else if (spaceAbove > spaceBelow) {
        position = 'top';
    }
    
    setActiveCalendar(prev => {
        const isActive = prev?.type === type && prev?.taskId === taskId;
        return isActive ? null : { type, taskId, position };
    });
  }, []);
  
  useEffect(() => {
    if (!activeCalendar) return;

    const handleClickOutside = (event: MouseEvent) => {
        if (!(event.target as HTMLElement).closest('[data-calendar-popover]') && !(event.target as HTMLElement).closest('[data-calendar-toggle]')) {
             setActiveCalendar(null);
        }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
        document.removeEventListener('mousedown', handleClickOutside);
    };
}, [activeCalendar]);

    useEffect(() => {
        // Ensure refs are cleaned up to prevent memory leaks
        const taskIds = new Set(tasks.map(t => t.id));
        Object.keys(taskRowRefs.current).forEach(taskId => {
            if (!taskIds.has(taskId)) {
                delete taskRowRefs.current[taskId];
            }
        });
    }, [tasks]);

  const dateArray = useMemo(() => {
    const start = parseUTCDateString(projectStart);
    const end = parseUTCDateString(projectEnd);
    if (!start || !end || start > end) return [];
    return getDatesInRange(start, end);
  }, [projectStart, projectEnd]);

  const getTaskDuration = useCallback((startDateStr: string, endDateStr: string): number => {
    const start = parseUTCDateString(startDateStr);
    const end = parseUTCDateString(endDateStr);
    if (!start || !end) return 0;
    return calculateWorkingDays(start, end, holidays);
  }, [holidays]);
    
  const getGridPosition = (start: Date, end: Date) => {
    if (dateArray.length === 0 || end < start) return { gridColumn: '1 / span 1', opacity: 0 };

    const projectStartDate = dateArray[0];
    const projectEndDate = dateArray[dateArray.length - 1];

    // Find the intersection of the task and project timelines for rendering
    const renderStart = new Date(Math.max(start.getTime(), projectStartDate.getTime()));
    const renderEnd = new Date(Math.min(end.getTime(), projectEndDate.getTime()));

    // If there is no intersection, the task is not visible
    if (renderEnd < renderStart) {
      return { gridColumn: '1 / span 1', opacity: 0 };
    }

    const startIndex = dateArray.findIndex(d => d.getTime() === renderStart.getTime());
    const endIndex = dateArray.findIndex(d => d.getTime() === renderEnd.getTime());
    
    if (startIndex === -1 || endIndex === -1) {
       return { gridColumn: '1 / span 1', opacity: 0 };
    }
    
    return { gridColumn: `${startIndex + 1} / ${endIndex + 2}` };
  };
  
  const getTaskSegments = useCallback((task: Task): {startDate: Date, endDate: Date}[] => {
    const start = parseUTCDateString(task.startDate);
    const end = parseUTCDateString(task.endDate);
    if (!start || !end || end < start) return [];

    const segments: {startDate: Date, endDate: Date}[] = [];
    let segmentStart: Date | null = null;
    
    const current = new Date(start.getTime());
    while(current.getTime() <= end.getTime()){
      const isHoliday = holidays.has(current.getUTCDay());
      
      if(!isHoliday && segmentStart === null){
        segmentStart = new Date(current.getTime());
      } else if(isHoliday && segmentStart !== null){
        const segmentEnd = new Date(current.getTime());
        segmentEnd.setUTCDate(segmentEnd.getUTCDate() - 1);
        segments.push({startDate: segmentStart, endDate: segmentEnd});
        segmentStart = null;
      }
      current.setUTCDate(current.getUTCDate() + 1);
    }
    
    if (segmentStart !== null) {
      segments.push({startDate: segmentStart, endDate: end});
    }

    return segments;
  }, [holidays]);

  const monthHeaders = useMemo(() => {
    const months: { formatted: string; days: number }[] = [];
    if (dateArray.length === 0) return months;

    let currentMonth = -1;
    let currentYear = -1;

    dateArray.forEach(date => {
        const month = date.getUTCMonth();
        const year = date.getUTCFullYear();
        if (month !== currentMonth || year !== currentYear) {
            currentMonth = month;
            currentYear = year;
            const formattedString = date.toLocaleString(language === 'ja' ? 'ja-JP' : 'en-US', {
                year: 'numeric',
                month: 'long',
                timeZone: 'UTC',
            });
            months.push({ formatted: formattedString, days: 0 });
        }
        months[months.length - 1].days++;
    });
    return months;
  }, [dateArray, language]);

  const dateHeaders = useMemo(() => {
    if (dateArray.length === 0) return [];

    let interval = 1;
    if (dayWidth < 24) interval = 2;
    if (dayWidth < 18) interval = 3;
    if (dayWidth < 12) interval = 7;

    const headers = [];
    for (let i = 0; i < dateArray.length; i += interval) {
      const date = dateArray[i];
      const remainingDays = dateArray.length - i;
      const span = Math.min(interval, remainingDays);
      
      const lastDayInSpan = dateArray[i + span - 1];
      const dayAfterLast = addDaysUTC(lastDayInSpan, 1);
      const isLastDayOfMonth = dayAfterLast.getUTCDate() === 1;

      headers.push({
        date,
        span,
        isLastDayOfMonth,
      });
    }
    return headers;
  }, [dateArray, dayWidth]);

  const getDateFromX = useCallback((x: number) => {
    // This implementation calculates the position relative to the main grid element,
    // which correctly accounts for horizontal scrolling.
    if (!ganttGridRef.current || !taskDetailsHeaderRef.current || dateArray.length === 0) return null;

    const gridRect = ganttGridRef.current.getBoundingClientRect();
    const detailsWidth = taskDetailsHeaderRef.current.offsetWidth;
    
    // The timeline starts visually after the task details column.
    // The absolute left position of the timeline content's start.
    const timelineStartLeft = gridRect.left + detailsWidth;

    // The mouse position relative to the beginning of the timeline content.
    const relativeX = x - timelineStartLeft;

    if (dayWidth <= 0 || relativeX < 0) return null;

    const dateIndex = Math.floor(relativeX / dayWidth);

    if (dateIndex >= 0 && dateIndex < dateArray.length) {
        return dateArray[dateIndex];
    }
    return null;
  }, [dateArray, dayWidth]);

 const handlePointerDownForCreate = useCallback((e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
      if (e.type.startsWith('touch')) {
        e.preventDefault();
      }
      const { clientX } = getReactEventCoords(e);
      const startDate = getDateFromX(clientX);
      if (startDate) {
          if (holidays.has(startDate.getUTCDay())) {
            // Prevent task creation on holidays
            return;
          }
          const taskId = (e.currentTarget as HTMLElement).dataset.taskRowId;
          if (taskId) {
            const startDateStr = formatDateUTC(startDate);
            setDragPreview({ taskId, start: startDateStr, end: startDateStr });
          }
      }
      setTooltip(null);
  }, [getDateFromX, holidays]);

  const handlePointerMove = useCallback((e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    const timelineRowCell = e.currentTarget;
    const { clientX, clientY } = getReactEventCoords(e);

    // Handle active drag preview update
    if(dragPreview) {
        if (e.type === 'touchmove') e.preventDefault(); // Prevent scrolling
        const currentDate = getDateFromX(clientX);
        if (currentDate) {
            setDragPreview(prev => (prev ? { ...prev, end: formatDateUTC(currentDate) } : null));
        }
        return; // Don't do cursor/tooltip logic while actively creating a task
    }

    if (e.type.startsWith('touch') || dragAction || reorderState) {
        setTooltip(null);
        return;
    }
    
    // Mouse-only logic for cursor and tooltip
    const taskId = timelineRowCell.dataset.taskRowId;
    const task = tasks.find(t => t.id === taskId);

    if (task && !task.startDate && !task.endDate) {
        const dateUnderCursor = getDateFromX(clientX);
        const isHolidayUnderCursor = dateUnderCursor ? holidays.has(dateUnderCursor.getUTCDay()) : true;

        if (isHolidayUnderCursor) {
            timelineRowCell.style.cursor = 'not-allowed';
            setTooltip(null);
        } else {
            timelineRowCell.style.cursor = 'crosshair';
            setTooltip({
                visible: true,
                x: clientX,
                y: clientY,
                content: t('dragToSetDuration'),
            });
        }
    } else {
        timelineRowCell.style.cursor = 'default';
        setTooltip(null);
    }
  }, [dragPreview, dragAction, reorderState, tasks, getDateFromX, holidays, t]);
  
  const handleMouseLeave = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    // Reset cursor and tooltip when mouse leaves the row
    e.currentTarget.style.cursor = 'default';
    setTooltip(null);
  }, []);

  useEffect(() => {
    if (!dragPreview) return;

    const handlePointerUpGlobal = () => {
        if (dragPreview) {
            onTaskDateSet(dragPreview.taskId, dragPreview.start, dragPreview.end);
            setDragPreview(null);
        }
    };

    window.addEventListener('mouseup', handlePointerUpGlobal);
    window.addEventListener('touchend', handlePointerUpGlobal);
    return () => {
        window.removeEventListener('mouseup', handlePointerUpGlobal);
        window.removeEventListener('touchend', handlePointerUpGlobal);
    };
  }, [dragPreview, onTaskDateSet]);

  const handleDragStart = useCallback((e: React.MouseEvent | React.TouchEvent, task: Task, type: DragActionType) => {
    if (e.type.startsWith('touch')) {
        e.preventDefault();
    }
    e.stopPropagation();
    const start = parseUTCDateString(task.startDate);
    const end = parseUTCDateString(task.endDate);
    if (!start || !end) return;

    const { clientX } = getReactEventCoords(e);

    setDragAction({
      type,
      taskId: task.id,
      initialX: clientX,
      initialStartDate: start,
      initialEndDate: end,
    });
  }, []);

  const handleDragMove = useCallback((e: MouseEvent | TouchEvent) => {
    if (e.type === 'touchmove') {
        e.preventDefault();
    }
    if (!dragAction) return;
    if (dayWidth <= 0) return;

    const coords = getNativeEventCoords(e);
    if (!coords) return;
    const { clientX } = coords;

    const deltaX = clientX - dragAction.initialX;
    const dayOffset = Math.round(deltaX / dayWidth);

    onTaskDragUpdate(
        dragAction.taskId,
        dragAction.type,
        dragAction.initialStartDate,
        dragAction.initialEndDate,
        dayOffset
    );

    // If resizing causes start/end to flip, update the drag action type
    const task = tasks.find(t => t.id === dragAction.taskId);
    if (task) {
        const newStart = parseUTCDateString(task.startDate);
        const newEnd = parseUTCDateString(task.endDate);
        if (newStart && newEnd && newStart > newEnd) {
            if (dragAction.type === 'resize-start') {
                setDragAction(prev => (prev ? { ...prev, type: 'resize-end' } : null));
            } else if (dragAction.type === 'resize-end') {
                setDragAction(prev => (prev ? { ...prev, type: 'resize-start' } : null));
            }
        }
    }
  }, [dragAction, dayWidth, onTaskDragUpdate, tasks]);

  const handleDragEnd = useCallback(() => {
    setDragAction(null);
  }, []);
  
  useEffect(() => {
    const getCursor = (type: DragActionType) => {
      switch (type) {
        case 'move': return 'grabbing';
        case 'resize-start':
        case 'resize-end': return 'ew-resize';
        default: return 'auto';
      }
    };
    
    if (dragAction) {
        document.body.style.cursor = getCursor(dragAction.type);
        document.body.style.userSelect = 'none';
        window.addEventListener('mousemove', handleDragMove);
        window.addEventListener('touchmove', handleDragMove, { passive: false });
        window.addEventListener('mouseup', handleDragEnd);
        window.addEventListener('touchend', handleDragEnd);
    }

    return () => {
        window.removeEventListener('mousemove', handleDragMove);
        window.removeEventListener('touchmove', handleDragMove);
        window.removeEventListener('mouseup', handleDragEnd);
        window.removeEventListener('touchend', handleDragEnd);
        if (document.body) {
           document.body.style.cursor = 'auto';
           document.body.style.userSelect = 'auto';
        }
    };
  }, [dragAction, handleDragMove, handleDragEnd]);


  const handleReorderStart = useCallback((e: React.MouseEvent | React.TouchEvent, taskId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setReorderState({ draggedTaskId: taskId, dropIndex: null });
  }, []);

  const handleReorderMove = useCallback((e: MouseEvent | TouchEvent) => {
    if (e.type === 'touchmove') {
        e.preventDefault();
    }
    if (!reorderState) return;

    const coords = getNativeEventCoords(e);
    if (!coords) return;
    const { clientY } = coords;

    const positions = tasks.map(task => {
        const el = taskRowRefs.current[task.id];
        if (!el) return { id: task.id, top: -1, bottom: -1, mid: -1 };
        const rect = el.getBoundingClientRect();
        return { id: task.id, top: rect.top, bottom: rect.bottom, mid: rect.top + rect.height / 2 };
    }).filter(p => p.top !== -1);

    const target = positions.find(p => clientY >= p.top && clientY <= p.bottom);
    let newDropIndex: number | null = null;
    if (target) {
        const targetIndex = tasks.findIndex(t => t.id === target.id);
        newDropIndex = clientY < target.mid ? targetIndex : targetIndex + 1;
    } else {
        const firstTaskRect = taskRowRefs.current[tasks[0]?.id]?.getBoundingClientRect();
        if (firstTaskRect && clientY < firstTaskRect.top) {
            newDropIndex = 0;
        } else {
            const lastTaskRect = taskRowRefs.current[tasks[tasks.length-1]?.id]?.getBoundingClientRect();
            if(lastTaskRect && clientY > lastTaskRect.bottom) {
                 newDropIndex = tasks.length;
            }
        }
    }
    
    setReorderState(prev => (prev ? { ...prev, dropIndex: newDropIndex } : null));
  }, [reorderState, tasks]);

  const handleReorderEnd = useCallback(() => {
    if (reorderState && typeof reorderState.dropIndex === 'number') {
        onTaskReorder(reorderState.draggedTaskId, reorderState.dropIndex);
    }
    setReorderState(null);
  }, [reorderState, onTaskReorder]);

  useEffect(() => {
    if (reorderState?.draggedTaskId) {
        document.body.style.cursor = 'grabbing';
        document.body.style.userSelect = 'none';
        window.addEventListener('mousemove', handleReorderMove);
        window.addEventListener('touchmove', handleReorderMove, { passive: false });
        window.addEventListener('mouseup', handleReorderEnd);
        window.addEventListener('touchend', handleReorderEnd);
    }
    return () => {
        window.removeEventListener('mousemove', handleReorderMove);
        window.removeEventListener('touchmove', handleReorderMove);
        window.removeEventListener('mouseup', handleReorderEnd);
        window.removeEventListener('touchend', handleReorderEnd);
        if (document.body) {
           document.body.style.cursor = 'auto';
           document.body.style.userSelect = 'auto';
        }
    };
  }, [reorderState, handleReorderMove, handleReorderEnd]);

  const dropIndex = reorderState?.dropIndex;

  const progressLinePath = useMemo(() => {
    if (!progressLineDate || dateArray.length === 0 || !taskDetailsHeaderRef.current || !timelineHeaderRef.current) return null;

    const headerHeight = timelineHeaderRef.current.offsetHeight;
    const taskDetailsWidth = taskDetailsHeaderRef.current.offsetWidth || 0;
    const baselineDate = parseUTCDateString(progressLineDate);
    if (!baselineDate) return null;

    const baselineDateIndex = dateArray.findIndex(d => d.getTime() === baselineDate.getTime());
    if (baselineDateIndex === -1) return null;

    const baselineX = (baselineDateIndex + 1) * dayWidth;

    const taskProgressXs = tasks.map(task => {
        let currentTaskX = baselineX; // Default to baseline

        const startDate = parseUTCDateString(task.startDate);
        const endDate = parseUTCDateString(task.endDate);

        if (startDate && endDate) {
            const isCompletedEarly = endDate.getTime() < baselineDate.getTime() && task.progress === 100;
            const isNotYetStarted = startDate.getTime() > baselineDate.getTime() && task.progress === 0;

            if (!isCompletedEarly && !isNotYetStarted) {
                const totalWorkDays = calculateWorkingDays(startDate, endDate, holidays);
                if (totalWorkDays > 0) {
                    let completedWorkDays = totalWorkDays * (task.progress / 100);
                    
                    let currentPosDate = new Date(startDate.getTime());
                    let pixelOffset = 0;

                    while(completedWorkDays > 0 && currentPosDate.getTime() <= endDate.getTime()) {
                        if(!holidays.has(currentPosDate.getUTCDay())){
                           const consumption = Math.min(1, completedWorkDays);
                           pixelOffset += consumption * dayWidth;
                           completedWorkDays -= consumption;
                        } else {
                           pixelOffset += dayWidth;
                        }
                        
                        if (completedWorkDays > 0) {
                          currentPosDate.setUTCDate(currentPosDate.getUTCDate() + 1);
                        }
                    }
                    const startIndex = dateArray.findIndex(d => d.getTime() === startDate.getTime());
                    if(startIndex !== -1) {
                        currentTaskX = (startIndex * dayWidth) + pixelOffset;
                    }
                }
            }
        }
        return taskDetailsWidth + currentTaskX;
    });

    const taskBarHeight = 32; // Corresponds to h-8 in Tailwind
    const spaceAboveBelowBar = (rowHeight - taskBarHeight) / 2;
    const finalBaselineX = taskDetailsWidth + baselineX;

    // Start with a vertical line through the timeline header.
    let path = `M ${finalBaselineX} 0 L ${finalBaselineX} ${headerHeight}`;
    
    if (tasks.length > 0 && taskProgressXs.length > 0) {
        tasks.forEach((_, i) => {
            const progressX = taskProgressXs[i];
            const rowTopY = headerHeight + i * rowHeight;
            const barTopY = rowTopY + spaceAboveBelowBar;
            const barCenterY = rowTopY + rowHeight / 2;
            const barBottomY = rowTopY + rowHeight - spaceAboveBelowBar;
            const rowBottomY = rowTopY + rowHeight;
            
            // From previous point (or header) to the top of the task bar at baseline
            path += ` L ${finalBaselineX} ${barTopY}`;
            
            // To the actual progress point at the center of the bar
            path += ` L ${progressX} ${barCenterY}`;
            
            // Back to the baseline at the bottom of the bar
            path += ` L ${finalBaselineX} ${barBottomY}`;
            
            // And finally down to the bottom of the row at baseline, to connect to the next task
            path += ` L ${finalBaselineX} ${rowBottomY}`;
        });
    }

    return path;
  }, [progressLineDate, tasks, dateArray, dayWidth, holidays, rowHeight]);
  
  const totalContentHeight = (timelineHeaderRef.current?.offsetHeight || 0) + tasks.length * rowHeight;

  const totalManHours = useMemo(() => {
    return tasks.reduce((sum, task) => sum + (task.manHours || 0), 0);
  }, [tasks]);

  return (
    <div className="bg-white rounded-lg shadow-lg flex flex-col h-[calc(100vh-7rem)] overflow-hidden relative">
      {tooltip?.visible && (
        <div
            className="fixed bg-gray-800 text-white text-xs rounded py-1 px-2 pointer-events-none shadow-lg"
            style={{
                top: tooltip.y + 20,
                left: tooltip.x + 15,
                zIndex: 1000,
            }}
        >
            {tooltip.content}
        </div>
      )}
      <div className="p-4 sm:p-6 flex-shrink-0 border-b">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 items-end">
          {/* Combined Row 1: Project Name, Creation Date, Creator */}
          <div className="md:col-span-2 flex flex-wrap items-end gap-x-4 gap-y-2">
            {/* Project Name */}
            <div className="flex-grow min-w-[300px]">
              <label htmlFor="projectName" className="block text-sm font-medium text-gray-700 mb-1">{t('projectNameLabel')}</label>
              <input
                type="text"
                id="projectName"
                value={projectName}
                onChange={e => setProjectName(e.target.value)}
                onFocus={handleInputFocus}
                placeholder={t('projectNamePlaceholder')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-base font-semibold focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            {/* Creation Date */}
            <div className="relative w-36 flex-shrink-0">
              <label htmlFor="creationDate" className="block text-sm font-medium text-gray-700 mb-1">{t('creationDate')}</label>
              <div className="relative">
                <input type="text" id="creationDate" value={creationDate} onChange={e => setCreationDate(e.target.value)} onFocus={handleInputFocus} placeholder={t('dateFormatPlaceholder')} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 pr-10" />
                <button
                  data-calendar-toggle
                  onClick={(e) => openCalendar(e, 'creationDate')}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-indigo-600 transition-colors"
                  aria-label={t('openCalendar')}
                >
                  <CalendarIcon className="w-5 h-5" />
                </button>
              </div>
              {activeCalendar?.type === 'creationDate' && (
                <Calendar
                  initialDate={creationDate}
                  onSelectDate={(date) => {
                    setCreationDate(date);
                    setActiveCalendar(null);
                  }}
                  onClose={() => setActiveCalendar(null)}
                  showToday={true}
                  position={activeCalendar.position}
                />
              )}
            </div>

            {/* Creator */}
            <div className="w-36 flex-shrink-0">
              <label htmlFor="creatorName" className="block text-sm font-medium text-gray-700 mb-1">{t('creator')}</label>
              <input
                type="text"
                id="creatorName"
                value={creatorName}
                onChange={e => setCreatorName(e.target.value)}
                onFocus={handleInputFocus}
                placeholder={t('creator')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Project Start Date */}
          <div className="relative">
            <label htmlFor="projectStart" className="block text-sm font-medium text-gray-700 mb-1">{t('projectStartDate')}</label>
            <div className="relative">
              <input type="text" id="projectStart" value={projectStart} onChange={e => setProjectStart(e.target.value)} placeholder={t('dateFormatPlaceholder')} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 pr-10" />
              <button
                data-calendar-toggle
                onClick={(e) => openCalendar(e, 'projectStart')}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-indigo-600 transition-colors"
                aria-label={t('openCalendar')}
              >
                <CalendarIcon className="w-5 h-5" />
              </button>
            </div>
            {activeCalendar?.type === 'projectStart' && (
              <Calendar
                initialDate={projectStart}
                onSelectDate={(date) => {
                  setProjectStart(date);
                  setActiveCalendar(null);
                }}
                onClose={() => setActiveCalendar(null)}
                position={activeCalendar.position}
              />
            )}
          </div>

          {/* Project End Date */}
          <div className="relative">
            <label htmlFor="projectEnd" className="block text-sm font-medium text-gray-700 mb-1">{t('projectEndDate')}</label>
            <div className="relative">
              <input type="text" id="projectEnd" value={projectEnd} onChange={e => setProjectEnd(e.target.value)} placeholder={t('dateFormatPlaceholder')} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 pr-10" />
              <button
                data-calendar-toggle
                onClick={(e) => openCalendar(e, 'projectEnd')}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-indigo-600 transition-colors"
                aria-label={t('openCalendar')}
              >
                <CalendarIcon className="w-5 h-5" />
              </button>
            </div>
            {activeCalendar?.type === 'projectEnd' && (
              <Calendar
                initialDate={projectEnd}
                onSelectDate={(date) => {
                  setProjectEnd(date);
                  setActiveCalendar(null);
                }}
                onClose={() => setActiveCalendar(null)}
                position={activeCalendar.position}
              />
            )}
          </div>
        </div>
      </div>

      <div ref={scrollContainerRef} className="relative overflow-auto flex-grow">
        <div
          ref={ganttGridRef}
          className="gantt-grid min-w-[1200px] grid relative"
          style={{
            gridTemplateColumns: `auto 1fr`,
            gridTemplateRows: `auto repeat(${tasks.length}, ${rowHeight}px)`,
          }}
        >
          {/* Top-left corner */}
          <div ref={taskDetailsHeaderRef} className="sticky top-0 left-0 bg-slate-100 p-2 border-b border-r border-gray-200 font-semibold text-slate-600 text-sm flex items-center z-30">
            <div className="flex items-center w-full gap-1">
              <div className="w-6 flex-shrink-0" /> {/* Spacer for Grip Icon */}
              <div className="flex-grow min-w-0 p-1">{t('taskDetails')}</div>
              {columnVisibility.assignee && <div className="w-24 flex-shrink-0 p-1 text-xs text-center">{t('assignee')}</div>}
              {columnVisibility.startDate && <div className="w-24 flex-shrink-0 p-1 text-xs text-center">{t('startDate')}</div>}
              {columnVisibility.endDate && <div className="w-24 flex-shrink-0 p-1 text-xs text-center">{t('endDate')}</div>}
              {columnVisibility.duration && <div className="w-16 flex-shrink-0 p-1 text-xs text-center">{t('duration')}</div>}
              {columnVisibility.progress && <div className="w-20 flex-shrink-0 p-1 text-xs text-center">{t('progress')}</div>}
              {columnVisibility.manHours && (
                <div className="w-20 flex-shrink-0 p-1 text-xs text-center">
                  <div className="flex flex-col items-center justify-center -space-y-1">
                    <span>{t('manHours')}</span>
                    <span className="text-[10px] text-slate-500 font-normal">
                      ({t('total')}: {totalManHours.toLocaleString(undefined, { maximumFractionDigits: 1 })})
                    </span>
                  </div>
                </div>
              )}
              <div className="w-16 flex-shrink-0 flex items-center justify-end">
                 <button 
                    onClick={onDeleteAllTasks} 
                    className="text-gray-400 hover:text-red-500 p-1 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed" 
                    title={t('deleteAllTasks')}
                    disabled={tasks.length === 0}
                  >
                      <TrashIcon />
                  </button>
              </div>
            </div>
          </div>

          {/* Date Headers */}
          <div
            className="sticky top-0 z-10 bg-slate-50 border-b border-gray-200"
            style={{
              gridColumn: `2 / span 1`,
            }}
            ref={timelineHeaderRef}
          >
            <div className="grid" style={{ gridTemplateColumns: `repeat(${dateArray.length}, ${dayWidth}px)` }}>
              {monthHeaders.map((month, index) => (
                <div key={index} className="text-center font-semibold text-slate-600 text-sm py-1 border-r border-gray-400" style={{ gridColumn: `span ${month.days}` }}>
                  {month.formatted}
                </div>
              ))}
            </div>
            <div className="grid" style={{ gridTemplateColumns: `repeat(${dateArray.length}, ${dayWidth}px)` }}>
              {dateHeaders.map(({ date, span, isLastDayOfMonth }, index) => {
                const dayOfWeek = date.toLocaleString(language === 'ja' ? 'ja-JP' : 'en-US', { weekday: 'short', timeZone: 'UTC' });
                const day = date.getUTCDay();
                const isHoliday = holidays.has(day);

                let dayColorClass = 'text-slate-500';
                if (day === 0) { // Sunday
                  dayColorClass = 'text-red-600';
                } else if (day === 6) { // Saturday
                  dayColorClass = 'text-blue-600';
                }
                
                let borderClass = 'border-gray-200';
                if (isLastDayOfMonth) {
                  borderClass = 'border-gray-400';
                } else if (span > 1) {
                  borderClass = 'border-gray-300';
                }
                const containerAlignmentClass = span === 1 ? 'justify-center' : 'justify-start pl-1';
                const textAlignmentClass = span === 1 ? 'items-center' : 'items-start';

                return (
                  <div 
                    key={index} 
                    className={`text-xs border-r ${borderClass} flex ${containerAlignmentClass} items-center h-full ${isHoliday ? 'bg-red-50' : 'bg-slate-50'} ${dayColorClass} overflow-hidden`}
                    style={{ gridColumn: `span ${span}` }}
                  >
                      <div className={`flex flex-col ${textAlignmentClass} justify-center h-full`}>
                        <span className="whitespace-nowrap leading-none">{date.getUTCDate()}</span>
                        <span className="text-[10px] leading-none whitespace-nowrap">{dayOfWeek}</span>
                      </div>
                  </div>
                );
              })}
            </div>
          </div>
          
          {typeof dropIndex === 'number' && reorderState && (
            <div
                className="h-0.5 bg-blue-500 pointer-events-none absolute w-full z-40"
                style={{
                    top: (timelineHeaderRef.current?.offsetHeight || 0) + (tasks.findIndex(t => t.id === reorderState.draggedTaskId) < dropIndex ? dropIndex -1 : dropIndex) * rowHeight - 2,
                    left: 0,
                }}
            />
          )}

          {/* Task Rows */}
          {tasks.map((task, index) => {
            const isDragging = reorderState?.draggedTaskId === task.id;
            
            return (
            <React.Fragment key={task.id}>
              {/* Task Details Column Cell */}
              <div
                ref={(el) => { taskRowRefs.current[task.id] = el; }}
                className={`sticky left-0 bg-white border-b border-r border-gray-200 z-20 flex items-center p-2 gap-1 transition-opacity ${isDragging ? 'opacity-50' : ''}`}
                style={{
                  height: `${rowHeight}px`,
                  gridRow: index + 2,
                  gridColumn: 1,
                  zIndex: activeCalendar?.taskId === task.id ? 41 : 20,
                }}
              >
                  <button
                    onMouseDown={(e) => handleReorderStart(e, task.id)}
                    onTouchStart={(e) => handleReorderStart(e, task.id)}
                    className="p-1 text-gray-400 hover:bg-gray-200 rounded-md"
                    title={t('reorderTask')}
                  >
                    <GripVerticalIcon className="w-5 h-5 cursor-grab active:cursor-grabbing"/>
                  </button>
                  <input type="text" value={task.name} onChange={e => onTaskChange(task.id, 'name', e.target.value)} onFocus={handleInputFocus} placeholder={t('taskNamePlaceholder')} className="flex-grow min-w-0 p-1 border-none focus:ring-0 text-sm"/>
                  {columnVisibility.assignee && <div className="w-24 flex-shrink-0">
                    <input
                      type="text"
                      value={task.assignee || ''}
                      onChange={e => onTaskChange(task.id, 'assignee', e.target.value)}
                      onFocus={handleInputFocus}
                      placeholder={t('assignee')}
                      className="w-full p-1 border-none focus:ring-0 text-xs"
                    />
                  </div>}
                  {columnVisibility.startDate && <div className="relative w-24 flex-shrink-0">
                      <input type="text" value={task.startDate} onChange={e => onTaskChange(task.id, 'startDate', e.target.value)} placeholder={t('dateFormatPlaceholder')} className="w-full p-1 border-none focus:ring-0 text-xs pr-6"/>
                      <button
                          data-calendar-toggle
                          onClick={(e) => openCalendar(e, 'taskStartDate', task.id)}
                          className="absolute inset-y-0 right-0 flex items-center pr-1 text-gray-400 hover:text-indigo-600"
                          aria-label={t('openCalendar')}
                      >
                          <CalendarIcon className="w-4 h-4"/>
                      </button>
                       {activeCalendar?.type === 'taskStartDate' && activeCalendar?.taskId === task.id && (
                          <Calendar
                              initialDate={task.startDate}
                              taskStartDate={task.startDate}
                              taskEndDate={task.endDate}
                              minDate={projectStart}
                              maxDate={task.endDate || projectEnd}
                              onSelectDate={(date) => {
                                  onTaskChange(task.id, 'startDate', date);
                                  setActiveCalendar(null);
                              }}
                              onClose={() => setActiveCalendar(null)}
                              position={activeCalendar.position}
                          />
                      )}
                  </div>}
                  {columnVisibility.endDate && <div className="relative w-24 flex-shrink-0">
                      <input type="text" value={task.endDate} onChange={e => onTaskChange(task.id, 'endDate', e.target.value)} placeholder={t('dateFormatPlaceholder')} className="w-full p-1 border-none focus:ring-0 text-xs pr-6"/>
                      <button
                          data-calendar-toggle
                          onClick={(e) => openCalendar(e, 'taskEndDate', task.id)}
                          className="absolute inset-y-0 right-0 flex items-center pr-1 text-gray-400 hover:text-indigo-600"
                          aria-label={t('openCalendar')}
                      >
                          <CalendarIcon className="w-4 h-4"/>
                      </button>
                      {activeCalendar?.type === 'taskEndDate' && activeCalendar?.taskId === task.id && (
                          <Calendar
                              initialDate={task.endDate}
                              taskStartDate={task.startDate}
                              taskEndDate={task.endDate}
                              minDate={task.startDate || projectStart}
                              maxDate={projectEnd}
                              onSelectDate={(date) => {
                                  onTaskChange(task.id, 'endDate', date);
                                  setActiveCalendar(null);
                              }}
                              onClose={() => setActiveCalendar(null)}
                              position={activeCalendar.position}
                          />
                      )}
                  </div>}
                  {columnVisibility.duration && <div className="w-16 flex-shrink-0">
                    <input
                      type="number"
                      value={getTaskDuration(task.startDate, task.endDate) || ''}
                      onChange={e => onDurationChange(task, e.target.value)}
                      onFocus={handleInputFocus}
                      className="w-full p-1 border-none focus:ring-0 text-xs text-center"
                      placeholder="-"
                      min="1"
                    />
                  </div>}
                  {columnVisibility.progress && <div className="w-20 flex-shrink-0 relative">
                    <input
                      type="number"
                      value={task.progress}
                      onChange={e => onProgressChange(task.id, e.target.value)}
                      onFocus={handleInputFocus}
                      className="w-full p-1 border-none focus:ring-0 text-xs text-center pr-4"
                      min="0"
                      max="100"
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">%</span>
                  </div>}
                  {columnVisibility.manHours && <div className="w-20 flex-shrink-0">
                    <input
                      type="number"
                      value={task.manHours ?? ''}
                      onChange={e => onManHoursChange(task.id, e.target.value)}
                      onFocus={handleInputFocus}
                      className="w-full p-1 border-none focus:ring-0 text-xs text-center"
                      placeholder="-"
                      min="0"
                    />
                  </div>}
                  <div className="w-16 flex-shrink-0 flex items-center justify-end">
                    <button
                      onClick={() => onDuplicateTask(task.id)}
                      className="text-gray-400 hover:text-indigo-500 p-1 rounded-full transition-colors"
                      title={t('duplicateTask')}
                    >
                      <DuplicateIcon className="w-5 h-5" />
                    </button>
                    <button onClick={() => onDeleteTask(task.id)} className="text-gray-400 hover:text-red-500 p-1 rounded-full transition-colors">
                        <TrashIcon />
                    </button>
                  </div>
              </div>

              {/* Task Timeline Row Cell */}
              <div
                className={`relative border-b transition-opacity z-0 ${isDragging ? 'opacity-50' : ''}`}
                style={{
                  gridRow: index + 2,
                  gridColumn: `2 / span 1`,
                }}
                data-task-row-id={task.id}
                onMouseDown={(e) => {
                  if (!task.startDate && !task.endDate) {
                    handlePointerDownForCreate(e);
                  }
                }}
                onTouchStart={(e) => {
                  if (!task.startDate && !task.endDate) {
                    handlePointerDownForCreate(e);
                  }
                }}
                onMouseMove={handlePointerMove}
                onTouchMove={handlePointerMove}
                onMouseLeave={handleMouseLeave}
              >
                  {/* Background Lines & Weekend Highlighting */}
                  <div className="absolute inset-0 grid" style={{ gridTemplateColumns: `repeat(${dateArray.length}, ${dayWidth}px)` }}>
                      {dateArray.map((date, index) => {
                          const isHoliday = holidays.has(date.getUTCDay());
                          const nextDay = addDaysUTC(date, 1);
                          const isLastDayOfMonth = nextDay.getUTCDate() === 1;

                          let interval = 1;
                          if (dayWidth < 24) interval = 2;
                          if (dayWidth < 18) interval = 3;
                          if (dayWidth < 12) interval = 7;
                          const isGroupSeparator = interval > 1 && (index + 1) % interval === 0;

                          let borderClass = 'border-gray-100'; // Lightest, default
                          if (isLastDayOfMonth) {
                              borderClass = 'border-gray-400'; // Darkest
                          } else if (isGroupSeparator) {
                              borderClass = 'border-gray-300'; // Medium
                          }
                          return <div key={index} className={`h-full border-r ${borderClass} ${isHoliday ? 'bg-red-50' : ''}`}></div>;
                      })}
                  </div>
                  {/* Task Bar */}
                  <div className="absolute inset-0 grid items-center" style={{ gridTemplateColumns: `repeat(${dateArray.length}, ${dayWidth}px)` }}>
                     {(() => {
                        const taskStart = parseUTCDateString(task.startDate);
                        const taskEnd = parseUTCDateString(task.endDate);

                        if (!taskStart || !taskEnd || taskEnd < taskStart) {
                            return null;
                        }

                        const totalWorkingDays = getTaskDuration(task.startDate, task.endDate);
                        if (totalWorkingDays === 0) return null;
                        
                        let completedWorkingDays = totalWorkingDays * (task.progress / 100);
                        const lightningSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5"><path fill-rule="evenodd" d="M11.933 3.339a.75.75 0 01.328 1.309l-6 7.5a.75.75 0 01-1.261-.548l2.25-9.75a.75.75 0 011.355-.26l2.328 1.75Z" clip-rule="evenodd" /><path d="M4.583 8.883c.31.043.614.12.906.224l-2.25 9.75a.75.75 0 01-1.355.26L.182 17.367a.75.75 0 01.26-1.025l4.14-1.453Z" /><path d="M12.75 11.25a.75.75 0 01.75-.75h4.5a.75.75 0 010 1.5h-4.5a.75.75 0 01-.75-.75Z" /></svg>`;
                        const lightningDataUrl = `url("data:image/svg+xml;base64,${btoa(lightningSvg.replace('<svg ', `<svg fill='rgba(31, 41, 55, 0.4)' `))}")`;
                        
                        const totalDurationDays = (taskEnd.getTime() - taskStart.getTime()) / (1000 * 3600 * 24) + 1;
                        if (totalDurationDays <= 0) return null;
                        
                        const segments = getTaskSegments(task);

                        const interactionLayerStyle: React.CSSProperties = { color: textColor };
                        if (segments.length > 0 && totalDurationDays > 0) {
                            const visualStartDate = segments[0].startDate;
                            const visualEndDate = segments[segments.length - 1].endDate;

                            const startOffsetDays = (visualStartDate.getTime() - taskStart.getTime()) / (1000 * 3600 * 24);
                            const endOffsetDays = (taskEnd.getTime() - visualEndDate.getTime()) / (1000 * 3600 * 24);
                            
                            interactionLayerStyle.position = 'absolute';
                            interactionLayerStyle.top = '0';
                            interactionLayerStyle.bottom = '0';
                            interactionLayerStyle.left = `${(startOffsetDays / totalDurationDays) * 100}%`;
                            interactionLayerStyle.right = `${(endOffsetDays / totalDurationDays) * 100}%`;
                        } else {
                            interactionLayerStyle.display = 'none';
                        }


                        return (
                            <div
                                className="relative h-8"
                                style={{ ...getGridPosition(taskStart, taskEnd) }}
                            >
                                {/* Background Visual Bars Container */}
                                <div className="absolute inset-0">
                                    {segments.map((segment, segIndex) => {
                                        const segmentWorkingDays = calculateWorkingDays(segment.startDate, segment.endDate, holidays);
                                        if (segmentWorkingDays === 0) return null;

                                        const progressDaysInSegment = Math.max(0, Math.min(segmentWorkingDays, completedWorkingDays));
                                        const progressWidthPercent = (progressDaysInSegment / segmentWorkingDays) * 100;
                                        completedWorkingDays -= progressDaysInSegment;

                                        const segmentStartOffsetDays = (segment.startDate.getTime() - taskStart.getTime()) / (1000 * 3600 * 24);
                                        const segmentDurationDays = (segment.endDate.getTime() - segment.startDate.getTime()) / (1000 * 3600 * 24) + 1;
                                        
                                        const left = (segmentStartOffsetDays / totalDurationDays) * 100;
                                        const width = (segmentDurationDays / totalDurationDays) * 100;
                                        
                                        return (
                                            <div
                                                key={`segment-${segIndex}`}
                                                className="absolute top-0 h-full"
                                                style={{ left: `${left}%`, width: `${width}%` }}
                                            >
                                                <div className="w-full h-full relative" style={{ backgroundColor: baseColor }}>
                                                    <div
                                                        className="absolute top-0 left-0 h-full pointer-events-none"
                                                        style={{ 
                                                            width: `${progressWidthPercent}%`, 
                                                            backgroundColor: progressColor,
                                                            backgroundImage: lightningDataUrl,
                                                            backgroundSize: '16px',
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Foreground Interaction & Text Layer */}
                                <div
                                    className="group/bar cursor-move px-3 text-sm font-medium flex items-center"
                                    style={{ ...interactionLayerStyle, touchAction: 'none' }}
                                    onMouseDown={(e) => handleDragStart(e, task, 'move')}
                                    onTouchStart={(e) => handleDragStart(e, task, 'move')}
                                >
                                    <span className="whitespace-nowrap">{task.name}</span>
                                    <div
                                        className="absolute left-0 top-0 h-full w-2 cursor-ew-resize"
                                        onMouseDown={(e) => handleDragStart(e, task, 'resize-start')}
                                        onTouchStart={(e) => handleDragStart(e, task, 'resize-start')}
                                    />
                                    <div
                                        className="absolute right-0 top-0 h-full w-2 cursor-ew-resize"
                                        onMouseDown={(e) => handleDragStart(e, task, 'resize-end')}
                                        onTouchStart={(e) => handleDragStart(e, task, 'resize-end')}
                                    />
                                </div>
                            </div>
                        );
                     })()}
                     {dragPreview && dragPreview.taskId === task.id && (
                        <div
                          className="h-8 bg-indigo-300 opacity-70"
                          style={getGridPosition(
                              parseUTCDateString(dragPreview.start > dragPreview.end ? dragPreview.end : dragPreview.start)!,
                              parseUTCDateString(dragPreview.start > dragPreview.end ? dragPreview.start : dragPreview.end)!,
                          )}
                        />
                     )}
                  </div>
              </div>
            </React.Fragment>
          )})}
          {progressLinePath && (
            <div className="absolute top-0 left-0 pointer-events-none z-35" style={{ height: totalContentHeight, width: totalGridWidth ? `${totalGridWidth}px` : '100%' }}>
              <svg width={totalGridWidth || '100%'} height="100%">
                  <path d={progressLinePath} stroke={progressLineColor} strokeWidth="2" fill="none" strokeDasharray="4 4" />
              </svg>
            </div>
          )}
        </div>
      </div>
      <button
        onClick={onAddTask}
        title={t('addTask')}
        className="fixed bottom-8 right-8 z-50 w-14 h-14 bg-indigo-600 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all transform hover:scale-110"
      >
        <PlusIcon className="w-7 h-7" />
      </button>
    </div>
  );
};

export default GanttChart;
