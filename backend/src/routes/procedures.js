'use strict';

/**
 * GET /api/v1/procedures/price-check?zip=XXXXX
 *
 * Returns geographically adjusted dental procedure pricing for the given ZIP code.
 * Base prices are national median 50th-percentile UCR rates.
 * Multipliers are derived from CMS Geographic Practice Cost Index (GPCI) data,
 * simplified to state level (national average = 1.0).
 */

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');

// ─── Geographic cost multipliers by state ───────────────────────────────────
// Source: CMS GPCI + FAIR Health regional benchmarks, national avg = 1.0
const STATE_MULTIPLIERS = {
  AK: 1.18, AL: 0.88, AR: 0.83, AZ: 0.95, CA: 1.28, CO: 1.08, CT: 1.18,
  DC: 1.32, DE: 1.10, FL: 0.98, GA: 0.93, HI: 1.22, IA: 0.87, ID: 0.88,
  IL: 1.12, IN: 0.90, KS: 0.88, KY: 0.88, LA: 0.91, MA: 1.22, MD: 1.15,
  ME: 0.90, MI: 0.97, MN: 1.02, MO: 0.93, MS: 0.82, MT: 0.86, NC: 0.88,
  ND: 0.85, NE: 0.88, NH: 1.05, NJ: 1.25, NM: 0.89, NV: 1.05, NY: 1.22,
  OH: 0.93, OK: 0.87, OR: 1.05, PA: 1.05, PR: 0.72, RI: 1.12, SC: 0.88,
  SD: 0.85, TN: 0.88, TX: 0.95, UT: 0.93, VA: 1.08, VI: 0.75, VT: 1.00,
  WA: 1.12, WI: 0.95, WV: 0.88, WY: 0.88,
};

// ─── Base procedure prices (national median 50th-percentile UCR) ─────────────
// withBase = low end of in-network range, withSpread = range width, withoutBase = out-of-network
const BASE_PROCEDURES = [
  {
    id: 1, cdt: 'D0120', name: 'Oral Eval', category: 'Preventive',
    withBase: 38, withSpread: 22, withoutBase: 135,
    coverage: 100, deductibleApplies: false,
    description: 'A routine periodic oral evaluation to check your overall dental health.',
  },
  {
    id: 2, cdt: 'D0274', name: 'X-Rays', category: 'Preventive',
    withBase: 42, withSpread: 24, withoutBase: 105,
    coverage: 100, deductibleApplies: false,
    description: 'Bitewing X-rays to detect cavities and check bone levels between teeth.',
  },
  {
    id: 3, cdt: 'D1110', name: 'Cleaning', category: 'Preventive',
    withBase: 62, withSpread: 35, withoutBase: 160,
    coverage: 100, deductibleApplies: false,
    description: 'Professional prophylaxis (cleaning) to remove plaque and tartar.',
  },
  {
    id: 4, cdt: 'D2392', name: 'Fillings', category: 'Basic',
    withBase: 140, withSpread: 91, withoutBase: 390,
    coverage: 80, deductibleApplies: true,
    description: 'Composite resin (tooth-colored) filling to restore a decayed tooth.',
  },
  {
    id: 5, cdt: 'D2750', name: 'Crown', category: 'Major',
    withBase: 662, withSpread: 433, withoutBase: 1821,
    coverage: 50, deductibleApplies: true,
    description: 'A porcelain crown to cap and protect a damaged or weakened tooth.',
  },
  {
    id: 6, cdt: 'D3330', name: 'Root Canal', category: 'Major',
    withBase: 682, withSpread: 445, withoutBase: 2195,
    coverage: 50, deductibleApplies: true,
    description: 'Endodontic treatment to remove infected pulp from a molar tooth.',
  },
  {
    id: 7, cdt: 'D4341', name: 'Scaling', category: 'Periodontics',
    withBase: 148, withSpread: 97, withoutBase: 400,
    coverage: 80, deductibleApplies: true,
    description: 'Scaling and root planing (deep cleaning) per quadrant for gum disease.',
  },
  {
    id: 8, cdt: 'D7210', name: 'Extraction', category: 'Oral Surgery',
    withBase: 179, withSpread: 117, withoutBase: 550,
    coverage: 80, deductibleApplies: true,
    description: 'Surgical removal of a tooth that cannot be saved.',
  },
  {
    id: 9, cdt: 'D1120', name: 'Child Cleaning', category: 'Preventive',
    withBase: 45, withSpread: 27, withoutBase: 120,
    coverage: 100, deductibleApplies: false,
    description: 'Prophylaxis cleaning for patients under 14 years old.',
  },
  {
    id: 10, cdt: 'D7240', name: 'Wisdom Tooth Removal', category: 'Oral Surgery',
    withBase: 280, withSpread: 185, withoutBase: 850,
    coverage: 50, deductibleApplies: true,
    description: 'Surgical removal of a completely impacted wisdom tooth.',
  },
  {
    id: 11, cdt: 'D8080', name: 'Braces (child)', category: 'Orthodontics',
    withBase: 3200, withSpread: 1600, withoutBase: 5200,
    coverage: 0, deductibleApplies: false,
    description: 'Comprehensive orthodontic treatment for patients under 18.',
  },
  {
    id: 12, cdt: 'D8090', name: 'Braces (adult)', category: 'Orthodontics',
    withBase: 3800, withSpread: 1700, withoutBase: 6000,
    coverage: 0, deductibleApplies: false,
    description: 'Comprehensive orthodontic treatment for adult patients.',
  },
];

