-- Migration to align validate_listing with the canonical 12 post types.

CREATE OR REPLACE FUNCTION public.validate_listing(
    p_title text, 
    p_description text DEFAULT NULL::text, 
    p_images text[] DEFAULT NULL::text[], 
    p_post_type text DEFAULT 'food'::text, 
    p_latitude double precision DEFAULT NULL::double precision, 
    p_longitude double precision DEFAULT NULL::double precision, 
    p_pickup_address text DEFAULT NULL::text, 
    p_pickup_time text DEFAULT NULL::text
) RETURNS jsonb
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
DECLARE
    v_errors JSONB := '[]'::JSONB;
    v_title TEXT;
    v_description TEXT;
    v_valid_types TEXT[] := ARRAY['food', 'thing', 'borrow', 'wanted', 'foodbank', 'fridge', 'zerowaste', 'vegan', 'organisation', 'volunteer', 'challenge', 'forum'];
BEGIN
    -- Sanitize title (trim whitespace)
    v_title := TRIM(COALESCE(p_title, ''));
    v_description := TRIM(COALESCE(p_description, ''));

    -- ==========================================================================
    -- Title Validation
    -- ==========================================================================
    IF v_title = '' THEN
        v_errors := v_errors || jsonb_build_object(
            'field', 'title',
            'code', 'VALIDATION_REQUIRED',
            'message', 'Title is required'
        );
    ELSIF LENGTH(v_title) < 3 THEN
        v_errors := v_errors || jsonb_build_object(
            'field', 'title',
            'code', 'VALIDATION_TOO_SHORT',
            'message', 'Title must be at least 3 characters'
        );
    ELSIF LENGTH(v_title) > 100 THEN
        v_errors := v_errors || jsonb_build_object(
            'field', 'title',
            'code', 'VALIDATION_TOO_LONG',
            'message', 'Title must be less than 100 characters'
        );
    END IF;

    -- ==========================================================================
    -- Description Validation (optional but has max length)
    -- ==========================================================================
    IF v_description <> '' AND LENGTH(v_description) > 2000 THEN
        v_errors := v_errors || jsonb_build_object(
            'field', 'description',
            'code', 'VALIDATION_TOO_LONG',
            'message', 'Description must be less than 2000 characters'
        );
    END IF;

    -- ==========================================================================
    -- Images Validation
    -- ==========================================================================
    IF p_images IS NULL OR array_length(p_images, 1) IS NULL OR array_length(p_images, 1) < 1 THEN
        v_errors := v_errors || jsonb_build_object(
            'field', 'images',
            'code', 'VALIDATION_REQUIRED',
            'message', 'At least one image is required'
        );
    ELSIF array_length(p_images, 1) > 3 THEN
        v_errors := v_errors || jsonb_build_object(
            'field', 'images',
            'code', 'VALIDATION_TOO_MANY',
            'message', 'Maximum 3 images allowed'
        );
    END IF;

    -- ==========================================================================
    -- Post Type Validation
    -- ==========================================================================
    IF p_post_type IS NULL OR NOT (p_post_type = ANY(v_valid_types)) THEN
        v_errors := v_errors || jsonb_build_object(
            'field', 'postType',
            'code', 'VALIDATION_INVALID',
            'message', 'Invalid post type. Must be one of: ' || array_to_string(v_valid_types, ', ')
        );
    END IF;

    -- ==========================================================================
    -- Location Validation
    -- ==========================================================================
    IF p_latitude IS NULL OR p_longitude IS NULL THEN
        v_errors := v_errors || jsonb_build_object(
            'field', 'location',
            'code', 'VALIDATION_REQUIRED',
            'message', 'Location coordinates are required'
        );
    ELSIF p_latitude < -90 OR p_latitude > 90 THEN
        v_errors := v_errors || jsonb_build_object(
            'field', 'latitude',
            'code', 'VALIDATION_INVALID',
            'message', 'Latitude must be between -90 and 90'
        );
    ELSIF p_longitude < -180 OR p_longitude > 180 THEN
        v_errors := v_errors || jsonb_build_object(
            'field', 'longitude',
            'code', 'VALIDATION_INVALID',
            'message', 'Longitude must be between -180 and 180'
        );
    END IF;

    -- ==========================================================================
    -- Return Result
    -- ==========================================================================
    RETURN jsonb_build_object(
        'valid', jsonb_array_length(v_errors) = 0,
        'errors', v_errors,
        'sanitized', CASE WHEN jsonb_array_length(v_errors) = 0 THEN
            jsonb_build_object(
                'title', v_title,
                'description', CASE WHEN v_description = '' THEN NULL ELSE v_description END,
                'images', p_images,
                'postType', p_post_type,
                'latitude', p_latitude,
                'longitude', p_longitude,
                'pickupAddress', TRIM(COALESCE(p_pickup_address, '')),
                'pickupTime', TRIM(COALESCE(p_pickup_time, ''))
            )
        ELSE NULL END
    );
END;
$$;
