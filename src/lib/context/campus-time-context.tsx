'use client';

import React, { createContext, useContext, useState } from 'react';

export interface CampusTimeContextType {
  day: string;
  timeStr: string;
  isSimulated: boolean;
  setDay: (day: string) => void;
  setTimeStr: (time: string) => void;
  resetToCurrentTime: () => void;
  setToDemoClassTime: () => void;
}

const CampusTimeContext = createContext<CampusTimeContextType | undefined>(undefined);

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function getCurrentDayAndTimeString() {
  const now = new Date();
  const dayName = DAYS[now.getDay()];
  const hours = now.getHours().toString().padStart(2, '0');
  const minutes = now.getMinutes().toString().padStart(2, '0');
  return {
    day: dayName === 'Sunday' || dayName === 'Saturday' ? 'Monday' : dayName,
    timeStr: `${hours}:${minutes}`,
  };
}

export function CampusTimeProvider({ children }: { children: React.ReactNode }) {
  // Default to a realistic active teaching hour (Monday 10:15 AM) for rich demo visibility
  const [day, setDay] = useState<string>('Monday');
  const [timeStr, setTimeStr] = useState<string>('10:15');
  const [isSimulated, setIsSimulated] = useState<boolean>(true);

  const resetToCurrentTime = () => {
    const current = getCurrentDayAndTimeString();
    setDay(current.day);
    setTimeStr(current.timeStr);
    setIsSimulated(false);
  };

  const setToDemoClassTime = () => {
    setDay('Monday');
    setTimeStr('10:15');
    setIsSimulated(true);
  };

  const handleSetDay = (newDay: string) => {
    setDay(newDay);
    setIsSimulated(true);
  };

  const handleSetTimeStr = (newTime: string) => {
    setTimeStr(newTime);
    setIsSimulated(true);
  };

  return (
    <CampusTimeContext.Provider
      value={{
        day,
        timeStr,
        isSimulated,
        setDay: handleSetDay,
        setTimeStr: handleSetTimeStr,
        resetToCurrentTime,
        setToDemoClassTime,
      }}
    >
      {children}
    </CampusTimeContext.Provider>
  );
}

export function useCampusTime(): CampusTimeContextType {
  const context = useContext(CampusTimeContext);
  if (!context) {
    // Graceful fallback for non-provider contexts or testing
    return {
      day: 'Monday',
      timeStr: '10:15',
      isSimulated: true,
      setDay: () => {},
      setTimeStr: () => {},
      resetToCurrentTime: () => {},
      setToDemoClassTime: () => {},
    };
  }
  return context;
}
