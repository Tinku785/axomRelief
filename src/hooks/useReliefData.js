import { useCallback, useEffect, useState } from 'react';
import { fetchVisibleRequests } from '../api/requests';
import { fetchVisibleHelpers } from '../api/helpers';
import { supabaseConfigured } from '../supabaseClient';

// A rescuer keeps this page open while working through a village, so the list
// has to refresh itself. 45s surfaces a new request while it still matters and
// stays light on a phone tethered to patchy 4G.
const POLL_MS = 45000;

// Shared fetch of the public requests + helpers lists, used by the Request
// form (map preview + active-rescuers list) and the Helping page (map,
// people-requiring-help list, help-now updates). `refetch` re-pulls both
// after a mutation (submit request, register helper, confirm help-now).
export function useReliefData() {
  const [requests, setRequests] = useState([]);
  const [helpers, setHelpers] = useState([]);
  const [loading, setLoading] = useState(supabaseConfigured);
  const [error, setError] = useState('');

  // `silent` skips the loading flag: a background poll must not blank the list
  // someone is reading and replace it with "Loading…".
  const refetch = useCallback(async (silent = false) => {
    if (!supabaseConfigured) {
      setLoading(false);
      return;
    }
    if (!silent) setLoading(true);
    setError('');
    try {
      const [r, h] = await Promise.all([fetchVisibleRequests(), fetchVisibleHelpers()]);
      setRequests(r);
      setHelpers(h);
    } catch {
      // A failed poll keeps what is already on screen. Stale rows beat an error
      // banner when the thing on screen is who still needs rescuing.
      if (!silent) setError('load');
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => { refetch(); }, [refetch]);

  useEffect(() => {
    if (!supabaseConfigured) return undefined;
    // Polling a backgrounded tab burns battery for nothing; coming back to the
    // tab refreshes immediately instead of waiting out the interval.
    const tick = () => { if (!document.hidden) refetch(true); };
    const id = setInterval(tick, POLL_MS);
    document.addEventListener('visibilitychange', tick);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [refetch]);

  return { requests, helpers, loading, error, refetch };
}
