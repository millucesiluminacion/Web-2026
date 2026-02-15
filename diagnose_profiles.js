const supabaseUrl = 'https://fvfnpztjsqdiljudjmdl.supabase.co';
const supabaseAnonKey = 'sb_publishable_r_KDpYwaFTzaISDu-9FdAw_XxUlufmo';

async function checkProfiles() {
    console.log('Checking profiles table via REST API...');
    try {
        const response = await fetch(`${supabaseUrl}/rest/v1/profiles?select=*`, {
            headers: {
                'apikey': supabaseAnonKey,
                'Authorization': `Bearer ${supabaseAnonKey}`
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP Error ${response.status}: ${errorText}`);
        }

        const data = await response.json();
        console.log('Profiles found:', data.length);
        console.table(data);
    } catch (error) {
        console.error('Error fetching profiles:', error.message);
    }
}

checkProfiles();
