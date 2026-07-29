import { supabase } from '../supabaseClient';

const TABLE = 'helplines';

export async function fetchHelplines() {
  const { data, error } = await supabase.from(TABLE).select('*').order('sort_order', { ascending: true });
  if (error) throw error;
  return data;
}

export async function addHelpline({ label, phone }) {
  const { data, error } = await supabase.from(TABLE).insert({ label, phone_number: phone }).select().single();
  if (error) throw error;
  return data;
}

export async function updateHelpline(id, { label, phone }) {
  const { error } = await supabase.from(TABLE).update({ label, phone_number: phone }).eq('id', id);
  if (error) throw error;
}

export async function deleteHelpline(id) {
  const { error } = await supabase.from(TABLE).delete().eq('id', id);
  if (error) throw error;
}
