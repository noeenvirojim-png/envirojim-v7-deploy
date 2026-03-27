/**
 * VB750 acceptance test cases — HAMMEL VB750 DK.
 * Each case defines: problem, expected subsystem, expect_official, expect_parts, expect_order_safety.
 */

export interface AcceptanceCase {
  id: string;
  problem: string;
  normalized: string;
  expected_subsystem_hint: string;
  expect_official_answer: boolean;
  expect_parts_candidate: boolean;
  expect_order_safety_not: 'not_safe_to_order' | null;
  expect_evidence_non_empty: boolean;
  expect_inferred_has_disclaimer: boolean;
}

export const VB750_CASES: AcceptanceCase[] = [
  {
    id: 'shafts_not_turning',
    problem: 'shafts do not turn',
    normalized: 'shafts do not turn',
    expected_subsystem_hint: 'shredding_unit',
    expect_official_answer: true,
    expect_parts_candidate: true,
    expect_order_safety_not: null,
    expect_evidence_non_empty: true,
    expect_inferred_has_disclaimer: true,
  },
  {
    id: 'shafts_too_slow',
    problem: 'shafts too slow',
    normalized: 'shafts too slow',
    expected_subsystem_hint: 'shredding_unit',
    expect_official_answer: true,
    expect_parts_candidate: true,
    expect_order_safety_not: null,
    expect_evidence_non_empty: true,
    expect_inferred_has_disclaimer: true,
  },
  {
    id: 'hydraulic_oil_temp_high',
    problem: 'hydraulic oil temperature too high',
    normalized: 'hydraulic oil temperature too high',
    expected_subsystem_hint: 'hydraulics',
    expect_official_answer: true,
    expect_parts_candidate: true,
    expect_order_safety_not: null,
    expect_evidence_non_empty: true,
    expect_inferred_has_disclaimer: true,
  },
  {
    id: 'conveyor_not_moving',
    problem: 'conveyor does not move',
    normalized: 'conveyor does not move',
    expected_subsystem_hint: 'conveyor',
    expect_official_answer: true,
    expect_parts_candidate: true,
    expect_order_safety_not: null,
    expect_evidence_non_empty: true,
    expect_inferred_has_disclaimer: true,
  },
  {
    id: 'automatic_mode_impossible',
    problem: 'automatic mode impossible',
    normalized: 'automatic mode impossible',
    expected_subsystem_hint: 'electrical_control',
    expect_official_answer: true,
    expect_parts_candidate: false,
    expect_order_safety_not: null,
    expect_evidence_non_empty: true,
    expect_inferred_has_disclaimer: true,
  },
  {
    id: 'engine_overheats',
    problem: 'engine overheats',
    normalized: 'engine overheats',
    expected_subsystem_hint: 'engine',
    expect_official_answer: true,
    expect_parts_candidate: true,
    expect_order_safety_not: null,
    expect_evidence_non_empty: true,
    expect_inferred_has_disclaimer: true,
  },
  {
    id: 'radio_remote_impossible',
    problem: 'radio remote control impossible',
    normalized: 'radio remote control impossible',
    expected_subsystem_hint: 'remote_control',
    expect_official_answer: true,
    expect_parts_candidate: false,
    expect_order_safety_not: null,
    expect_evidence_non_empty: true,
    expect_inferred_has_disclaimer: true,
  },
];

export const VB750_FAMILY_PARAMS = {
  family_code: 'vb750_dk',
  manufacturer: 'HAMMEL',
  brand: 'HAMMEL',
  model: 'VB750 DK',
};
