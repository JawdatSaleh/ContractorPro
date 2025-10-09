(function() {
    const SESSION_KEY = 'contractorpro_user';
    const body = document.body;
    if (!body) {
        return;
    }

    const isPublicPage = body.dataset.publicPage === 'true';
    const currentScript = document.currentScript;
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
})();
