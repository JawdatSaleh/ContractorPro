import clsx from 'clsx';
import { mapRoleToBadgeColor } from '../../utils/permissions';

interface RoleBadgeProps {
  roleKey: string;
  label: string;
}

export function RoleBadge({ roleKey, label }: RoleBadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold shadow-sm transition',
        mapRoleToBadgeColor(roleKey)
      )}
    >
      {label}
    </span>
  );
}

export default RoleBadge;
