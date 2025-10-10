(function() {
    const SESSION_KEY = 'contractorpro_user';
    const body = document.body;
    if (!body) {
        return;
    }

    const currentScript = document.currentScript;
    const isPublicPage = body.dataset.publicPage === 'true';

    let deferredScripts = [];
    if (!isPublicPage) {
        deferredScripts = initializeApplicationLayout();
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
        'project_creation_wizard.html': 'projects',
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

    const legacyHeader = document.querySelector('header');
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
    const mainHTML = originalMain ? originalMain.innerHTML : body.innerHTML;

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

    body.innerHTML = '';

    const layoutWrapper = document.createElement('div');
    layoutWrapper.className = 'flex';

    const sidebar = document.createElement('aside');
    sidebar.className = 'fixed right-0 top-0 h-full w-64 bg-surface shadow-modal z-50 border-l border-border';
    sidebar.innerHTML = `
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
        <nav class="p-4 space-y-2">
            <a data-nav-link="home" href="main_dashboard.html" class="flex items-center gap-3 px-4 py-3 rounded-lg text-text-secondary hover:bg-secondary-100 transition-fast">
                <i class="fas fa-tachometer-alt w-5"></i>
                <span class="font-medium">الصفحة الرئيسية</span>
            </a>
            <a data-nav-link="projects" href="projects_management_center.html" class="flex items-center gap-3 px-4 py-3 rounded-lg text-text-secondary hover:bg-secondary-100 transition-fast">
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
    `;

    const mainWrapper = document.createElement('div');
    mainWrapper.className = 'mr-64 min-h-screen flex flex-col bg-background';

    const header = document.createElement('header');
    header.className = 'bg-surface shadow-card px-6 py-4 border-b border-border flex flex-col md:flex-row md:items-center md:justify-between gap-4';
    header.innerHTML = `
        <div class="space-y-1">
            <h1 class="text-2xl font-bold text-text-primary" data-layout-title></h1>
            <p class="text-text-secondary text-sm" data-layout-subtitle></p>
        </div>
        <div class="flex items-center gap-4" data-layout-actions>
            <div class="flex items-center gap-2" data-layout-custom-actions></div>
            <div data-current-user class="text-sm text-text-secondary hidden md:block"></div>
            <i class="fas fa-bell text-text-secondary text-lg cursor-pointer"></i>
            <i class="fas fa-user text-text-secondary text-lg"></i>
            <button data-logout-button class="text-sm text-error hover:text-error-600 transition-fast">تسجيل الخروج</button>
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
    main.className = 'p-6 space-y-6';
    main.innerHTML = mainHTML;

    const footer = document.createElement('footer');
    footer.className = 'mt-auto bg-surface border-t border-border px-6 py-4 text-sm text-text-secondary flex flex-col gap-2 md:flex-row md:items-center md:justify-between';
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

    if (isPublicPage) {
        document.dispatchEvent(new CustomEvent('contractorpro-auth-ready', {
            detail: { user: null, public: true }
        }));
        return;
    }

    function redirectToLogin() {
        window.location.replace(loginPath);
    }

    const rawSession = localStorage.getItem(SESSION_KEY);
    if (!rawSession) {
        redirectToLogin();
        return;
    }

    let userSession;
    try {
        userSession = JSON.parse(rawSession);
    } catch (error) {
        console.error('Unable to parse stored session.', error);
        localStorage.removeItem(SESSION_KEY);
        redirectToLogin();
        return;
    }

    if (!userSession || !userSession.email) {
        localStorage.removeItem(SESSION_KEY);
        redirectToLogin();
        return;
    }

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
})();
