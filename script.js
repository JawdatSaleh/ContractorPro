// ContractorPro JavaScript Application
// Main JavaScript functionality for the construction project management system

// ===========================
// AUTHENTICATION SYSTEM
// ===========================

class AuthenticationSystem {
    constructor() {
        this.init();
    }

    init() {
        // Check if we're on main dashboard and show login modal if not authenticated
        if (window.location.pathname.includes('main_dashboard.html') || window.location.pathname === '/') {
            this.checkLoginStatus();
        } else {
            this.checkAuthentication();
        }
    }

    checkLoginStatus() {
        const currentUser = localStorage.getItem('currentUser');
        const loginModal = document.getElementById('loginModal');
        
        if (!currentUser && loginModal) {
            // Show login modal using Bootstrap modal
            const modal = new bootstrap.Modal(loginModal);
            modal.show();
            this.setupLoginForm();
        } else if (currentUser) {
            // User is logged in, setup the dashboard
            this.updateUserInterface(currentUser);
            this.hideLoginModal();
        }
    }

    checkAuthentication() {
        const currentUser = localStorage.getItem('currentUser');
        if (!currentUser) {
            window.location.href = 'main_dashboard.html';
            return false;
        }
        
        this.updateUserInterface(currentUser);
        return true;
    }

    setupLoginForm() {
        const loginForm = document.getElementById('loginForm');
        const loginError = document.getElementById('loginError');

        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                
                const username = document.getElementById('username').value.trim();
                const password = document.getElementById('password').value;
                
                // Simple authentication (in real app, this would be server-side)
                if (username === 'admin' && password === '123') {
                    localStorage.setItem('currentUser', username);
                    this.updateUserInterface(username);
                    this.hideLoginModal();
                    loginError.classList.add('d-none');
                } else {
                    loginError.classList.remove('d-none');
                }
            });
        }
    }

    updateUserInterface(username) {
        const userWelcome = document.getElementById('userWelcome');
        if (userWelcome) {
            userWelcome.textContent = `مرحباً، ${username}`;
        }

        // Setup logout functionality
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                if (confirm('هل أنت متأكد من تسجيل الخروج؟')) {
                    this.logout();
                }
            });
        }
    }

    hideLoginModal() {
        const loginModal = document.getElementById('loginModal');
        if (loginModal) {
            const modal = bootstrap.Modal.getInstance(loginModal);
            if (modal) {
                modal.hide();
            }
        }
    }

    logout() {
        localStorage.removeItem('currentUser');
        localStorage.removeItem('projectDraft'); // Clear any draft data
        window.location.href = 'main_dashboard.html';
    }
}

// ===========================
// PROJECT MANAGEMENT SYSTEM
// ===========================

const PROJECT_STORAGE_KEYS = [
    'contractorPro.projects',
    'contractorProjects',
    'projects'
];

class ProjectManager {
    constructor() {
        this.projects = this.loadProjects();
        this.init();
    }

    init() {
        // Setup project form if it exists
        const projectForm = document.getElementById('projectForm');
        if (projectForm) {
            this.setupProjectForm();
            this.setupAutoSave();
            this.loadDraft();
        }

        // Setup export functionality
        const exportBtn = document.getElementById('exportBtn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportData());
        }

        // Update dashboard stats if on dashboard
        this.updateDashboardStats();
    }

