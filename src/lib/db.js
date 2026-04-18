import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON } from '../config.js';

export const db = createClient(SUPABASE_URL, SUPABASE_ANON);

export const DB = {
  async load() {
    const { data, error } = await db.from('pantry_items').select('*').order('created_at');
    if (error) { console.error(error); return []; }
    return data || [];
  },
  async insert(item)       { const { error } = await db.from('pantry_items').insert([item]);              if (error) console.error(error); },
  async update(id, fields) { const { error } = await db.from('pantry_items').update(fields).eq('id', id); if (error) console.error(error); },
  async remove(id)         { const { error } = await db.from('pantry_items').delete().eq('id', id);        if (error) console.error(error); },
  async bulkInsert(items)  { const { error } = await db.from('pantry_items').insert(items);                if (error) console.error(error); },
};
