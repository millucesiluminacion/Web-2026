import dotenv from 'dotenv';
dotenv.config();

async function testEmail() {
    const url = 'http://localhost:5173/api/send-email';
    const key = process.env.VITE_EMAIL_SYSTEM_KEY;

    console.log('Testing with key:', key);

    try {
        const resp = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': key
            },
            body: JSON.stringify({
                to: 'milluces2018@gmail.com',
                templateKey: 'order_confirmation',
                variables: {
                    name: 'Test Debug',
                    order_id: 'DEBUG123',
                    site_name: 'Mil Luces Iluminación'
                }
            })
        });

        console.log('Status:', resp.status);
        const data = await resp.json();
        console.log('Data:', data);
    } catch (e) {
        console.error('Fetch failed. Is the dev server running at localhost:5173?', e.message);
    }
}

testEmail();
