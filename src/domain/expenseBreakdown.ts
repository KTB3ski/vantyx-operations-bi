import type { PeriodInput } from './types';

export type ExpenseBreakdownFieldKey =
  | 'payroll'
  | 'payrollTaxes'
  | 'employeeBenefits'
  | 'contractLabor'
  | 'roomsExpense'
  | 'foodBeverageExpense'
  | 'utilities'
  | 'repairsMaintenance'
  | 'supplies'
  | 'adminGeneral'
  | 'salesMarketing'
  | 'otherOperatingExpenses';

export interface ExpenseBreakdownField {
  key: ExpenseBreakdownFieldKey;
  label: string;
  helper: string;
}

export const EXPENSE_BREAKDOWN_FIELDS: ExpenseBreakdownField[] = [
  {
    key: 'payroll',
    label: 'Payroll / Wages',
    helper: 'Regular wages, salary, overtime, and scheduled labor.',
  },
  {
    key: 'payrollTaxes',
    label: 'Payroll Taxes',
    helper: 'Employer payroll tax burden tied to labor.',
  },
  {
    key: 'employeeBenefits',
    label: 'Benefits',
    helper: 'Benefits, insurance, PTO burden, and related labor costs.',
  },
  {
    key: 'contractLabor',
    label: 'Contract Labor',
    helper: 'Agency labor, temporary staffing, and outsourced shifts.',
  },
  {
    key: 'roomsExpense',
    label: 'Rooms Department',
    helper: 'Housekeeping, rooms supplies, laundry, and room operations.',
  },
  {
    key: 'foodBeverageExpense',
    label: 'Food & Beverage',
    helper: 'Food, beverage, banquet, outlet, and service costs.',
  },
  {
    key: 'utilities',
    label: 'Utilities',
    helper: 'Power, gas, water, waste, internet, and utility services.',
  },
  {
    key: 'repairsMaintenance',
    label: 'Repairs & Maintenance',
    helper: 'Property operations, repairs, maintenance, and service calls.',
  },
  {
    key: 'supplies',
    label: 'Operating Supplies',
    helper: 'General supplies that are not already included above.',
  },
  {
    key: 'adminGeneral',
    label: 'Admin & General',
    helper: 'Office, accounting, licenses, fees, and general overhead.',
  },
  {
    key: 'salesMarketing',
    label: 'Sales & Marketing',
    helper: 'Marketing, sales expenses, commissions, and promotions.',
  },
  {
    key: 'otherOperatingExpenses',
    label: 'Other Operating',
    helper: 'Anything else that belongs in the controllable expense total.',
  },
];

export const EXPENSE_BREAKDOWN_FIELD_KEYS = EXPENSE_BREAKDOWN_FIELDS.map(
  (field) => field.key,
);

export function createEmptyExpenseBreakdown(): Pick<
  PeriodInput,
  'expenseBreakdownEnabled' | ExpenseBreakdownFieldKey
> {
  return EXPENSE_BREAKDOWN_FIELD_KEYS.reduce(
    (breakdown, key) => ({ ...breakdown, [key]: 0 }),
    { expenseBreakdownEnabled: false } as Pick<
      PeriodInput,
      'expenseBreakdownEnabled' | ExpenseBreakdownFieldKey
    >,
  );
}

export function calculateExpenseBreakdownTotal(
  input: Pick<PeriodInput, ExpenseBreakdownFieldKey>,
) {
  return EXPENSE_BREAKDOWN_FIELD_KEYS.reduce(
    (total, key) => total + (input[key] || 0),
    0,
  );
}
