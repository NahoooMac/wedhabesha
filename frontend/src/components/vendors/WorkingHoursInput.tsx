import React, { useState, useEffect } from 'react';
import { Clock, Plus, X } from 'lucide-react';

interface WorkingHour {
  day: string;
  isOpen: boolean;
  openTime: string;
  closeTime: string;
}

interface WorkingHoursInputProps {
  value: WorkingHour[];
  onChange: (hours: WorkingHour[]) => void;
}

const DAYS_OF_WEEK = [
  'Monday',
  'Tuesday', 
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday'
];

const TIME_OPTIONS = [
  '06:00', '06:30', '07:00', '07:30', '08:00', '08:30', '09:00', '09:30',
  '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30',
  '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
  '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00', '21:30',
  '22:00', '22:30', '23:00', '23:30'
];

const WorkingHoursInput: React.FC<WorkingHoursInputProps> = ({ value, onChange }) => {
  const [workingHours, setWorkingHours] = useState<WorkingHour[]>(() => {
    if (value && value.length > 0) {
      return value;
    }
    
    // Default working hours
    return DAYS_OF_WEEK.map(day => ({
      day,
      isOpen: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].includes(day),
      openTime: '09:00',
      closeTime: '18:00'
    }));
  });

  useEffect(() => {
    onChange(workingHours);
  }, [workingHours, onChange]);

  const updateDay = (dayIndex: number, updates: Partial<WorkingHour>) => {
    const newHours = [...workingHours];
    newHours[dayIndex] = { ...newHours[dayIndex], ...updates };
    setWorkingHours(newHours);
  };

  const toggleDay = (dayIndex: number) => {
    updateDay(dayIndex, { isOpen: !workingHours[dayIndex].isOpen });
  };

  const setAllDays = (isOpen: boolean) => {
    const newHours = workingHours.map(hour => ({ ...hour, isOpen }));
    setWorkingHours(newHours);
  };

  const copyToAll = (dayIndex: number) => {
    const sourceDay = workingHours[dayIndex];
    const newHours = workingHours.map(hour => ({
      ...hour,
      openTime: sourceDay.openTime,
      closeTime: sourceDay.closeTime,
      isOpen: sourceDay.isOpen
    }));
    setWorkingHours(newHours);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          <h4 className="font-medium text-gray-900 dark:text-white">Business Hours</h4>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setAllDays(true)}
            className="text-xs px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-lg hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors"
          >
            Open All
          </button>
          <button
            type="button"
            onClick={() => setAllDays(false)}
            className="text-xs px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
          >
            Close All
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {workingHours.map((hour, index) => (
          <div key={hour.day} className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
            <div className="w-20">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hour.isOpen}
                  onChange={() => toggleDay(index)}
                  className="w-4 h-4 text-rose-600 bg-gray-100 border-gray-300 rounded focus:ring-rose-500 dark:focus:ring-rose-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                />
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {hour.day.slice(0, 3)}
                </span>
              </label>
            </div>

            {hour.isOpen ? (
              <>
                <div className="flex items-center gap-2">
                  <select
                    value={hour.openTime}
                    onChange={(e) => updateDay(index, { openTime: e.target.value })}
                    className="text-sm border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg px-3 py-2 focus:border-rose-500 dark:focus:border-rose-400"
                  >
                    {TIME_OPTIONS.map(time => (
                      <option key={time} value={time}>{time}</option>
                    ))}
                  </select>
                  <span className="text-gray-500 dark:text-gray-400 text-sm">to</span>
                  <select
                    value={hour.closeTime}
                    onChange={(e) => updateDay(index, { closeTime: e.target.value })}
                    className="text-sm border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg px-3 py-2 focus:border-rose-500 dark:focus:border-rose-400"
                  >
                    {TIME_OPTIONS.map(time => (
                      <option key={time} value={time}>{time}</option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  onClick={() => copyToAll(index)}
                  className="text-xs px-2 py-1 text-gray-500 dark:text-gray-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
                  title="Copy to all days"
                >
                  Copy to all
                </button>
              </>
            ) : (
              <span className="text-gray-500 dark:text-gray-400 text-sm italic">Closed</span>
            )}
          </div>
        ))}
      </div>

      <div className="text-xs text-gray-500 dark:text-gray-400 bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
        <strong>Tip:</strong> Set your regular business hours. Customers will see when you're available for consultations and meetings.
      </div>
    </div>
  );
};

export default WorkingHoursInput;