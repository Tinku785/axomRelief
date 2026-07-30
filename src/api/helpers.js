import { supabase } from '../supabaseClient';
import { jitterAroundDistrict } from '../utils/mapGeo';
import { cleanContacts } from '../utils/phone';
import { needLabel } from '../i18n/strings';

const TABLE = 'helpers';

// `supplies` is the machine-readable list used to score a rescuer against a
// request; what_given stays as the human sentence every card already renders.
function suppliesText(form) {
  const parts = (form.supplies || []).filter((k) => k !== 'other').map((k) => needLabel(k, 0));
  if (form.supplies?.includes('other') && form.suppliesOther) parts.push(form.suppliesOther);
  return parts.join(', ') || null;
}

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
  const [primary, ...extra] = cleanContacts(form.contacts);
  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      name: form.name,
      contact_number: primary,
      contact_numbers: extra,
      districts_covered: form.districts || [],
      areas_text: form.areas || null,
      areas_covered: form.areas || null,
      supplies: (form.supplies || []).filter((k) => k !== 'other'),
      supplies_other: form.supplies?.includes('other') ? form.suppliesOther || null : null,
      what_given: suppliesText(form),
      boat_available: form.boat,
      notes: form.notes || null,
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
