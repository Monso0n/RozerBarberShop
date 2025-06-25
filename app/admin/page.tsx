'use client';
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import bcrypt from 'bcryptjs';
import { addDays, startOfWeek, format, isSameDay, parseISO } from 'date-fns';

const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Add prop types for BarberScheduleCalendar
interface BarberScheduleCalendarProps {
  barber: any;
  schedules: any[];
  bookings: any[];
  weekStart: Date;
  onPrevWeek: () => void;
  onNextWeek: () => void;
}

function BarberScheduleCalendar({ barber, schedules, bookings, weekStart, onPrevWeek, onNextWeek }: BarberScheduleCalendarProps) {
  // Build days of week
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  // Time slots (8am to 8pm)
  const hours = Array.from({ length: 13 }, (_, i) => 8 + i);

  // Helper: get schedule for a day
  const getSchedule = (day: Date) => {
    const dow = day.getDay() === 0 ? 7 : day.getDay(); // 1=Mon, 7=Sun
    return schedules.find((s: any) => s.employee_id === barber.id && s.day_of_week === dow);
  };

  // Helper: get bookings for a day
  const getBookings = (day: Date) => {
    return bookings.filter((b: any) => b.employee_id === barber.id && isSameDay(parseISO(b.date), day));
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <button onClick={onPrevWeek} className="px-2 py-1 bg-gray-200 rounded">&lt; Prev</button>
        <div className="font-bold text-lg">{format(weekStart, 'MMMM d, yyyy')} - {format(addDays(weekStart, 6), 'MMMM d, yyyy')}</div>
        <button onClick={onNextWeek} className="px-2 py-1 bg-gray-200 rounded">Next &gt;</button>
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
            {hours.map(hour => (
              <tr key={hour}>
                <td className="border px-2 py-1 text-xs">{hour}:00</td>
                {days.map((day, i) => {
                  const schedule = getSchedule(day);
                  const inSchedule = schedule &&
                    hour >= parseInt(schedule.start_time.split(':')[0]) &&
                    hour < parseInt(schedule.end_time.split(':')[0]);
                  const bookingsForDay = getBookings(day);
                  const booking = bookingsForDay.find((b: any) =>
                    hour >= parseInt(b.start_time.split(':')[0]) &&
                    hour < parseInt(b.end_time.split(':')[0])
                  );
                  return (
                    <td key={i} className="border px-1 py-1 relative" style={{ minWidth: 90 }}>
                      {booking ? (
                        <div className="bg-blue-400 text-white text-xs rounded px-1 py-0.5">
                          {booking.customers?.name} <br />
                          {booking.booking_services?.map((bs: any) => bs.services?.name).join(', ')}
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
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AdminPanel() {
  const [tab, setTab] = useState('bookings');
  const [bookings, setBookings] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBarberId, setSelectedBarberId] = useState<string | null>(null);
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [bookingBarberFilter, setBookingBarberFilter] = useState('');
  const [bookingDateFilter, setBookingDateFilter] = useState('');

  useEffect(() => {
    setLoading(true);
    Promise.all([
      supabase.from('bookings').select(`
        id, date, start_time, end_time, status,
        customers (name, phone, email),
        employees (id, name),
        booking_services (
          services (name, price)
        )
      `),
      supabase.from('employees').select('*'),
      supabase.from('services').select('*'),
      supabase.from('customers').select('*'),
      supabase.from('employee_schedule').select('*, employees(id, name)')
    ]).then(([bookingsRes, employeesRes, servicesRes, customersRes, schedulesRes]) => {
      setBookings(bookingsRes.data || []);
      setEmployees(employeesRes.data || []);
      setServices(servicesRes.data || []);
      setCustomers(customersRes.data || []);
      setSchedules(schedulesRes.data || []);
      setLoading(false);
    });
  }, []);

  const cancelBooking = async (id: string) => {
    await supabase.from('bookings').update({ status: 'cancelled' }).eq('id', id);
    setBookings(bookings.map(b => b.id === id ? { ...b, status: 'cancelled' } : b));
  };

  // Helper: Get bookings for a barber and day
  const getBookingsForBarberDay = (barberId: string, date: string) =>
    bookings.filter(
      b => b.employees?.id === barberId && b.date === date && b.status !== 'cancelled'
    );

  // Helper: Get schedule for a barber and day_of_week
  const getScheduleForBarberDay = (barberId: string, dayOfWeek: number) =>
    schedules.find(s => s.employee_id === barberId && s.day_of_week === dayOfWeek + 1);

  // Get next week's dates for Mon-Sat
  const getNextWeekDates = () => {
    const today = new Date();
    const nextMonday = new Date(today);
    nextMonday.setDate(today.getDate() + ((8 - today.getDay()) % 7 || 7));
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(nextMonday);
      d.setDate(nextMonday.getDate() + i);
      return d;
    });
  };
  const weekDates = getNextWeekDates();

  return (
    <div className="max-w-7xl mx-auto mt-10 p-6 bg-white rounded-lg shadow">
      <div className="flex gap-4 mb-8 border-b pb-4">
        <button onClick={() => setTab('bookings')} className={tab === 'bookings' ? 'font-bold underline' : 'text-gray-600'}>Bookings</button>
        <button onClick={() => setTab('employees')} className={tab === 'employees' ? 'font-bold underline' : 'text-gray-600'}>Barbers</button>
        <button onClick={() => setTab('services')} className={tab === 'services' ? 'font-bold underline' : 'text-gray-600'}>Services</button>
        <button onClick={() => setTab('customers')} className={tab === 'customers' ? 'font-bold underline' : 'text-gray-600'}>Customers</button>
        <button onClick={() => setTab('schedules')} className={tab === 'schedules' ? 'font-bold underline' : 'text-gray-600'}>Schedules</button>
      </div>

      {loading && <div>Loading...</div>}

      {tab === 'bookings' && !loading && (
        <div className="overflow-x-auto">
          <div className="flex gap-4 mb-4 items-end">
            <div>
              <label className="block text-sm font-semibold mb-1">Barber</label>
              <select
                value={bookingBarberFilter}
                onChange={e => setBookingBarberFilter(e.target.value)}
                className="border rounded px-2 py-1"
              >
                <option value="">All</option>
                {employees.map(e => (
                  <option key={e.id} value={e.id}>{e.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">Date</label>
              <input
                type="date"
                value={bookingDateFilter}
                onChange={e => setBookingDateFilter(e.target.value)}
                className="border rounded px-2 py-1"
              />
            </div>
            <button
              className="ml-2 px-3 py-1 bg-gray-200 rounded"
              onClick={() => { setBookingBarberFilter(''); setBookingDateFilter(''); }}
            >Clear</button>
          </div>
          <table className="min-w-full border border-gray-200 rounded-lg shadow-sm">
            <thead className="bg-gray-100 sticky top-0 z-10">
              <tr>
                <th className="px-4 py-2 text-left">Date</th>
                <th className="px-4 py-2 text-left">Time</th>
                <th className="px-4 py-2 text-left">Barber</th>
                <th className="px-4 py-2 text-left">Customer</th>
                <th className="px-4 py-2 text-left">Services</th>
                <th className="px-4 py-2 text-left">Status</th>
                <th className="px-4 py-2 text-left">Cancel</th>
              </tr>
            </thead>
            <tbody>
              {bookings
                .filter(b =>
                  (!bookingBarberFilter || b.employees?.id === bookingBarberFilter) &&
                  (!bookingDateFilter || b.date === bookingDateFilter)
                )
                .map((b, idx) => (
                  <tr key={b.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-4 py-2">{b.date}</td>
                    <td className="px-4 py-2">{b.start_time} - {b.end_time}</td>
                    <td className="px-4 py-2">{b.employees?.name}</td>
                    <td className="px-4 py-2">
                      <div className="font-medium">{b.customers?.name}</div>
                      <div className="text-xs text-gray-500">{b.customers?.phone}</div>
                      <div className="text-xs text-gray-400">{b.customers?.email}</div>
                    </td>
                    <td className="px-4 py-2">
                      {b.booking_services?.map((bs: any) => (
                        <span key={bs.services?.name} className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded mr-1 mb-1">{bs.services?.name}</span>
                      ))}
                    </td>
                    <td className="px-4 py-2 capitalize">{b.status}</td>
                    <td className="px-4 py-2">
                      {b.status !== 'cancelled' && (
                        <button className="text-red-600 hover:underline" onClick={() => cancelBooking(b.id)}>Cancel</button>
                      )}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'employees' && !loading && (
        <div className="overflow-x-auto">
          <table className="min-w-full border border-gray-200 rounded-lg shadow-sm mb-8">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-2 text-left">Name</th>
                <th className="px-4 py-2 text-left">Email</th>
                <th className="px-4 py-2 text-left">Phone</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((e, idx) => (
                <tr key={e.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-4 py-2">{e.name}</td>
                  <td className="px-4 py-2">{e.email}</td>
                  <td className="px-4 py-2">{e.phone}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'services' && !loading && (
        <div className="overflow-x-auto">
          <table className="min-w-full border border-gray-200 rounded-lg shadow-sm mb-8">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-2 text-left">Name</th>
                <th className="px-4 py-2 text-left">Duration (min)</th>
                <th className="px-4 py-2 text-left">Price</th>
              </tr>
            </thead>
            <tbody>
              {services.map((s, idx) => (
                <tr key={s.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-4 py-2">{s.name}</td>
                  <td className="px-4 py-2">{s.duration_minutes}</td>
                  <td className="px-4 py-2">${s.price}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'customers' && !loading && (
        <div className="overflow-x-auto">
          <table className="min-w-full border border-gray-200 rounded-lg shadow-sm mb-8">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-2 text-left">Name</th>
                <th className="px-4 py-2 text-left">Phone</th>
                <th className="px-4 py-2 text-left">Email</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c, idx) => (
                <tr key={c.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-4 py-2">{c.name}</td>
                  <td className="px-4 py-2">{c.phone}</td>
                  <td className="px-4 py-2">{c.email}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'schedules' && !loading && (
        <div>
          <div className="mb-4">
            <label className="mr-2 font-semibold">Select Barber:</label>
            <select
              value={selectedBarberId || ''}
              onChange={e => setSelectedBarberId(e.target.value)}
              className="border rounded px-2 py-1"
            >
              <option value="">-- Select --</option>
              {employees.map(e => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </select>
          </div>
          {selectedBarberId && (
            <BarberScheduleCalendar
              barber={employees.find(e => e.id === selectedBarberId)}
              schedules={schedules}
              bookings={bookings}
              weekStart={weekStart}
              onPrevWeek={() => setWeekStart(addDays(weekStart, -7))}
              onNextWeek={() => setWeekStart(addDays(weekStart, 7))}
            />
          )}
          {!selectedBarberId && <div className="text-gray-500">Please select a barber to view their schedule.</div>}
        </div>
      )}
    </div>
  );
}

export default AdminPanel;