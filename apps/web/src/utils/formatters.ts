const currencyFormatter = new Intl.NumberFormat('ar-EG', {
  style: 'currency',
  currency: 'SAR'
});

export const formatCurrency = (value: number, currency = 'SAR') => {
  return new Intl.NumberFormat('ar-EG', { style: 'currency', currency }).format(value ?? 0);
};

export const formatDate = (value?: string) => {
  if (!value) return 'غير متوفر';
  return new Intl.DateTimeFormat('ar-EG', { dateStyle: 'medium' }).format(new Date(value));
};

export const formatStatus = (status: string) => {
  switch (status) {
    case 'active':
      return 'نشط';
    case 'inactive':
      return 'غير نشط';
    case 'probation':
      return 'تحت التجربة';
    case 'terminated':
      return 'منتهي';
    case 'draft':
      return 'مسودة';
    case 'approved':
      return 'معتمد';
    case 'pending':
      return 'قيد الانتظار';
    case 'rejected':
      return 'مرفوض';
    case 'paid':
      return 'مدفوع';
    case 'settled':
      return 'مسدد';
    case 'overdue':
      return 'متأخر';
    default:
      return status;
  }
};

export const formatPayrollStatus = (status: string) => {
  switch (status) {
    case 'draft':
      return 'مسودة';
    case 'approved':
      return 'معتمد';
    case 'paid':
      return 'مدفوع';
    default:
      return status;
  }
};

export const formatPercentage = (value: number) => `${Math.round(value)}٪`;

export { currencyFormatter };
