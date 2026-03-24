'use strict';

/**
 * calculateClaimAdjudication
 *
 * Performs instant adjudication of a dental claim.
 *
 * @param {Object} claimHeader - { service_date }
 * @param {Array}  lineItems   - [{ procedure_code, billed_amount, category, quantity }]
 * @param {Object} plan        - plan row from DB
 * @param {Object} member      - member row from DB (annual_deductible_met, annual_maximum_used, enrollment_date)
 *
 * @returns {Object} {
 *   allowed_amount, plan_paid, member_responsibility, deductible_applied,
 *   adjudication_reason, status, line_item_results
 * }
 */
const calculateClaimAdjudication = (claimHeader, lineItems, plan, member) => {
  const reasons = [];
  let totalBilled = 0;
  let totalAllowed = 0;
  let totalPlanPaid = 0;
  let totalDeductibleApplied = 0;

  // Annual maximum remaining for member
  const annualMaxUsed = parseFloat(member.annual_maximum_used) || 0;
  const annualMax = parseFloat(plan.annual_maximum) || Infinity;
  let annualMaxRemaining = Math.max(0, annualMax - annualMaxUsed);

  // Deductible remaining
  const deductibleMet = parseFloat(member.annual_deductible_met) || 0;
  const deductibleIndividual = parseFloat(plan.deductible_individual) || 0;
  let deductibleRemaining = Math.max(0, deductibleIndividual - deductibleMet);

  // Enrollment date for waiting period checks
  const enrollmentDate = member.enrollment_date ? new Date(member.enrollment_date) : new Date();
  const serviceDate = claimHeader.service_date ? new Date(claimHeader.service_date) : new Date();
  const monthsEnrolled = monthDiff(enrollmentDate, serviceDate);

  // Coverage percentages from plan
  const coverageByCategory = {
    preventive: parseFloat(plan.coverage_preventive) / 100 || 1.0,
    basic: parseFloat(plan.coverage_basic) / 100 || 0.8,
    major: parseFloat(plan.coverage_major) / 100 || 0.5,
    orthodontic: parseFloat(plan.coverage_orthodontic) / 100 || 0.5,
  };

  // Waiting periods (months)
  const waitingPeriods = {
    basic: parseInt(plan.waiting_period_basic, 10) || 0,
    major: parseInt(plan.waiting_period_major, 10) || 0,
  };

  const lineItemResults = [];
  let overallDenied = false;

  for (const item of lineItems) {
    const billed = parseFloat(item.billed_amount) * (parseInt(item.quantity, 10) || 1);
    totalBilled += billed;

    const category = (item.category || 'basic').toLowerCase();

    // Check waiting period
    const waitingMonths = waitingPeriods[category] || 0;
    if (waitingMonths > 0 && monthsEnrolled < waitingMonths) {
      lineItemResults.push({
        procedure_code: item.procedure_code,
        billed_amount: billed,
        allowed_amount: billed,
        plan_paid: 0,
        member_responsibility: billed,
        deductible_applied: 0,
        denial_reason: `Waiting period not met. Requires ${waitingMonths} months enrollment; ${monthsEnrolled.toFixed(1)} months enrolled.`,
        status: 'denied',
      });
      totalAllowed += billed;
      overallDenied = true;
      reasons.push(`D${item.procedure_code}: waiting period not met`);
      continue;
    }

    const allowed = billed; // Use billed as allowed for simplicity (UCR fee schedules would adjust this)
    const covPct = coverageByCategory[category] ?? 0.5;

    // Preventive procedures skip the deductible
    let deductibleAppliedForItem = 0;
    let coveredAfterDeductible = allowed;

    if (category !== 'preventive' && deductibleRemaining > 0) {
      const applyDed = Math.min(deductibleRemaining, allowed);
      deductibleAppliedForItem = applyDed;
      deductibleRemaining -= applyDed;
      totalDeductibleApplied += applyDed;
      coveredAfterDeductible = allowed - applyDed;
    }

    let planPaidForItem = Math.round(coveredAfterDeductible * covPct * 100) / 100;

    // Annual maximum cap
    if (planPaidForItem > annualMaxRemaining) {
      reasons.push(`Annual maximum limit reached; partial payment applied.`);
      planPaidForItem = Math.max(0, annualMaxRemaining);
    }
    annualMaxRemaining = Math.max(0, annualMaxRemaining - planPaidForItem);

    const memberRespForItem = Math.round((allowed - planPaidForItem) * 100) / 100;

    totalAllowed += allowed;
    totalPlanPaid += planPaidForItem;

    lineItemResults.push({
      procedure_code: item.procedure_code,
      billed_amount: billed,
      allowed_amount: allowed,
      plan_paid: planPaidForItem,
      member_responsibility: memberRespForItem,
      deductible_applied: deductibleAppliedForItem,
      status: 'approved',
    });
  }

  totalAllowed = Math.round(totalAllowed * 100) / 100;
  totalPlanPaid = Math.round(totalPlanPaid * 100) / 100;
  totalDeductibleApplied = Math.round(totalDeductibleApplied * 100) / 100;
  const totalMemberResp = Math.round((totalAllowed - totalPlanPaid) * 100) / 100;

  // Determine overall claim status
  let status;
  if (overallDenied && totalPlanPaid === 0) {
    status = 'denied';
  } else if (overallDenied || totalPlanPaid < totalAllowed * 0.99) {
    status = 'partial';
  } else {
    status = 'approved';
  }

  if (totalDeductibleApplied > 0) {
    reasons.unshift(`$${totalDeductibleApplied.toFixed(2)} applied to deductible.`);
  }
  if (reasons.length === 0) {
    const pct = Math.round((totalPlanPaid / (totalAllowed || 1)) * 100);
    reasons.push(`Plan paid ${pct}% of allowed amount.`);
  }

  return {
    allowed_amount: totalAllowed,
    plan_paid: totalPlanPaid,
    member_responsibility: totalMemberResp,
    deductible_applied: totalDeductibleApplied,
    adjudication_reason: reasons.join(' '),
    status,
    line_item_results: lineItemResults,
  };
};

/**
 * Returns the number of full months between two dates.
 */
const monthDiff = (from, to) => {
  const years = to.getFullYear() - from.getFullYear();
  const months = to.getMonth() - from.getMonth();
  const days = to.getDate() - from.getDate();
  return years * 12 + months + (days < 0 ? -1 : 0);
};

module.exports = { calculateClaimAdjudication, monthDiff };
