// Insert default locations into Supabase
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Read .env.local file
const envPath = path.join(__dirname, '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');

// Parse environment variables
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=:#]+)=(.*)$/);
  if (match) {
    const key = match[1].trim();
    const value = match[2].trim();
    env[key] = value;
  }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  console.error('URL:', supabaseUrl ? 'Found' : 'Missing');
  console.error('Service Key:', supabaseServiceKey ? 'Found' : 'Missing');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const locations = [
  {
    id: 'loc1',
    name: 'Rameshwaram Dosa Center',
    address: '123 Main Street, Downtown',
    highlights: 'Famous for Traditional Dosas'
  },
  {
    id: 'loc2',
    name: 'Vighnaharta Sweet & Snacks Corner',
    address: '456 Park Avenue, Midtown',
    highlights: 'Best South Indian Sweets'
  },
  {
    id: 'loc3',
    name: 'Vighnaharta Snacks Corner',
    address: '789 Oak Street, Uptown',
    highlights: 'Quick Bites & Snacks'
  }
];

async function insertLocations() {
  console.log('🚀 Inserting locations...');

  const { data, error } = await supabase
    .from('locations')
    .upsert(locations, { onConflict: 'id' })
    .select();

  if (error) {
    console.error('❌ Error inserting locations:', error);
    process.exit(1);
  }

  console.log('✅ Locations inserted successfully!');
  console.log(data);
}

insertLocations();
