import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

// Mapping between Stripe product IDs and subscription plans
const PRODUCT_TO_PLAN: Record<string, 'basic' | 'standard' | 'premium'> = {
  'prod_TGOwro62MFLPyX': 'basic',
  'prod_TGOw0Jc5m8kT4B': 'standard',
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    logStep("Stripe key verified");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      logStep("No authorization header; returning unsubscribed");
      return new Response(
        JSON.stringify({ subscribed: false, plan: 'basic', status: 'inactive' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }
    logStep("Authorization header found");

    const token = authHeader.replace("Bearer ", "");
    logStep("Authenticating user with token");
    
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) {
      logStep("Auth error; returning unsubscribed", { message: userError.message });
      return new Response(
        JSON.stringify({ subscribed: false, plan: 'basic', status: 'inactive' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }
    const user = userData.user;
    if (!user?.email) {
      logStep("No user/email; returning unsubscribed");
      return new Response(
        JSON.stringify({ subscribed: false, plan: 'basic', status: 'inactive' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }
    logStep("User authenticated", { userId: user.id, email: user.email });

    // 1) Check database for manual or still-valid subscription before calling Stripe
    const { data: dbSubscription } = await supabaseClient
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .single();

    // Manual grants (temporary overrides)
    const MANUAL_GRANTS: Record<string, { plan: 'standard' | 'premium'; days: number }> = {
      'vrollsign@yahoo.com.br': { plan: 'standard', days: 30 },
      'vrollsing@yahoo.com.br': { plan: 'standard', days: 30 }, // typo variant
    };

    const grant = MANUAL_GRANTS[String(user.email).toLowerCase()];
    if (grant) {
      const targetEnd = new Date(Date.now() + grant.days * 24 * 60 * 60 * 1000);
      const currentEndMs = dbSubscription?.current_period_end
        ? new Date(dbSubscription.current_period_end).getTime()
        : 0;

      if (
        !dbSubscription ||
        currentEndMs < targetEnd.getTime() ||
        dbSubscription.status !== 'active' ||
        dbSubscription.plan !== grant.plan
      ) {
        logStep('Applying manual grant', { email: user.email, plan: grant.plan, days: grant.days });
        await supabaseClient
          .from('subscriptions')
          .update({
            status: 'active',
            plan: grant.plan,
            current_period_end: targetEnd.toISOString(),
          })
          .eq('user_id', user.id);
      }

      const effectiveEnd = (() => {
        if (dbSubscription?.current_period_end) {
          const dbEndMs = new Date(dbSubscription.current_period_end).getTime();
          return (dbEndMs >= targetEnd.getTime())
            ? new Date(dbEndMs).toISOString()
            : targetEnd.toISOString();
        }
        return targetEnd.toISOString();
      })();

      return new Response(
        JSON.stringify({
          subscribed: true,
          plan: grant.plan,
          status: 'active',
          subscription_end: effectiveEnd,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Respect an already-active DB subscription within its validity window
    if (
      dbSubscription?.status === 'active' &&
      dbSubscription?.current_period_end &&
      new Date(dbSubscription.current_period_end).getTime() > Date.now()
    ) {
      logStep('Keeping active DB subscription (no Stripe required)', {
        plan: dbSubscription.plan,
        end: dbSubscription.current_period_end,
      });

      return new Response(
        JSON.stringify({
          subscribed: true,
          plan: dbSubscription.plan,
          status: 'active',
          subscription_end: dbSubscription.current_period_end,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // 2) Fallback to Stripe check
    const stripe = new Stripe(stripeKey, { apiVersion: '2025-08-27.basil' });
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });

    if (customers.data.length === 0) {
      logStep('No Stripe customer found; setting inactive');
      await supabaseClient
        .from('subscriptions')
        .update({
          status: 'inactive',
          plan: 'basic',
          stripe_customer_id: null,
          stripe_subscription_id: null,
          current_period_end: null,
        })
        .eq('user_id', user.id);

    
      return new Response(
        JSON.stringify({ subscribed: false, plan: 'basic', status: 'inactive' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    const customerId = customers.data[0].id;
    logStep('Found Stripe customer', { customerId });

    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });
    
    const hasActiveSub = subscriptions.data.length > 0;
    let plan: 'basic' | 'standard' | 'premium' = 'basic';
    let subscriptionEnd = null;
    let stripeSubscriptionId = null;
    let status = 'inactive';

    if (hasActiveSub) {
      const subscription = subscriptions.data[0];
      stripeSubscriptionId = subscription.id;
      subscriptionEnd = new Date(subscription.current_period_end * 1000).toISOString();
      logStep("Active subscription found", { subscriptionId: subscription.id, endDate: subscriptionEnd });
      
      const productId = subscription.items.data[0].price.product as string;
      plan = PRODUCT_TO_PLAN[productId] || 'basic';
      status = 'active';
      logStep("Determined subscription plan", { productId, plan });
      
      // Update subscription in database
      await supabaseClient
        .from('subscriptions')
        .update({ 
          status: 'active',
          plan: plan,
          stripe_customer_id: customerId,
          stripe_subscription_id: stripeSubscriptionId,
          current_period_end: subscriptionEnd
        })
        .eq('user_id', user.id);
        
      logStep("Database updated with active subscription");
    } else {
      logStep("No active subscription found in Stripe, checking database");
      
      // Check database for existing subscription
      const { data: dbSubscription, error: dbError } = await supabaseClient
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (dbError) {
        logStep("Error fetching subscription from database", { error: dbError });
      } else if (dbSubscription && dbSubscription.status === 'active') {
        logStep("Found active subscription in database", { 
          plan: dbSubscription.plan, 
          status: dbSubscription.status,
          end: dbSubscription.current_period_end 
        });
        
        plan = dbSubscription.plan as 'basic' | 'standard' | 'premium';
        status = 'active';
        subscriptionEnd = dbSubscription.current_period_end;
      } else {
        logStep("No active subscription in database either, setting to inactive");
        
        // Update to inactive in database
        await supabaseClient
          .from('subscriptions')
          .update({ 
            status: 'inactive',
            plan: 'basic',
            stripe_customer_id: customerId,
            stripe_subscription_id: null,
            current_period_end: null
          })
          .eq('user_id', user.id);
      }
    }

    return new Response(JSON.stringify({
      subscribed: status === 'active',
      plan: plan,
      status: status,
      subscription_end: subscriptionEnd
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in check-subscription", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
