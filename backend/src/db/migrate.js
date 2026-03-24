'use strict';

require('dotenv').config();

const { query } = require('../config/database');

const migrations = [
  // ------------------------------------------------------------------
  // users
  // ------------------------------------------------------------------
  `CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    role VARCHAR(50) NOT NULL CHECK (role IN ('employer', 'member', 'dentist', 'admin')),
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone VARCHAR(20),
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT true,
    email_verified BOOLEAN DEFAULT false,
    magic_link_token VARCHAR(255),
    magic_link_expires TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
  )`,

  // ------------------------------------------------------------------
  // employers
  // ------------------------------------------------------------------
  `CREATE TABLE IF NOT EXISTS employers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    company_name VARCHAR(255) NOT NULL,
    company_size INTEGER,
    industry VARCHAR(100),
    tax_id VARCHAR(50),
    address_line1 VARCHAR(255),
    address_line2 VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(50),
    zip_code VARCHAR(20),
    website VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW()
  )`,

  // ------------------------------------------------------------------
  // plans
  // ------------------------------------------------------------------
  `CREATE TABLE IF NOT EXISTS plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employer_id UUID REFERENCES employers(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    plan_type VARCHAR(50) DEFAULT 'self_insured',
    annual_maximum DECIMAL(10,2),
    deductible_individual DECIMAL(10,2),
    deductible_family DECIMAL(10,2),
    coverage_preventive DECIMAL(5,2) DEFAULT 100.00,
    coverage_basic DECIMAL(5,2) DEFAULT 80.00,
    coverage_major DECIMAL(5,2) DEFAULT 50.00,
    coverage_orthodontic DECIMAL(5,2) DEFAULT 50.00,
    orthodontic_lifetime_max DECIMAL(10,2),
    waiting_period_basic INTEGER DEFAULT 0,
    waiting_period_major INTEGER DEFAULT 6,
    is_active BOOLEAN DEFAULT true,
    effective_date DATE,
    termination_date DATE,
    created_at TIMESTAMP DEFAULT NOW()
  )`,

  // ------------------------------------------------------------------
  // members
  // ------------------------------------------------------------------
  `CREATE TABLE IF NOT EXISTS members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    employer_id UUID REFERENCES employers(id),
    plan_id UUID REFERENCES plans(id),
    member_id VARCHAR(50) UNIQUE,
    date_of_birth DATE,
    gender VARCHAR(20),
    relationship VARCHAR(50) DEFAULT 'employee',
    enrollment_date DATE DEFAULT CURRENT_DATE,
    termination_date DATE,
    annual_deductible_met DECIMAL(10,2) DEFAULT 0,
    annual_maximum_used DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
  )`,

  // ------------------------------------------------------------------
  // dentists
  // ------------------------------------------------------------------
  `CREATE TABLE IF NOT EXISTS dentists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    npi VARCHAR(20) UNIQUE,
    license_number VARCHAR(50),
    practice_name VARCHAR(255),
    specialty VARCHAR(100),
    address_line1 VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(50),
    zip_code VARCHAR(20),
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    phone VARCHAR(20),
    accepting_new_patients BOOLEAN DEFAULT true,
    is_in_network BOOLEAN DEFAULT true,
    rating DECIMAL(3,2),
    review_count INTEGER DEFAULT 0,
    bio TEXT,
    created_at TIMESTAMP DEFAULT NOW()
  )`,

  // ------------------------------------------------------------------
  // claims
  // ------------------------------------------------------------------
  `CREATE TABLE IF NOT EXISTS claims (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    claim_number VARCHAR(50) UNIQUE NOT NULL,
    member_id UUID REFERENCES members(id),
    dentist_id UUID REFERENCES dentists(id),
    plan_id UUID REFERENCES plans(id),
    service_date DATE NOT NULL,
    submission_date TIMESTAMP DEFAULT NOW(),
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'approved', 'partial', 'denied', 'paid')),
    total_billed DECIMAL(10,2) NOT NULL,
    allowed_amount DECIMAL(10,2),
    plan_paid DECIMAL(10,2),
    member_responsibility DECIMAL(10,2),
    deductible_applied DECIMAL(10,2) DEFAULT 0,
    notes TEXT,
    adjudication_reason TEXT,
    paid_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
  )`,

  // ------------------------------------------------------------------
  // claim_line_items
  // ------------------------------------------------------------------
  `CREATE TABLE IF NOT EXISTS claim_line_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    claim_id UUID REFERENCES claims(id) ON DELETE CASCADE,
    procedure_code VARCHAR(20) NOT NULL,
    procedure_description VARCHAR(255),
    tooth_number VARCHAR(10),
    surface VARCHAR(20),
    quantity INTEGER DEFAULT 1,
    billed_amount DECIMAL(10,2) NOT NULL,
    allowed_amount DECIMAL(10,2),
    plan_paid DECIMAL(10,2),
    member_responsibility DECIMAL(10,2),
    category VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW()
  )`,

  // ------------------------------------------------------------------
  // appointments
  // ------------------------------------------------------------------
  `CREATE TABLE IF NOT EXISTS appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID REFERENCES members(id),
    dentist_id UUID REFERENCES dentists(id),
    appointment_date TIMESTAMP NOT NULL,
    duration_minutes INTEGER DEFAULT 60,
    appointment_type VARCHAR(100),
    status VARCHAR(50) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'completed', 'cancelled', 'no_show')),
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
  )`,

  // ------------------------------------------------------------------
  // notifications
  // ------------------------------------------------------------------
  `CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    data JSONB,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
  )`,

  // ------------------------------------------------------------------
  // support_tickets
  // ------------------------------------------------------------------
  `CREATE TABLE IF NOT EXISTS support_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    subject VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    status VARCHAR(50) DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
    category VARCHAR(50),
    assigned_to UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
  )`,

  // ------------------------------------------------------------------
  // payments
  // ------------------------------------------------------------------
  `CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    claim_id UUID REFERENCES claims(id),
    dentist_id UUID REFERENCES dentists(id),
    amount DECIMAL(10,2) NOT NULL,
    payment_method VARCHAR(50) DEFAULT 'ach',
    payment_status VARCHAR(50) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'processing', 'completed', 'failed')),
    transaction_id VARCHAR(255),
    payment_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
  )`,

  // ------------------------------------------------------------------
  // procedure_codes
  // ------------------------------------------------------------------
  `CREATE TABLE IF NOT EXISTS procedure_codes (
    code VARCHAR(20) PRIMARY KEY,
    description VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL,
    typical_cost DECIMAL(10,2)
  )`,
];

const run = async () => {
  console.log('Running database migrations...');
  for (let i = 0; i < migrations.length; i++) {
    try {
      await query(migrations[i]);
      console.log(`Migration ${i + 1}/${migrations.length} applied.`);
    } catch (err) {
      console.error(`Migration ${i + 1} failed:`, err.message);
      throw err;
    }
  }
  console.log('All migrations completed successfully.');
  process.exit(0);
};

run().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
