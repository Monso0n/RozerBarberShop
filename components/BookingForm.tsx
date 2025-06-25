'use client';
import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Star } from "lucide-react";

type GoogleReview = { author_name: string; time: number; text: string; rating: number; };

export default function BookingForm() {
  const todayStr = new Date().toISOString().slice(0, 10);
  const [employees, setEmployees] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    employee_id: '',
    service_ids: [] as string[],
    date: todayStr,
    time: '',
  });
  const [availableTimes, setAvailableTimes] = useState<string[]>([]);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [reviews, setReviews] = useState<GoogleReview[]>([]);

  // Fetch employees and services
  useEffect(() => {
    supabase.from('employees').select('*').then(({ data }) => setEmployees(data || []));
    supabase.from('services').select('*').then(({ data }) => setServices(data || []));
  }, []);

  // Update available times when barber, date, or services change
  useEffect(() => {
    const fetchAvailableTimes = async () => {
      if (!form.employee_id || !form.date || form.service_ids.length === 0) {
        setAvailableTimes([]);
        return;
      }
      // Get selected services' total duration
      const selectedServices = services.filter((s: any) => form.service_ids.includes(s.id));
      const totalDuration = selectedServices.reduce((sum, s) => sum + s.duration_minutes, 0);

      // Get barber's schedule for that day of week
      let dayOfWeek = new Date(form.date).getDay();
      // Align with admin panel: Monday=1, Sunday=7
      dayOfWeek = dayOfWeek === 0 ? 7 : dayOfWeek;
      const { data: schedule } = await supabase
        .from('employee_schedule')
        .select('*')
        .eq('employee_id', form.employee_id)
        .eq('day_of_week', dayOfWeek)
        .single();

      // Debug log
      console.log('Schedule for', form.employee_id, 'on day', dayOfWeek, ':', schedule);

      if (!schedule) {
        setAvailableTimes([]);
        return;
      }

      // Get existing bookings for that barber on that date
      const { data: bookings } = await supabase
        .from('bookings')
        .select('start_time, end_time')
        .eq('employee_id', form.employee_id)
        .eq('date', form.date)
        .in('status', ['confirmed', 'completed']);

      // Generate time slots
      const slots: string[] = [];
      let [h, m] = schedule.start_time.split(':').map(Number);
      const [endH, endM] = schedule.end_time.split(':').map(Number);

      while (h < endH || (h === endH && m + totalDuration <= endM)) {
        const start = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
        // Calculate end time for this slot
        let endDate = new Date(0, 0, 0, h, m + totalDuration);
        const end = `${endDate.getHours().toString().padStart(2, '0')}:${endDate.getMinutes().toString().padStart(2, '0')}`;

        // Check for conflicts
        const conflict = bookings?.some(
          (b: any) =>
            (start < b.end_time && end > b.start_time)
        );
        if (!conflict) slots.push(start);

        // Increment by 15 min
        m += 15;
        if (m >= 60) {
          h += 1;
          m -= 60;
        }
      }
      setAvailableTimes(slots);
    };
    fetchAvailableTimes();
    // eslint-disable-next-line
  }, [form.employee_id, form.date, form.service_ids, services]);

  const handleChange = (e: any) => {
    const { name, value, type, checked } = e.target;
    if (name === 'service_ids') {
      setForm((prev) => {
        let newServiceIds = checked
          ? [...prev.service_ids, value]
          : prev.service_ids.filter((id: string) => id !== value);
        // Limit to max 5 services
        if (newServiceIds.length > 5) newServiceIds = newServiceIds.slice(0, 5);
        return { ...prev, service_ids: newServiceIds };
      });
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setError('');
    // 1. Check/create customer
    let { data: customer } = await supabase
      .from('customers')
      .select('*')
      .eq('phone', form.phone)
      .single();
    if (!customer) {
      const { data: newCustomer, error: custErr } = await supabase
        .from('customers')
        .insert([{ name: form.name, phone: form.phone, email: form.email }])
        .select()
        .single();
      if (custErr) return setError('Error creating customer');
      customer = newCustomer;
    }
    // 2. Calculate total duration
    const selectedServices = services.filter((s: any) => form.service_ids.includes(s.id));
    const totalDuration = selectedServices.reduce((sum, s) => sum + s.duration_minutes, 0);
    // 3. Create booking
    const startTime = form.time;
    const [h, m] = startTime.split(':').map(Number);
    const endDate = new Date(0, 0, 0, h, m + totalDuration);
    const endTime = endDate.toTimeString().slice(0, 5);
    const { data: booking, error: bookErr } = await supabase
      .from('bookings')
      .insert([{
        customer_id: customer.id,
        employee_id: form.employee_id,
        date: form.date,
        start_time: startTime,
        end_time: endTime,
        status: 'confirmed',
      }])
      .select()
      .single();
    if (bookErr) return setError('Error creating booking');
    // 4. Insert booking_services
    for (const service_id of form.service_ids) {
      await supabase.from('booking_services').insert([{ booking_id: booking.id, service_id }]);
    }
    // 5. Notify n8n webhook
    try {
      // TODO: Replace with your actual n8n webhook URL
      await fetch('https://monsoon02.app.n8n.cloud/webhook/e7cb6eec-6212-49fa-8b80-8d3bc6fd0d67', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId: booking.id })
      });
    } catch (err) {
      // Optionally handle webhook error
      console.error('Failed to notify n8n webhook', err);
    }
    setSuccess(true);
  };

  if (success) return <div className="p-4 text-green-600">Booking successful!</div>;

  // Debug function to fetch and show the schedule for the current selection
  const debugFetchSchedule = async () => {
    let dayOfWeek = new Date(form.date).getDay();
    dayOfWeek = dayOfWeek === 0 ? 7 : dayOfWeek;
    alert(`Barber: ${form.employee_id}, Day: ${dayOfWeek}`);
    const { data: schedule } = await supabase
      .from('employee_schedule')
      .select('*')
      .eq('employee_id', form.employee_id)
      .eq('day_of_week', dayOfWeek)
      .single();
    alert(JSON.stringify(schedule, null, 2));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-md mx-auto p-4 bg-white rounded shadow">
      <h2 className="text-xl font-bold mb-2">Book an Appointment</h2>
      {error && <div className="text-red-600">{error}</div>}
      <input name="name" placeholder="Name" required className="input w-full" onChange={handleChange} />
      <input name="phone" placeholder="Phone" required className="input w-full" onChange={handleChange} />
      <input name="email" placeholder="Email" className="input w-full" onChange={handleChange} />
      <select name="employee_id" required className="input w-full" onChange={handleChange} value={form.employee_id}>
        <option value="">Select Barber</option>
        {employees.map((e: any) => (
          <option key={e.id} value={e.id}>{e.name}</option>
        ))}
      </select>
      <div>
        <label className="block font-semibold">Services (max 5):</label>
        {services.map((s: any) => (
          <label key={s.id} className="block">
            <input
              type="checkbox"
              name="service_ids"
              value={s.id}
              checked={form.service_ids.includes(s.id)}
              onChange={handleChange}
              disabled={!form.service_ids.includes(s.id) && form.service_ids.length >= 5}
            /> {s.name} ({s.duration_minutes} min, ${s.price})
          </label>
        ))}
      </div>
      <input
        type="date"
        name="date"
        required
        className="input w-full"
        onChange={handleChange}
        value={form.date}
      />
      <select name="time" required className="input w-full" onChange={handleChange} value={form.time}>
        <option value="">Select Time</option>
        {availableTimes.map(t => (
          <option key={t} value={t}>{t}</option>
        ))}
      </select>
      {form.employee_id && form.date && form.service_ids.length > 0 && availableTimes.length === 0 && (
        <div className="text-red-600 text-sm mt-1">No available times for this selection.</div>
      )}
      {/* Debug button for schedule fetch */}
      <button type="button" onClick={debugFetchSchedule} className="btn btn-secondary w-full mb-2">
        Debug Schedule Fetch
      </button>
      <button type="submit" className="btn btn-primary w-full">Book Appointment</button>
    </form>
  );
}

function GoogleReviews() {
  const [reviews, setReviews] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/google-reviews')
      .then(res => res.json())
      .then(setReviews);
  }, []);

  if (!reviews.length) return <p>Loading reviews...</p>;

  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
      {reviews.map((review, idx) => (
        <Card key={idx}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">{review.author_name}</CardTitle>
                <CardDescription>
                  {new Date(review.time * 1000).toLocaleDateString()}
                </CardDescription>
              </div>
              <div className="flex">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">"{review.text}"</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}