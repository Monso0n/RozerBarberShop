import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import MessagingResponse from 'twilio/lib/twiml/MessagingResponse';

export async function POST(req: Request) {
  // Parse Twilio's x-www-form-urlencoded body
  const formData = await req.formData();
  const from = formData.get('From') as string; // E.164 format
  const body = (formData.get('Body') as string || '').trim().toUpperCase();

  const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

  // Handle SCHEDULE command for barbers
  if (body === 'SCHEDULE') {
    // Find the barber by phone number
    const { data: barber } = await supabase
      .from('employees')
      .select('id, name')
      .eq('phone', from)
      .single();

    const resp = new MessagingResponse();

    if (!barber) {
      resp.message("We couldn't find a barber account for your number.");
      return new Response(resp.toString(), { headers: { 'Content-Type': 'text/xml' } });
    }

    // Get today's day of week (1=Monday, 7=Sunday)
    const today = new Date();
    let dayOfWeek = today.getDay();
    dayOfWeek = dayOfWeek === 0 ? 7 : dayOfWeek;

    // Fetch today's schedule
    const { data: schedule } = await supabase
      .from('employee_schedule')
      .select('start_time, end_time')
      .eq('employee_id', barber.id)
      .eq('day_of_week', dayOfWeek)
      .single();

    if (!schedule) {
      resp.message(`Hi ${barber.name}, you are off today!`);
    } else {
      resp.message(`Hi ${barber.name}, your schedule today is ${schedule.start_time} to ${schedule.end_time}.`);
    }

    return new Response(resp.toString(), { headers: { 'Content-Type': 'text/xml' } });
  }

  // Handle CANCEL command for customers
  if (body === 'CANCEL') {
    // Find the customer by phone number
    const { data: customer } = await supabase
      .from('customers')
      .select('id, name')
      .eq('phone', from)
      .single();

    if (!customer) {
      const resp = new MessagingResponse();
      resp.message("We couldn't find any bookings for your number.");
      return new Response(resp.toString(), { headers: { 'Content-Type': 'text/xml' } });
    }

    // Find all upcoming bookings more than 1 hour away
    const now = new Date();
    const { data: bookings } = await supabase
      .from('bookings')
      .select('id, date, start_time, status')
      .eq('customer_id', customer.id)
      .in('status', ['confirmed', 'reminder_sent'])
      .order('date', { ascending: true });

    const toCancel = (bookings || []).filter(b => {
      const bookingDate = new Date(`${b.date}T${b.start_time}`);
      return (bookingDate.getTime() - now.getTime()) / 3600000 > 1;
    });

    if (toCancel.length === 0) {
      const resp = new MessagingResponse();
      resp.message("You have no upcoming bookings that can be cancelled.");
      return new Response(resp.toString(), { headers: { 'Content-Type': 'text/xml' } });
    }

    // Cancel the bookings
    const ids = toCancel.map(b => b.id);
    await supabase.from('bookings').update({ status: 'cancelled' }).in('id', ids);

    // Build the reply
    const details = toCancel.map(b => `• ${b.date} at ${b.start_time}`).join('\n');
    const resp = new MessagingResponse();
    resp.message(`Cancelled the following bookings:\n${details}`);

    return new Response(resp.toString(), { headers: { 'Content-Type': 'text/xml' } });
  }

  // Default: ignore or reply with help
  const resp = new MessagingResponse();
  resp.message('Unrecognized command. Reply with SCHEDULE (barbers) or CANCEL (customers).');
  return new Response(resp.toString(), { headers: { 'Content-Type': 'text/xml' } });
} 