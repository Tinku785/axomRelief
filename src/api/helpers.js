import { supabase } from '../supabaseClient';
import { jitterAroundDistrict } from '../utils/mapGeo';
import { normalizePhone } from '../utils/phone';

const TABLE = 'helpers';

export async function fetchVisibleHelpers() {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('hidden', false)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function fetchAllHelpersForAdmin() {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function registerHelper(form) {
  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      name: form.name,
      contact_number: normalizePhone(form.contact),
      districts_covered: form.districts || [],
      areas_text: form.areas || null,
      areas_covered: form.areas || null,
      what_given: form.given || null,
      boat_available: form.boat,
      ...jitterAroundDistrict(form.districts?.[0]),
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function setHelperHidden(id, hidden) {
  const { error } = await supabase.from(TABLE).update({ hidden }).eq('id', id);
  if (error) throw error;
}

export async function deleteHelper(id) {
  const { error } = await supabase.from(TABLE).delete().eq('id', id);
  if (error) throw error;
}
