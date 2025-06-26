import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import twilio from 'twilio';

// Helper to combine date and time into a JS Date object (UTC)
function combineDateTime(date: string, time: string) {
  return new Date(`${date}T${time}Z`);
}

export async function GET() {
  const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID!, process.env.TWILIO_AUTH_TOKEN!);

  const now = new Date();

  // 1. Find bookings for reminders (1 hour before start)
  const { data: reminderBookings } = await supabase
    .from('bookings')
    .select('id, customer_id, employee_id, date, start_time, status')
    .eq('status', 'confirmed');

  for (const booking of reminderBookings || []) {
    const start = combineDateTime(booking.date, booking.start_time);
    const diffMinutes = (start.getTime() - now.getTime()) / 60000;
    if (diffMinutes > 59 && diffMinutes < 61) {
      // Fetch customer info
      const { data: customer } = await supabase
        .from('customers')
        .select('name, phone')
        .eq('id', booking.customer_id)
        .single();

      // Fetch barber info (optional)
      const { data: barber } = await supabase
        .from('employees')
        .select('name, phone')
        .eq('id', booking.employee_id)
        .single();

      if (customer?.phone) {
        // Send reminder SMS to customer
        await twilioClient.messages.create({
          to: customer.phone,
          from: process.env.TWILIO_PHONE_NUMBER!,
          body: `Hi ${customer.name}, your booking at Rozer's Barber Station is in 1 hour!`
        });
        // (Optional) Send reminder to barber
        if (barber?.phone) {
          await twilioClient.messages.create({
            to: barber.phone,
            from: process.env.TWILIO_PHONE_NUMBER!,
            body: `Reminder: You have a booking with ${customer.name} at ${booking.start_time} on ${booking.date}.`
          });
        }
        // Update status
        await supabase.from('bookings').update({ status: 'reminder_sent' }).eq('id', booking.id);
      }
    }
  }

  // 2. Find bookings for follow-up (5 min after end)
  const { data: followupBookings } = await supabase
    .from('bookings')
    .select('id, customer_id, employee_id, date, end_time, status')
    .eq('status', 'reminder_sent');

  for (const booking of followupBookings || []) {
    const end = combineDateTime(booking.date, booking.end_time);
    const diffMinutes = (now.getTime() - end.getTime()) / 60000;
    if (diffMinutes > 4 && diffMinutes < 6) {
      // Fetch customer info
      const { data: customer } = await supabase
        .from('customers')
        .select('name, phone')
        .eq('id', booking.customer_id)
        .single();

      if (customer?.phone) {
        try {
          // Send follow-up SMS to customer
          await twilioClient.messages.create({
            to: customer.phone,
            from: process.env.TWILIO_PHONE_NUMBER!,
            body: `Thank you for choosing Rozer's Barber Station, ${customer.name}! We hope you enjoyed your visit. Please leave us a review: [YOUR_GOOGLE_REVIEW_LINK]`
          });
          // Update status
          await supabase.from('bookings').update({ status: 'completed' }).eq('id', booking.id);
        } catch (err) {
          console.error('Twilio error (follow-up):', err);
        }
      }
    }
  }

  return NextResponse.json({ ok: true });
}
