export function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white/70 px-4 py-3 text-xs text-slate-500 backdrop-blur dark:border-slate-800 dark:bg-slate-950/70 dark:text-slate-400">
      <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-2 text-right sm:flex-row sm:items-center">
        <p>منصة ContractorPro - نظام إدارة المقاولات المتكامل</p>
        <p>
          بدعم فريق التطوير <span className="font-semibold text-sky-600 dark:text-sky-300">Codex</span>
        </p>
      </div>
    </footer>
  );
}

export default Footer;
