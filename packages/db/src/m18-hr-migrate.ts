import { db } from "./client";
import { sql } from "drizzle-orm";

async function runM18Migration() {
  console.log("🚀 Running Milestone 18 HR & Payroll Database Migration...");

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS hr_departments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      department_name TEXT NOT NULL,
      code VARCHAR(50) NOT NULL,
      description TEXT,
      head_of_department_id UUID REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_hr_dept_school_code ON hr_departments(school_id, code);

    CREATE TABLE IF NOT EXISTS hr_positions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      department_id UUID NOT NULL REFERENCES hr_departments(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      grade_level VARCHAR(50),
      min_salary DOUBLE PRECISION DEFAULT 0,
      max_salary DOUBLE PRECISION DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_hr_pos_school_dept ON hr_positions(school_id, department_id);

    CREATE TABLE IF NOT EXISTS hr_employees (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      user_id UUID REFERENCES users(id) ON DELETE SET NULL,
      employee_number VARCHAR(50) NOT NULL,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      middle_name TEXT,
      gender VARCHAR(20),
      date_of_birth TIMESTAMPTZ,
      phone VARCHAR(30) NOT NULL,
      email VARCHAR(255),
      address TEXT,
      department_id UUID REFERENCES hr_departments(id) ON DELETE SET NULL,
      position_id UUID REFERENCES hr_positions(id) ON DELETE SET NULL,
      employment_type VARCHAR(30) NOT NULL DEFAULT 'full_time',
      employment_status VARCHAR(30) NOT NULL DEFAULT 'active',
      hire_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      exit_date TIMESTAMPTZ,
      bank_name TEXT,
      account_number VARCHAR(50),
      tax_id_number VARCHAR(50),
      pension_pin VARCHAR(50),
      pension_pfa_name TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_hr_emp_school_num ON hr_employees(school_id, employee_number);
    CREATE INDEX IF NOT EXISTS idx_hr_emp_school_status ON hr_employees(school_id, employment_status);

    CREATE TABLE IF NOT EXISTS hr_salary_structures (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      grade_level VARCHAR(50),
      basic_salary DOUBLE PRECISION NOT NULL DEFAULT 0,
      tax_deduction_rate DOUBLE PRECISION NOT NULL DEFAULT 7.5,
      pension_deduction_rate DOUBLE PRECISION NOT NULL DEFAULT 8.0,
      status VARCHAR(20) NOT NULL DEFAULT 'active',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_hr_sal_struct_school ON hr_salary_structures(school_id, status);

    CREATE TABLE IF NOT EXISTS hr_allowances (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      salary_structure_id UUID NOT NULL REFERENCES hr_salary_structures(id) ON DELETE CASCADE,
      allowance_type VARCHAR(50) NOT NULL,
      amount DOUBLE PRECISION NOT NULL DEFAULT 0,
      is_taxable BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_hr_allowance_struct ON hr_allowances(salary_structure_id);

    CREATE TABLE IF NOT EXISTS hr_salary_history (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      employee_id UUID NOT NULL REFERENCES hr_employees(id) ON DELETE CASCADE,
      old_basic_salary DOUBLE PRECISION NOT NULL DEFAULT 0,
      new_basic_salary DOUBLE PRECISION NOT NULL DEFAULT 0,
      effective_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      changed_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
      reason TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_hr_sal_hist_emp ON hr_salary_history(employee_id);

    CREATE TABLE IF NOT EXISTS hr_employee_documents (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      employee_id UUID NOT NULL REFERENCES hr_employees(id) ON DELETE CASCADE,
      document_type VARCHAR(50) NOT NULL,
      title TEXT NOT NULL,
      file_url TEXT NOT NULL,
      file_size INTEGER,
      mime_type VARCHAR(100),
      uploaded_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_hr_emp_docs_emp ON hr_employee_documents(employee_id);

    CREATE TABLE IF NOT EXISTS hr_leave_balances (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      employee_id UUID NOT NULL REFERENCES hr_employees(id) ON DELETE CASCADE,
      leave_type VARCHAR(50) NOT NULL,
      year INTEGER NOT NULL DEFAULT 2026,
      entitled_days INTEGER NOT NULL DEFAULT 30,
      taken_days INTEGER NOT NULL DEFAULT 0,
      remaining_days INTEGER NOT NULL DEFAULT 30,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_hr_leave_bal_emp_type_year ON hr_leave_balances(employee_id, leave_type, year);

    CREATE TABLE IF NOT EXISTS hr_leave_requests (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      employee_id UUID NOT NULL REFERENCES hr_employees(id) ON DELETE CASCADE,
      leave_type VARCHAR(50) NOT NULL,
      start_date TIMESTAMPTZ NOT NULL,
      end_date TIMESTAMPTZ NOT NULL,
      total_days INTEGER NOT NULL DEFAULT 1,
      reason TEXT NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'Pending',
      reviewed_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
      reviewed_at TIMESTAMPTZ,
      approved_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
      approved_at TIMESTAMPTZ,
      remarks TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_hr_leave_req_school_status ON hr_leave_requests(school_id, status);

    CREATE TABLE IF NOT EXISTS hr_payroll_runs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      pay_period_month INTEGER NOT NULL,
      pay_period_year INTEGER NOT NULL,
      run_title TEXT NOT NULL,
      total_gross_salary DOUBLE PRECISION NOT NULL DEFAULT 0,
      total_deductions DOUBLE PRECISION NOT NULL DEFAULT 0,
      total_net_salary DOUBLE PRECISION NOT NULL DEFAULT 0,
      status VARCHAR(20) NOT NULL DEFAULT 'Draft',
      processed_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
      approved_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
      paid_at TIMESTAMPTZ,
      locked_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_hr_payroll_run_period ON hr_payroll_runs(school_id, pay_period_month, pay_period_year);

    CREATE TABLE IF NOT EXISTS hr_payslips (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      payroll_run_id UUID NOT NULL REFERENCES hr_payroll_runs(id) ON DELETE CASCADE,
      employee_id UUID NOT NULL REFERENCES hr_employees(id) ON DELETE CASCADE,
      basic_salary DOUBLE PRECISION NOT NULL DEFAULT 0,
      total_allowances DOUBLE PRECISION NOT NULL DEFAULT 0,
      gross_salary DOUBLE PRECISION NOT NULL DEFAULT 0,
      tax_deduction DOUBLE PRECISION NOT NULL DEFAULT 0,
      pension_deduction DOUBLE PRECISION NOT NULL DEFAULT 0,
      attendance_deductions DOUBLE PRECISION NOT NULL DEFAULT 0,
      other_deductions DOUBLE PRECISION NOT NULL DEFAULT 0,
      total_deductions DOUBLE PRECISION NOT NULL DEFAULT 0,
      net_salary DOUBLE PRECISION NOT NULL DEFAULT 0,
      payment_status VARCHAR(20) NOT NULL DEFAULT 'Unpaid',
      payment_date TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_hr_payslip_run_emp ON hr_payslips(payroll_run_id, employee_id);

    CREATE TABLE IF NOT EXISTS hr_payroll_items (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      payslip_id UUID NOT NULL REFERENCES hr_payslips(id) ON DELETE CASCADE,
      item_type VARCHAR(30) NOT NULL,
      item_label TEXT NOT NULL,
      amount DOUBLE PRECISION NOT NULL DEFAULT 0,
      is_taxable BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_hr_pay_items_payslip ON hr_payroll_items(payslip_id);

    CREATE TABLE IF NOT EXISTS hr_audit_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      performed_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
      action VARCHAR(50) NOT NULL,
      employee_id UUID REFERENCES hr_employees(id) ON DELETE SET NULL,
      details TEXT NOT NULL,
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_hr_audit_school_date ON hr_audit_logs(school_id, created_at);
  `);

  console.log("✅ Milestone 18 HR & Payroll Database Migration Completed Successfully!");
}

runM18Migration().catch((e) => {
  console.error("❌ Migration failed:", e);
  process.exit(1);
});
