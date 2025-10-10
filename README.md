# ContractorPro Employee Management System

ContractorPro is a monorepo that implements an employee management backend and administrative web UI with deep integration across HR, finance, and IAM modules. The project is ready to run locally using Docker Compose or pnpm workspaces.

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm 8+
- Docker and Docker Compose

### Environment Variables

Create a `.env` file at `apps/api/.env` (or use Docker environment variables) with the following values:

```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/contractorpro
JWT_SECRET=supersecret
PORT=3000
BASE_URL=http://localhost:3000
```

Additional variables can be added for third-party storage providers when integrating file uploads.

### Installation

```
pnpm install
pnpm --filter api install
pnpm --filter web install
```

### Database

Run database migrations and seed initial RBAC data:

```
pnpm --filter api db:migrate
pnpm --filter api db:seed
```

### Development Servers

To run all services in development mode:

```
pnpm -r dev
```

Alternatively, use Docker Compose to launch PostgreSQL, pgAdmin, and the API service:

```
docker compose up --build
```

### Admin Credentials

The seeder creates an initial System Admin user:

- Email: `admin@contractorpro.local`
- Password: `Admin#123`

### Testing

```
pnpm --filter api test
```

## Project Structure

```
apps/
  api/       # Fastify + Prisma backend
  web/       # React + Vite + Tailwind frontend
```

### أين أجد النظام الآن؟

- **واجهة البرمجة الخلفية (API)**: موجودة داخل المسار `apps/api`. يمكنك تشغيلها محليًا عبر `pnpm --filter api dev` أو من خلال خدمة Docker `api` في ملف `docker-compose.yml`.
- **واجهة الإدارة (الويب)**: الكود الكامل لواجهة React موجود داخل `apps/web`. شغّلها بواسطة `pnpm --filter web dev` وسيتم تقديم لوحة التحكم على `http://localhost:5173`.
- **قواعد البيانات والمخططات**: مخطط Prisma، ملفات الهجرة، وسكربت التهيئة الأولية موجودة في `apps/api/prisma/`، وتشمل إنشاء الأدوار والصلاحيات والمستخدم الإداري.
- **وثائق التشغيل**: يحتوي هذا الملف (`README.md`) على جميع خطوات الإعداد، كما يمكن الرجوع إلى `apps/api/src/openapi.yaml` لرؤية توصيف REST الكامل.

## Features

- JWT authentication with role- and permission-based access controls.
- HR management: employees, contracts, attendance, leaves.
- Finance management: payroll batches, postings, advances, loans, journals.
- IAM management: users, roles, permissions.
- Tailwind-based RTL-ready administrative interface.

## Deployment

Adjust the Docker Compose file or provide your own infrastructure scripts to deploy the API and PostgreSQL. The web application can be built with `pnpm --filter web build` and served via a static hosting provider.

---

المواصفة الأصلية (للإنشاء — لا تُعدل)

نظام إدارة الموظفين – مواصفة شاملة متكاملة (متصلة بالمالية والعقود)

> الهدف: بناء قسم "إدارة الموظفين" احترافي لموقعك يشبه أنظمة إدارة المشاريع والمحاسبة العالمية، مع ربط كامل بالمالية والعقود والسلف، وإدارة أدوار وصلاحيات دقيقة (RBAC) بحيث يرى كل مستخدم ما يخصه فقط.



---

1) نظرة معمارية (Architecture Overview)

العمود التقني المقترح

الواجهة: React + TypeScript + TailwindCSS (أو Vue).

الخلفية: Node.js (Express/Fastify) + TypeScript.

قاعدة البيانات: PostgreSQL.

ORM: Prisma.

الهوية والصلاحيات: JWT + RBAC (مع دعم ABAC لاحقًا).

الملفات والمرفقات: S3-compatible storage (أو Cloudinary).

المراقبة والتدقيق: Audit log + soft delete + versioning أساسي.


خدمات فرعية

خدمة الموارد البشرية HR (الموظفون، العقود، الرواتب، الحضور، الإجازات، الأداء).

خدمة المالية Finance (حسابات الأستاذ العام، القيود، المصاريف/الإيرادات، السلف، المستحقات).

