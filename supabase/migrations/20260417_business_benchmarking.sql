-- Business Benchmarking: add sector, state, and size fields for peer grouping
-- These fields enable anonymous aggregate comparisons across businesses

ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS sector text,
  ADD COLUMN IF NOT EXISTS state text,
  ADD COLUMN IF NOT EXISTS business_size text;

-- Constrain to valid values
ALTER TABLE businesses
  ADD CONSTRAINT businesses_sector_check CHECK (
    sector IS NULL OR sector IN (
      'Crop Farming',
      'Livestock & Poultry',
      'Fisheries & Aquaculture',
      'Agro-Processing',
      'Input Supply',
      'Equipment & Machinery',
      'Transport & Logistics',
      'Trading & Export',
      'Consulting & Advisory',
      'Other'
    )
  );

ALTER TABLE businesses
  ADD CONSTRAINT businesses_size_check CHECK (
    business_size IS NULL OR business_size IN (
      'Micro (1-9 staff)',
      'Small (10-49 staff)',
      'Medium (50-199 staff)',
      'Large (200+ staff)'
    )
  );

-- Nigerian states (36 + FCT)
ALTER TABLE businesses
  ADD CONSTRAINT businesses_state_check CHECK (
    state IS NULL OR state IN (
      'Abia','Adamawa','Akwa Ibom','Anambra','Bauchi','Bayelsa','Benue','Borno',
      'Cross River','Delta','Ebonyi','Edo','Ekiti','Enugu','FCT','Gombe',
      'Imo','Jigawa','Kaduna','Kano','Katsina','Kebbi','Kogi','Kwara',
      'Lagos','Nasarawa','Niger','Ogun','Ondo','Osun','Oyo','Plateau',
      'Rivers','Sokoto','Taraba','Yobe','Zamfara'
    )
  );

-- Indexes for fast peer-group queries
CREATE INDEX IF NOT EXISTS idx_businesses_sector ON businesses (sector) WHERE sector IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_businesses_state ON businesses (state) WHERE state IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_businesses_size ON businesses (business_size) WHERE business_size IS NOT NULL;
