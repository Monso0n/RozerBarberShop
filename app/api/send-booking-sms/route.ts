import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import twilio from 'twilio';

// export const config = { runtime: 'edge' };

const accountSid = process.env.TWILIO_ACCOUNT_SID!;
const authToken = process.env.TWILIO_AUTH_TOKEN!;
const twilioNumber = process.env.TWILIO_PHONE_NUMBER!;

export async function POST(req: NextRequest) {
  if (req.method !== 'POST') {
    return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const body = await req.json();
    console.log('Webhook payload:', body);

    const booking = body.record;

    // Connect to Supabase (use service role key for server-side)
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Fetch customer
    const { data: customer, error: custErr } = await supabase
      .from('customers')
      .select('id, name, phone')
      .eq('id', booking.customer_id)
      .single();
    console.log('Customer:', customer, 'Error:', custErr);

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 400 });
    }
    if (!customer.phone) {
      return NextResponse.json({ error: 'Customer phone missing' }, { status: 400 });
    }

    // Fetch barber
    const { data: barber, error: barbErr } = await supabase
      .from('employees')
      .select('id, name, phone')
      .eq('id', booking.employee_id)
      .single();
    console.log('Barber:', barber, 'Error:', barbErr);

    if (!barber) {
      return NextResponse.json({ error: 'Barber not found' }, { status: 400 });
    }
    if (!barber.phone) {
      return NextResponse.json({ error: 'Barber phone missing' }, { status: 400 });
    }

    // Extract phone numbers and details
    const customerPhone = customer.phone;
    const barberPhone = barber.phone;
    const customerName = customer.name;
    const barberName = barber.name;
    const date = booking.date;
    const startTime = booking.start_time;
    const endTime = booking.end_time;
    // Services: try to get a string list
    let services = '';
    if (booking.services && Array.isArray(booking.services)) {
      services = booking.services.map((s: any) => s.name).join(', ');
    } else if (booking.service_names) {
      services = booking.service_names;
    } else if (booking.services) {
      services = booking.services;
    }

    if (!customerPhone || !barberPhone || !date || !startTime) {
      return NextResponse.json({ error: 'Missing required booking info' }, { status: 400 });
    }

    const client = twilio(accountSid, authToken);

    // Compose messages
    const customerMsg = `Hi ${customerName}, your booking at Rozer's Barber Station is confirmed for ${date} at ${startTime} with ${barberName}. See you soon!`;
    const barberMsg = `New booking: ${customerName}\nServices: ${services || 'N/A'}\nTime: ${date} ${startTime} - ${endTime || ''}`;

    // Send SMS
    console.log('Final phone values:', { customerPhone, barberPhone });
    const result = await client.messages.create({
      to: customerPhone,
      from: process.env.TWILIO_PHONE_NUMBER!,
      body: customerMsg
    });
    console.log('Twilio customer SMS result:', result);

    // (Optional) Send SMS to barber
    if (barberPhone) {
      console.log('About to send SMS to barber:', barber.phone);
      const resultBarber = await client.messages.create({
        to: barberPhone,
        from: process.env.TWILIO_PHONE_NUMBER!,
        body: barberMsg
      });
      console.log('Twilio barber SMS result:', resultBarber);
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('Error in send-booking-sms:', err);
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
} 