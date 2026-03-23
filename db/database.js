const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

async function getSetting(key) {
  const { data, error } = await supabase
    .from('settings')
    .select('value')
    .eq('key', key)
    .single();
  if (error || !data) return null;
  return data.value;
}

async function setSetting(key, value) {
  await supabase
    .from('settings')
    .upsert({ key, value: String(value) }, { onConflict: 'key' });
}

module.exports = { supabase, getSetting, setSetting };
