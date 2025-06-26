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

    // Fetch customer info
    const { data: customer } = await supabase
      .from('customers')
      .select('name, phone')
      .eq('id', booking.customer_id)
      .single();

    // Fetch barber info (if you want to message the barber too)
    const { data: barber } = await supabase
      .from('employees')
      .select('name, phone')
      .eq('id', booking.employee_id)
      .single();

    if (!customer?.phone) {
      return NextResponse.json({ error: 'Customer phone not found' }, { status: 400 });
    }

    // Extract phone numbers and details
    const customerPhone = booking.customer_phone || booking.customer?.phone;
    const barberPhone = booking.barber_phone || booking.barber?.phone;
    const customerName = booking.customer_name || booking.customer?.name || 'Customer';
    const barberName = booking.barber_name || booking.barber?.name || 'Barber';
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
    await client.messages.create({ body: customerMsg, from: twilioNumber, to: customerPhone });

    // (Optional) Send SMS to barber
    if (barber?.phone) {
      await client.messages.create({ body: barberMsg, from: twilioNumber, to: barberPhone });
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('Error in send-booking-sms:', err);
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
} 