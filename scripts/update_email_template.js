import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function updateTemplates() {
    const { data: current } = await supabase.from('app_settings').select('value').eq('key', 'email_templates').single();

    const newTemplates = {
        ...current.value,
        "order_confirmation": {
            "body": "{body}",
            "subject": "Confirmación de Pedido #{order_id}"
        }
    };

    await supabase.from('app_settings').update({ value: newTemplates }).eq('key', 'email_templates');
    console.log('Template updated successfully');
}

updateTemplates();
