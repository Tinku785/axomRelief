import { supabase } from '../supabaseClient';
import { jitterAroundDistrict } from '../utils/mapGeo';
import { cleanContacts } from '../utils/phone';

const TABLE = 'requests';

export async function fetchVisibleRequests() {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('hidden', false)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function fetchAllRequestsForAdmin() {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function submitRequest(form) {
  // A shared GPS pin is exact; otherwise scatter near the district centre.
  const point = form.hasLiveLocation && form.lat != null
    ? { lat: form.lat, lng: form.lng }
    : jitterAroundDistrict(form.district);
  const needs = form.needs.filter((n) => n !== 'other');
  const [primary, ...extra] = cleanContacts(form.contacts);
  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      name: form.name,
      district: form.district,
      location: form.location,
      contact_number: primary,
      contact_numbers: extra,
      num_people: form.numPeople ? Number(form.numPeople) : 1,
      needs,
      needs_other: form.needs.includes('other') ? form.other || null : null,
      priority: form.priority,
      boat_required: form.boat,
      notes: form.notes || null,
      has_live_location: !!form.hasLiveLocation,
      live_lat: form.lat ?? null,
      live_lng: form.lng ?? null,
      ...point,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function setRequestHidden(id, hidden) {
  const { error } = await supabase.from(TABLE).update({ hidden }).eq('id', id);
  if (error) throw error;
}

export async function deleteRequest(id) {
  const { error } = await supabase.from(TABLE).delete().eq('id', id);
  if (error) throw error;
}
