# Stage 2 – مراجعة الكود المصدري (2025-10-28)

## 1. ملخص تنفيذي
- التهيئة الأمنية الحالية تسمح بتزوير الطلبات المصدق عليها بسبب إعداد CORS المتساهل واعتماد سر JWT احتياطي مكشوف، ما يعرض الجلسات للاختراق بسهولة.
- اكتُشفت فجوة تكامل أساسية بين الواجهة الأمامية وخدمات الموارد البشرية: معاملات التصفية ومسارات الملف المالي لا تتوافق مع ما يتيحه الخادم فعليًا.
- تبيّن تكرار منطق تسلسلي في وحدات الـ API ووجود أدوات تطوير (Zustand Devtools) مفعّلة في الواجهة الأمامية الإنتاجية، ما يزيد مخاطر الأداء وتسريب الحالة الحساسة.

## 2. منهجية المراجعة
1. تحليل حزم `apps/api` و`apps/web` مع التركيز على التهيئة الأمنية، التحقق من المدخلات، وأنماط الوصول إلى البيانات.
2. مطابقة استدعاءات REST في الواجهة الأمامية مع المسارات المعرّفة في خادم Fastify للتحقق من التوافق.
3. استقصاء التكرار والاعتماديات عالية الخطورة داخل الشيفرة (RBAC، Prisma، مخازن Zustand) وتوثيق أي أدوات تطوير مدمجة بلا حماية.
4. اقتراح تصحيحات على شكل قصاصات `diff` قابلة للتطبيق في مراحل الإصلاح اللاحقة.

## 3. النتائج الحرجة والعالية

| # | الخطورة | الوحدة | الوصف | الأثر |
|---|---------|---------|-------|-------|
| 1 | عالية | API > auth | الخادم يوقّع رموز JWT باستخدام قيمة احتياطية ثابتة (`dev-secret`) عندما لا يتم ضبط المتغير البيئي، ما يسمح بتزوير الجلسات في أي بيئة نُسيت فيها إعدادات السر.【F:apps/api/src/auth/jwt.ts†L1-L42】 | استيلاء كامل على الحسابات عبر إعادة توقيع الرموز.
| 2 | عالية | API > التهيئة | تفعيل CORS بخيار `origin: true` مع `credentials: true` يعني قبول أي مصدر يقوم بإرسال ملفات تعريف الارتباط/الرموز، ما يفتح الباب أمام هجمات CSRF من نطاقات خارجية.【F:apps/api/src/index.ts†L13-L39】 | تنفيذ عمليات مالية/موارد بشرية من مواقع خبيثة دون تفاعل المستخدم.
| 3 | عالية | Web > HR store | مخزن الموظفين يرسل معاملات `search`, `department`, `roleKey`, `status` بينما الخادم لا يفهم سوى `q`, `departmentId`, `projectId`، إضافةً إلى استدعاء نقاط نهاية غير موجودة (`/finance`, `/expenses`, ...).【F:apps/web/src/store/useEmployeeStore.ts†L49-L101】【F:apps/web/src/api/employees.ts†L93-L135】【F:apps/api/src/common/validators.ts†L8-L17】 | جميع فلاتر الواجهة تفشل، وطلبات الملف المالي تسقط بخطأ 404، ما يمنع المستخدمين من إكمال مهامهم.

### التوصيات ذات الأولوية

1. **فرض تهيئة سرية صريحة لرموز JWT**  
   ```diff
   --- a/apps/api/src/auth/jwt.ts
   +++ b/apps/api/src/auth/jwt.ts
   -const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-secret';
   +const JWT_SECRET = process.env.JWT_SECRET;
   +if (!JWT_SECRET) {
   +  throw new Error('JWT_SECRET environment variable is required');
   +}
   ```
   يضمن التصحيح فشل الخادم مبكرًا في حال غياب السر بدلًا من اعتماد قيمة معروفة علنًا.

2. **تقييد مصادر CORS المصرح بها**  
   ```diff
   --- a/apps/api/src/index.ts
   +++ b/apps/api/src/index.ts
   -await server.register(cors, { origin: true, credentials: true });
   +const allowedOrigins = (process.env.CORS_ORIGINS ?? '').split(',').map((value) => value.trim()).filter(Boolean);
   +await server.register(cors, {
   +  origin: (origin, cb) => {
   +    if (!origin || allowedOrigins.includes(origin)) {
   +      cb(null, origin ?? true);
   +    } else {
   +      cb(new Error('Origin not allowed'), false);
   +    }
   +  },
   +  credentials: true
   +});
   ```
   يحدّ هذا التغيير مصادر الطلبات الموثوقة إلى قائمة واضحة تُدار عبر المتغيرات البيئية.

