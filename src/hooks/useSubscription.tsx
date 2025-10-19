import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type SubscriptionPlan = 'basic' | 'standard' | 'premium';

export interface Subscription {
  plan: SubscriptionPlan;
  status: string;
}

export const useSubscription = (userId: string | undefined) => {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const fetchSubscription = async () => {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('plan, status')
        .eq('user_id', userId)
        .single();

      if (error) {
        console.error('Error fetching subscription:', error);
      } else {
        setSubscription(data);
      }
      setLoading(false);
    };

    fetchSubscription();
  }, [userId]);

  const canDownload = subscription?.plan === 'standard' || subscription?.plan === 'premium';
  const canSaveLoad = subscription?.plan === 'standard' || subscription?.plan === 'premium';

  return {
    subscription,
    loading,
    canDownload,
    canSaveLoad,
  };
};
