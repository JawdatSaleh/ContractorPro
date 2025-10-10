-- Prisma migration placeholder implementing core schema and view
CREATE TABLE IF NOT EXISTS "User" (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  phone TEXT UNIQUE,
  "passwordHash" TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  "lastLoginAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "Role" (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  "nameAr" TEXT NOT NULL,
  description TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "Permission" (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  "nameAr" TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS "UserRole" (
  "userId" TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  "roleId" TEXT NOT NULL REFERENCES "Role"(id) ON DELETE CASCADE,
  PRIMARY KEY ("userId", "roleId")
);

CREATE TABLE IF NOT EXISTS "RolePermission" (
  "roleId" TEXT NOT NULL REFERENCES "Role"(id) ON DELETE CASCADE,
  "permissionId" TEXT NOT NULL REFERENCES "Permission"(id) ON DELETE CASCADE,
  PRIMARY KEY ("roleId", "permissionId")
);

CREATE TABLE IF NOT EXISTS "Department" (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "nameAr" TEXT NOT NULL,
  "costCenterCode" TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS "Project" (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  "nameAr" TEXT NOT NULL,
  "costCenterCode" TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS "Project_cost_center_idx" ON "Project"("costCenterCode");

CREATE TABLE IF NOT EXISTS "Employee" (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" TEXT UNIQUE,
  code TEXT NOT NULL UNIQUE,
  "fullName" TEXT NOT NULL,
  "nationalId" TEXT,
  "hireDate" TIMESTAMPTZ,
  "jobTitle" TEXT,
  "departmentId" TEXT REFERENCES "Department"(id),
  "projectId" TEXT REFERENCES "Project"(id),
  "managerId" TEXT REFERENCES "Employee"(id),
  status TEXT NOT NULL DEFAULT 'active',
  grade TEXT,
  "hourlyRate" NUMERIC(12,2),
  "monthlyBasic" NUMERIC(12,2),
  "allowancesJson" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "bankIban" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "Employee_department_idx" ON "Employee"("departmentId");
CREATE INDEX IF NOT EXISTS "Employee_project_idx" ON "Employee"("projectId");

CREATE TABLE IF NOT EXISTS "Contract" (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "employeeId" TEXT NOT NULL REFERENCES "Employee"(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  "startDate" TIMESTAMPTZ NOT NULL,
  "endDate" TIMESTAMPTZ,
  "probationEnd" TIMESTAMPTZ,
  "basicSalary" NUMERIC(12,2) NOT NULL,
  "allowancesJson" JSONB NOT NULL DEFAULT '{}'::jsonb,
  currency TEXT NOT NULL,
  "visibilityScope" TEXT NOT NULL DEFAULT 'restricted',
  "signedFileUrl" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "Attendance" (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "employeeId" TEXT NOT NULL REFERENCES "Employee"(id) ON DELETE CASCADE,
  day DATE NOT NULL,
  "checkIn" TIMESTAMPTZ,
  "checkOut" TIMESTAMPTZ,
  "shiftCode" TEXT,
  "overtimeMinutes" INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'present'
);
CREATE INDEX IF NOT EXISTS "Attendance_employee_idx" ON "Attendance"("employeeId");
CREATE INDEX IF NOT EXISTS "Attendance_day_idx" ON "Attendance"(day);

CREATE TABLE IF NOT EXISTS "Leave" (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "employeeId" TEXT NOT NULL REFERENCES "Employee"(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  "startDate" TIMESTAMPTZ NOT NULL,
  "endDate" TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  "approvedBy" TEXT REFERENCES "User"(id),
  notes TEXT
);
CREATE INDEX IF NOT EXISTS "Leave_employee_idx" ON "Leave"("employeeId");

CREATE TABLE IF NOT EXISTS "PayrollBatch" (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  "postedJournalId" TEXT REFERENCES "Journal"(id),
  "createdBy" TEXT REFERENCES "User"(id),
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "PayrollBatch_period_idx" ON "PayrollBatch"(month, year);

CREATE TABLE IF NOT EXISTS "Journal" (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS "PayrollItem" (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "batchId" TEXT NOT NULL REFERENCES "PayrollBatch"(id) ON DELETE CASCADE,
  "employeeId" TEXT NOT NULL REFERENCES "Employee"(id),
  "earningsJson" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "deductionsJson" JSONB NOT NULL DEFAULT '{}'::jsonb,
  gross NUMERIC(12,2) NOT NULL,
  net NUMERIC(12,2) NOT NULL,
  "loanDeduction" NUMERIC(12,2) NOT NULL DEFAULT 0,
  "advanceDeduction" NUMERIC(12,2) NOT NULL DEFAULT 0,
  "costCenter" TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS "PayrollItem_employee_idx" ON "PayrollItem"("employeeId");
CREATE INDEX IF NOT EXISTS "PayrollItem_cost_idx" ON "PayrollItem"("costCenter");

CREATE TABLE IF NOT EXISTS "JournalEntry" (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "journalId" TEXT NOT NULL REFERENCES "Journal"(id) ON DELETE CASCADE,
  "accountCode" TEXT NOT NULL,
  debit NUMERIC(12,2) NOT NULL DEFAULT 0,
  credit NUMERIC(12,2) NOT NULL DEFAULT 0,
  "costCenter" TEXT,
  ref TEXT
);
CREATE INDEX IF NOT EXISTS "JournalEntry_account_idx" ON "JournalEntry"("accountCode");
CREATE INDEX IF NOT EXISTS "JournalEntry_cost_idx" ON "JournalEntry"("costCenter");

CREATE TABLE IF NOT EXISTS "Advance" (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "employeeId" TEXT NOT NULL REFERENCES "Employee"(id) ON DELETE CASCADE,
  "requestDate" DATE NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  currency TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  "approvedBy" TEXT REFERENCES "User"(id),
  "repaymentMonths" INTEGER,
  reason TEXT
);
CREATE INDEX IF NOT EXISTS "Advance_employee_idx" ON "Advance"("employeeId");

CREATE TABLE IF NOT EXISTS "Loan" (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "employeeId" TEXT NOT NULL REFERENCES "Employee"(id) ON DELETE CASCADE,
  principal NUMERIC(12,2) NOT NULL,
  remaining NUMERIC(12,2) NOT NULL,
  installment NUMERIC(12,2) NOT NULL,
  "startMonth" TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active'
);
CREATE INDEX IF NOT EXISTS "Loan_employee_idx" ON "Loan"("employeeId");

CREATE TABLE IF NOT EXISTS "Expense" (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "projectId" TEXT REFERENCES "Project"(id),
  "employeeId" TEXT REFERENCES "Employee"(id),
  category TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  currency TEXT NOT NULL,
  date DATE NOT NULL,
  "costCenter" TEXT NOT NULL,
  reference TEXT,
  "approvedBy" TEXT REFERENCES "User"(id)
);
CREATE INDEX IF NOT EXISTS "Expense_project_idx" ON "Expense"("projectId");
CREATE INDEX IF NOT EXISTS "Expense_employee_idx" ON "Expense"("employeeId");
CREATE INDEX IF NOT EXISTS "Expense_cost_idx" ON "Expense"("costCenter");

CREATE TABLE IF NOT EXISTS "AuditLog" (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "actorUserId" TEXT REFERENCES "User"(id),
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  "beforeJson" JSONB,
  "afterJson" JSONB,
  at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE VIEW v_employee_public AS
SELECT e.id,
       e."fullName" AS "fullName",
       e."jobTitle" AS "jobTitle",
       d."nameAr" AS department,
       p."nameAr" AS project
FROM "Employee" e
LEFT JOIN "Department" d ON d.id = e."departmentId"
LEFT JOIN "Project" p ON p.id = e."projectId";
