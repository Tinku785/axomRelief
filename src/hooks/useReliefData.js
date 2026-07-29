import { useCallback, useEffect, useState } from 'react';
import { fetchVisibleRequests } from '../api/requests';
import { fetchVisibleHelpers } from '../api/helpers';
import { supabaseConfigured } from '../supabaseClient';

// Shared fetch of the public requests + helpers lists, used by the Request
// form (map preview + active-rescuers list) and the Helping page (map,
// people-requiring-help list, help-now updates). `refetch` re-pulls both
// after a mutation (submit request, register helper, confirm help-now).
export function useReliefData() {
  const [requests, setRequests] = useState([]);
  const [helpers, setHelpers] = useState([]);
  const [loading, setLoading] = useState(supabaseConfigured);
  const [error, setError] = useState('');

  const refetch = useCallback(async () => {
    if (!supabaseConfigured) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const [r, h] = await Promise.all([fetchVisibleRequests(), fetchVisibleHelpers()]);
      setRequests(r);
      setHelpers(h);
    } catch {
      setError('load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refetch(); }, [refetch]);

  return { requests, helpers, loading, error, refetch };
}
