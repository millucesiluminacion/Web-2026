-- Optimization: Server-side Catalog Metadata (v3 - Perfectly Clean Strings)
-- Ensure all values (whether from arrays or scalars) are returned as clean text.

CREATE OR REPLACE FUNCTION public.get_catalog_metadata(
    p_category_id UUID DEFAULT NULL,
    p_room_id UUID DEFAULT NULL,
    p_brand_id UUID DEFAULT NULL,
    p_profession_id UUID DEFAULT NULL,
    p_search_query TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_scoped_cat_ids UUID[];
    v_result JSONB;
BEGIN
    -- 1. Resolve recursive categories if category_id is provided
    IF p_category_id IS NOT NULL THEN
        WITH RECURSIVE cat_tree AS (
            SELECT p_category_id AS cat_id
            UNION
            SELECT cr.child_id
            FROM public.category_relationships cr
            JOIN cat_tree ct ON cr.parent_id = ct.cat_id
        )
        SELECT array_agg(cat_id) INTO v_scoped_cat_ids FROM cat_tree;
    END IF;

    -- 2. Aggregate data
    WITH filtered_prods AS (
        SELECT 
            p.id,
            p.attributes,
            p.price,
            p.discount_price,
            p.created_at,
            p.stock,
            p.parent_id
        FROM public.products p
        LEFT JOIN public.product_rooms pr ON p.id = pr.product_id
        LEFT JOIN public.product_professions pp ON p.id = pp.product_id
        WHERE p.is_active = true
          AND p.parent_id IS NULL
          AND (v_scoped_cat_ids IS NULL OR p.category_id = ANY(v_scoped_cat_ids))
          AND (p_room_id IS NULL OR pr.room_id = p_room_id)
          AND (p_brand_id IS NULL OR p.brand_id = p_brand_id)
          AND (p_profession_id IS NULL OR pp.profession_id = p_profession_id)
          AND (p_search_query IS NULL OR (p.name ILIKE '%' || p_search_query || '%' OR p.reference ILIKE '%' || p_search_query || '%'))
    ),
    stats AS (
        SELECT
            MIN(price) as min_p,
            MAX(price) as max_p,
            COUNT(DISTINCT id) FILTER (WHERE stock > 0) as in_stock_count,
            COUNT(DISTINCT id) FILTER (WHERE discount_price > 0 AND discount_price < price) as on_offer_count,
            COUNT(DISTINCT id) FILTER (WHERE created_at > (NOW() - INTERVAL '30 days')) as is_new_count
        FROM filtered_prods
    ),
    attr_unpacked AS (
        SELECT
            key,
            CASE 
                WHEN jsonb_typeof(value) = 'array' THEN jsonb_array_elements_text(value)
                ELSE value #>> '{}' -- This extracts the text content without quotes
            END as val
        FROM filtered_prods,
             jsonb_each(attributes)
    ),
    attr_counts AS (
        SELECT
            key,
            jsonb_agg(DISTINCT val) as values
        FROM attr_unpacked
        WHERE val IS NOT NULL AND val != ''
        GROUP BY key
    )
    SELECT jsonb_build_object(
        'min_price', COALESCE((SELECT min_p FROM stats), 0),
        'max_price', COALESCE((SELECT max_p FROM stats), 2000),
        'availability', jsonb_build_object(
            'inStock', COALESCE((SELECT in_stock_count FROM stats), 0),
            'onOffer', COALESCE((SELECT on_offer_count FROM stats), 0),
            'isNew', COALESCE((SELECT is_new_count FROM stats), 0)
        ),
        'attributes', COALESCE((SELECT jsonb_object_agg(key, values) FROM attr_counts), '{}'::jsonb)
    ) INTO v_result;

    RETURN v_result;
END;
$$;
