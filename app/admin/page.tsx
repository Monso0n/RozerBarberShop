'use client';
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import bcrypt from 'bcryptjs';
import { addDays, startOfWeek, format, isSameDay, parseISO } from 'date-fns';
import { FormEvent, ChangeEvent } from 'react';

export const weekDays = [
  { label: 'Monday', num: 1 },
  { label: 'Tuesday', num: 2 },
  { label: 'Wednesday', num: 3 },
  { label: 'Thursday', num: 4 },
  { label: 'Friday', num: 5 },
  { label: 'Saturday', num: 6 },
  { label: 'Sunday', num: 7 },
];

// Add prop types for BarberScheduleCalendar
interface BarberScheduleCalendarProps {
  barber: any;
  schedules: any[];
  bookings: any[];
  weekStart: Date;
  onPrevWeek: () => void;
  onNextWeek: () => void;
  timeOffDates: string[];
}

function BarberScheduleCalendar({ barber, schedules, bookings, weekStart, onPrevWeek, onNextWeek, timeOffDates }: BarberScheduleCalendarProps) {
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
    return schedules.find((s: any) => s.employee_id === barber.id && s.day_of_week === dow);
  };

  // Helper: get bookings for a day
  const getBookings = (day: Date) => {
    return bookings.filter((b: any) => b.employees?.id === barber.id && isSameDay(parseISO(b.date), day));
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
  const [barberTimeOffDates, setBarberTimeOffDates] = useState<string[]>([]);
  const [showScheduleModal, setShowScheduleModal] = useState<string | null>(null);
  const [scheduleEdit, setScheduleEdit] = useState<{ [key: number]: { working: boolean; start_time: string; end_time: string } } | null>(null);
  const [savingSchedule, setSavingSchedule] = useState(false);

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
      supabase.from('employee_schedule').select('*, employees(id, name)'),
      supabase.from('employee_time_off').select('date').eq('employee_id', selectedBarberId)
    ]).then(([bookingsRes, employeesRes, servicesRes, customersRes, schedulesRes, timeOffRes]) => {
      setBookings(bookingsRes.data || []);
      setEmployees(employeesRes.data || []);
      setServices(servicesRes.data || []);
      setCustomers(customersRes.data || []);
      setSchedules(schedulesRes.data || []);
      setBarberTimeOffDates(timeOffRes.data?.map((t: any) => t.date) || []);
      setLoading(false);
    });
  }, [selectedBarberId]);

  const cancelBooking = async (id: string) => {
    if (!window.confirm('Are you sure you want to cancel this booking?')) return;
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

  // Fetch and open schedule modal
  const openScheduleModal = async (employeeId: string) => {
    // Fetch current schedule for this employee
    const { data } = await supabase.from('employee_schedule').select('*').eq('employee_id', employeeId);
    // Build scheduleEdit state
    const sch: { [key: number]: { working: boolean; start_time: string; end_time: string } } = {};
    weekDays.forEach(day => {
      const found = data?.find((s: any) => s.day_of_week === day.num);
      sch[day.num] = found
        ? { working: true, start_time: found.start_time.slice(0,5), end_time: found.end_time.slice(0,5) }
        : { working: false, start_time: '10:00', end_time: '19:00' };
    });
    setScheduleEdit(sch);
    setShowScheduleModal(employeeId);
  };

  const saveSchedule = async (employeeId: string) => {
    setSavingSchedule(true);
    // Delete all existing schedule rows for this employee
    await supabase.from('employee_schedule').delete().eq('employee_id', employeeId);
    // Insert new rows for working days
    const rows = weekDays.filter(day => scheduleEdit?.[day.num].working).map(day => ({
      employee_id: employeeId,
      day_of_week: day.num,
      start_time: scheduleEdit?.[day.num].start_time + ':00',
      end_time: scheduleEdit?.[day.num].end_time + ':00',
    }));
    if (rows.length > 0) {
      await supabase.from('employee_schedule').insert(rows);
    }
    setSavingSchedule(false);
    setShowScheduleModal(null);
  };

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
                      {b.booking_services?.map((bs: any, idx: number) => (
                        <span key={bs.id || idx} className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded mr-1 mb-1">{bs.services?.name}</span>
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
          <BarbersAdminTable employees={employees} setEmployees={setEmployees} onEditSchedule={openScheduleModal} />
        </div>
      )}

      {tab === 'services' && !loading && (
        <div className="overflow-x-auto">
          <ServicesAdminTable services={services} setServices={setServices} />
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
              timeOffDates={barberTimeOffDates}
            />
          )}
          {!selectedBarberId && <div className="text-gray-500">Please select a barber to view their schedule.</div>}
        </div>
      )}

      {showScheduleModal && scheduleEdit && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-lg relative">
            <button className="absolute top-2 right-2 text-gray-500 hover:text-black" onClick={() => setShowScheduleModal(null)}>&times;</button>
            <h2 className="text-xl font-bold mb-4">Edit Schedule</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-4">
              {weekDays.map(day => (
                <div key={day.num} className="flex flex-col border rounded p-2 bg-white">
                  <label className="font-semibold mb-1 flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={scheduleEdit[day.num].working}
                      onChange={e => setScheduleEdit(sch => sch ? { ...sch, [day.num]: { ...sch[day.num], working: e.target.checked } } : sch)}
                    />
                    {day.label}
                  </label>
                  {scheduleEdit[day.num].working && (
                    <div className="flex gap-1 items-center">
                      <input
                        type="time"
                        className="border rounded px-1 py-0.5 w-24"
                        value={scheduleEdit[day.num].start_time}
                        onChange={e => setScheduleEdit(sch => sch ? { ...sch, [day.num]: { ...sch[day.num], start_time: e.target.value } } : sch)}
                      />
                      <span>-</span>
                      <input
                        type="time"
                        className="border rounded px-1 py-0.5 w-24"
                        value={scheduleEdit[day.num].end_time}
                        onChange={e => setScheduleEdit(sch => sch ? { ...sch, [day.num]: { ...sch[day.num], end_time: e.target.value } } : sch)}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
            <button className="bg-blue-600 text-white px-4 py-2 rounded font-semibold" onClick={() => saveSchedule(showScheduleModal)} disabled={savingSchedule}>
              {savingSchedule ? 'Saving...' : 'Save Schedule'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

type Service = {
  id: string;
  name: string;
  price: number;
  duration_minutes: number;
  description: string;
};

function ServicesAdminTable({ services, setServices }: { services: Service[]; setServices: React.Dispatch<React.SetStateAction<Service[]>> }) {
  const [editId, setEditId] = React.useState<string | null>(null);
  const [editForm, setEditForm] = React.useState<{ name: string; price: string; duration_minutes: string; description: string }>({ name: '', price: '', duration_minutes: '', description: '' });
  const [addForm, setAddForm] = React.useState<{ name: string; price: string; duration_minutes: string; description: string }>({ name: '', price: '', duration_minutes: '', description: '' });
  const addFormRef = useRef<HTMLFormElement>(null);

  // Handle edit
  const startEdit = (service: Service) => {
    setEditId(service.id);
    setEditForm({
      name: service.name,
      price: String(service.price),
      duration_minutes: String(service.duration_minutes),
      description: service.description || ''
    });
  };
  const cancelEdit = () => {
    setEditId(null);
    setEditForm({ name: '', price: '', duration_minutes: '', description: '' });
  };
  const saveEdit = async (id: string) => {
    const { error } = await supabase.from('services').update({
      name: editForm.name,
      price: Number(editForm.price),
      duration_minutes: Number(editForm.duration_minutes),
      description: editForm.description
    }).eq('id', id);
    if (!error) {
      setServices(services.map(s => s.id === id ? { ...s, ...editForm, price: Number(editForm.price), duration_minutes: Number(editForm.duration_minutes) } : s));
      cancelEdit();
    } else {
      alert('Error updating service');
    }
  };
  // Handle delete
  const deleteService = async (id: string) => {
    if (!window.confirm('Delete this service?')) return;
    const { error } = await supabase.from('services').delete().eq('id', id);
    if (!error) {
      setServices(services.filter(s => s.id !== id));
    } else {
      alert('Error deleting service');
    }
  };
  // Handle add
  const addService = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const { data, error } = await supabase.from('services').insert([{ ...addForm, price: Number(addForm.price), duration_minutes: Number(addForm.duration_minutes) }]).select().single();
    if (!error && data) {
      setServices([...services, data]);
      setAddForm({ name: '', price: '', duration_minutes: '', description: '' });
      if (addFormRef.current) addFormRef.current.reset();
    } else {
      alert('Error adding service');
    }
  };
  return (
    <>
      <form ref={addFormRef} onSubmit={addService} className="mb-4 flex flex-wrap gap-2 items-end bg-gray-50 p-4 rounded">
        <input required placeholder="Name" className="border rounded px-2 py-1" value={addForm.name} onChange={(e: ChangeEvent<HTMLInputElement>) => setAddForm(f => ({ ...f, name: e.target.value }))} />
        <input required placeholder="Duration (min)" type="number" className="border rounded px-2 py-1 w-32" value={addForm.duration_minutes} onChange={(e: ChangeEvent<HTMLInputElement>) => setAddForm(f => ({ ...f, duration_minutes: e.target.value }))} />
        <input required placeholder="Price" type="number" className="border rounded px-2 py-1 w-32" value={addForm.price} onChange={(e: ChangeEvent<HTMLInputElement>) => setAddForm(f => ({ ...f, price: e.target.value }))} />
        <input required placeholder="Description" className="border rounded px-2 py-1 flex-1" value={addForm.description} onChange={(e: ChangeEvent<HTMLInputElement>) => setAddForm(f => ({ ...f, description: e.target.value }))} />
        <button type="submit" className="bg-blue-600 text-white px-3 py-1 rounded">Add Service</button>
      </form>
      <table className="min-w-full border border-gray-200 rounded-lg shadow-sm mb-8">
        <thead className="bg-gray-100">
          <tr>
            <th className="px-4 py-2 text-left">Name</th>
            <th className="px-4 py-2 text-left">Duration (min)</th>
            <th className="px-4 py-2 text-left">Price</th>
            <th className="px-4 py-2 text-left">Description</th>
            <th className="px-4 py-2 text-left">Actions</th>
          </tr>
        </thead>
        <tbody>
          {services.map((s, idx) => (
            <tr key={s.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
              {editId === s.id ? (
                <>
                  <td className="px-4 py-2"><input className="border rounded px-2 py-1 w-32" value={editForm.name} onChange={(e: ChangeEvent<HTMLInputElement>) => setEditForm(f => ({ ...f, name: e.target.value }))} /></td>
                  <td className="px-4 py-2"><input className="border rounded px-2 py-1 w-20" type="number" value={editForm.duration_minutes} onChange={(e: ChangeEvent<HTMLInputElement>) => setEditForm(f => ({ ...f, duration_minutes: e.target.value }))} /></td>
                  <td className="px-4 py-2"><input className="border rounded px-2 py-1 w-20" type="number" value={editForm.price} onChange={(e: ChangeEvent<HTMLInputElement>) => setEditForm(f => ({ ...f, price: e.target.value }))} /></td>
                  <td className="px-4 py-2"><input className="border rounded px-2 py-1 w-64" value={editForm.description} onChange={(e: ChangeEvent<HTMLInputElement>) => setEditForm(f => ({ ...f, description: e.target.value }))} /></td>
                  <td className="px-4 py-2 space-x-2">
                    <button className="bg-green-600 text-white px-2 py-1 rounded" onClick={() => saveEdit(s.id)}>Save</button>
                    <button className="bg-gray-400 text-white px-2 py-1 rounded" onClick={cancelEdit}>Cancel</button>
                  </td>
                </>
              ) : (
                <>
                  <td className="px-4 py-2">{s.name}</td>
                  <td className="px-4 py-2">{s.duration_minutes}</td>
                  <td className="px-4 py-2">${s.price}</td>
                  <td className="px-4 py-2">{s.description}</td>
                  <td className="px-4 py-2 space-x-2">
                    <button className="bg-yellow-500 text-white px-2 py-1 rounded" onClick={() => startEdit(s)}>Edit</button>
                    <button className="bg-red-600 text-white px-2 py-1 rounded" onClick={() => deleteService(s.id)}>Delete</button>
                  </td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

type Barber = {
  id: string;
  name: string;
  phone: string;
  photo_url?: string;
};

function BarbersAdminTable({ employees, setEmployees, onEditSchedule }: { employees: Barber[]; setEmployees: React.Dispatch<React.SetStateAction<Barber[]>>; onEditSchedule: (employeeId: string) => void }) {
  const [editId, setEditId] = React.useState<string | null>(null);
  const [editForm, setEditForm] = React.useState<{ name: string; phone: string; photo_url?: string }>({ name: '', phone: '', photo_url: '' });
  const [addForm, setAddForm] = React.useState<{ name: string; phone: string; photo_url?: string }>({ name: '', phone: '', photo_url: '' });
  const [addPhotoFile, setAddPhotoFile] = React.useState<File | null>(null);
  const [editPhotoFile, setEditPhotoFile] = React.useState<File | null>(null);
  const addFormRef = React.useRef<HTMLFormElement>(null);
  const [showTimeOffModal, setShowTimeOffModal] = useState<string | null>(null);
  const [timeOffList, setTimeOffList] = useState<{ id: string; date: string; reason: string }[]>([]);
  const [timeOffDate, setTimeOffDate] = useState('');
  const [timeOffReason, setTimeOffReason] = useState('');
  const [loadingTimeOff, setLoadingTimeOff] = useState(false);

  // Default weekly schedule
  const defaultSchedule = {
    1: { working: true, start_time: '10:00', end_time: '18:00' }, // Monday
    2: { working: false, start_time: '', end_time: '' },          // Tuesday (closed)
    3: { working: true, start_time: '10:00', end_time: '19:00' }, // Wednesday
    4: { working: true, start_time: '10:00', end_time: '19:00' }, // Thursday
    5: { working: true, start_time: '10:00', end_time: '19:00' }, // Friday
    6: { working: true, start_time: '10:00', end_time: '19:00' }, // Saturday
    7: { working: true, start_time: '10:00', end_time: '18:00' }, // Sunday
  };
  const [schedule, setSchedule] = React.useState<{ [key: number]: { working: boolean; start_time: string; end_time: string } }>(defaultSchedule);

  // Fetch time off for selected employee
  useEffect(() => {
    if (showTimeOffModal) {
      setLoadingTimeOff(true);
      supabase.from('employee_time_off').select('*').eq('employee_id', showTimeOffModal).order('date', { ascending: true }).then(({ data }) => {
        setTimeOffList(data || []);
        setLoadingTimeOff(false);
      });
    }
  }, [showTimeOffModal]);

  const addTimeOff = async () => {
    if (!timeOffDate) return;
    await supabase.from('employee_time_off').insert([{ employee_id: showTimeOffModal, date: timeOffDate, reason: timeOffReason }]);
    setTimeOffDate('');
    setTimeOffReason('');
    // Refresh list
    const { data } = await supabase.from('employee_time_off').select('*').eq('employee_id', showTimeOffModal).order('date', { ascending: true });
    setTimeOffList(data || []);
  };
  const removeTimeOff = async (id: string) => {
    await supabase.from('employee_time_off').delete().eq('id', id);
    setTimeOffList(timeOffList.filter(t => t.id !== id));
  };

  // Handle edit
  const startEdit = (barber: Barber) => {
    setEditId(barber.id);
    setEditForm({
      name: barber.name,
      phone: barber.phone || '',
      photo_url: barber.photo_url || ''
    });
    setEditPhotoFile(null);
  };
  const cancelEdit = () => {
    setEditId(null);
    setEditForm({ name: '', phone: '', photo_url: '' });
    setEditPhotoFile(null);
  };
  const saveEdit = async (id: string) => {
    let photo_url = editForm.photo_url;
    let uploadError = null;
    if (editPhotoFile) {
      const fileExt = editPhotoFile.name.split('.').pop();
      const filePath = `barbers/${id}.${fileExt}`;
      const uploadRes = await supabase.storage.from('barber-photos').upload(filePath, editPhotoFile, { upsert: true });
      uploadError = uploadRes.error;
      if (!uploadError) {
        const { data: publicUrlData } = supabase.storage.from('barber-photos').getPublicUrl(filePath);
        photo_url = publicUrlData.publicUrl;
      } else {
        alert('Image upload failed: ' + uploadError.message);
        console.error('Image upload error:', uploadError);
        return;
      }
    }
    const { error } = await supabase.from('employees').update({
      name: editForm.name,
      phone: editForm.phone,
      photo_url: photo_url || null
    }).eq('id', id);
    if (!error) {
      setEmployees(employees.map(e => e.id === id ? { ...e, ...editForm, photo_url } : e));
      cancelEdit();
    } else {
      alert('Error updating barber: ' + error.message);
      console.error('Barber update error:', error);
    }
  };
  // Handle delete
  const deleteBarber = async (id: string) => {
    if (!window.confirm('Delete this barber?')) return;
    const { error } = await supabase.from('employees').delete().eq('id', id);
    if (!error) {
      setEmployees(employees.filter(e => e.id !== id));
    } else {
      alert('Error deleting barber');
    }
  };
  // Handle add
  const addBarber = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // Validate phone number: must be 10 digits
    const phoneDigits = addForm.phone.replace(/\D/g, '');
    if (phoneDigits.length !== 10) {
      alert('Please enter a valid 10-digit phone number.');
      return;
    }
    const formattedPhone = '+1' + phoneDigits;
    let photo_url = '';
    let newEmployeeId = '';
    // Insert employee first to get the id
    const { data, error } = await supabase.from('employees').insert([{ name: addForm.name, phone: formattedPhone }]).select().single();
    if (!error && data) {
      newEmployeeId = data.id;
      // Upload photo if present
      if (addPhotoFile) {
        const fileExt = addPhotoFile.name.split('.').pop();
        const filePath = `barbers/${newEmployeeId}.${fileExt}`;
        const uploadRes = await supabase.storage.from('baber-photos').upload(filePath, addPhotoFile, { upsert: true });
        if (!uploadRes.error) {
          const { data: publicUrlData } = supabase.storage.from('baber-photos').getPublicUrl(filePath);
          photo_url = publicUrlData.publicUrl;
          // Update employee with photo_url
          const { error: updateError } = await supabase.from('employees').update({ photo_url }).eq('id', newEmployeeId);
          if (updateError) {
            alert('Error updating photo_url: ' + updateError.message);
            console.error('Photo_url update error:', updateError);
          }
        } else {
          alert('Image upload failed: ' + uploadRes.error.message);
          console.error('Image upload error:', uploadRes.error);
        }
      }
      // Always fetch the latest employee data after update
      const { data: latestEmp } = await supabase.from('employees').select('*').eq('id', newEmployeeId).single();
      setEmployees([...employees, latestEmp || { ...data, photo_url }]);
      setAddForm({ name: '', phone: '', photo_url: '' });
      setAddPhotoFile(null);
      if (addFormRef.current) addFormRef.current.reset();
      // Insert schedule for each working day
      const scheduleRows = weekDays
        .filter(day => schedule[day.num].working)
        .map(day => ({
          employee_id: newEmployeeId,
          day_of_week: day.num,
          start_time: schedule[day.num].start_time + ':00',
          end_time: schedule[day.num].end_time + ':00',
        }));
      if (scheduleRows.length > 0) {
        await supabase.from('employee_schedule').insert(scheduleRows);
      }
      setSchedule(defaultSchedule);
    } else {
      alert('Error adding barber: ' + (error?.message || 'Unknown error'));
      console.error('Add barber error:', error);
    }
  };
  return (
    <>
      <form ref={addFormRef} onSubmit={addBarber} className="mb-4 flex flex-col gap-4 bg-gray-50 p-4 rounded">
        <div className="flex flex-wrap gap-2 items-end">
          <input required placeholder="Name" className="border rounded px-2 py-1" value={addForm.name} onChange={(e: ChangeEvent<HTMLInputElement>) => setAddForm(f => ({ ...f, name: e.target.value }))} />
          <input required placeholder="Phone" className="border rounded px-2 py-1 w-40" value={addForm.phone} onChange={(e: ChangeEvent<HTMLInputElement>) => setAddForm(f => ({ ...f, phone: e.target.value }))} />
          <input type="file" accept="image/*" onChange={e => setAddPhotoFile(e.target.files?.[0] || null)} className="border rounded px-2 py-1" />
          <button type="submit" className="bg-blue-600 text-white px-3 py-1 rounded">Add Barber</button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 mt-2">
          {weekDays.map(day => (
            <div key={day.num} className="flex flex-col border rounded p-2 bg-white">
              <label className="font-semibold mb-1 flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={schedule[day.num].working}
                  onChange={e => setSchedule(sch => ({
                    ...sch,
                    [day.num]: { ...sch[day.num], working: e.target.checked }
                  }))}
                />
                {day.label}
              </label>
              {schedule[day.num].working && (
                <div className="flex gap-1 items-center">
                  <input
                    type="time"
                    className="border rounded px-1 py-0.5 w-24"
                    value={schedule[day.num].start_time}
                    onChange={e => setSchedule(sch => ({
                      ...sch,
                      [day.num]: { ...sch[day.num], start_time: e.target.value }
                    }))}
                  />
                  <span>-</span>
                  <input
                    type="time"
                    className="border rounded px-1 py-0.5 w-24"
                    value={schedule[day.num].end_time}
                    onChange={e => setSchedule(sch => ({
                      ...sch,
                      [day.num]: { ...sch[day.num], end_time: e.target.value }
                    }))}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </form>
      <table className="min-w-full border border-gray-200 rounded-lg shadow-sm mb-8">
        <thead className="bg-gray-100">
          <tr>
            <th className="px-4 py-2 text-left">Name</th>
            <th className="px-4 py-2 text-left">Phone</th>
            <th className="px-4 py-2 text-left">Photo</th>
            <th className="px-4 py-2 text-left">Actions</th>
          </tr>
        </thead>
        <tbody>
          {employees.map((e, idx) => (
            <tr key={e.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
              {editId === e.id ? (
                <>
                  <td className="px-4 py-2"><input className="border rounded px-2 py-1 w-32" value={editForm.name} onChange={(ev: ChangeEvent<HTMLInputElement>) => setEditForm(f => ({ ...f, name: ev.target.value }))} /></td>
                  <td className="px-4 py-2"><input className="border rounded px-2 py-1 w-40" value={editForm.phone} onChange={(ev: ChangeEvent<HTMLInputElement>) => setEditForm(f => ({ ...f, phone: ev.target.value }))} /></td>
                  <td className="px-4 py-2">
                    <input type="file" accept="image/*" onChange={e => setEditPhotoFile(e.target.files?.[0] || null)} className="border rounded px-2 py-1" />
                    {editForm.photo_url && <img src={editForm.photo_url} alt="Barber" className="w-12 h-12 rounded-full mt-1" />}
                  </td>
                  <td className="px-4 py-2 space-x-2">
                    <button className="bg-green-600 text-white px-2 py-1 rounded" onClick={() => saveEdit(e.id)}>Save</button>
                    <button className="bg-gray-400 text-white px-2 py-1 rounded" onClick={cancelEdit}>Cancel</button>
                  </td>
                </>
              ) : (
                <>
                  <td className="px-4 py-2">{e.name}</td>
                  <td className="px-4 py-2">{e.phone}</td>
                  <td className="px-4 py-2">
                    <img src={e.photo_url || '/images/barber-placeholder.jpg'} alt="Barber" className="w-12 h-12 rounded-full" />
                  </td>
                  <td className="px-4 py-2 space-x-2">
                    <button className="bg-yellow-500 text-white px-2 py-1 rounded" onClick={() => startEdit(e)}>Edit</button>
                    <button className="bg-red-600 text-white px-2 py-1 rounded" onClick={() => deleteBarber(e.id)}>Delete</button>
                    <button className="bg-gray-700 text-white px-2 py-1 rounded" onClick={() => setShowTimeOffModal(e.id)}>Time Off</button>
                    <button className="bg-blue-700 text-white px-2 py-1 rounded" onClick={() => onEditSchedule(e.id)}>Edit Schedule</button>
                  </td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      {/* Time Off Modal */}
      {showTimeOffModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md relative">
            <button className="absolute top-2 right-2 text-gray-500 hover:text-black" onClick={() => setShowTimeOffModal(null)}>&times;</button>
            <h2 className="text-xl font-bold mb-4">Time Off</h2>
            {loadingTimeOff ? <div>Loading...</div> : (
              <>
                <ul className="mb-4 max-h-40 overflow-y-auto">
                  {timeOffList.map(t => (
                    <li key={t.id} className="flex justify-between items-center border-b py-1">
                      <span>{t.date} {t.reason && <span className="text-xs text-gray-500 ml-2">({t.reason})</span>}</span>
                      <button className="text-red-600 hover:underline ml-2" onClick={() => removeTimeOff(t.id)}>Remove</button>
                    </li>
                  ))}
                  {timeOffList.length === 0 && <li className="text-gray-500">No time off set.</li>}
                </ul>
                <div className="flex gap-2 items-end">
                  <input type="date" className="border rounded px-2 py-1" value={timeOffDate} onChange={e => setTimeOffDate(e.target.value)} />
                  <input type="text" className="border rounded px-2 py-1" placeholder="Reason (optional)" value={timeOffReason} onChange={e => setTimeOffReason(e.target.value)} />
                  <button className="bg-blue-600 text-white px-3 py-1 rounded" onClick={addTimeOff}>Add</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

export default AdminPanel;