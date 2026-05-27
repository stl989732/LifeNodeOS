import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface ConnectedAppRecord {
  app_id: string;
  target_node: string;
  connection_status: 'connected' | 'syncing' | 'disconnected';
}

export function useConnectedApps(userId: string) {
  const [connectedApps, setConnectedApps] = useState<Record<string, 'connected' | 'syncing' | 'disconnected'>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;

    // 1. Fetch current app connection states from database on load
    async function fetchInitialStates() {
      const { data, error } = await supabase
        .from('user_connected_apps')
        .select('app_id, target_node, connection_status')
        .eq('user_id', userId);

      if (!error && data) {
        const stateMap: Record<string, 'connected' | 'syncing' | 'disconnected'> = {};
        data.forEach((row: any) => {
          // Key format: "node_app" (e.g. "va_slack" or "biz_hubspot")
          const key = `${row.target_node.toLowerCase()}_${row.app_id.toLowerCase()}`;
          stateMap[key] = row.connection_status;
        });
        setConnectedApps(stateMap);
      }
      setLoading(false);
    }

    fetchInitialStates();

    // 2. Turn on Real-Time listening so clicking a card updates the interface instantly
    const channel = supabase
      .channel('realtime-user-apps')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_connected_apps',
          filter: `user_id=eq.${userId}`
        },
        (payload: any) => {
          const updatedRow = payload.new || payload.old;
          if (!updatedRow) return;

          const key = `${updatedRow.target_node.toLowerCase()}_${updatedRow.app_id.toLowerCase()}`;
          
          setConnectedApps((prev) => ({
            ...prev,
            [key]: payload.eventType === 'DELETE' ? 'disconnected' : updatedRow.connection_status
          }));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return { connectedApps, loading };
}