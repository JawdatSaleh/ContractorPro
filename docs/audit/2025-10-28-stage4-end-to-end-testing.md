# Stage 4 – أتمتة الاختبارات الشاملة (2025-10-28)

## 1. ملخص تنفيذي
- **تجهيز إطار Playwright ثنائي المتصفحات** (Chromium/Firefox) مع إعدادات تتبع تلقائي وإعادة استخدام واجهة برمجة التطبيقات للمصادقة، ما يمكّن من تشغيل اختبارات E2E على بيئات staging والمحلية بنفس التهيئة.【F:tests/playwright/playwright.config.ts†L1-L24】【F:tests/playwright/utils/auth.ts†L1-L29】
- **تغطية مسارات الدخول والموارد البشرية والمالية والتقارير** عبر ثلاث حزم اختبارات (`auth`, `employees`, `operations`) مع إبراز الفجوات الحرجة المكتشفة في المراحل السابقة (404 عند إنشاء الموظف، تعطل الملف المالي).【F:tests/playwright/specs/auth.spec.ts†L1-L19】【F:tests/playwright/specs/employees.spec.ts†L1-L48】【F:tests/playwright/specs/operations.spec.ts†L1-L74】
- **إتاحة تشغيل موحد للأتمتة** بإضافة سكربت `npm run test:e2e` وربط الاعتمادية على `@playwright/test` ضمن devDependencies مع تعليمات صريحة حول المتغيرات البيئية للمستخدمين والمصادقة.【F:package.json†L6-L18】【F:docs/audit/2025-10-28-stage4-end-to-end-testing.md†L37-L63】

## 2. منهجية الأتمتة
1. إعادة استخدام اعتماد المسؤول المزروع (`admin@contractorpro.local` / `Admin#123`) عبر استدعاء واجهة `/api/auth/login` ثم حقن رمز JWT في `localStorage` قبل تحميل واجهات React لضمان جلسة صالحة دون الاعتماد على واجهة الدخول القديمة.【F:tests/playwright/utils/auth.ts†L5-L29】【F:apps/web/src/store/useAuthStore.ts†L14-L59】
2. تقسيم السيناريوهات إلى ملفات متخصصة لتسهيل التوازي وإبراز الفشل المتوقع (HR) مقابل النجاح الحالي (الحضور، الإجازات، الرواتب، التقارير، النشاط).【F:tests/playwright/specs/employees.spec.ts†L7-L48】【F:tests/playwright/specs/operations.spec.ts†L7-L74】
3. توثيق نتائج الشبكة داخل الاختبارات نفسها (`waitForResponse`) لضمان التقاط حالات الخطأ 404 ومراقبة صحة الاستدعاءات الناجحة مع إثبات الاسترجاع بعد كل عملية مالية.【F:tests/playwright/specs/employees.spec.ts†L23-L48】【F:tests/playwright/specs/operations.spec.ts†L13-L64】

## 3. مصفوفة التغطية الآلية

| الحزمة | السيناريو | الحالة المتوقعة | الوضع الحالي |
|--------|-----------|-----------------|---------------|
| auth | تدفق تسجيل الدخول عبر الصفحة التراثية (`login.html`) | نجاح مع إعادة توجيه إلى `main_dashboard.html` | **ناجح** – يتم التحقق من النص وزمن إعادة التوجيه.【F:tests/playwright/specs/auth.spec.ts†L9-L19】 |
| employees | تصفية قائمة الموظفين | يجب أن تتحول معاملات `search` إلى `q` | **فشل معروف** – يبقى الوسيط `search` كما هو، ما يثبت فجوة العقد.【F:tests/playwright/specs/employees.spec.ts†L15-L34】【F:apps/api/src/common/validators.ts†L8-L17】 |
| employees | تحميل ملف موظف | يجب تحميل البيانات الأساسية حتى مع فشل الموارد المالية | **فشل حرج** – أول استدعاء فرعي (`/finance`) يعيد 404 ويظهر التنبيه للمستخدم.【F:tests/playwright/specs/employees.spec.ts†L36-L44】【F:apps/web/src/store/useEmployeeStore.ts†L71-L109】 |
| employees | إنشاء موظف جديد | إنشاء سجل والانتقال إلى التفاصيل | **فشل حرج** – الخادم يعيد 404 لعدم وجود `POST /api/employees`.【F:tests/playwright/specs/employees.spec.ts†L46-L48】【F:apps/api/src/hr/routes.ts†L20-L130】 |
| operations | استيراد الحضور | نجاح وتحديث الجدول | **ناجح** – الطلب `POST /api/attendance/bulk` يعود 200 مع إعادة تحميل الشبكة.【F:tests/playwright/specs/operations.spec.ts†L11-L24】 |
| operations | طلب إجازة واعتماده | نجاح مع تحديث الجدول | **ناجح** – كل من `POST /api/leaves` و`PATCH /approve` يعملان.【F:tests/playwright/specs/operations.spec.ts†L26-L45】 |
| operations | إنشاء/حساب/ترحيل الرواتب | نجاح متسلسل مع تحديث الحالة | **ناجح** – جميع الاستدعاءات الثلاثة تعود 200 وتحدث الواجهة.【F:tests/playwright/specs/operations.spec.ts†L47-L64】 |
| operations | تصدير نشاط CSV | تنزيل ملف في حال توفر بيانات | **مشروط** – يُضاف تعليق "pending-data" عندما يكون الزر معطلاً.【F:tests/playwright/specs/operations.spec.ts†L66-L74】 |
| operations | تقرير مراكز التكلفة | عرض جدول محسوب | **ناجح** – الرد `GET /api/reports/cost-centers` يعرض صفوفاً.【F:tests/playwright/specs/operations.spec.ts†L76-L83】 |