3. **مواءمة طبقة الواجهة مع عقود الـ API الفعلية**  
   - توسيع مخطط التحقق في الخادم لقبول الحقول المستخدمة حاليًا من الواجهة، ثم إعادة تعيينها داخليًا إلى الحقول المعتمدة (`q`, `departmentId`).  
   - تجميد استدعاءات `/finance` و`/expenses` في الواجهة أو تفعيل نقاط النهاية المقابلة قبل تنفيذ `Promise.all` لضمان عدم انهيار الرحلة.  
   ```diff
   --- a/apps/api/src/common/validators.ts
   +++ b/apps/api/src/common/validators.ts
   -export const employeeFilterQuery = z.object({
   -  projectId: z.string().optional(),
   -  departmentId: z.string().optional(),
   -  q: z.string().optional()
   -});
   +export const employeeFilterQuery = z.object({
   +  projectId: z.string().optional(),
   +  departmentId: z.string().optional(),
   +  department: z.string().optional(),
   +  q: z.string().optional(),
   +  search: z.string().optional(),
   +  status: z.string().optional(),
   +  roleKey: z.string().optional()
   +});
   ```
   ```diff
   --- a/apps/api/src/hr/routes.ts
   +++ b/apps/api/src/hr/routes.ts
   @@
       const parsed = employeeFilterQuery.safeParse(request.query);
       if (!parsed.success) throw new ValidationError(parsed.error.flatten());
   -    const { departmentId, projectId, q } = parsed.data;
   +    const { departmentId, department, projectId, q, search, status, roleKey } = parsed.data;
   +    const term = q ?? search;
   ```
   بعد ذلك يُعاد استخدام `term` و`department || departmentId` داخل الاستعلام، مع تجاهل `roleKey` لحين دعم الربط بالأدوار.

## 4. نتائج متوسطة ومنخفضة

| # | الخطورة | الوحدة | الوصف | الأثر / الملاحظة |
|---|---------|---------|-------|------------------|
| 4 | متوسطة | API > نشاط | دالتا `serializeEntity` متطابقتان في وحدتي HR وFinance مع تعريف يدوي مكرر يمكن نقله إلى أداة مشتركة.【F:apps/api/src/hr/routes.ts†L260-L287】【F:apps/api/src/finance/routes.ts†L243-L299】 | صيانة أصعب وزيادة خطر التعديلات غير المتزامنة بين الوحدات.
| 5 | متوسطة | Web > State | جميع مخازن Zustand (`useAuthStore`, `useEmployeeStore`, `useRoleStore`) تفعّل إضافة Devtools في كل بيئة، ما يسمح لأي امتداد متصفح بدخول حالة التطبيق الحساسة في الإنتاج.【F:apps/web/src/store/useAuthStore.ts†L1-L77】【F:apps/web/src/store/useEmployeeStore.ts†L49-L120】【F:apps/web/src/store/useRoleStore.ts†L1-L44】 | مخاطر خصوصية وأداء، لأن devtools تبقي لقطات الحالة وتفتح قناة للحقن.
| 6 | منخفضة | Web > UI | مكوّن البطاقة يستخدم مساحة الأسماء `React` بدون استيراد صريح، ما يعتمد على السلوك الضمني للـ TypeScript وقد يفشل في إعدادات Strict المستقبلية.【F:apps/web/src/components/ui/Card.tsx†L1-L26】 | خطأ ترجمة محتمل عند تشديد الإعدادات أو أثناء دمج ESLint.

### توصيات إضافية
- استخراج وظيفة `serializeEntity` إلى `apps/api/src/common/serialization.ts` واستيرادها في الوحدات التي تحتاجها لتفادي التكرار.
- تغليف استيراد `devtools` بشرط بيئي (`import.meta.env.DEV`) أو استبداله بـ middleware لا يعمل إلا في التطوير.
- استيراد `type ReactNode` مباشرة في مكونات UI، أو تفعيل ESLint rule (`react/react-in-jsx-scope` OFF + `no-undef`) لضمان الانسجام مع إعدادات البناء.

## 5. الفرص التحسينية العامة
- اعتماد حزمة Rate Limiting (`@fastify/rate-limit`) لحماية نقاط الدخول الحساسة بعد إصلاح CORS.
- إضافة اختبارات وحدة (Vitest) لطبقة التحقق في `employeeFilterQuery` لضمان عدم تكرار التعارضات بين الواجهة والخادم.
- توثيق قائمة المصادر الموثوقة في ملف البيئة (`.env.staging`) لتسهيل إطلاق الإصلاحات الأمنية.

## 6. الخطوات التالية
1. تطبيق إصلاحات الأمان (JWT + CORS) قبل الانتقال إلى اختبارات المرحلة الثالثة.
2. معالجة فجوات تكامل الموظفين أو تعليق واجهة المستخدم لحين استكمال الـ API.
3. إنشاء تذكرة refactor لنقل الأدوات المشتركة وإطفاء أدوات التطوير في الإنتاج.
