'use client';
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import bcrypt from 'bcryptjs';

const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function AdminPanel() {
  const [tab, setTab] = useState('bookings');
  const [bookings, setBookings] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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
              {bookings.map((b, idx) => (
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
        <div className="overflow-x-auto">
          <table className="min-w-full border border-gray-200 rounded-lg shadow-sm mb-8">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-2 text-left">Barber</th>
                {daysOfWeek.map((d, i) => (
                  <th key={i} className="px-4 py-2 text-left">{d}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {employees.map(barber => (
                <tr key={barber.id}>
                  <td className="px-4 py-2 font-bold">{barber.name}</td>
                  {daysOfWeek.map((_, i) => {
                    const schedule = getScheduleForBarberDay(barber.id, i);
                    return (
                      <td key={i} className="px-4 py-2 align-top border">
                        {schedule ? (
                          <div>
                            <div className="text-xs text-gray-500 mb-1">
                              {schedule.start_time} - {schedule.end_time}
                            </div>
                            <div className="text-xs text-green-600">Working</div>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">Off</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default AdminPanel;