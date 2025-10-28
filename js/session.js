(function() {
    const SESSION_KEY = 'contractorpro_user';
    const body = document.body;
    if (!body) {
        return;
    }

    const currentScript = document.currentScript;
    const isPublicPage = body.dataset.publicPage === 'true';

    function getStoredSession() {
        const rawSession = localStorage.getItem(SESSION_KEY);
        if (!rawSession) {
            return null;
        }

        try {
            const parsed = JSON.parse(rawSession);
            if (!parsed || !parsed.email) {
                return null;
            }
            return parsed;
        } catch (error) {
            console.error('Unable to parse stored session.', error);
            return null;
        }
    }


function initializeApplicationLayout() {
    if (!body || body.dataset.publicPage === 'true') {
        return;
    }

    const path = window.location.pathname.split('/').pop() || '';
    const activeMap = {
        'main_dashboard.html': 'home',
        'authentication_main_dashboard.html': 'home',
        'navigation_system_audit_testing_center.html': 'home',
        'notifications.html': 'home',
        'about.html': 'home',
        'html_implementation_dashboard.html': 'projects',
        'projects_management_center.html': 'projects',
        'Projects/projects_management_center.html': 'projects',
        'project_creation_wizard.html': 'projects',
        'Projects/project_creation_wizard.html': 'projects',
        'projects_hub.html': 'projects',
        'advanced_invoice_creation_portal.html': 'finance',
        'advanced_quotation_invoice_designer.html': 'finance',
        'comprehensive_invoice_management_hub.html': 'finance',
        'financial_management_center.html': 'finance',
        'financial_center.html': 'finance',
        'financial_operations_dashboard.html': 'finance',
        'human_resources_center.html': 'hr',
        'add_employee.html': 'hr',
        'employee_profile.html': 'hr',
        'user_profile.html': 'settings',
        'settings.html': 'settings',
        'faq.html': 'settings',
        'privacy-policy.html': 'settings',
        'contact.html': 'settings'
    };

    const activeLink = body.dataset.activeLink || activeMap[path] || 'home';

    const legacyHeader = document.querySelector('[data-layout-header]') || document.querySelector('header');
    const legacyTitle = body.dataset.pageTitle || (legacyHeader && legacyHeader.querySelector('h1') ? legacyHeader.querySelector('h1').textContent.trim() : '') || document.title;
    const legacySubtitle = body.dataset.pageSubtitle || (legacyHeader && legacyHeader.querySelector('p') ? legacyHeader.querySelector('p').textContent.trim() : '');
    let legacyActions = null;
    if (legacyHeader) {
        legacyActions = legacyHeader.querySelector('[data-header-actions]');
        if (!legacyActions) {
            let primaryFlex = legacyHeader.querySelector('.flex.justify-between');
            if (!primaryFlex) {
                primaryFlex = legacyHeader.querySelector('[class*="justify-between"]');
            }
            if (primaryFlex && primaryFlex.children && primaryFlex.children.length > 1) {
                legacyActions = primaryFlex.children[primaryFlex.children.length - 1];
            }
        }
    }

    const originalMain = document.querySelector('main');
    const manualContentRoot = body.querySelector('[data-page-root]');
    const contentSource = originalMain || manualContentRoot;
    const mainHTML = contentSource ? contentSource.innerHTML : body.innerHTML;

    const bodyScripts = [];
    document.querySelectorAll('body script').forEach((script) => {
        if (script === currentScript) {
            return;
        }
        if (script.parentElement) {
            bodyScripts.push({
                src: script.getAttribute('src'),
                text: script.textContent,
                attrs: Array.from(script.attributes).map((attr) => ({ name: attr.name, value: attr.value }))
            });
            script.parentElement.removeChild(script);
        }
    });

    const originalOverflow = body.style.overflow;

    body.innerHTML = '';

    const layoutWrapper = document.createElement('div');
    layoutWrapper.className = 'flex w-full min-h-screen';

    const sidebar = document.createElement('aside');
    sidebar.setAttribute('data-sidebar', '');
    sidebar.className = 'fixed right-0 top-0 h-full w-64 bg-surface shadow-modal z-50 border-l border-border transform translate-x-full transition-transform duration-300 ease-in-out md:translate-x-0 md:static md:h-auto md:min-h-screen md:flex md:flex-col md:shadow-none';
    sidebar.innerHTML = `
        <div class="relative flex-1 flex flex-col h-full">
            <button type="button" class="md:hidden absolute left-4 top-4 text-text-secondary hover:text-text-primary transition-fast" data-sidebar-close aria-label="إغلاق القائمة">
                <i class="fas fa-times text-xl"></i>
            </button>
            <div class="p-6 border-b border-border">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                        <i class="fas fa-hard-hat text-white text-lg"></i>
                    </div>
                    <div>
                        <h1 class="text-xl font-bold text-text-primary">ContractorPro</h1>
                        <p class="text-sm text-text-secondary">نظام إدارة المقاولات</p>
                    </div>
                </div>
            </div>
            <nav class="p-4 space-y-2 overflow-y-auto">
                <a data-nav-link="home" href="main_dashboard.html" class="flex items-center gap-3 px-4 py-3 rounded-lg text-text-secondary hover:bg-secondary-100 transition-fast">
                    <i class="fas fa-tachometer-alt w-5"></i>
                    <span class="font-medium">الصفحة الرئيسية</span>
                </a>
                <a data-nav-link="projects" href="Projects/projects_management_center.html" class="flex items-center gap-3 px-4 py-3 rounded-lg text-text-secondary hover:bg-secondary-100 transition-fast">
                    <i class="fas fa-building w-5"></i>
                    <span>المشاريع</span>
                </a>
                <a data-nav-link="finance" href="financial_management_center.html" class="flex items-center gap-3 px-4 py-3 rounded-lg text-text-secondary hover:bg-secondary-100 transition-fast">
                    <i class="fas fa-chart-line w-5"></i>
                    <span>المالية</span>
                </a>
                <a data-nav-link="hr" href="human_resources_center.html" class="flex items-center gap-3 px-4 py-3 rounded-lg text-text-secondary hover:bg-secondary-100 transition-fast">
                    <i class="fas fa-users w-5"></i>
                    <span>الموظفين</span>
                </a>
                <a data-nav-link="settings" href="settings.html" class="flex items-center gap-3 px-4 py-3 rounded-lg text-text-secondary hover:bg-secondary-100 transition-fast">
                    <i class="fas fa-cog w-5"></i>
                    <span>الإعدادات</span>
                </a>
            </nav>
        </div>
    `;

    const overlay = document.createElement('div');
    overlay.className = 'fixed inset-0 bg-black bg-opacity-40 z-40 hidden md:hidden';
    overlay.setAttribute('data-sidebar-overlay', '');

    const mainWrapper = document.createElement('div');
    mainWrapper.className = 'flex-1 w-full min-h-screen flex flex-col bg-background transition-[margin] duration-300 md:mr-64';

    const header = document.createElement('header');
    header.className = 'bg-surface shadow-card px-4 sm:px-6 py-4 border-b border-border';
    header.innerHTML = `
        <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div class="flex items-start gap-3 md:items-center">
                <button type="button" class="md:hidden text-text-secondary hover:text-text-primary transition-fast focus:outline-none" data-sidebar-toggle aria-label="فتح القائمة">
                    <i class="fas fa-bars text-2xl"></i>
                </button>
                <div class="space-y-1">
                    <h1 class="text-2xl font-bold text-text-primary" data-layout-title></h1>
                    <p class="text-text-secondary text-sm" data-layout-subtitle></p>
                </div>
            </div>
            <div class="flex flex-wrap items-center gap-3 justify-end" data-layout-actions>
                <div class="flex flex-wrap items-center gap-2" data-layout-custom-actions></div>
                <div data-current-user class="text-sm text-text-secondary hidden md:block"></div>
                <i class="fas fa-bell text-text-secondary text-lg cursor-pointer"></i>
                <i class="fas fa-user text-text-secondary text-lg"></i>
                <button data-logout-button class="text-sm text-error hover:text-error-600 transition-fast">تسجيل الخروج</button>
            </div>
        </div>
    `;

    const titleEl = header.querySelector('[data-layout-title]');
    const subtitleEl = header.querySelector('[data-layout-subtitle]');
    const actionsHolder = header.querySelector('[data-layout-custom-actions]');

    titleEl.textContent = legacyTitle;
    if (legacySubtitle) {
        subtitleEl.textContent = legacySubtitle;
    } else {
        subtitleEl.remove();
    }

    if (legacyActions) {
        const fragment = document.createElement('div');
        fragment.innerHTML = legacyActions.innerHTML;
        fragment.querySelectorAll('[data-logout-button], [data-current-user]').forEach((node) => node.remove());
        if (fragment.textContent.trim() || fragment.children.length) {
            actionsHolder.innerHTML = fragment.innerHTML;
        } else {
            actionsHolder.remove();
        }
    } else {
        actionsHolder.remove();
    }

    const main = document.createElement('main');
    main.className = 'p-4 sm:p-6 space-y-6';
    main.innerHTML = mainHTML;

    const footer = document.createElement('footer');
    footer.className = 'mt-auto bg-surface border-t border-border px-4 sm:px-6 py-4 text-sm text-text-secondary flex flex-col gap-2 md:flex-row md:items-center md:justify-between';
    footer.innerHTML = `
        <span>© ${new Date().getFullYear()} ContractorPro. جميع الحقوق محفوظة.</span>
        <div class="flex items-center gap-4 text-xs md:text-sm">
            <a href="privacy-policy.html" class="hover:text-text-primary transition-fast">سياسة الخصوصية</a>
            <a href="faq.html" class="hover:text-text-primary transition-fast">الأسئلة الشائعة</a>
            <a href="contact.html" class="hover:text-text-primary transition-fast">اتصل بنا</a>
        </div>
    `;

    layoutWrapper.appendChild(sidebar);
    mainWrapper.appendChild(header);
    mainWrapper.appendChild(main);
    mainWrapper.appendChild(footer);
    layoutWrapper.appendChild(mainWrapper);

    body.appendChild(layoutWrapper);
    body.appendChild(overlay);

    let isSidebarOpen = false;

    const closeSidebar = () => {
        sidebar.classList.add('translate-x-full');
        sidebar.style.transform = '';
        sidebar.setAttribute('aria-hidden', 'true');
        overlay.classList.add('hidden');
        body.style.overflow = originalOverflow;
        isSidebarOpen = false;
    };

    const openSidebar = () => {
        sidebar.style.transform = 'translateX(0)';
        sidebar.setAttribute('aria-hidden', 'false');
        overlay.classList.remove('hidden');
        body.style.overflow = 'hidden';
        isSidebarOpen = true;
    };

    header.querySelectorAll('[data-sidebar-toggle]').forEach((button) => {
        button.addEventListener('click', () => {
            if (window.innerWidth >= 768) {
                return;
            }
            if (isSidebarOpen) {
                closeSidebar();
            } else {
                openSidebar();
            }
        });
    });

    const closeButton = sidebar.querySelector('[data-sidebar-close]');
    if (closeButton) {
        closeButton.addEventListener('click', closeSidebar);
    }

    overlay.addEventListener('click', closeSidebar);

    sidebar.querySelectorAll('a').forEach((link) => {
        link.addEventListener('click', () => {
            if (window.innerWidth < 768) {
                closeSidebar();
            }
        });
    });

    const handleResize = () => {
        if (window.innerWidth >= 768) {
            overlay.classList.add('hidden');
            sidebar.setAttribute('aria-hidden', 'false');
            sidebar.style.transform = '';
            body.style.overflow = originalOverflow;
            isSidebarOpen = false;
        } else if (isSidebarOpen) {
            sidebar.style.transform = 'translateX(0)';
            overlay.classList.remove('hidden');
            sidebar.setAttribute('aria-hidden', 'false');
            body.style.overflow = 'hidden';
        } else {
            closeSidebar();
        }
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    sidebar.querySelectorAll('[data-nav-link]').forEach((link) => {
        if (link.dataset.navLink === activeLink) {
            link.classList.add('bg-primary-50', 'text-primary', 'border-r-4', 'border-primary');
        }
    });

    return bodyScripts;
}

    const loginPath = currentScript && currentScript.dataset && currentScript.dataset.loginPath
        ? currentScript.dataset.loginPath
        : 'login.html';

    const redirectToLogin = () => {
        window.location.replace(loginPath);
    };

    if (isPublicPage) {
        document.dispatchEvent(new CustomEvent('contractorpro-auth-ready', {
            detail: { user: null, public: true }
        }));
        return;
    }

    const shouldPreserveLayout = body.dataset.preserveLayout === 'true' || body.hasAttribute('data-preserve-layout');

    const userSession = getStoredSession();
    if (!userSession) {
        localStorage.removeItem(SESSION_KEY);
        redirectToLogin();
        return;
    }

    const deferredScripts = shouldPreserveLayout ? [] : (initializeApplicationLayout() || []);

    document.querySelectorAll('[data-current-user]').forEach((element) => {
        element.textContent = userSession.email;
        element.classList.remove('hidden');
    });

    document.querySelectorAll('[data-logout-button]').forEach((button) => {
        button.addEventListener('click', (event) => {
            event.preventDefault();
            localStorage.removeItem(SESSION_KEY);
            redirectToLogin();
        });
    });

    document.dispatchEvent(new CustomEvent('contractorpro-auth-ready', {
        detail: { user: userSession, public: false }
    }));

    if (!shouldPreserveLayout) {
        deferredScripts.forEach((scriptInfo) => {
            const script = document.createElement('script');
            scriptInfo.attrs.forEach(({ name, value }) => {
                if (name !== 'src') {
                    script.setAttribute(name, value);
                }
            });
            if (scriptInfo.src) {
                script.src = scriptInfo.src;
            } else if (scriptInfo.text) {
                script.textContent = scriptInfo.text;
            }
            body.appendChild(script);
        });
    }
})();
