'use client';
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { addDays, startOfWeek, format, isSameDay, parseISO } from 'date-fns';

export default function ScheduleGrid({ barberId }: { barberId: string }) {
  const [barber, setBarber] = useState<any>(null);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [timeOffDates, setTimeOffDates] = useState<string[]>([]);
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));

  useEffect(() => {
    if (!barberId) return;
    Promise.all([
      supabase.from('employees').select('*').eq('id', barberId).single(),
      supabase.from('employee_schedule').select('*').eq('employee_id', barberId),
      supabase.from('bookings').select('*').eq('employee_id', barberId),
      supabase.from('employee_time_off').select('date').eq('employee_id', barberId)
    ]).then(([barberRes, schedulesRes, bookingsRes, timeOffRes]) => {
      setBarber(barberRes.data || null);
      setSchedules(schedulesRes.data || []);
      setBookings(bookingsRes.data || []);
      setTimeOffDates(timeOffRes.data?.map((t: any) => t.date) || []);
    });
  }, [barberId, weekStart]);

  if (!barber) return <div>Loading schedule...</div>;

  // Build days of week
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  // 15-minute slots from 8:00 to 20:00 (8pm)
  const slots = [];
  for (let mins = 8 * 60; mins < 20 * 60; mins += 20) {
    slots.push(mins);
  }

  // Helper: get schedule for a day
  const getSchedule = (day: Date) => {
    const dow = day.getDay() === 0 ? 7 : day.getDay(); // 1=Mon, 7=Sun
    return schedules.find((s: any) => s.day_of_week === dow);
  };

  // Helper: get bookings for a day
  const getBookings = (day: Date) => {
    return bookings.filter((b: any) => isSameDay(parseISO(b.date), day));
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <button onClick={() => setWeekStart(addDays(weekStart, -7))} className="px-2 py-1 bg-gray-200 rounded">&lt; Prev</button>
        <div className="font-bold text-lg">{format(weekStart, 'MMMM d, yyyy')} - {format(addDays(weekStart, 6), 'MMMM d, yyyy')}</div>
        <button onClick={() => setWeekStart(addDays(weekStart, 7))} className="px-2 py-1 bg-gray-200 rounded">Next &gt;</button>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full border">
          <thead>
            <tr>
              <th className="border px-2 py-1">Time</th>
              {days.map((day, i) => (
                <th key={i} className="border px-2 py-1">{format(day, 'EEE dd')}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {slots.map(slotStart => {
              const slotLabel = `${String(Math.floor(slotStart / 60)).padStart(2, '0')}:${String(slotStart % 60).padStart(2, '0')}`;
              return (
                <tr key={slotStart}>
                  <td className="border px-2 py-1 text-xs">{slotLabel}</td>
                  {days.map((day, i) => {
                    const dateStr = format(day, 'yyyy-MM-dd');
                    if (timeOffDates.includes(dateStr)) {
                      return <td key={i} className="border px-1 py-1 bg-gray-300 text-gray-700 text-xs text-center font-semibold">Time Off</td>;
                    }
                    const schedule = getSchedule(day);
                    const inSchedule = schedule &&
                      slotStart >= parseInt(schedule.start_time.split(':')[0]) * 60 + parseInt(schedule.start_time.split(':')[1]) &&
                      slotStart < parseInt(schedule.end_time.split(':')[0]) * 60 + parseInt(schedule.end_time.split(':')[1]);
                    const bookingsForDay = getBookings(day).filter((b: any) => b.status === 'confirmed' || b.status === 'completed');
                    const booking = bookingsForDay.find((b: any) => {
                      const [startH, startM] = b.start_time.split(':').map(Number);
                      const [endH, endM] = b.end_time.split(':').map(Number);
                      const bookStart = startH * 60 + startM;
                      const bookEnd = endH * 60 + endM;
                      return slotStart < bookEnd && (slotStart + 15) > bookStart;
                    });
                    return (
                      <td key={i} className="border px-1 py-1 relative" style={{ minWidth: 60 }}>
                        {booking ? (
                          <div className="bg-red-500 text-white text-xs rounded px-1 py-0.5 text-center font-semibold">
                            Booked
                          </div>
                        ) : inSchedule ? (
                          <div className="bg-green-200 text-green-900 text-xs rounded px-1 py-0.5 text-center">Working</div>
                        ) : (
                          <div className="bg-gray-100 text-gray-400 text-xs rounded px-1 py-0.5 text-center">Off</div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
} 