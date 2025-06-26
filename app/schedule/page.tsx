'use client';
import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import ScheduleGrid from '@/components/ScheduleGrid';
import BookingsList from '@/components/BookingsList';

export default function SchedulePage() {
  const [barbers, setBarbers] = useState<any[]>([]);
  const [selectedBarber, setSelectedBarber] = useState<string>('');

  useEffect(() => {
    supabase.from('employees').select('id, name').then(({ data }) => {
      setBarbers(data || []);
      if (data && data.length > 0 && !selectedBarber) {
        setSelectedBarber(data[0].id);
      }
    });
  }, []);

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Barber Schedules</h1>
      <div className="mb-4">
        <label className="font-semibold mr-2">Select Barber:</label>
        <select
          className="border rounded px-2 py-1"
          value={selectedBarber}
          onChange={e => setSelectedBarber(e.target.value)}
        >
          {barbers.map(b => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
      </div>
      {selectedBarber ? (
        <>
          <div className="mb-8">
            <ScheduleGrid barberId={selectedBarber} />
          </div>
          <div>
            <BookingsList barberId={selectedBarber} />
          </div>
        </>
      ) : (
        <div>Please select a barber to view their schedule and bookings.</div>
      )}
    </div>
  );
} 