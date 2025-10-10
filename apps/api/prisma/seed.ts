import { PrismaClient } from '@prisma/client';
import argon2 from 'argon2';
import { permissionKeys, roleKeys } from '../src/auth/roles.js';

const prisma = new PrismaClient();

const permissionsSeed = [
  { key: permissionKeys.MANAGE_USERS, nameAr: 'إدارة المستخدمين' },
  { key: permissionKeys.VIEW_EMPLOYEES, nameAr: 'عرض الموظفين' },
  { key: permissionKeys.EDIT_EMPLOYEES, nameAr: 'تعديل الموظفين' },
  { key: permissionKeys.VIEW_CONTRACT_VALUES, nameAr: 'عرض قيمة العقد' },
  { key: permissionKeys.MANAGE_PAYROLL, nameAr: 'إدارة الرواتب' },
  { key: permissionKeys.APPROVE_ADVANCES, nameAr: 'اعتماد السلف' },
  { key: permissionKeys.VIEW_FINANCE_REPORTS, nameAr: 'عرض تقارير المالية' }
];

const rolesSeed: { key: string; nameAr: string; permissions: string[] }[] = [
  {
    key: roleKeys.ADMIN,
    nameAr: 'مدير النظام',
    permissions: permissionsSeed.map((p) => p.key)
  },
  {
    key: roleKeys.CEO,
    nameAr: 'المدير التنفيذي',
    permissions: [permissionKeys.VIEW_EMPLOYEES, permissionKeys.VIEW_CONTRACT_VALUES, permissionKeys.MANAGE_PAYROLL, permissionKeys.VIEW_FINANCE_REPORTS]
  },
  {
    key: roleKeys.CFO,
    nameAr: 'المدير المالي',
    permissions: [permissionKeys.MANAGE_PAYROLL, permissionKeys.APPROVE_ADVANCES, permissionKeys.VIEW_FINANCE_REPORTS]
  },
  {
    key: roleKeys.ACCOUNTANT,
    nameAr: 'محاسب',
    permissions: [permissionKeys.MANAGE_PAYROLL, permissionKeys.APPROVE_ADVANCES]
  },
  {
    key: roleKeys.HR_MANAGER,
    nameAr: 'مدير الموارد البشرية',
    permissions: [permissionKeys.VIEW_EMPLOYEES, permissionKeys.EDIT_EMPLOYEES]
  },
  {
    key: roleKeys.SUPERVISOR,
    nameAr: 'مشرف موقع',
    permissions: [permissionKeys.VIEW_EMPLOYEES]
  },
  {
    key: roleKeys.ENGINEER,
    nameAr: 'مهندس',
    permissions: [permissionKeys.VIEW_EMPLOYEES]
  },
  {
    key: roleKeys.EMPLOYEE,
    nameAr: 'موظف',
    permissions: [permissionKeys.VIEW_EMPLOYEES]
  }
];

async function main() {
  await prisma.permission.createMany({
    data: permissionsSeed,
    skipDuplicates: true
  });

  for (const role of rolesSeed) {
    const created = await prisma.role.upsert({
      where: { key: role.key },
      update: { nameAr: role.nameAr },
      create: { key: role.key, nameAr: role.nameAr }
    });
    const permissionRecords = await prisma.permission.findMany({ where: { key: { in: role.permissions } } });
    await prisma.rolePermission.deleteMany({ where: { roleId: created.id } });
    await prisma.rolePermission.createMany({
      data: permissionRecords.map((perm) => ({ roleId: created.id, permissionId: perm.id })),
      skipDuplicates: true
    });
  }

  const passwordHash = await argon2.hash('Admin#123');
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@contractorpro.local' },
    update: {},
    create: {
      email: 'admin@contractorpro.local',
      passwordHash,
      status: 'active'
    }
  });

  const adminRole = await prisma.role.findUnique({ where: { key: roleKeys.ADMIN } });
  if (adminRole) {
    await prisma.userRole.upsert({
      where: {
        userId_roleId: {
          userId: adminUser.id,
          roleId: adminRole.id
        }
      },
      update: {},
      create: {
        userId: adminUser.id,
        roleId: adminRole.id
      }
    });
  }

  await prisma.department.upsert({
    where: { costCenterCode: 'HR-001' },
    update: { nameAr: 'الموارد البشرية' },
    create: { nameAr: 'الموارد البشرية', costCenterCode: 'HR-001' }
  });

  await prisma.project.upsert({
    where: { code: 'PRJ-OPS' },
    update: { nameAr: 'مشروع العمليات' },
    create: { code: 'PRJ-OPS', nameAr: 'مشروع العمليات', costCenterCode: 'OPS' }
  });

  await prisma.employee.upsert({
    where: { code: 'EMP-001' },
    update: {},
    create: {
      code: 'EMP-001',
      fullName: 'مدير افتراضي',
      jobTitle: 'System Admin',
      status: 'active',
      userId: adminUser.id,
      department: { connect: { costCenterCode: 'HR-001' } },
      project: { connect: { code: 'PRJ-OPS' } }
    }
  });

  console.log('Seed completed');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
