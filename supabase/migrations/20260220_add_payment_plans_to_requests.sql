-- Add payment tracking fields to product_requests table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='product_requests' AND column_name='payment_plan') THEN
        ALTER TABLE product_requests ADD COLUMN payment_plan TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='product_requests' AND column_name='payments') THEN
        ALTER TABLE product_requests ADD COLUMN payments JSONB DEFAULT '[]'::jsonb;
    END IF;
END $$;
