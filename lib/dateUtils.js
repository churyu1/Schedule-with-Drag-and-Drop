// --- UTC Date Helper Functions ---

export const parseUTCDateString = (dateStr) => {
    if (!/^\d{4}\/\d{2}\/\d{2}$/.test(dateStr)) return null;
    const parts = dateStr.split('/').map(p => parseInt(p, 10));
    // Note: months are 0-based in JS Date
    const date = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
    // Validate date (e.g., handles 2023/02/30)
    if (date.getUTCFullYear() !== parts[0] || date.getUTCMonth() !== parts[1] - 1 || date.getUTCDate() !== parts[2]) {
        return null;
    }
    return date;
};

export const formatDateUTC = (date) => {
  const year = date.getUTCFullYear();
  const month = (date.getUTCMonth() + 1).toString().padStart(2, '0');
  const day = date.getUTCDate().toString().padStart(2, '0');
  return `${year}/${month}/${day}`;
};

export const addDaysUTC = (date, days) => {
    const result = new Date(date.getTime());
    result.setUTCDate(result.getUTCDate() + days);
    return result;
};

export const getDatesInRange = (startDate, endDate) => {
  const dates = [];
  const currentDate = new Date(startDate.getTime());

  while (currentDate.getTime() <= endDate.getTime()) {
    dates.push(new Date(currentDate.getTime()));
    currentDate.setUTCDate(currentDate.getUTCDate() + 1);
  }
  return dates;
};

export const calculateWorkingDays = (startDate, endDate, nonWorkingDays) => {
    if (endDate < startDate) return 0;
    let count = 0;
    const current = new Date(startDate.getTime());
    while (current.getTime() <= endDate.getTime()) {
      if (!nonWorkingDays.has(current.getUTCDay())) {
        count++;
      }
      current.setUTCDate(current.getUTCDate() + 1);
    }
    return count;
};

export const addWorkingDays = (startDate, days, nonWorkingDays) => {
    if (days === 0) {
        let tempDate = new Date(startDate.getTime());
        while(nonWorkingDays.has(tempDate.getUTCDay())) {
             tempDate.setUTCDate(tempDate.getUTCDate() - 1);
        }
        return tempDate;
    };
    if (days < 1) return startDate;

    const result = new Date(startDate.getTime());
    let added = 0;
    
    // Ensure the start date itself is a working day before we begin counting
    while(nonWorkingDays.has(result.getUTCDay())){
      result.setUTCDate(result.getUTCDate() + 1);
    }

    // We start counting from day 1, so we add days-1
    while (added < days -1) {
      result.setUTCDate(result.getUTCDate() + 1);
      if (!nonWorkingDays.has(result.getUTCDay())) {
        added++;
      }
    }
    return result;
};

export const addOrSubtractWorkingDays = (startDate, days, nonWorkingDays) => {
    const result = new Date(startDate.getTime());
    let remaining = Math.abs(days);
    const direction = Math.sign(days);
    
    if(direction === 0) return result;

    while (remaining > 0) {
      result.setUTCDate(result.getUTCDate() + direction);
      if (!nonWorkingDays.has(result.getUTCDay())) {
        remaining--;
      }
    }
    return result;
};