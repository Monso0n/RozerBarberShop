import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import MessagingResponse from 'twilio/lib/twiml/MessagingResponse';

// Helper to combine date and time into a JS Date object in Toronto time (fixed UTC-4 offset)
function combineDateTimeToronto(date: string, time: string) {
  const [year, month, day] = date.split('-').map(Number);
  const [hour, minute, second] = time.split(':').map(Number);
  return new Date(Date.UTC(year, month - 1, day, hour + 4, minute, second || 0));
}

export async function POST(req: Request) {
  // Parse Twilio's x-www-form-urlencoded body
  const formData = await req.formData();
  const from = formData.get('From') as string; // E.164 format
  const body = (formData.get('Body') as string || '').trim().toUpperCase();
  console.log('Inbound SMS received:', { from, body });

  const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

  // Handle SCHEDULE command for barbers
  if (body === 'SCHEDULE') {
    // Find the barber by phone number
    const { data: barber, error: barberError } = await supabase
      .from('employees')
      .select('id, name')
      .eq('phone', from)
      .single();
    console.log('SCHEDULE command - barber lookup:', { barber, barberError });

    const resp = new MessagingResponse();

    if (!barber) {
      resp.message("We couldn't find a barber account for your number.");
      console.log('SCHEDULE command - barber not found for number:', from);
      return new Response(resp.toString(), { headers: { 'Content-Type': 'text/xml' } });
    }

    // Get today's date in YYYY-MM-DD
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const todayStr = `${yyyy}-${mm}-${dd}`;

    // Fetch today's bookings for this barber
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('start_time, customers(name)')
      .eq('employee_id', barber.id)
      .eq('date', todayStr)
      .in('status', ['confirmed', 'reminder_sent'])
      .order('start_time', { ascending: true });
    console.log('SCHEDULE command - today bookings:', { bookings, bookingsError });

    if (bookingsError) {
      console.error('SCHEDULE command - error fetching bookings:', bookingsError);
      resp.message('An error occurred while fetching your bookings. Please try again later.');
      return new Response(resp.toString(), { headers: { 'Content-Type': 'text/xml' } });
    }

    let message = '';
    try {
      if (bookings && bookings.length > 0) {
        message = `Today's bookings:\n` +
          bookings.map(b => {
            let customerName = 'Unknown';
            if (b.customers) {
              if (Array.isArray(b.customers)) {
                customerName = (b.customers as any)[0]?.name || 'Unknown';
              } else if (typeof b.customers === 'object') {
                customerName = (b.customers as any).name || 'Unknown';
              }
            }
            return `• ${b.start_time} - ${customerName}`;
          }).join('\n');
      } else {
        message = 'You have no bookings today.';
      }
    } catch (err) {
      console.error('SCHEDULE command - error formatting bookings:', err);
      message = 'An error occurred while formatting your bookings.';
    }
    resp.message(message);
    return new Response(resp.toString(), { headers: { 'Content-Type': 'text/xml' } });
  }

  // Handle CANCEL command for customers
  if (body === 'CANCELBOOKING') {
    // Find the customer by phone number
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('id, name')
      .eq('phone', from)
      .single();
    console.log('CANCEL command - customer lookup:', { customer, customerError });

    if (!customer) {
      const resp = new MessagingResponse();
      resp.message("We couldn't find any bookings for your number.");
      console.log('CANCEL command - customer not found for number:', from);
      return new Response(resp.toString(), { headers: { 'Content-Type': 'text/xml' } });
    }

    // Find all upcoming bookings
    const now = new Date();
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('id, date, start_time, status')
      .eq('customer_id', customer.id)
      .in('status', ['confirmed', 'reminder_sent'])
      .order('date', { ascending: true });
    console.log('CANCELBOOKING command - bookings lookup:', { bookings, bookingsError });

    // Only consider bookings in the future (Toronto time)
    const futureBookings = (bookings || []).filter((b: any) => {
      const bookingDate = combineDateTimeToronto(b.date, b.start_time);
      return bookingDate.getTime() > Date.now();
    });

    if (futureBookings.length === 0) {
      const resp = new MessagingResponse();
      resp.message("You have no upcoming bookings that can be cancelled.");
      console.log('CANCELBOOKING command - no future bookings for customer:', customer.id);
      return new Response(resp.toString(), { headers: { 'Content-Type': 'text/xml' } });
    }

    const toCancel = futureBookings.filter((b: any) => {
      const bookingDate = combineDateTimeToronto(b.date, b.start_time);
      return (bookingDate.getTime() - Date.now()) / 3600000 > 1;
    });
    const tooLate = futureBookings.filter((b: any) => {
      const bookingDate = combineDateTimeToronto(b.date, b.start_time);
      return (bookingDate.getTime() - Date.now()) / 3600000 <= 1 && (bookingDate.getTime() - Date.now()) > 0;
    });
    console.log('CANCELBOOKING command - bookings to cancel:', toCancel);
    console.log('CANCELBOOKING command - bookings too close to cancel:', tooLate);

    if (toCancel.length === 0 && tooLate.length > 0) {
      const resp = new MessagingResponse();
      resp.message('❗This appointment is too close to cancel. Please call us to make changes at (289) 952-7018');
      console.log('CANCELBOOKING command - booking(s) too close to cancel for customer:', customer.id);
      return new Response(resp.toString(), { headers: { 'Content-Type': 'text/xml' } });
    }

    // Cancel the bookings
    const ids = toCancel.map(b => b.id);
    const { error: cancelError } = await supabase.from('bookings').update({ status: 'cancelled' }).in('id', ids);
    if (cancelError) {
      console.error('CANCELBOOKING command - error cancelling bookings:', cancelError);
    } else {
      console.log('CANCELBOOKING command - cancelled bookings:', ids);
    }

    // Build the reply
    const details = toCancel.map(b => `• ${b.date} at ${b.start_time}`).join('\n');
    const resp = new MessagingResponse();
    resp.message(`Cancelled the following bookings:\n${details}`);
    return new Response(resp.toString(), { headers: { 'Content-Type': 'text/xml' } });
  }

  // Default: ignore or reply with help
  console.log('Inbound SMS - unrecognized command:', body);
  const resp = new MessagingResponse();
  resp.message('Unrecognized command. Reply with SCHEDULE (barbers) or CANCEL (customers).');
  return new Response(resp.toString(), { headers: { 'Content-Type': 'text/xml' } });
} 