## 4. الثغرات المكتشفة أثناء الأتمتة
1. **عدم توافق معاملات التصفية (أولوية عالية)** – طلب Playwright يثبت إرسال `search` بينما الخادم ينتظر `q`، ما يحافظ على الفشل الموثّق في المرحلة الثالثة.【F:tests/playwright/specs/employees.spec.ts†L23-L34】【F:apps/api/src/common/validators.ts†L8-L17】
2. **فشل تجميع ملف الموظف (أولوية حرجة)** – الاستدعاءات الفرعية (`/finance`, `/advances`, `/loans`, `/expenses`) تواصل إعادة 404 وتمنع إكمال السيناريوهات اللاحقة (تحرير، إنشاء عقود).【F:tests/playwright/specs/employees.spec.ts†L36-L44】【F:apps/web/src/api/employees.ts†L45-L110】
3. **نقطة نهاية إنشاء الموظف مفقودة (أولوية حرجة)** – تأكيد أوتوماتيكي لخطأ 404 عند الضغط على "إنشاء الموظف"، ما يمنع أي توسع في القوى العاملة على النظام.【F:tests/playwright/specs/employees.spec.ts†L46-L48】【F:apps/api/src/hr/routes.ts†L20-L130】
4. **متطلب بيانات لسجل النشاط (أولوية متوسطة)** – الزر "تصدير CSV" يظل معطلاً في البيئات الفارغة؛ يلزم تهيئة seed أو تحميل بيانات قبل دمج الاختبارات في خط CI.【F:tests/playwright/specs/operations.spec.ts†L66-L74】【F:apps/web/src/features/activity/ActivityCenterPage.tsx†L93-L148】

## 5. تعليمات التشغيل والتكامل
1. ثبّت الاعتماديات: `pnpm add -D @playwright/test` أو `npm install -D @playwright/test` (يتطلب الوصول إلى سجل npm). في البيئات المقيدة، خزّن الحزمة محلياً ضمن Artifactory داخلي.
2. صدّر المتغيرات البيئية قبل التشغيل لضبط العناوين والاعتمادات:
   ```bash
   export PLAYWRIGHT_BASE_URL="https://staging.example.com"
   export PLAYWRIGHT_API_URL="https://staging.example.com"
   export PLAYWRIGHT_ADMIN_EMAIL="admin@contractorpro.local"
   export PLAYWRIGHT_ADMIN_PASSWORD="Admin#123"
   ```
3. شغّل الاختبارات محلياً أو في CI عبر:
   ```bash
   npm run test:e2e
   ```
   يدعم السكربت تخريج تقارير HTML (`playwright-report/index.html`) إضافةً إلى سجل القائمة الافتراضي.
4. لدمج الاختبارات في خط CI الحالي، أضف مرحلة بعد الاختبارات الوحدوية: `npm ci && npm run test:e2e -- --reporter=junit,list` مع رفع مخرجات JUnit إلى لوحة المراقبة.

## 6. توصيات للمراحل اللاحقة
1. **توفير نقاط النهاية المفقودة للموظف** قبل الانتقال إلى مرحلة الأمن/الأداء، ثم تحديث الاختبارات لإزالة التوقعات السلبية (`expect(...).toBe(404)`).
2. **إضافة بيانات نشاط افتراضية** في seed أو عبر script مستقل لضمان تفعيل زر التصدير وإبقاء الاختبار حتمي النتائج.
3. **استكمال تغطية RBAC** بكتابة سيناريوهات تمنع الوصول للمستخدمين بدون صلاحيات (مثلاً مستخدم finance لا يرى `payroll.post`).
4. **تجهيز لقطة تخزين Playwright** (Storage State) بعد إصلاح واجهة الدخول الحديثة لتسريع الاختبارات وتقليل الاعتماد على API login المباشر.
