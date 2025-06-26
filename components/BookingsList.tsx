'use client';
import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function BookingsList({ barberId }: { barberId: string }) {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!barberId) return;
    setLoading(true);
    supabase
      .from('bookings')
      .select(`
        id, date, start_time, end_time, status,
        customers (name, phone, email),
        employees (id, name),
        booking_services (
          services (name, price)
        )
      `)
      .eq('employee_id', barberId)
      .then(({ data }) => {
        setBookings(data || []);
        setLoading(false);
      });
  }, [barberId]);

  if (loading) return <div>Loading bookings...</div>;

  return (
    <div className="overflow-x-auto">
      <h2 className="text-xl font-bold mb-4">Bookings</h2>
      <table className="min-w-full border border-gray-200 rounded-lg shadow-sm">
        <thead className="bg-gray-100 sticky top-0 z-10">
          <tr>
            <th className="px-4 py-2 text-left">Date</th>
            <th className="px-4 py-2 text-left">Time</th>
            <th className="px-4 py-2 text-left">Barber</th>
            <th className="px-4 py-2 text-left">Customer</th>
            <th className="px-4 py-2 text-left">Services</th>
            <th className="px-4 py-2 text-left">Status</th>
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
                {b.booking_services?.map((bs: any, idx: number) => (
                  <span key={bs.id || idx} className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded mr-1 mb-1">{bs.services?.name}</span>
                ))}
              </td>
              <td className="px-4 py-2 capitalize">{b.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
} 