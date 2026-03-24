-- Migration: Advanced Shipping Matrix (Tiers x Zones)

UPDATE app_settings 
SET value = '{
    "tiers": {
        "b2c": {
            "label": "General (B2C)",
            "zones": {
                "peninsula": { "base_cost": 5.95, "free_shipping_threshold": 150, "delivery_time": "48-72h" },
                "islands": { "base_cost": 15.00, "free_shipping_threshold": 300, "delivery_time": "3-5 días" },
                "international": { "base_cost": 25.00, "free_shipping_threshold": 500, "delivery_time": "7-10 días" }
            }
        },
        "b2b": {
            "label": "Profesional (B2B)",
            "zones": {
                "peninsula": { "base_cost": 0, "free_shipping_threshold": 100, "delivery_time": "48-72h" },
                "islands": { "base_cost": 10.00, "free_shipping_threshold": 250, "delivery_time": "3-5 días" },
                "international": { "base_cost": 20.00, "free_shipping_threshold": 400, "delivery_time": "7-10 días" }
            }
        },
        "socio": {
            "label": "Socio / Partner",
            "zones": {
                "peninsula": { "base_cost": 0, "free_shipping_threshold": 0, "delivery_time": "24h" },
                "islands": { "base_cost": 5.00, "free_shipping_threshold": 150, "delivery_time": "48-72h" },
                "international": { "base_cost": 15.00, "free_shipping_threshold": 300, "delivery_time": "5-7 días" }
            }
        }
    }
}'::jsonb
WHERE key = 'shipping_config';