خدمة الهوية IAM (المستخدمون، الأدوار، الصلاحيات، سياسات الوصول).


التكاملات

تكامل HR ↔ Finance: قيود رواتب، سلف، مستحقات نهاية خدمة، مخصصات.

تكامل HR ↔ Projects: إسناد الموظفين للمشاريع وتكلفة الساعة ومراكز التكلفة.



---

2) نموذج الصلاحيات (RBAC)

الأدوار الافتراضية

مدير النظام (System Admin): كل الصلاحيات.

المدير التنفيذي (CEO/Executive): رؤية شاملة للرواتب والتكاليف والعقود.

المدير المالي (CFO/Finance Manager): الوصول للرواتب، السلف، قيود الترحيل، تقارير التكلفة.

المحاسب (Accountant): إدخال/مراجعة قيود الرواتب والسلف، تقارير مالية مرتبطة بالموظفين.

مدير الموارد البشرية (HR Manager): إدارة ملفات الموظفين والعقود والحضور والإجازات والتقييمات.

مشرف الموقع/المراقب (Site Supervisor): مشاهدة الفريق المعين، الحضور اليومي، طلبات الإذن.

المهندس (Engineer): الاطلاع على سجلاته الذاتية الحضور/الإجازة/المرتب، دون قيمة العقد الشاملة.

موظف عادي (Employee): بوابة ذاتية (Self-Service).


مصفوفة الصلاحيات (مختصرة)

الكيان/العمليةAdminCEOCFOAccountantHR MgrSupervisorEngineerEmployee

الموظفون (قراءة)✓✓محدودمحدود✓محدودذاتيذاتي
الموظفون (إضافة/تعديل)✓———✓———
العقود (عرض القيمة)✓✓✓محدود✓ (بدون التكلفة الإجمالية)—إخفاء القيمة—
الرواتب (الحساب/الترحيل)✓✓✓✓اقتراح فقط—ذاتي (قسط/سلف)ذاتي
السلف (إنشاء/اعتماد)✓✓✓✓طلب فقططلب فقططلب ذاتيطلب ذاتي
الحضور (قراءة/اعتماد)✓✓——✓✓ (فرقته فقط)ذاتيذاتي
الأذونات والإجازات✓✓——✓توصيةذاتيذاتي
التقارير الحساسة (تكلفة إجمالية)✓✓✓محدود————


> ملاحظة: "محدود" تعني تقارير مجمعة بدون تفاصيل العقد/الراتب الفردية. ويمكن توسيعها بسياسات ABAC حسب مركز التكلفة أو المشروع.



---

3) مخطط قاعدة البيانات (ERD) – نصي

User(id, email, phone, password_hash, status, last_login_at)
Role(id, key, name_ar, description)
UserRole(user_id, role_id)
Permission(id, key, name_ar)
RolePermission(role_id, permission_id)

Employee(id, user_id, code, full_name, national_id, hire_date,
        job_title, department_id, project_id, manager_id, status, grade,
        hourly_rate, monthly_basic, allowances_json, bank_iban,
        created_at, updated_at)
Department(id, name_ar, cost_center_code)
Project(id, code, name_ar, cost_center_code)

Contract(id, employee_id, type, start_date, end_date, probation_end,
        basic_salary, allowances_json, currency, visibility_scope,
        signed_file_url, created_at)

Attendance(id, employee_id, day, check_in, check_out,
          shift_code, overtime_minutes, status)
Leave(id, employee_id, type, start_date, end_date, status, approved_by, notes)

PayrollBatch(id, month, year, status, posted_journal_id, created_by)
PayrollItem(id, batch_id, employee_id, earnings_json, deductions_json,
            gross, net, loan_deduction, advance_deduction, cost_center)

Advance(id, employee_id, request_date, amount, currency, status,
        approved_by, repayment_months, reason)
Loan(id, employee_id, principal, remaining, installment, start_month, status)

Expense(id, project_id, employee_id, category, amount, currency, date,
        cost_center, reference, approved_by)

Journal(id, date, description, status)
JournalEntry(id, journal_id, account_code, debit, credit, cost_center, ref)

AuditLog(id, actor_user_id, action, entity, entity_id, before_json, after_json, at)