    setupProjectForm() {
        const form = document.getElementById('projectForm');
        
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            
            if (this.validateForm()) {
                this.saveProject();
            }
        });

        // Setup real-time validation
        this.setupRealTimeValidation();
    }

    validateForm() {
        const name = document.getElementById('name').value.trim();
        const client = document.getElementById('client').value.trim();
        const budget = document.getElementById('budget').value;
        const description = document.getElementById('description').value.trim();
        
        if (!name) {
            this.showMessage('يرجى إدخال اسم المشروع', 'error');
            return false;
        }
        
        if (name.length < 3) {
            this.showMessage('يجب أن يكون اسم المشروع أكثر من 3 أحرف', 'error');
            return false;
        }
        
        if (!client) {
            this.showMessage('يرجى إدخال اسم العميل', 'error');
            return false;
        }
        
        if (!budget || parseFloat(budget) <= 0) {
            this.showMessage('يرجى إدخال ميزانية صحيحة', 'error');
            return false;
        }
        
        if (!description) {
            this.showMessage('يرجى إدخال وصف المشروع', 'error');
            return false;
        }
        
        if (description.length < 10) {
            this.showMessage('يجب أن يكون وصف المشروع أكثر تفصيلاً (على الأقل 10 أحرف)', 'error');
            return false;
        }
        
        // Validate dates if provided
        const startDate = document.getElementById('startDate').value;
        const endDate = document.getElementById('endDate').value;
        
        if (startDate && endDate && new Date(startDate) >= new Date(endDate)) {
            this.showMessage('يجب أن يكون تاريخ النهاية بعد تاريخ البداية', 'error');
            return false;
        }
        
        return true;
    }

    setupRealTimeValidation() {
        const nameField = document.getElementById('name');
        const clientField = document.getElementById('client');
        const budgetField = document.getElementById('budget');
        const descriptionField = document.getElementById('description');
        
        if (nameField) {
            nameField.addEventListener('blur', function() {
                if (this.value.trim().length < 3) {
                    this.style.borderColor = '#ef4444';
                    this.style.boxShadow = '0 0 0 3px rgba(239, 68, 68, 0.1)';
                } else {
                    this.style.borderColor = '#10b981';
                    this.style.boxShadow = '0 0 0 3px rgba(16, 185, 129, 0.1)';
                }
            });

            nameField.addEventListener('focus', function() {
                this.style.borderColor = '';
                this.style.boxShadow = '';
            });
        }
        
        if (budgetField) {
            budgetField.addEventListener('input', function() {
                const value = parseFloat(this.value);
                if (isNaN(value) || value <= 0) {
                    this.style.borderColor = '#ef4444';
                    this.style.boxShadow = '0 0 0 3px rgba(239, 68, 68, 0.1)';
                } else {
                    this.style.borderColor = '#10b981';
                    this.style.boxShadow = '0 0 0 3px rgba(16, 185, 129, 0.1)';
                }
            });

            budgetField.addEventListener('focus', function() {
                this.style.borderColor = '';
                this.style.boxShadow = '';
            });
        }

        if (descriptionField) {
            descriptionField.addEventListener('input', function() {
                const charCount = this.value.length;
                let countElement = this.nextElementSibling;
                
                // Create character counter if it doesn't exist
                if (!countElement || !countElement.classList.contains('char-counter')) {
                    countElement = document.createElement('small');
                    countElement.classList.add('char-counter', 'text-gray-500', 'mt-1');
                    this.parentNode.appendChild(countElement);
                }
                
                countElement.textContent = `${charCount} حرف`;
                
                if (charCount < 10) {
                    countElement.style.color = '#ef4444';
                    this.style.borderColor = '#ef4444';
                } else {
                    countElement.style.color = '#10b981';
                    this.style.borderColor = '#10b981';
                }
            });
        }
    }

    saveProject() {
        const now = new Date();
        const generatedId = 'PRJ-' + now.getTime();
        const statusValue = document.getElementById('status').value;
        const startDate = document.getElementById('startDate').value;
        const endDate = document.getElementById('endDate').value;
        const durationDays = this.calculateDuration(startDate, endDate);

        const projectData = {
            id: generatedId,
            code: '#' + generatedId,
            name: document.getElementById('name').value.trim(),
            description: document.getElementById('description').value.trim(),
            status: statusValue,
            progress: this.calculateInitialProgress(statusValue),
            client: {
                name: document.getElementById('client').value.trim()
            },
            clientName: document.getElementById('client').value.trim(),
            budget: {
                contractValue: parseFloat(document.getElementById('budget').value) || 0,
                currency: 'SAR',
                advancePayment: 0,
                paymentTerms: '',
                paymentTermsLabel: '',
                paymentsCount: null
            },
            value: parseFloat(document.getElementById('budget').value) || 0,
            timeline: {
                startDate: startDate,
                endDate: endDate,
                durationDays: durationDays
            },
            startDate: startDate,
            endDate: endDate,
            location: this.normalizeLocation(document.getElementById('location').value.trim()),
            phases: [],
            createdAt: now.toISOString(),
            createdBy: localStorage.getItem('currentUser') || 'system'
        };

        const normalizedProject = this.normalizeProject(projectData);
        this.upsertProject(normalizedProject);

        this.showMessage('تم حفظ المشروع بنجاح!', 'success');

        // Clear draft and reset form
        this.clearDraft();
        setTimeout(() => {
            document.getElementById('projectForm').reset();
            this.resetFormValidation();
        }, 2000);
    }

    calculateDuration(startDate, endDate) {
        if (!startDate || !endDate) {
            return 0;
        }

        const start = new Date(startDate);
        const end = new Date(endDate);
        const diff = end - start;

        if (Number.isNaN(diff) || diff <= 0) {
            return 0;
        }

        return Math.max(1, Math.round(diff / (1000 * 60 * 60 * 24)));
    }

    calculateInitialProgress(status) {
        const progressMap = {
            'planning': 10,
            'active': 25,
            'paused': 15,
            'completed': 100
        };
        return progressMap[status] || 10;
    }

    normalizeLocation(rawLocation) {
        if (!rawLocation) {
            return {};
        }

        if (typeof rawLocation === 'string') {
            return {
                city: rawLocation,
                address: rawLocation
            };
        }

        if (typeof rawLocation === 'object') {
            return { ...rawLocation };
        }

        return {};
    }

    parseNumber(value) {
        if (value === undefined || value === null) {
            return 0;
        }

        if (typeof value === 'number') {
            return Number.isFinite(value) ? value : 0;
        }

        const cleaned = String(value).replace(/[^0-9.-]/g, '');
        const parsed = Number(cleaned);
        return Number.isFinite(parsed) ? parsed : 0;
    }

    normalizeProject(project) {
        if (!project || typeof project !== 'object') {
            return null;
        }

        const now = new Date().toISOString();
        const normalized = { ...project };

        normalized.id = normalized.id || ('PRJ-' + Date.now());
        normalized.code = normalized.code || ('#' + normalized.id);
        normalized.name = normalized.name || normalized.title || 'مشروع جديد';
        normalized.description = normalized.description || '';
        normalized.status = normalized.status || 'planning';
        const rawProgress = this.parseNumber(normalized.progress);
        normalized.progress = Math.max(0, Math.min(100, rawProgress));

        const client = normalized.client || {};
        const clientName = client.name || normalized.clientName || (typeof normalized.client === 'string' ? normalized.client : '');
        normalized.client = typeof normalized.client === 'object' && !Array.isArray(normalized.client)
            ? { ...normalized.client, name: client.name || clientName }
            : { name: clientName };
        normalized.clientName = clientName;

        if (!normalized.location) {
            normalized.location = {};
        } else if (typeof normalized.location === 'string') {
            normalized.location = {
                city: normalized.location,
                address: normalized.location
            };
        } else {
            normalized.location = { ...normalized.location };
        }

        normalized.timeline = { ...(normalized.timeline || {}) };
        normalized.timeline.startDate = normalized.timeline.startDate || normalized.startDate || '';
        normalized.timeline.endDate = normalized.timeline.endDate || normalized.endDate || '';

        if (!normalized.timeline.durationDays) {
            const calculated = this.calculateDuration(normalized.timeline.startDate, normalized.timeline.endDate);
            normalized.timeline.durationDays = calculated;
        }

        normalized.startDate = normalized.timeline.startDate;
        normalized.endDate = normalized.timeline.endDate;
        normalized.durationDays = normalized.timeline.durationDays;

        const budget = { ...(normalized.budget || {}) };
        const valueCandidate = this.parseNumber(
            budget.contractValue ?? normalized.value ?? budget.total ?? normalized.totalBudget
        );

        budget.contractValue = valueCandidate;
        budget.currency = budget.currency || 'SAR';
        budget.advancePayment = budget.advancePayment ?? normalized.advancePayment ?? 0;
        budget.paymentTerms = budget.paymentTerms || normalized.paymentTerms || '';
        budget.paymentTermsLabel = budget.paymentTermsLabel || normalized.paymentTermsLabel || '';
        if (budget.paymentsCount !== null && budget.paymentsCount !== undefined) {
            const count = Number(budget.paymentsCount);
            budget.paymentsCount = Number.isFinite(count) ? count : null;
        }

        normalized.budget = budget;
        normalized.value = valueCandidate;

        if (!Array.isArray(normalized.phases)) {
            normalized.phases = [];
        }

        normalized.createdAt = normalized.createdAt || now;

        return normalized;
    }

    normalizeProjects(projects) {
        if (!Array.isArray(projects)) {
            return [];
        }

        const normalized = [];
        const seen = new Set();

        projects.forEach(project => {
            const normalizedProject = this.normalizeProject(project);
            if (!normalizedProject) return;

            if (!seen.has(normalizedProject.id)) {
                seen.add(normalizedProject.id);
                normalized.push(normalizedProject);
            }
        });

        return normalized;
    }

    upsertProject(project) {
        const normalizedProject = this.normalizeProject(project);
        if (!normalizedProject) return;

        const index = this.projects.findIndex(p => p.id === normalizedProject.id);
        if (index >= 0) {
            this.projects[index] = normalizedProject;
        } else {
            this.projects.push(normalizedProject);
        }

        this.saveProjects();
    }

    resetFormValidation() {
        const fields = ['name', 'client', 'budget', 'description'];
        fields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field) {
                field.style.borderColor = '';
                field.style.boxShadow = '';
            }
        });

        // Remove character counters
        const counters = document.querySelectorAll('.char-counter');
        counters.forEach(counter => counter.remove());
    }

    loadProjects() {
        let storedProjects = [];

        for (const key of PROJECT_STORAGE_KEYS) {
            try {
                const raw = localStorage.getItem(key);
                if (!raw) continue;
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed) && parsed.length) {
                    storedProjects = parsed;
                    break;
                }
            } catch (error) {
                // Ignore and continue to next key
            }
        }

        const normalized = this.normalizeProjects(storedProjects);
        this.projects = normalized;
        this.saveProjects();
        return normalized;
    }

    saveProjects() {
        const serialized = JSON.stringify(this.projects);
        PROJECT_STORAGE_KEYS.forEach(key => {
            try {
                localStorage.setItem(key, serialized);
            } catch (error) {
                // Skip keys that cannot be written
            }
        });
    }

    // Auto-save draft functionality
    setupAutoSave() {
        const fields = ['name', 'client', 'budget', 'status', 'startDate', 'endDate', 'description', 'location'];
        
        fields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field) {
                field.addEventListener('input', () => {
                    clearTimeout(this.autoSaveTimeout);
                    this.autoSaveTimeout = setTimeout(() => this.autoSaveDraft(), 2000);
                });
            }
        });

        // Auto-save every 30 seconds
        setInterval(() => this.autoSaveDraft(), 30000);
    }

    autoSaveDraft() {
        const formData = {
            name: document.getElementById('name')?.value.trim() || '',
            client: document.getElementById('client')?.value.trim() || '',
            budget: document.getElementById('budget')?.value || '',
            status: document.getElementById('status')?.value || 'planning',
            startDate: document.getElementById('startDate')?.value || '',
            endDate: document.getElementById('endDate')?.value || '',
            description: document.getElementById('description')?.value.trim() || '',
            location: document.getElementById('location')?.value.trim() || '',
            savedAt: new Date().toISOString()
        };
        
        // Only save if there's meaningful content
        if (formData.name || formData.client || formData.description) {
            localStorage.setItem('projectDraft', JSON.stringify(formData));
        }
    }

    loadDraft() {
        const draft = localStorage.getItem('projectDraft');
        if (draft) {
            const draftData = JSON.parse(draft);
            const savedTime = new Date(draftData.savedAt);
            const now = new Date();
            const hoursDiff = (now - savedTime) / (1000 * 60 * 60);
            
            // Only load draft if it's less than 24 hours old
            if (hoursDiff < 24) {
                if (confirm('تم العثور على مسودة محفوظة. هل تريد استكمالها؟')) {
                    this.populateFormWithDraft(draftData);
                } else {
                    this.clearDraft();
                }
            } else {
                this.clearDraft();
            }
        }
    }

    populateFormWithDraft(draftData) {
        const fields = {
            'name': draftData.name,
            'client': draftData.client,
            'budget': draftData.budget,
            'status': draftData.status,
            'startDate': draftData.startDate,
            'endDate': draftData.endDate,
            'description': draftData.description,
            'location': draftData.location
        };

        Object.entries(fields).forEach(([fieldId, value]) => {
            const field = document.getElementById(fieldId);
            if (field && value) {
                field.value = value;
            }
        });
    }

    clearDraft() {
        localStorage.removeItem('projectDraft');
    }

    // Export functionality
    exportData() {
        const data = {
            exportDate: new Date().toISOString(),
            projectsCount: this.projects.length,
            totalBudget: this.projects.reduce((sum, project) => sum + project.budget, 0),
            projects: this.projects
        };

        const dataStr = JSON.stringify(data, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `contractor_pro_export_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        this.showMessage('تم تصدير البيانات بنجاح!', 'success');
    }

    // Update dashboard statistics
    updateDashboardStats() {
        const totalProjectsEl = document.getElementById('totalProjects');
        const totalBudgetEl = document.getElementById('totalBudget');
        const activeProjectsEl = document.getElementById('activeProjects');
        const avgBudgetEl = document.getElementById('avgBudget');

        if (totalProjectsEl) {
            totalProjectsEl.textContent = this.projects.length;
        }

        if (totalBudgetEl) {
            const total = this.projects.reduce((sum, project) => sum + project.budget, 0);
            totalBudgetEl.textContent = this.formatCurrency(total);
        }

        if (activeProjectsEl) {
            const active = this.projects.filter(p => p.status === 'active' || p.status === 'planning').length;
            activeProjectsEl.textContent = active;
        }

        if (avgBudgetEl) {
            const avg = this.projects.length > 0 ? 
                this.projects.reduce((sum, project) => sum + project.budget, 0) / this.projects.length : 0;
            avgBudgetEl.textContent = this.formatCurrency(avg);
        }
    }

    formatCurrency(amount) {
        if (amount >= 1000000) {
            return (amount / 1000000).toFixed(1) + 'M ريال';
        } else if (amount >= 1000) {
            return (amount / 1000).toFixed(0) + 'K ريال';
        }
        return amount.toLocaleString('ar-SA') + ' ريال';
    }

    showMessage(message, type) {
        const container = document.getElementById('messageContainer');
        const alert = document.getElementById('messageAlert');
        const icon = document.getElementById('messageIcon');
        const text = document.getElementById('messageText');
        
        if (!container || !alert || !icon || !text) return;
        
        // Set message content
        text.textContent = message;
        
        // Set styling based on type
        if (type === 'success') {
            alert.className = 'px-6 py-4 rounded-lg shadow-lg bg-green-100 border border-green-200 text-green-800';
            icon.className = 'fas fa-check-circle text-xl text-green-600';
        } else if (type === 'error') {
            alert.className = 'px-6 py-4 rounded-lg shadow-lg bg-red-100 border border-red-200 text-red-800';
            icon.className = 'fas fa-exclamation-circle text-xl text-red-600';
        } else {
            alert.className = 'px-6 py-4 rounded-lg shadow-lg bg-blue-100 border border-blue-200 text-blue-800';
            icon.className = 'fas fa-info-circle text-xl text-blue-600';
        }
        
        // Show message with animation
        container.classList.remove('hidden');
        container.style.opacity = '0';
        container.style.transform = 'translateY(-20px)';
        
        setTimeout(() => {
            container.style.transition = 'all 0.3s ease';
            container.style.opacity = '1';
            container.style.transform = 'translateY(0)';
        }, 10);
        
        // Hide message after 4 seconds
        setTimeout(() => {
            container.style.opacity = '0';
            container.style.transform = 'translateY(-20px)';
            setTimeout(() => {
                container.classList.add('hidden');
            }, 300);
        }, 4000);
    }
}

// ===========================
// UI INTERACTION SYSTEM
// ===========================

class UIManager {
    constructor() {
        this.init();
    }

    init() {
        this.setupMobileMenu();
        this.setupInteractiveElements();
        this.setupTimeUpdates();
        this.setupSearchFunctionality();
        this.setupProgressAnimations();
    }

    setupMobileMenu() {
        window.toggleMobileMenu = () => {
            const navbarNav = document.getElementById('navbarNav');
            if (navbarNav) {
                navbarNav.classList.toggle('hidden');
                navbarNav.classList.toggle('flex');
            }
        };

        // Close mobile menu when clicking outside
        document.addEventListener('click', (e) => {
            const navbarNav = document.getElementById('navbarNav');
            const toggleBtn = document.querySelector('[onclick="toggleMobileMenu()"]');
            
            if (navbarNav && !navbarNav.contains(e.target) && !toggleBtn?.contains(e.target)) {
                navbarNav.classList.add('hidden');
                navbarNav.classList.remove('flex');
            }
        });
    }

    setupInteractiveElements() {
        // Add hover effects to cards
        const cards = document.querySelectorAll('.card, .cursor-pointer');
        cards.forEach(card => {
            card.addEventListener('mouseenter', function() {
                this.style.transition = 'all 0.3s ease';
                this.style.transform = 'translateY(-2px)';
                this.style.boxShadow = '0 10px 25px rgba(0, 0, 0, 0.15)';
            });
            
            card.addEventListener('mouseleave', function() {
                this.style.transform = 'translateY(0)';
                this.style.boxShadow = '';
            });
        });

        // Add ripple effect to buttons
        const buttons = document.querySelectorAll('.btn');
        buttons.forEach(button => {
            button.addEventListener('click', function(e) {
                const ripple = document.createElement('span');
                const rect = this.getBoundingClientRect();
                const size = Math.max(rect.width, rect.height);
                const x = e.clientX - rect.left - size / 2;
                const y = e.clientY - rect.top - size / 2;
                
                ripple.style.width = ripple.style.height = size + 'px';
                ripple.style.left = x + 'px';
                ripple.style.top = y + 'px';
                ripple.classList.add('ripple');
                
                this.appendChild(ripple);
                
                setTimeout(() => {
                    ripple.remove();
                }, 600);
            });
        });
    }

    setupTimeUpdates() {
        this.updateTime();
        setInterval(() => this.updateTime(), 60000); // Update every minute
    }

    updateTime() {
        const now = new Date();
        const timeString = now.toLocaleString('ar-SA', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        const footerTime = document.getElementById('lastUpdate');
        if (footerTime) {
            footerTime.textContent = `آخر تحديث: ${timeString}`;
        }
    }

    setupSearchFunctionality() {
        const searchInput = document.querySelector('input[type="text"]');
        if (searchInput) {
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    const searchTerm = searchInput.value.trim();
                    if (searchTerm) {
                        this.performSearch(searchTerm);
                    }
                }
            });

            // Add search suggestions
            searchInput.addEventListener('input', (e) => {
                const searchTerm = e.target.value.trim();
                if (searchTerm.length > 2) {
                    this.showSearchSuggestions(searchTerm);
                } else {
                    this.hideSearchSuggestions();
                }
            });
        }
    }

    performSearch(searchTerm) {
        console.log('البحث عن:', searchTerm);
        // In a real app, this would filter projects or redirect to search results
        // For now, we'll show a message
        const projectManager = new ProjectManager();
        const matchingProjects = projectManager.projects.filter(project => 
            project.name.includes(searchTerm) || 
            project.client.includes(searchTerm) ||
            project.description.includes(searchTerm)
        );
        
        if (matchingProjects.length > 0) {
            projectManager.showMessage(`تم العثور على ${matchingProjects.length} مشاريع`, 'success');
        } else {
            projectManager.showMessage('لم يتم العثور على نتائج', 'info');
        }
    }

    showSearchSuggestions(searchTerm) {
        // Implementation for search suggestions
        // This would show a dropdown with matching projects
    }

    hideSearchSuggestions() {
        // Hide search suggestions dropdown
    }

    setupProgressAnimations() {
        // Animate progress bars on page load
        const progressBars = document.querySelectorAll('.progress-bar, [style*="width:"]');
        progressBars.forEach((bar, index) => {
            const width = bar.style.width || bar.getAttribute('data-width');
            if (width) {
                bar.style.width = '0%';
                bar.style.transition = 'width 1s ease-in-out';
                
                setTimeout(() => {
                    bar.style.width = width;
                }, 100 * (index + 1));
            }
        });
    }
}

// ===========================
// NAVIGATION HELPERS
// ===========================

class NavigationHelper {
    static openNotifications() {
        window.location.href = 'notifications.html';
    }

    static openUserProfile() {
        window.location.href = 'user_profile.html';
    }

    static openProjectDetails(projectId) {
        window.location.href = `projects_management_center.html?project=${projectId}`;
    }

    static goToProjects() {
        window.location.href = 'projects_management_center.html';
    }

    static goToAddProject() {
        window.location.href = 'project_creation_wizard.html';
    }

    static goToDashboard() {
        window.location.href = 'main_dashboard.html';
    }
}

// ===========================
// APPLICATION INITIALIZATION
// ===========================

document.addEventListener('DOMContentLoaded', function() {
    // Initialize all systems
    const auth = new AuthenticationSystem();
    const projectManager = new ProjectManager();
    const uiManager = new UIManager();
    
    // Make navigation functions globally available
    window.openNotifications = NavigationHelper.openNotifications;
    window.openUserProfile = NavigationHelper.openUserProfile;
    window.openProjectDetails = NavigationHelper.openProjectDetails;
    window.goToProjects = NavigationHelper.goToProjects;
    window.goToAddProject = NavigationHelper.goToAddProject;
    window.goToDashboard = NavigationHelper.goToDashboard;
    
    // Add global error handling
    window.addEventListener('error', function(e) {
        console.error('JavaScript Error:', e.error);
        // In production, you might want to send this to a logging service
    });
    
    // Add unhandled promise rejection handling
    window.addEventListener('unhandledrejection', function(e) {
        console.error('Unhandled Promise Rejection:', e.reason);
    });
    
    // Add custom CSS for ripple effects
    if (!document.querySelector('#ripple-styles')) {
        const style = document.createElement('style');
        style.id = 'ripple-styles';
        style.textContent = `
            .btn {
                position: relative;
                overflow: hidden;
            }
            
            .ripple {
                position: absolute;
                border-radius: 50%;
                background: rgba(255, 255, 255, 0.3);
                transform: scale(0);
                animation: ripple-animation 0.6s linear;
                pointer-events: none;
            }
            
            @keyframes ripple-animation {
                to {
                    transform: scale(4);
                    opacity: 0;
                }
            }
            
            .fade-in {
                animation: fadeIn 0.5s ease-in;
            }
            
            @keyframes fadeIn {
                from { opacity: 0; transform: translateY(20px); }
                to { opacity: 1; transform: translateY(0); }
            }
            
            .slide-in {
                animation: slideIn 0.3s ease-out;
            }
            
            @keyframes slideIn {
                from { transform: translateX(-100%); }
                to { transform: translateX(0); }
            }
        `;
        document.head.appendChild(style);
    }
    
    console.log('ContractorPro Application Initialized Successfully');
});

// ===========================
// UTILITY FUNCTIONS
// ===========================

// Format numbers in Arabic locale
function formatNumber(number) {
    return new Intl.NumberFormat('ar-SA').format(number);
}

// Format dates in Arabic
function formatDate(date, options = {}) {
    const defaultOptions = {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        ...options
    };
    return new Date(date).toLocaleDateString('ar-SA', defaultOptions);
}

// Debounce function for performance optimization
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Throttle function for scroll events
function throttle(func, limit) {
    let inThrottle;
    return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// Export classes for use in other modules if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        AuthenticationSystem,
        ProjectManager,
        UIManager,
        NavigationHelper
    };
}