import { supabase } from '../supabaseClient';

const TABLE = 'news_updates';

export async function fetchNews() {
  const { data, error } = await supabase.from(TABLE).select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function addNews(message) {
  const { data, error } = await supabase.from(TABLE).insert({ message }).select().single();
  if (error) throw error;
  return data;
}

export async function updateNews(id, message) {
  const { error } = await supabase.from(TABLE).update({ message }).eq('id', id);
  if (error) throw error;
}

export async function deleteNews(id) {
  const { error } = await supabase.from(TABLE).delete().eq('id', id);
  if (error) throw error;
}
