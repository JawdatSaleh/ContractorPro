import { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import Button from './Button';

interface ModalProps {
  open: boolean;
  title?: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  onClose: () => void;
  onConfirm?: () => void;
  children?: React.ReactNode;
}

export function Modal({
  open,
  title,
  description,
  confirmLabel = 'تأكيد',
  cancelLabel = 'إلغاء',
  loading,
  onClose,
  onConfirm,
  children
}: ModalProps) {
  return (
    <Transition.Root show={open} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose} dir="rtl">
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 z-50 flex items-center justify-center px-6 py-12">
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-200"
            enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            enterTo="opacity-100 translate-y-0 sm:scale-100"
            leave="ease-in duration-150"
            leaveFrom="opacity-100 translate-y-0 sm:scale-100"
            leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
          >
            <Dialog.Panel className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl transition dark:bg-slate-900">
              <div className="space-y-2 text-right">
                {title && <Dialog.Title className="text-lg font-semibold text-slate-900 dark:text-slate-100">{title}</Dialog.Title>}
                {description && <Dialog.Description className="text-sm text-slate-600 dark:text-slate-400">{description}</Dialog.Description>}
                {children && <div className="pt-2 text-slate-700 dark:text-slate-200">{children}</div>}
              </div>
              <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-start">
                <Button variant="ghost" onClick={onClose} disabled={loading} className="sm:min-w-[120px]">
                  {cancelLabel}
                </Button>
                {onConfirm && (
                  <Button onClick={onConfirm} loading={loading} className="sm:min-w-[120px]">
                    {confirmLabel}
                  </Button>
                )}
              </div>
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition.Root>
  );
}

export default Modal;
