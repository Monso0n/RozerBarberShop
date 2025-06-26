import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import twilio from 'twilio';

// Helper to combine date and time into a JS Date object in Toronto time (fixed UTC-4 offset)
function combineDateTimeToronto(date: string, time: string) {
  // date: 'YYYY-MM-DD', time: 'HH:mm:ss'
  // Toronto is UTC-4 for most of the year (no DST handling)
  const [year, month, day] = date.split('-').map(Number);
  const [hour, minute, second] = time.split(':').map(Number);
  // Adjust hour for UTC-4 offset
  return new Date(Date.UTC(year, month - 1, day, hour + 4, minute, second || 0));
}

// Helper to get current time in Toronto (fixed UTC-4 offset)
function getNowToronto() {
  const now = new Date();
  // Subtract 4 hours to get Toronto local time if server is in UTC
  return new Date(now.getTime() - 4 * 60 * 60 * 1000);
}

export async function GET() {
  const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID!, process.env.TWILIO_AUTH_TOKEN!);

  // Use Toronto local time for all calculations
  const now = getNowToronto();

  // 1. Find bookings for reminders (1 hour before start)
  const { data: reminderBookings, error: reminderBookingsError } = await supabase
    .from('bookings')
    .select('id, customer_id, employee_id, date, start_time, status')
    .eq('status', 'confirmed');
  console.log('Reminder bookings query result:', reminderBookings, 'Error:', reminderBookingsError);

  for (const booking of reminderBookings || []) {
    const start = combineDateTimeToronto(booking.date, booking.start_time);
    const diffMinutes = (start.getTime() - now.getTime()) / 60000;
    console.log('Checking booking for reminder:', booking, 'Toronto start:', start, 'Now:', now, 'Minutes until start:', diffMinutes);
    if (diffMinutes > 0 && diffMinutes < 61) {
      // Fetch customer info
      const { data: customer, error: customerError } = await supabase
        .from('customers')
        .select('name, phone')
        .eq('id', booking.customer_id)
        .single();
      console.log('Fetched customer for reminder:', customer, 'Error:', customerError);

      // Fetch barber info (optional)
      const { data: barber, error: barberError } = await supabase
        .from('employees')
        .select('name, phone')
        .eq('id', booking.employee_id)
        .single();
      console.log('Fetched barber for reminder:', barber, 'Error:', barberError);

      if (customer?.phone) {
        // Send reminder SMS to customer
        try {
          const result = await twilioClient.messages.create({
            to: customer.phone,
            from: process.env.TWILIO_PHONE_NUMBER!,
            body: `Hi ${customer.name}, your booking at Rozer's Barber Station is coming right up, see you soon!`
          });
          console.log('Sent reminder SMS to customer:', result);
        } catch (err) {
          console.error('Error sending reminder SMS to customer:', err);
        }
        // (Optional) Send reminder to barber
        if (barber?.phone) {
          const { data: bookingServices, error: bookingServicesError } = await supabase
            .from('booking_services')
            .select('service_id, services(name)')
            .eq('booking_id', booking.id);
          console.log('Fetched booking_services for reminder:', bookingServices, 'Error:', bookingServicesError);

          let serviceNames = 'N/A';
          if (bookingServices && bookingServices.length > 0) {
            serviceNames = bookingServices
              .map((bs: any) => {
                if (!bs.services) return null;
                if (Array.isArray(bs.services)) {
                  return bs.services.map((s: any) => s.name).filter(Boolean).join(', ');
                } else if (typeof bs.services === 'object') {
                  return bs.services.name;
                }
                return null;
              })
              .filter(Boolean)
              .join(', ');
          }

          const barberMessage = `New booking: ${customer.name}\nServices: ${serviceNames}\nTime: ${booking.date} ${booking.start_time}`;
          try {
            const resultBarber = await twilioClient.messages.create({
              to: barber.phone,
              from: process.env.TWILIO_PHONE_NUMBER!,
              body: barberMessage
            });
            console.log('Sent reminder SMS to barber:', resultBarber);
          } catch (err) {
            console.error('Error sending reminder SMS to barber:', err);
          }
        }
        // Update status
        const { error: updateError } = await supabase.from('bookings').update({ status: 'reminder_sent' }).eq('id', booking.id);
        if (updateError) {
          console.error('Error updating booking status to reminder_sent:', updateError);
        } else {
          console.log('Updated booking status to reminder_sent for booking:', booking.id);
        }
      }
    }
  }

  // 2. Find bookings for follow-up (5 min after end)
  const { data: followupBookings, error: followupBookingsError } = await supabase
    .from('bookings')
    .select('id, customer_id, employee_id, date, end_time, status')
    .eq('status', 'reminder_sent');
  console.log('Follow-up bookings query result:', followupBookings, 'Error:', followupBookingsError);

  for (const booking of followupBookings || []) {
    const end = combineDateTimeToronto(booking.date, booking.end_time);
    const diffMinutes = (now.getTime() - end.getTime()) / 60000;
    console.log('Checking booking for follow-up:', booking, 'Toronto end:', end, 'Now:', now, 'Minutes since end:', diffMinutes);
    if (diffMinutes > 4) {
      // Fetch customer info
      const { data: customer, error: customerError } = await supabase
        .from('customers')
        .select('name, phone')
        .eq('id', booking.customer_id)
        .single();
      console.log('Fetched customer for follow-up:', customer, 'Error:', customerError);

      if (customer?.phone) {
        try {
          // Send follow-up SMS to customer
          const result = await twilioClient.messages.create({
            to: customer.phone,
            from: process.env.TWILIO_PHONE_NUMBER!,
            body: `Thank you for choosing Rozer's Barber Station, ${customer.name}! We hope you enjoyed your visit. Please leave us a review: [YOUR_GOOGLE_REVIEW_LINK]`
          });
          console.log('Sent follow-up SMS to customer:', result);
          // Update status
          const { error: updateError } = await supabase.from('bookings').update({ status: 'completed' }).eq('id', booking.id);
          if (updateError) {
            console.error('Error updating booking status to completed:', updateError);
          } else {
            console.log('Updated booking status to completed for booking:', booking.id);
          }
        } catch (err) {
          console.error('Twilio error (follow-up):', err);
        }
      }
    }
  }

  return NextResponse.json({ ok: true });
}
