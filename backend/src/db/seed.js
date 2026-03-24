'use strict';

require('dotenv').config();

const bcrypt = require('bcryptjs');
const { query, pool } = require('../config/database');

const SALT_ROUNDS = 10;

const hash = (pw) => bcrypt.hash(pw, SALT_ROUNDS);

const run = async () => {
  console.log('Seeding database...');

  // ------------------------------------------------------------------
  // Procedure codes
  // ------------------------------------------------------------------
  const procedureCodes = [
    { code: 'D0120', description: 'Periodic oral evaluation', category: 'preventive', cost: 65.00 },
    { code: 'D0150', description: 'Comprehensive oral evaluation', category: 'preventive', cost: 120.00 },
    { code: 'D0210', description: 'Complete series of radiographic images', category: 'preventive', cost: 180.00 },
    { code: 'D0220', description: 'Periapical radiographic image', category: 'preventive', cost: 35.00 },
    { code: 'D0274', description: 'Bitewing radiographic image – four images', category: 'preventive', cost: 75.00 },
    { code: 'D1110', description: 'Prophylaxis – adult', category: 'preventive', cost: 115.00 },
    { code: 'D1120', description: 'Prophylaxis – child', category: 'preventive', cost: 80.00 },
    { code: 'D2140', description: 'Amalgam restoration – one surface, primary', category: 'basic', cost: 175.00 },
    { code: 'D2150', description: 'Amalgam restoration – two surfaces, primary', category: 'basic', cost: 220.00 },
    { code: 'D2160', description: 'Amalgam restoration – three surfaces, primary', category: 'basic', cost: 265.00 },
    { code: 'D2330', description: 'Resin-based composite – one surface, anterior', category: 'basic', cost: 195.00 },
    { code: 'D2740', description: 'Crown – porcelain/ceramic substrate', category: 'major', cost: 1350.00 },
    { code: 'D3310', description: 'Root canal – anterior', category: 'major', cost: 950.00 },
    { code: 'D4341', description: 'Periodontal scaling and root planing – four or more teeth per quadrant', category: 'basic', cost: 285.00 },
    { code: 'D5110', description: 'Complete denture – maxillary', category: 'major', cost: 1850.00 },
    { code: 'D7140', description: 'Extraction, erupted tooth', category: 'basic', cost: 185.00 },
    { code: 'D7210', description: 'Extraction, erupted tooth requiring elevation of mucoperiosteal flap', category: 'basic', cost: 320.00 },
    { code: 'D8080', description: 'Comprehensive orthodontic treatment, adolescent', category: 'orthodontic', cost: 5500.00 },
    { code: 'D9310', description: 'Consultation – diagnostic service', category: 'preventive', cost: 95.00 },
    { code: 'D9940', description: 'Occlusal guard, by report', category: 'major', cost: 550.00 },
  ];

  for (const pc of procedureCodes) {
    await query(
      `INSERT INTO procedure_codes (code, description, category, typical_cost)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (code) DO NOTHING`,
      [pc.code, pc.description, pc.category, pc.cost]
    );
  }
  console.log('Procedure codes seeded.');

  // ------------------------------------------------------------------
  // Admin user
  // ------------------------------------------------------------------
  const adminHash = await hash('Admin123!');
  const adminResult = await query(
    `INSERT INTO users (email, password_hash, role, first_name, last_name, phone, is_active, email_verified)
     VALUES ($1, $2, 'admin', 'System', 'Admin', '555-000-0001', true, true)
     ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash
     RETURNING id`,
    ['admin@clearcaredental.com', adminHash]
  );
  const adminUserId = adminResult.rows[0].id;
  console.log(`Admin user: ${adminUserId}`);

  // ------------------------------------------------------------------
  // Employer users & profiles
  // ------------------------------------------------------------------
  const employerData = [
    {
      email: 'hr@techcorp.com', password: 'Employer123!',
      first_name: 'Jennifer', last_name: 'Walsh', phone: '555-100-0001',
      company_name: 'TechCorp Solutions', company_size: 250, industry: 'Technology',
      tax_id: '12-3456789', address_line1: '100 Market St', city: 'San Francisco',
      state: 'CA', zip_code: '94105', website: 'https://techcorp.example.com',
    },
    {
      email: 'benefits@greenmfg.com', password: 'Employer123!',
      first_name: 'Robert', last_name: 'Chen', phone: '555-200-0001',
      company_name: 'Green Manufacturing Inc', company_size: 500, industry: 'Manufacturing',
      tax_id: '98-7654321', address_line1: '2000 Industrial Blvd', city: 'Chicago',
      state: 'IL', zip_code: '60601', website: 'https://greenmfg.example.com',
    },
    {
      email: 'hr@sunsetretail.com', password: 'Employer123!',
      first_name: 'Maria', last_name: 'Santos', phone: '555-300-0001',
      company_name: 'Sunset Retail Group', company_size: 120, industry: 'Retail',
      tax_id: '55-1234567', address_line1: '500 Commerce Dr', city: 'Austin',
      state: 'TX', zip_code: '78701', website: 'https://sunsetretail.example.com',
    },
  ];

  const employerIds = [];
  const employerUserIds = [];

  for (const emp of employerData) {
    const ph = await hash(emp.password);
    const uRes = await query(
      `INSERT INTO users (email, password_hash, role, first_name, last_name, phone, is_active, email_verified)
       VALUES ($1, $2, 'employer', $3, $4, $5, true, true)
       ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash
       RETURNING id`,
      [emp.email, ph, emp.first_name, emp.last_name, emp.phone]
    );
    const userId = uRes.rows[0].id;
    employerUserIds.push(userId);

    const eRes = await query(
      `INSERT INTO employers (user_id, company_name, company_size, industry, tax_id,
         address_line1, city, state, zip_code, website)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT DO NOTHING
       RETURNING id`,
      [userId, emp.company_name, emp.company_size, emp.industry, emp.tax_id,
        emp.address_line1, emp.city, emp.state, emp.zip_code, emp.website]
    );

    let empId;
    if (eRes.rows.length > 0) {
      empId = eRes.rows[0].id;
    } else {
      const existing = await query('SELECT id FROM employers WHERE user_id = $1', [userId]);
      empId = existing.rows[0].id;
    }
    employerIds.push(empId);
  }
  console.log('Employers seeded:', employerIds.length);

  // ------------------------------------------------------------------
  // Plans (3 per employer)
  // ------------------------------------------------------------------
  const planTemplates = [
    {
      name: 'Basic Plan', plan_type: 'self_insured',
      annual_maximum: 1000, deductible_individual: 100, deductible_family: 300,
      coverage_preventive: 100, coverage_basic: 70, coverage_major: 40,
      coverage_orthodontic: 0, orthodontic_lifetime_max: 0,
      waiting_period_basic: 3, waiting_period_major: 12,
    },
    {
      name: 'Standard Plan', plan_type: 'self_insured',
      annual_maximum: 1500, deductible_individual: 75, deductible_family: 225,
      coverage_preventive: 100, coverage_basic: 80, coverage_major: 50,
      coverage_orthodontic: 50, orthodontic_lifetime_max: 1500,
      waiting_period_basic: 0, waiting_period_major: 6,
    },
    {
      name: 'Premium Plan', plan_type: 'self_insured',
      annual_maximum: 3000, deductible_individual: 50, deductible_family: 150,
      coverage_preventive: 100, coverage_basic: 90, coverage_major: 70,
      coverage_orthodontic: 60, orthodontic_lifetime_max: 2500,
      waiting_period_basic: 0, waiting_period_major: 0,
    },
  ];

  const planIds = [];
  for (const empId of employerIds) {
    for (const tpl of planTemplates) {
      const pRes = await query(
        `INSERT INTO plans (employer_id, name, plan_type, annual_maximum,
           deductible_individual, deductible_family, coverage_preventive, coverage_basic,
           coverage_major, coverage_orthodontic, orthodontic_lifetime_max,
           waiting_period_basic, waiting_period_major, is_active, effective_date)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,true,CURRENT_DATE - INTERVAL '1 year')
         RETURNING id`,
        [empId, tpl.name, tpl.plan_type, tpl.annual_maximum,
          tpl.deductible_individual, tpl.deductible_family, tpl.coverage_preventive,
          tpl.coverage_basic, tpl.coverage_major, tpl.coverage_orthodontic,
          tpl.orthodontic_lifetime_max, tpl.waiting_period_basic, tpl.waiting_period_major]
      );
      planIds.push({ id: pRes.rows[0].id, employer_id: empId, ...tpl });
    }
  }
  console.log('Plans seeded:', planIds.length);

  // ------------------------------------------------------------------
  // Member users
  // ------------------------------------------------------------------
  const memberUserData = [
    { email: 'alice.johnson@email.com', first_name: 'Alice', last_name: 'Johnson', dob: '1988-03-15', gender: 'female', empIdx: 0 },
    { email: 'brian.smith@email.com', first_name: 'Brian', last_name: 'Smith', dob: '1975-07-22', gender: 'male', empIdx: 0 },
    { email: 'carol.white@email.com', first_name: 'Carol', last_name: 'White', dob: '1992-11-08', gender: 'female', empIdx: 0 },
    { email: 'david.lee@email.com', first_name: 'David', last_name: 'Lee', dob: '1983-05-30', gender: 'male', empIdx: 0 },
    { email: 'eva.martinez@email.com', first_name: 'Eva', last_name: 'Martinez', dob: '1990-09-12', gender: 'female', empIdx: 1 },
    { email: 'frank.wilson@email.com', first_name: 'Frank', last_name: 'Wilson', dob: '1978-01-25', gender: 'male', empIdx: 1 },
    { email: 'grace.taylor@email.com', first_name: 'Grace', last_name: 'Taylor', dob: '1995-06-17', gender: 'female', empIdx: 1 },
    { email: 'henry.brown@email.com', first_name: 'Henry', last_name: 'Brown', dob: '1968-12-03', gender: 'male', empIdx: 2 },
    { email: 'isabella.davis@email.com', first_name: 'Isabella', last_name: 'Davis', dob: '1987-04-28', gender: 'female', empIdx: 2 },
    { email: 'james.garcia@email.com', first_name: 'James', last_name: 'Garcia', dob: '1972-08-14', gender: 'male', empIdx: 2 },
  ];

  const memberIds = [];
  const memberUserIds = [];
  const memberPassword = await hash('Member123!');

  for (let i = 0; i < memberUserData.length; i++) {
    const m = memberUserData[i];
    const uRes = await query(
      `INSERT INTO users (email, password_hash, role, first_name, last_name, is_active, email_verified)
       VALUES ($1, $2, 'member', $3, $4, true, true)
       ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash
       RETURNING id`,
      [m.email, memberPassword, m.first_name, m.last_name]
    );
    const userId = uRes.rows[0].id;
    memberUserIds.push(userId);

    const employerId = employerIds[m.empIdx];
    // Assign the "Standard Plan" for the employer (index 1 of the 3 plans per employer)
    const planIdx = m.empIdx * 3 + 1;
    const planId = planIds[planIdx].id;
    const memberId = `BEN-${String(i + 1).padStart(3, '0')}`;

    const mRes = await query(
      `INSERT INTO members (user_id, employer_id, plan_id, member_id, date_of_birth, gender,
         relationship, enrollment_date, annual_deductible_met, annual_maximum_used)
       VALUES ($1,$2,$3,$4,$5,$6,'employee',CURRENT_DATE - INTERVAL '6 months',$7,$8)
       ON CONFLICT (member_id) DO UPDATE SET user_id = EXCLUDED.user_id
       RETURNING id`,
      [userId, employerId, planId, memberId, m.dob, m.gender,
        i % 3 === 0 ? 75.00 : 0.00,
        i % 3 === 0 ? 450.00 : 0.00]
    );
    memberIds.push(mRes.rows[0].id);
  }
  console.log('Members seeded:', memberIds.length);

  // ------------------------------------------------------------------
  // Dentist users
  // ------------------------------------------------------------------
  const dentistData = [
    {
      email: 'dr.patel@smileplus.com', first_name: 'Priya', last_name: 'Patel',
      npi: '1234567890', license: 'CA-DDS-12345', practice: 'Smile Plus Dental',
      specialty: 'General Dentistry', address: '1200 Market St', city: 'San Francisco',
      state: 'CA', zip: '94102', lat: 37.7792, lng: -122.4197, phone: '415-555-0101',
      in_network: true, rating: 4.8, reviews: 142, accepting: true,
      bio: 'Dr. Patel has over 15 years of experience in general and cosmetic dentistry.',
    },
    {
      email: 'dr.nguyen@baysmiles.com', first_name: 'Kevin', last_name: 'Nguyen',
      npi: '2345678901', license: 'CA-DDS-23456', practice: 'Bay Area Smiles',
      specialty: 'Cosmetic Dentistry', address: '450 Sutter St', city: 'San Francisco',
      state: 'CA', zip: '94108', lat: 37.7882, lng: -122.4089, phone: '415-555-0202',
      in_network: true, rating: 4.9, reviews: 218, accepting: true,
      bio: 'Specializing in smile makeovers and teeth whitening.',
    },
    {
      email: 'dr.rodriguez@familydental.com', first_name: 'Carlos', last_name: 'Rodriguez',
      npi: '3456789012', license: 'IL-DDS-34567', practice: 'Family Dental Care',
      specialty: 'General Dentistry', address: '325 N Michigan Ave', city: 'Chicago',
      state: 'IL', zip: '60601', lat: 41.8870, lng: -87.6245, phone: '312-555-0303',
      in_network: true, rating: 4.7, reviews: 95, accepting: true,
      bio: 'Providing comprehensive family dental care for over 20 years.',
    },
    {
      email: 'dr.kim@pearlortho.com', first_name: 'Susan', last_name: 'Kim',
      npi: '4567890123', license: 'IL-DDS-45678', practice: 'Pearl Orthodontics',
      specialty: 'Orthodontics', address: '77 W Wacker Dr', city: 'Chicago',
      state: 'IL', zip: '60601', lat: 41.8858, lng: -87.6348, phone: '312-555-0404',
      in_network: true, rating: 4.9, reviews: 307, accepting: false,
      bio: 'Board-certified orthodontist specializing in Invisalign and braces.',
    },
    {
      email: 'dr.johnson@austindental.com', first_name: 'Marcus', last_name: 'Johnson',
      npi: '5678901234', license: 'TX-DDS-56789', practice: 'Austin Dental Studio',
      specialty: 'General Dentistry', address: '701 Congress Ave', city: 'Austin',
      state: 'TX', zip: '78701', lat: 30.2677, lng: -97.7407, phone: '512-555-0505',
      in_network: true, rating: 4.6, reviews: 183, accepting: true,
      bio: 'Modern dental care in the heart of Austin.',
    },
    {
      email: 'dr.thompson@periospecialist.com', first_name: 'Linda', last_name: 'Thompson',
      npi: '6789012345', license: 'TX-DDS-67890', practice: 'Texas Perio Specialists',
      specialty: 'Periodontics', address: '500 W 2nd St', city: 'Austin',
      state: 'TX', zip: '78701', lat: 30.2648, lng: -97.7489, phone: '512-555-0606',
      in_network: false, rating: 4.8, reviews: 64, accepting: true,
      bio: 'Specialist in gum disease treatment and dental implants.',
    },
    {
      email: 'dr.harris@nycsmiledds.com', first_name: 'Angela', last_name: 'Harris',
      npi: '7890123456', license: 'NY-DDS-78901', practice: 'NYC Smile Design',
      specialty: 'Cosmetic Dentistry', address: '30 E 60th St', city: 'New York',
      state: 'NY', zip: '10022', lat: 40.7638, lng: -73.9720, phone: '212-555-0707',
      in_network: true, rating: 5.0, reviews: 421, accepting: true,
      bio: 'Award-winning cosmetic dentist transforming smiles for 18 years.',
    },
    {
      email: 'dr.martinez@seattledental.com', first_name: 'Diego', last_name: 'Martinez',
      npi: '8901234567', license: 'WA-DDS-89012', practice: 'Seattle Family Dental',
      specialty: 'Pediatric Dentistry', address: '1000 2nd Ave', city: 'Seattle',
      state: 'WA', zip: '98104', lat: 47.6041, lng: -122.3349, phone: '206-555-0808',
      in_network: true, rating: 4.7, reviews: 156, accepting: true,
      bio: 'Creating positive dental experiences for children of all ages.',
    },
  ];

  const dentistIds = [];
  const dentistPassword = await hash('Dentist123!');

  for (const d of dentistData) {
    const uRes = await query(
      `INSERT INTO users (email, password_hash, role, first_name, last_name, phone, is_active, email_verified)
       VALUES ($1, $2, 'dentist', $3, $4, $5, true, true)
       ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash
       RETURNING id`,
      [d.email, dentistPassword, d.first_name, d.last_name, d.phone]
    );
    const userId = uRes.rows[0].id;

    const dRes = await query(
      `INSERT INTO dentists (user_id, npi, license_number, practice_name, specialty,
         address_line1, city, state, zip_code, latitude, longitude, phone,
         accepting_new_patients, is_in_network, rating, review_count, bio)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
       ON CONFLICT (npi) DO UPDATE SET user_id = EXCLUDED.user_id
       RETURNING id`,
      [userId, d.npi, d.license, d.practice, d.specialty,
        d.address, d.city, d.state, d.zip, d.lat, d.lng, d.phone,
        d.accepting, d.in_network, d.rating, d.reviews, d.bio]
    );
    dentistIds.push(dRes.rows[0].id);
  }
  console.log('Dentists seeded:', dentistIds.length);

  // ------------------------------------------------------------------
  // Claims with line items
  // ------------------------------------------------------------------
  const claimStatuses = ['approved', 'approved', 'paid', 'paid', 'approved', 'partial', 'denied', 'pending', 'processing', 'paid'];

  const claimScenarios = [
    { procedures: [{ code: 'D0120', desc: 'Periodic oral evaluation', billed: 65, category: 'preventive' }, { code: 'D1110', desc: 'Prophylaxis – adult', billed: 115, category: 'preventive' }] },
    { procedures: [{ code: 'D0150', desc: 'Comprehensive oral evaluation', billed: 120, category: 'preventive' }, { code: 'D0210', desc: 'Complete series X-rays', billed: 180, category: 'preventive' }] },
    { procedures: [{ code: 'D2140', desc: 'Amalgam – one surface', billed: 175, category: 'basic', tooth: '14' }, { code: 'D2150', desc: 'Amalgam – two surfaces', billed: 220, category: 'basic', tooth: '19' }] },
    { procedures: [{ code: 'D2740', desc: 'Crown – porcelain/ceramic', billed: 1350, category: 'major', tooth: '30' }] },
    { procedures: [{ code: 'D3310', desc: 'Root canal – anterior', billed: 950, category: 'major', tooth: '9' }] },
    { procedures: [{ code: 'D4341', desc: 'Scaling and root planing', billed: 285, category: 'basic' }, { code: 'D4341', desc: 'Scaling and root planing', billed: 285, category: 'basic' }] },
    { procedures: [{ code: 'D7140', desc: 'Extraction, erupted tooth', billed: 185, category: 'basic', tooth: '32' }] },
    { procedures: [{ code: 'D0120', desc: 'Periodic oral evaluation', billed: 65, category: 'preventive' }, { code: 'D1110', desc: 'Prophylaxis – adult', billed: 115, category: 'preventive' }, { code: 'D0274', desc: 'Bitewing X-rays', billed: 75, category: 'preventive' }] },
    { procedures: [{ code: 'D2330', desc: 'Resin composite – anterior', billed: 195, category: 'basic', tooth: '8', surface: 'M' }] },
    { procedures: [{ code: 'D5110', desc: 'Complete denture – maxillary', billed: 1850, category: 'major' }] },
    { procedures: [{ code: 'D7210', desc: 'Surgical extraction', billed: 320, category: 'basic', tooth: '1' }] },
    { procedures: [{ code: 'D0120', desc: 'Periodic oral evaluation', billed: 65, category: 'preventive' }, { code: 'D1110', desc: 'Prophylaxis – adult', billed: 115, category: 'preventive' }] },
    { procedures: [{ code: 'D2160', desc: 'Amalgam – three surfaces', billed: 265, category: 'basic', tooth: '3' }] },
    { procedures: [{ code: 'D9940', desc: 'Occlusal guard', billed: 550, category: 'major' }] },
    { procedures: [{ code: 'D0150', desc: 'Comprehensive oral evaluation', billed: 120, category: 'preventive' }] },
    { procedures: [{ code: 'D2740', desc: 'Crown – porcelain/ceramic', billed: 1350, category: 'major', tooth: '12' }, { code: 'D3310', desc: 'Root canal', billed: 950, category: 'major', tooth: '12' }] },
    { procedures: [{ code: 'D4341', desc: 'Scaling and root planing', billed: 285, category: 'basic' }] },
    { procedures: [{ code: 'D1120', desc: 'Prophylaxis – child', billed: 80, category: 'preventive' }] },
    { procedures: [{ code: 'D0220', desc: 'Periapical X-ray', billed: 35, category: 'preventive' }, { code: 'D2330', desc: 'Resin composite', billed: 195, category: 'basic', tooth: '7' }] },
    { procedures: [{ code: 'D9310', desc: 'Consultation', billed: 95, category: 'preventive' }] },
    { procedures: [{ code: 'D7140', desc: 'Extraction', billed: 185, category: 'basic', tooth: '16' }, { code: 'D7140', desc: 'Extraction', billed: 185, category: 'basic', tooth: '17' }] },
    { procedures: [{ code: 'D2740', desc: 'Crown – porcelain/ceramic', billed: 1350, category: 'major', tooth: '18' }] },
    { procedures: [{ code: 'D8080', desc: 'Comprehensive orthodontic treatment', billed: 5500, category: 'orthodontic' }] },
  ];

  const now = new Date();

  for (let i = 0; i < claimScenarios.length; i++) {
    const scenario = claimScenarios[i];
    const memberIdx = i % memberIds.length;
    const dentistIdx = i % dentistIds.length;
    const status = claimStatuses[i % claimStatuses.length];

    const serviceDate = new Date(now);
    serviceDate.setDate(serviceDate.getDate() - (i * 12 + 5));
    const serviceDateStr = serviceDate.toISOString().split('T')[0];

    const totalBilled = scenario.procedures.reduce((s, p) => s + p.billed, 0);

    // Simple adjudication for seed data
    let planPaid = 0;
    let deductibleApplied = 0;
    const planStandard = { coverage_preventive: 100, coverage_basic: 80, coverage_major: 50, coverage_orthodontic: 50, deductible_individual: 75 };
    let deductibleRemaining = 75;

    for (const proc of scenario.procedures) {
      let covPct = 0;
      if (proc.category === 'preventive') covPct = 1.0;
      else if (proc.category === 'basic') covPct = 0.8;
      else if (proc.category === 'major') covPct = 0.5;
      else if (proc.category === 'orthodontic') covPct = 0.5;

      if (proc.category !== 'preventive' && deductibleRemaining > 0) {
        const applied = Math.min(deductibleRemaining, proc.billed);
        deductibleApplied += applied;
        deductibleRemaining -= applied;
        planPaid += Math.max(0, proc.billed - applied) * covPct;
      } else {
        planPaid += proc.billed * covPct;
      }
    }

    planPaid = Math.round(planPaid * 100) / 100;
    const memberResp = Math.round((totalBilled - planPaid) * 100) / 100;

    const dateTag = serviceDateStr.replace(/-/g, '');
    const claimNum = `CLM-${dateTag}-${String(i + 1).padStart(5, '0')}`;

    // Fetch plan_id for this member
    const memberPlanRes = await query('SELECT plan_id FROM members WHERE id = $1', [memberIds[memberIdx]]);
    const planId = memberPlanRes.rows[0]?.plan_id;

    const paidDate = (status === 'paid') ? new Date(serviceDate.getTime() + 7 * 24 * 60 * 60 * 1000) : null;

    const claimRes = await query(
      `INSERT INTO claims (claim_number, member_id, dentist_id, plan_id, service_date,
         status, total_billed, allowed_amount, plan_paid, member_responsibility,
         deductible_applied, adjudication_reason, paid_date)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       ON CONFLICT (claim_number) DO NOTHING
       RETURNING id`,
      [claimNum, memberIds[memberIdx], dentistIds[dentistIdx], planId, serviceDateStr,
        status, totalBilled, totalBilled, planPaid, memberResp,
        deductibleApplied, `Adjudicated automatically. Coverage applied per plan.`,
        paidDate]
    );

    if (claimRes.rows.length === 0) continue;
    const claimId = claimRes.rows[0].id;

    for (const proc of scenario.procedures) {
      let covPct = proc.category === 'preventive' ? 1.0 : proc.category === 'basic' ? 0.8 : 0.5;
      const procAllowed = proc.billed;
      const procPlanPaid = Math.round(procAllowed * covPct * 100) / 100;
      const procMemberResp = Math.round((procAllowed - procPlanPaid) * 100) / 100;

      await query(
        `INSERT INTO claim_line_items (claim_id, procedure_code, procedure_description,
           tooth_number, surface, quantity, billed_amount, allowed_amount,
           plan_paid, member_responsibility, category)
         VALUES ($1,$2,$3,$4,$5,1,$6,$7,$8,$9,$10)`,
        [claimId, proc.code, proc.desc, proc.tooth || null, proc.surface || null,
          proc.billed, procAllowed, procPlanPaid, procMemberResp, proc.category]
      );
    }
  }
  console.log('Claims seeded.');

  // ------------------------------------------------------------------
  // Appointments
  // ------------------------------------------------------------------
  const appointmentTypes = ['Routine Cleaning', 'X-Rays', 'Crown Consultation', 'Root Canal', 'Extraction', 'Orthodontic Consult', 'Gum Disease Treatment', 'New Patient Exam'];
  const apptStatuses = ['scheduled', 'confirmed', 'completed', 'completed', 'cancelled'];

  for (let i = 0; i < 12; i++) {
    const apptDate = new Date(now);
    apptDate.setDate(apptDate.getDate() + (i < 6 ? i * 7 + 3 : -(i - 5) * 10));

    await query(
      `INSERT INTO appointments (member_id, dentist_id, appointment_date, duration_minutes,
         appointment_type, status, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [memberIds[i % memberIds.length], dentistIds[i % dentistIds.length],
        apptDate, 60,
        appointmentTypes[i % appointmentTypes.length],
        apptStatuses[i % apptStatuses.length],
        i % 4 === 0 ? 'Patient requested morning appointment.' : null]
    );
  }
  console.log('Appointments seeded.');

  // ------------------------------------------------------------------
  // Notifications
  // ------------------------------------------------------------------
  const notifData = [
    { type: 'claim_approved', title: 'Claim Approved', message: 'Your claim CLM-20250101-00001 has been approved. Plan paid: $131.50.' },
    { type: 'claim_submitted', title: 'Claim Submitted', message: 'Your claim has been submitted successfully and is under review.' },
    { type: 'payment_received', title: 'Payment Received', message: 'Payment of $875.00 has been processed via ACH.' },
    { type: 'appointment_reminder', title: 'Appointment Reminder', message: 'You have an appointment tomorrow at 10:00 AM with Dr. Patel.' },
    { type: 'plan_update', title: 'Plan Updated', message: 'Your dental plan has been updated. Review your new coverage details.' },
    { type: 'claim_denied', title: 'Claim Denied', message: 'Claim CLM-20250115-00007 was denied. Waiting period not yet met.' },
    { type: 'claim_approved', title: 'Claim Approved', message: 'Your preventive cleaning claim has been approved. $0 out of pocket.' },
    { type: 'payment_received', title: 'Payment Processed', message: 'ACH payment of $1,200.00 sent to Dr. Nguyen.' },
    { type: 'appointment_reminder', title: 'Upcoming Appointment', message: 'Reminder: Orthodontic consultation next Monday at 2:00 PM.' },
    { type: 'plan_update', title: 'Annual Maximum Reset', message: 'Your annual maximum has been reset for the new benefit year.' },
  ];

  // Distribute notifications among member users and employer users
  const allUserIds = [...memberUserIds, ...employerUserIds, adminUserId];

  for (let i = 0; i < 20; i++) {
    const n = notifData[i % notifData.length];
    const userId = allUserIds[i % allUserIds.length];
    const createdAt = new Date(now);
    createdAt.setDate(createdAt.getDate() - i);

    await query(
      `INSERT INTO notifications (user_id, type, title, message, is_read, created_at)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [userId, n.type, n.title, n.message, i % 3 === 0, createdAt]
    );
  }
  console.log('Notifications seeded.');

  // ------------------------------------------------------------------
  // Support tickets
  // ------------------------------------------------------------------
  const ticketData = [
    { subj: 'Claim not showing in portal', desc: 'I submitted a claim 3 days ago but it does not appear in my portal.', priority: 'high', cat: 'claims', status: 'open' },
    { subj: 'Unable to find in-network dentist', desc: 'The dentist finder is not returning results for my zip code.', priority: 'normal', cat: 'network', status: 'in_progress' },
    { subj: 'Payment not received', desc: 'Approved claim from last month has not been paid yet.', priority: 'urgent', cat: 'payments', status: 'open' },
    { subj: 'Question about coverage for orthodontics', desc: 'My plan shows orthodontic coverage but the claim was denied.', priority: 'normal', cat: 'benefits', status: 'resolved' },
    { subj: 'Add dependent to plan', desc: 'I recently had a child and need to add them as a dependent.', priority: 'normal', cat: 'enrollment', status: 'open' },
    { subj: 'Incorrect EOB information', desc: 'The Explanation of Benefits shows incorrect amounts.', priority: 'high', cat: 'claims', status: 'in_progress' },
    { subj: 'Password reset not working', desc: 'Magic link was not received in my email.', priority: 'low', cat: 'technical', status: 'resolved' },
    { subj: 'Bulk enrollment upload failing', desc: 'CSV enrollment file fails validation.', priority: 'high', cat: 'enrollment', status: 'open' },
  ];

  const ticketUserIds = [...memberUserIds, ...employerUserIds];

  for (let i = 0; i < ticketData.length; i++) {
    const t = ticketData[i];
    const createdAt = new Date(now);
    createdAt.setDate(createdAt.getDate() - i * 3);

    await query(
      `INSERT INTO support_tickets (user_id, subject, description, priority, status, category, assigned_to, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$8)`,
      [ticketUserIds[i % ticketUserIds.length], t.subj, t.desc,
        t.priority, t.status, t.cat,
        i % 3 === 0 ? adminUserId : null, createdAt]
    );
  }
  console.log('Support tickets seeded.');

  // ------------------------------------------------------------------
  // Payments for paid claims
  // ------------------------------------------------------------------
  const paidClaimsRes = await query(`SELECT id, dentist_id, plan_paid FROM claims WHERE status = 'paid' LIMIT 10`);
  for (const claim of paidClaimsRes.rows) {
    await query(
      `INSERT INTO payments (claim_id, dentist_id, amount, payment_method, payment_status,
         transaction_id, payment_date)
       VALUES ($1,$2,$3,'ach','completed',$4,NOW() - INTERVAL '5 days')`,
      [claim.id, claim.dentist_id, claim.plan_paid, `TXN-${Date.now()}-${Math.floor(Math.random() * 9999)}`]
    );
  }
  console.log('Payments seeded.');

  console.log('\nSeed completed successfully!');
  console.log('Login credentials:');
  console.log('  Admin:    admin@clearcaredental.com / Admin123!');
  console.log('  Employer: hr@techcorp.com / Employer123!');
  console.log('  Member:   alice.johnson@email.com / Member123!');
  console.log('  Dentist:  dr.patel@smileplus.com / Dentist123!');

  await pool.end();
  process.exit(0);
};

run().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