فهارس أساسية

فهرسة employee_id, project_id, cost_center_code لربط سريع بالمالية.

فهرسة month/year في PayrollBatch وAttendance.day.



---

4) سياسات إخفاء الحقول الحساسة

في طبقة الخدمات (Service Layer) نطبّق مُرشّح عرض بناءً على الدور:

الحقول المخفية عن: المهندس/المراقب/الموظف: Contract.basic_salary, Contract.allowances_json, أي حقول تكلفة إجمالية.

للمحاسب: يُعرض المجمل دون تفاصيل العقد الفردية.


على مستوى SQL يمكن استخدام views مختلفة لكل فئة دور.


مثال View مختصر (PostgreSQL):

CREATE VIEW v_employee_public AS
SELECT e.id, e.full_name, e.job_title, d.name_ar AS department, p.name_ar AS project
FROM Employee e
LEFT JOIN Department d ON d.id = e.department_id
LEFT JOIN Project p ON p.id = e.project_id;


---

5) تدفقات رئيسية (Workflows)

أ) دورة العقد

1. HR ينشئ عقدًا → يرفع ملف PDF.


2. مدير النظام يحدد visibility_scope (من يرى القيم).


3. عند الاعتماد: تُسجل ملاحظة تدقيق في AuditLog.



ب) دورة السلف/القروض

1. الموظف يطلب سلفة (Self-Service) → إشعار للـ HR/CFO.


2. CFO يعتمد → إنشاء Loan/Advance وتحديد خطة السداد.


3. عند ترحيل الرواتب: تُخصم الأقساط تلقائيًا وتُنشأ قيود يومية بالربط مع مركز التكلفة.



ج) الحضور والإجازات

المراقب يعتمد حضور فريقه فقط.

HR يدير الاستثناءات.

الرواتب تقرأ الحضور لحساب بدل/خصم.


د) الرواتب (Payroll)

1. إنشاء دفعة رواتب PayrollBatch(month, year).


2. حساب المستحقات: الأساسي + البدلات − الخصومات − (قسط القرض/السلفة) + (ساعات إضافية).


3. ترحيل محاسبي: إنشاء Journal و JournalEntry حسب شجرة الحسابات ومراكز التكلفة.



---

6) واجهات برمجة التطبيقات (REST) – أمثلة

الهوية والصلاحيات

POST /api/auth/login
GET  /api/iam/users
POST /api/iam/roles
POST /api/iam/roles/{id}/permissions

الموظفون والعقود

GET  /api/employees?projectId=&departmentId=&q=
POST /api/employees
GET  /api/employees/{id}
PATCH/PUT /api/employees/{id}

POST /api/employees/{id}/contracts
GET  /api/employees/{id}/contracts (مع إخفاء الحقول حسب الدور)

الحضور والإجازات

POST /api/attendance/bulk
GET  /api/attendance?employeeId=&from=&to=
POST /api/leaves (طلب إجازة)
PATCH /api/leaves/{id}/approve

السلف والقروض

POST /api/advances (طلب سلفة)
PATCH /api/advances/{id}/approve
POST /api/loans
PATCH /api/loans/{id}/settle

الرواتب

POST /api/payroll/batches
POST /api/payroll/batches/{id}/calculate
POST /api/payroll/batches/{id}/post (ترحيل قيود)
GET  /api/payroll/batches/{id}/journal


---

7) نماذج أكواد مهمة

أ) حماية نقطة نهاية حسب الدور (Express + TS)

// middleware/requireRole.ts
export function requireRole(roles: string[]) {
  return (req, res, next) => {
    const user = req.user; // معرّف من طبقة المصادقة
    if (!user || !roles.some(r => user.roles.includes(r))) {
      return res.status(403).json({ message: 'ليس لديك صلاحية' });
    }
    next();
  };
}

ب) فلترة الحقول الحساسة (Contract Service)

function sanitizeContractForRole(contract: any, roleKeys: string[]): any {
  const canSeeMoney = roleKeys.some(r => ['admin','ceo','cfo'].includes(r));
  if (!canSeeMoney) {
    const { basic_salary, allowances_json, ...rest } = contract;
    return rest;
  }
  return contract;
}

