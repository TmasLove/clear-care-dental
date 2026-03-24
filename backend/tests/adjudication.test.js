'use strict';

const { calculateClaimAdjudication, monthDiff } = require('../src/utils/adjudication');

// ---------------------------------------------------------------------------
// Helper factories
// ---------------------------------------------------------------------------
const makePlan = (overrides = {}) => ({
  annual_maximum: 1500,
  deductible_individual: 100,
  deductible_family: 300,
  coverage_preventive: 100,
  coverage_basic: 80,
  coverage_major: 50,
  coverage_orthodontic: 50,
  orthodontic_lifetime_max: 1500,
  waiting_period_basic: 0,
  waiting_period_major: 0,
  ...overrides,
});

const makeMember = (overrides = {}) => ({
  annual_deductible_met: 0,
  annual_maximum_used: 0,
  enrollment_date: new Date(new Date().setFullYear(new Date().getFullYear() - 1)).toISOString(),
  ...overrides,
});

const makeClaimHeader = (overrides = {}) => ({
  service_date: new Date().toISOString().split('T')[0],
  ...overrides,
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('calculateClaimAdjudication', () => {

  // -------------------------------------------------------------------------
  // 1. Preventive coverage – 100% plan pays, no deductible applied
  // -------------------------------------------------------------------------
  describe('Preventive coverage', () => {
    it('pays 100% of preventive procedures with no deductible', () => {
      const result = calculateClaimAdjudication(
        makeClaimHeader(),
        [
          { procedure_code: 'D0120', billed_amount: 65, category: 'preventive', quantity: 1 },
          { procedure_code: 'D1110', billed_amount: 115, category: 'preventive', quantity: 1 },
        ],
        makePlan(),
        makeMember()
      );

      expect(result.status).toBe('approved');
      expect(result.plan_paid).toBeCloseTo(180.00, 2);
      expect(result.member_responsibility).toBeCloseTo(0, 2);
      expect(result.deductible_applied).toBe(0);
    });

    it('marks each preventive line item as approved', () => {
      const result = calculateClaimAdjudication(
        makeClaimHeader(),
        [{ procedure_code: 'D1110', billed_amount: 100, category: 'preventive', quantity: 1 }],
        makePlan(),
        makeMember()
      );

      expect(result.line_item_results[0].status).toBe('approved');
      expect(result.line_item_results[0].plan_paid).toBeCloseTo(100, 2);
    });
  });

  // -------------------------------------------------------------------------
  // 2. Basic coverage with deductible
  // -------------------------------------------------------------------------
  describe('Basic coverage with deductible', () => {
    it('applies deductible before calculating plan payment on basic procedures', () => {
      const plan = makePlan({ deductible_individual: 100, coverage_basic: 80 });
      const member = makeMember({ annual_deductible_met: 0 });

      const result = calculateClaimAdjudication(
        makeClaimHeader(),
        [{ procedure_code: 'D2140', billed_amount: 200, category: 'basic', quantity: 1 }],
        plan,
        member
      );

      // $100 deductible applied first, then 80% of remaining $100 = $80
      expect(result.deductible_applied).toBeCloseTo(100, 2);
      expect(result.plan_paid).toBeCloseTo(80, 2);
      expect(result.member_responsibility).toBeCloseTo(120, 2); // $100 ded + $20 coinsurance
      expect(result.status).toBe('approved');
    });

    it('does not re-apply deductible when already fully met', () => {
      const plan = makePlan({ deductible_individual: 100, coverage_basic: 80 });
      const member = makeMember({ annual_deductible_met: 100 }); // fully met

      const result = calculateClaimAdjudication(
        makeClaimHeader(),
        [{ procedure_code: 'D2140', billed_amount: 200, category: 'basic', quantity: 1 }],
        plan,
        member
      );

      expect(result.deductible_applied).toBe(0);
      expect(result.plan_paid).toBeCloseTo(160, 2); // 80% of $200
      expect(result.member_responsibility).toBeCloseTo(40, 2);
    });

    it('partially satisfies deductible when billed < remaining deductible', () => {
      const plan = makePlan({ deductible_individual: 100, coverage_basic: 80 });
      const member = makeMember({ annual_deductible_met: 60 }); // $40 remaining

      const result = calculateClaimAdjudication(
        makeClaimHeader(),
        [{ procedure_code: 'D2140', billed_amount: 80, category: 'basic', quantity: 1 }],
        plan,
        member
      );

      // $40 of deductible applied, then 80% of remaining $40 = $32
      expect(result.deductible_applied).toBeCloseTo(40, 2);
      expect(result.plan_paid).toBeCloseTo(32, 2);
    });
  });

  // -------------------------------------------------------------------------
  // 3. Annual maximum limit
  // -------------------------------------------------------------------------
  describe('Annual maximum limit', () => {
    it('caps plan payment at the annual maximum remaining', () => {
      const plan = makePlan({ annual_maximum: 500, coverage_major: 50, deductible_individual: 0 });
      const member = makeMember({ annual_maximum_used: 450 }); // only $50 remaining

      const result = calculateClaimAdjudication(
        makeClaimHeader(),
        [{ procedure_code: 'D2740', billed_amount: 1000, category: 'major', quantity: 1 }],
        plan,
        member
      );

      // Plan would normally pay 50% ($500) but only $50 annual max remains
      expect(result.plan_paid).toBeCloseTo(50, 2);
      expect(result.member_responsibility).toBeCloseTo(950, 2);
    });

    it('pays full coverage when annual max has not been used', () => {
      const plan = makePlan({ annual_maximum: 2000, coverage_major: 50, deductible_individual: 0 });
      const member = makeMember({ annual_maximum_used: 0 });

      const result = calculateClaimAdjudication(
        makeClaimHeader(),
        [{ procedure_code: 'D2740', billed_amount: 1000, category: 'major', quantity: 1 }],
        plan,
        member
      );

      expect(result.plan_paid).toBeCloseTo(500, 2);
    });
  });

  // -------------------------------------------------------------------------
  // 4. Partial approval when annual max is exceeded mid-claim
  // -------------------------------------------------------------------------
  describe('Partial approval when max is mid-claim exceeded', () => {
    it('returns partial status when some procedures exceed the annual maximum', () => {
      const plan = makePlan({ annual_maximum: 200, coverage_major: 50, deductible_individual: 0 });
      const member = makeMember({ annual_maximum_used: 150 }); // $50 left

      const result = calculateClaimAdjudication(
        makeClaimHeader(),
        [
          { procedure_code: 'D2740', billed_amount: 500, category: 'major', quantity: 1 },
          { procedure_code: 'D3310', billed_amount: 800, category: 'major', quantity: 1 },
        ],
        plan,
        member
      );

      // Normal plan_paid would be 50% of $1300 = $650, but only $50 annual max remains
      expect(result.plan_paid).toBeCloseTo(50, 2);
      expect(result.status).toBe('partial');
    });
  });

  // -------------------------------------------------------------------------
  // 5. Waiting period denial
  // -------------------------------------------------------------------------
  describe('Waiting period denial', () => {
    it('denies basic procedures when waiting period is not met', () => {
      // Member enrolled 1 month ago, plan requires 3 months for basic
      const recentEnrollment = new Date();
      recentEnrollment.setMonth(recentEnrollment.getMonth() - 1);

      const plan = makePlan({ waiting_period_basic: 3, coverage_basic: 80 });
      const member = makeMember({ enrollment_date: recentEnrollment.toISOString() });

      const result = calculateClaimAdjudication(
        makeClaimHeader(),
        [{ procedure_code: 'D2140', billed_amount: 200, category: 'basic', quantity: 1 }],
        plan,
        member
      );

      expect(result.status).toBe('denied');
      expect(result.plan_paid).toBe(0);
      expect(result.line_item_results[0].status).toBe('denied');
      expect(result.line_item_results[0].denial_reason).toMatch(/waiting period/i);
    });

    it('approves basic procedures when waiting period is met', () => {
      // Member enrolled 6 months ago, plan requires 3 months for basic
      const olderEnrollment = new Date();
      olderEnrollment.setMonth(olderEnrollment.getMonth() - 6);

      const plan = makePlan({ waiting_period_basic: 3, coverage_basic: 80, deductible_individual: 0 });
      const member = makeMember({ enrollment_date: olderEnrollment.toISOString() });

      const result = calculateClaimAdjudication(
        makeClaimHeader(),
        [{ procedure_code: 'D2140', billed_amount: 200, category: 'basic', quantity: 1 }],
        plan,
        member
      );

      expect(result.status).toBe('approved');
      expect(result.plan_paid).toBeCloseTo(160, 2);
    });

    it('denies major procedures when major waiting period is not met', () => {
      const recentEnrollment = new Date();
      recentEnrollment.setMonth(recentEnrollment.getMonth() - 3);

      const plan = makePlan({ waiting_period_major: 6, coverage_major: 50 });
      const member = makeMember({ enrollment_date: recentEnrollment.toISOString() });

      const result = calculateClaimAdjudication(
        makeClaimHeader(),
        [{ procedure_code: 'D2740', billed_amount: 1000, category: 'major', quantity: 1 }],
        plan,
        member
      );

      expect(result.status).toBe('denied');
      expect(result.plan_paid).toBe(0);
    });

    it('mixed claim: approved preventive + denied basic (waiting period)', () => {
      const recentEnrollment = new Date();
      recentEnrollment.setMonth(recentEnrollment.getMonth() - 1);

      const plan = makePlan({ waiting_period_basic: 3, coverage_preventive: 100, coverage_basic: 80 });
      const member = makeMember({ enrollment_date: recentEnrollment.toISOString() });

      const result = calculateClaimAdjudication(
        makeClaimHeader(),
        [
          { procedure_code: 'D1110', billed_amount: 115, category: 'preventive', quantity: 1 },
          { procedure_code: 'D2140', billed_amount: 200, category: 'basic', quantity: 1 },
        ],
        plan,
        member
      );

      expect(result.status).toBe('partial');
      expect(result.plan_paid).toBeCloseTo(115, 2); // only preventive paid
      expect(result.line_item_results[0].status).toBe('approved');
      expect(result.line_item_results[1].status).toBe('denied');
    });
  });

  // -------------------------------------------------------------------------
  // 6. monthDiff utility
  // -------------------------------------------------------------------------
  describe('monthDiff utility', () => {
    it('returns 0 for the same month', () => {
      const d = new Date('2025-01-15');
      expect(monthDiff(d, d)).toBe(0);
    });

    it('returns 6 for 6 months apart', () => {
      expect(monthDiff(new Date('2024-01-01'), new Date('2024-07-01'))).toBe(6);
    });

    it('returns 12 for exactly 1 year apart', () => {
      expect(monthDiff(new Date('2024-03-01'), new Date('2025-03-01'))).toBe(12);
    });
  });

  // -------------------------------------------------------------------------
  // 7. Orthodontic coverage
  // -------------------------------------------------------------------------
  describe('Orthodontic coverage', () => {
    it('applies 50% orthodontic coverage', () => {
      const plan = makePlan({ coverage_orthodontic: 50, deductible_individual: 0, annual_maximum: 10000 });
      const member = makeMember();

      const result = calculateClaimAdjudication(
        makeClaimHeader(),
        [{ procedure_code: 'D8080', billed_amount: 5000, category: 'orthodontic', quantity: 1 }],
        plan,
        member
      );

      expect(result.plan_paid).toBeCloseTo(2500, 2);
      expect(result.status).toBe('approved');
    });
  });
});
