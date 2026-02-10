import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { Resend } from 'resend';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, message } = body;

    // 1. Save to Supabase (Database Storage)
    const supabase = createClient() as any;
    const { error: dbError } = await supabase
      .from('contact_submissions')
      .insert([
        { 
          name, 
          email, 
          message,
          created_at: new Date().toISOString()
        }
      ]);

    if (dbError) {
      console.error('[Contact API] Supabase Error:', dbError);
    }

    // 2. Email Notification logic (ranadheerpothula33@gmail.com)
    if (process.env.RESEND_API_KEY) {
      const resend = new Resend(process.env.RESEND_API_KEY);
      try {
        await resend.emails.send({
          from: 'Pauser <onboarding@resend.dev>', // Note: This is the default Resend testing address. Replace with your verified domain address in production.
          to: process.env.CONTACT_EMAIL || 'ranadheerpothula33@gmail.com',
          subject: `New Feedback from ${name}`,
          text: `Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}`,
        });
        console.log('[Contact API] Email sent via Resend');
      } catch (emailError) {
        console.error('[Contact API] Resend Error:', emailError);
      }
    } else {
      console.warn('[Contact API] Skipping email: RESEND_API_KEY not found');
    }

    console.log(`[Contact Form] Submission received for ranadheerpothula33@gmail.com:`, {
      name,
      email,
      message,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Contact API Error:', error);
    return NextResponse.json(
      { error: 'Failed to process contact request' },
      { status: 500 }
    );
  }
}