ج) حساب قسط السلفة داخل الرواتب

function computeNet(pay: PayrollItem, loan?: Loan) {
  const loanDeduction = loan ? Math.min(loan.installment, loan.remaining) : 0;
  const gross = pay.gross; // الأساسي + البدلات − خصومات غير القرض
  const net = gross - loanDeduction;
  return { ...pay, loan_deduction: loanDeduction, net };
}

د) قيد يومية بسيط للرواتب (Finance Posting)

// مثال مبسط: صافي الرواتب من ح/مصروف الرواتب إلى ح/رواتب مستحقة
insertJournal(date, 'ترحيل رواتب شهرية', [
  { account: '5001', debit: totalSalaries, credit: 0, cost_center: 'HR' },
  { account: '2103', debit: 0, credit: totalSalaries, cost_center: 'HR' },
]);


---

8) الواجهة (UI) – الصفحات والمكونات

قائمة الموظفين: بحث، فلاتر (قسم، مشروع، حالة)، أعمدة قابلة للتخصيص.

ملف موظف: بيانات أساسية، عقد، مرفقات، تاريخ وظيفي، أداء، تاريخ رواتب.

العقود: إنشاء/تعديل، مرفقات، سياسة ظهور القيمة.

الحضور: تقويم + إدخال جماعي + اعتماد المشرف.

الإجازات: تقديم/اعتماد/تاريخ.

السلف والقروض: طلب/اعتماد/جدولة سداد/سجل.

الرواتب: دفعات شهرية، حساب، مراجعة، ترحيل، تقارير.

التقارير: تكلفة الموظف/المركز/المشروع، التزامات الرواتب، ملخص السلف.

إدارة الأدوار والصلاحيات: إنشاء أدوار، ربط صلاحيات، تعيينها للمستخدمين.



---

9) سياسات الأمن والامتثال

تشفير كلمات المرور (Argon2/BCrypt).

تدوير مفاتيح JWT وإضافة Refresh Tokens.

سجل تدقيق AuditLog لكل عملية حساسة.

Masking/Redaction للحقول الحساسة في الـ logs.

صلاحيات للملفات: لا يستطيع المستخدم تنزيل مرفقات العقود إلا بتصريح.



---

10) أداء وقابلية التوسع

فهارس مدروسة، إستعلامات مجمعة للتقارير.

Job Queue لحساب الرواتب وترحيل القيود.

Cache لتقارير القراءة الثقيلة.



---

11) خارطة طريق (Roadmap)

المرحلة 1: الموظفون + العقود + الحضور/الإجازات + RBAC أساسي.

المرحلة 2: الرواتب والسلف + تكامل القيود المحاسبية.

المرحلة 3: الأداء والتقييمات + مسارات موافقات متعددة (Workflow Engine).

المرحلة 4: تطبيق جوال للموظف (Self-Service).



---

12) نقاط تكامل مع قسم المالية

عند اعتماد PayrollBatch: إنشاء Journal تلقائي وربطه بمركز التكلفة لكل موظف/مشروع.

عند إنشاء سلفة/قرض: قيود تلقائية (سلفة مدينة/رواتب مستحقة) وتحديث الرصيد المتبقي.

تقارير موحدة: تكلفة مشروع = مصروفات مباشرة + رواتب محمّلة على المشروع حسب ساعات العمل.



---

13) عيّنة مخطط Prisma (مقتطف)

model Employee {
  id           String   @id @default(cuid())
  userId       String?  @unique
  code         String   @unique
  fullName     String
  jobTitle     String?
  departmentId String?
  projectId    String?
  hireDate     DateTime?
  monthlyBasic Decimal? @db.Decimal(12,2)
  hourlyRate   Decimal? @db.Decimal(12,2)
  bankIban     String?
  status       String   @default("active")
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}


---

14) ملاحظات تطبيقية

إخفاء قيمة العقد للمهندس/المراقب عبر DTO مخصص أو GraphQL field auth.

استخدام feature flags لتفعيل وحدات تدريجيًا.

بناء Seeder لإنشاء أدوار وصلاحيات أولية.



---

نفّذ جميع النقاط أعلاه بالكامل.
