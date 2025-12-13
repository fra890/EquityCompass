import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface NotificationPreference {
  id: string;
  user_id: string;
  client_id: string;
  vesting_alerts_enabled: boolean;
  vesting_alert_days: number[];
  iso_exercise_alerts_enabled: boolean;
  iso_exercise_alert_days: number;
  tax_planning_alerts_enabled: boolean;
  amt_exposure_alerts_enabled: boolean;
  amt_threshold: number;
  email: string;
}

interface Client {
  id: string;
  name: string;
  grants: Grant[];
}

interface Grant {
  id: string;
  type: string;
  ticker: string;
  companyName: string;
  grantDate: string;
  totalShares: number;
  vestingSchedule: string;
}

function calculateVestingDates(grant: Grant): Date[] {
  const dates: Date[] = [];
  const grantDate = new Date(grant.grantDate);
  
  if (grant.vestingSchedule === 'standard_4y_1y_cliff') {
    for (let i = 4; i <= 16; i++) {
      const vestDate = new Date(grantDate);
      vestDate.setMonth(vestDate.getMonth() + (i * 3));
      dates.push(vestDate);
    }
  } else if (grant.vestingSchedule === 'standard_4y_quarterly') {
    for (let i = 1; i <= 16; i++) {
      const vestDate = new Date(grantDate);
      vestDate.setMonth(vestDate.getMonth() + (i * 3));
      dates.push(vestDate);
    }
  }
  
  return dates;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: preferences, error: prefsError } = await supabase
      .from('notification_preferences')
      .select('*');

    if (prefsError) throw prefsError;

    const today = new Date();
    const notificationsSent = [];

    for (const pref of (preferences as NotificationPreference[])) {
      if (!pref.vesting_alerts_enabled) continue;

      const { data: clientsData, error: clientError } = await supabase
        .from('clients')
        .select('*')
        .eq('user_id', pref.user_id);

      if (clientError) {
        console.error('Error fetching clients:', clientError);
        continue;
      }

      const client = (clientsData as Client[])?.find(c => c.id === pref.client_id);
      if (!client || !client.grants) continue;

      for (const grant of client.grants) {
        const vestingDates = calculateVestingDates(grant);

        for (const vestDate of vestingDates) {
          if (vestDate < today) continue;

          for (const alertDays of pref.vesting_alert_days) {
            const alertDate = new Date(vestDate);
            alertDate.setDate(alertDate.getDate() - alertDays);

            const daysDiff = Math.floor((alertDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

            if (daysDiff === 0) {
              const { data: existingLog } = await supabase
                .from('notification_logs')
                .select('id')
                .eq('user_id', pref.user_id)
                .eq('client_id', pref.client_id)
                .eq('grant_id', grant.id)
                .eq('event_date', vestDate.toISOString().split('T')[0])
                .eq('notification_type', `vesting_alert_${alertDays}d`)
                .single();

              if (existingLog) continue;

              const emailBody = `
Hello,

This is a reminder that you have equity vesting in ${alertDays} days:

Client: ${client.name}
Company: ${grant.companyName} (${grant.ticker})
Grant Type: ${grant.type}
Vesting Date: ${formatDate(vestDate)}
Shares Vesting: ${Math.floor(grant.totalShares / 16)}

Please review your equity compensation plan and consider any tax implications.

Best regards,
EquityCompass
              `;

              console.log('Would send email to:', pref.email);
              console.log('Email body:', emailBody);

              await supabase.from('notification_logs').insert({
                user_id: pref.user_id,
                client_id: pref.client_id,
                grant_id: grant.id,
                notification_type: `vesting_alert_${alertDays}d`,
                event_date: vestDate.toISOString().split('T')[0],
                email_to: pref.email,
                status: 'sent',
              });

              notificationsSent.push({
                email: pref.email,
                type: 'vesting_alert',
                client: client.name,
                grant: grant.ticker,
                vestDate: formatDate(vestDate),
                daysUntil: alertDays,
              });
            }
          }
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        notificationsSent: notificationsSent.length,
        notifications: notificationsSent,
        message: `Processed notifications for ${preferences?.length || 0} preferences`,
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Error in send-notifications:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});