// ─── ZIP → state lookup (first-3-digit prefix ranges) ───────────────────────
function zipToState(zip) {
  const n = parseInt(zip.substring(0, 3), 10);

  if (n >= 6 && n <= 9) return 'PR';
  if (n >= 10 && n <= 27) return 'MA';
  if (n >= 28 && n <= 29) return 'RI';
  if (n >= 30 && n <= 38) return 'NH';
  if (n >= 39 && n <= 49) return 'ME';
  if (n >= 50 && n <= 59) return 'VT';
  if (n >= 60 && n <= 69) return 'CT';
  if (n >= 70 && n <= 89) return 'NJ';
  if (n >= 100 && n <= 149) return 'NY';
  if (n >= 150 && n <= 196) return 'PA';
  if (n >= 197 && n <= 199) return 'DE';
  if (n >= 200 && n <= 205) return 'DC';
  if (n >= 206 && n <= 219) return 'MD';
  if (n >= 220 && n <= 246) return 'VA';
  if (n >= 247 && n <= 268) return 'WV';
  if (n >= 270 && n <= 289) return 'NC';
  if (n >= 290 && n <= 299) return 'SC';
  if ((n >= 300 && n <= 319) || n === 398 || n === 399) return 'GA';
  if ((n >= 320 && n <= 347) || n === 349) return 'FL';
  if ((n >= 350 && n <= 352) || (n >= 354 && n <= 369)) return 'AL';
  if (n >= 370 && n <= 385) return 'TN';
  if (n >= 386 && n <= 397) return 'MS';
  if (n >= 400 && n <= 427) return 'KY';
  if (n >= 430 && n <= 458) return 'OH';
  if (n >= 460 && n <= 479) return 'IN';
  if (n >= 480 && n <= 499) return 'MI';
  if (n >= 500 && n <= 528) return 'IA';
  if (n >= 530 && n <= 549) return 'WI';
  if (n >= 550 && n <= 567) return 'MN';
  if (n >= 570 && n <= 577) return 'SD';
  if (n >= 580 && n <= 588) return 'ND';
  if (n >= 590 && n <= 599) return 'MT';
  if (n >= 600 && n <= 629) return 'IL';
  if (n >= 630 && n <= 658) return 'MO';
  if (n >= 660 && n <= 679) return 'KS';
  if (n >= 680 && n <= 693) return 'NE';
  if (n >= 700 && n <= 714) return 'LA';
  if (n >= 716 && n <= 729) return 'AR';
  if (n >= 730 && n <= 749) return 'OK';
  if (n >= 750 && n <= 799) return 'TX';
  if (n >= 800 && n <= 816) return 'CO';
  if (n >= 820 && n <= 831) return 'WY';
  if (n >= 832 && n <= 838) return 'ID';
  if (n >= 840 && n <= 847) return 'UT';
  if (n >= 850 && n <= 865) return 'AZ';
  if (n >= 870 && n <= 884) return 'NM';
  if (n >= 889 && n <= 898) return 'NV';
  if (n >= 900 && n <= 961) return 'CA';
  if (n >= 967 && n <= 968) return 'HI';
  if (n >= 970 && n <= 979) return 'OR';
  if (n >= 980 && n <= 994) return 'WA';
  if (n >= 995 && n <= 999) return 'AK';

  return null; // unknown
}

// ─── Route ───────────────────────────────────────────────────────────────────
router.get('/price-check', authenticateToken, (req, res) => {
  const { zip } = req.query;

  if (!zip || !/^\d{5}$/.test(zip)) {
    return res.status(400).json({ success: false, error: 'A valid 5-digit ZIP code is required.' });
  }

  const state = zipToState(zip);
  const multiplier = (state && STATE_MULTIPLIERS[state]) ? STATE_MULTIPLIERS[state] : 1.0;

  const procedures = BASE_PROCEDURES.map(({ withBase, withSpread, withoutBase, ...p }) => ({
    ...p,
    withLow: Math.round(withBase * multiplier),
    withHigh: Math.round((withBase + withSpread) * multiplier),
    without: Math.round(withoutBase * multiplier),
  }));

  res.json({
    success: true,
    zip,
    state: state || 'US',
    multiplier,
    procedures,
  });
});

module.exports = router;
