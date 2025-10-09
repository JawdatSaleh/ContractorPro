<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>بوابة إنشاء الفواتير المتقدمة - ContractorPro</title>
    <link rel="stylesheet" href="../css/main.css" />
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet" />

<script type="module" src="https://static.rocket.new/rocket-web.js?_cfg=https%3A%2F%2Fcontractor7112back.builtwithrocket.new&_be=https%3A%2F%2Fapplication.rocket.new&_v=0.1.8"></script>
<script type="module" src="https://static.rocket.new/rocket-shot.js?v=0.0.1"></script>
</head>
<body class="bg-gradient-to-br from-gray-50 to-blue-50 font-arabic min-h-screen">
    
    <!-- Top Navigation Bar -->
    <nav class="bg-white/80 backdrop-blur-md shadow-lg px-8 py-4 border-b border-white/20 sticky top-0 z-50">
        <div class="flex items-center justify-between">
            <div class="flex items-center gap-6">
                <button onclick="goBack()" class="w-12 h-12 bg-gradient-to-br from-primary to-primary-600 rounded-2xl flex items-center justify-center text-white hover:shadow-lg transition-all">
                    <i class="fas fa-arrow-right text-lg"></i>
                </button>
                
                <div>
                    <h1 class="text-2xl font-black text-text-primary bg-gradient-to-r from-primary to-primary-600 bg-clip-text text-transparent">بوابة إنشاء الفواتير المتقدمة</h1>
                    <p class="text-text-secondary font-medium">إنشاء فواتير ضريبية متوافقة مع هيئة الزكاة والضريبة والجمارك</p>
                </div>
            </div>
            
            <div class="flex items-center gap-4">
                <!-- Progress Indicator -->
                <div class="flex items-center gap-2 bg-white/60 rounded-2xl px-4 py-2">
                    <i class="fas fa-tasks text-primary"></i>
                    <span class="text-sm font-medium text-text-secondary">خطوة <span id="current-step" class="text-primary font-bold">1</span> من 4</span>
                </div>
                
                <!-- Save Draft -->
                <button onclick="saveDraft()" class="bg-white/60 text-text-secondary px-4 py-2 rounded-2xl hover:bg-white hover:shadow-md transition-all flex items-center gap-2">
                    <i class="fas fa-save"></i>
                    <span>حفظ مسودة</span>
                </button>
            </div>
        </div>
    </nav>

    <div class="max-w-7xl mx-auto p-8">
        <!-- Progress Steps -->
        <div class="mb-8">
            <div class="flex items-center justify-center gap-4 mb-8">
                <div class="flex items-center">
                    <div class="w-10 h-10 bg-gradient-to-r from-primary to-primary-600 text-white rounded-full flex items-center justify-center font-bold step-indicator active" data-step="1">1</div>
                    <span class="mr-3 font-medium text-primary">معلومات العميل</span>
                </div>
                <div class="w-16 h-1 bg-gray-200 rounded"></div>
                <div class="flex items-center">
                    <div class="w-10 h-10 bg-gray-200 text-gray-500 rounded-full flex items-center justify-center font-bold step-indicator" data-step="2">2</div>
                    <span class="mr-3 font-medium text-gray-500">تفاصيل الفاتورة</span>
                </div>
                <div class="w-16 h-1 bg-gray-200 rounded"></div>
                <div class="flex items-center">
                    <div class="w-10 h-10 bg-gray-200 text-gray-500 rounded-full flex items-center justify-center font-bold step-indicator" data-step="3">3</div>
                    <span class="mr-3 font-medium text-gray-500">المراجعة</span>
                </div>
                <div class="w-16 h-1 bg-gray-200 rounded"></div>
                <div class="flex items-center">
                    <div class="w-10 h-10 bg-gray-200 text-gray-500 rounded-full flex items-center justify-center font-bold step-indicator" data-step="4">4</div>
                    <span class="mr-3 font-medium text-gray-500">الإنهاء</span>
                </div>
            </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <!-- Main Content -->
            <div class="lg:col-span-2">
                <!-- Step 1: Client Information -->
                <div id="step-1" class="step-content">
                    <div class="bg-white/80 backdrop-blur-sm rounded-3xl p-8 shadow-xl border border-white/50">
                        <div class="flex items-center gap-4 mb-8">
                            <div class="w-16 h-16 bg-gradient-to-br from-primary to-primary-600 rounded-2xl flex items-center justify-center">
                                <i class="fas fa-user-tie text-white text-2xl"></i>
                            </div>
                            <div>
                                <h2 class="text-3xl font-bold text-text-primary">معلومات العميل</h2>
                                <p class="text-text-secondary">اختر العميل أو أضف عميل جديد</p>
                            </div>
                        </div>

                        <!-- Client Selection -->
                        <div class="mb-8">
                            <div class="flex items-center justify-between mb-4">
                                <label class="text-lg font-bold text-text-primary">اختيار العميل</label>
                                <button onclick="toggleClientForm()" class="bg-gradient-to-r from-success to-success-600 text-white px-4 py-2 rounded-2xl hover:shadow-lg transition-all flex items-center gap-2" id="add-client-btn">
                                    <i class="fas fa-plus"></i>
                                    <span>إضافة عميل جديد</span>
                                </button>
                            </div>

                            <!-- Existing Client Search -->
                            <div id="client-search-section">
                                <div class="relative mb-6">
                                    <input type="text" id="client-search" placeholder="ابحث عن العميل..." class="w-full px-6 py-4 rounded-2xl bg-white/60 border border-white/30 focus:bg-white focus:border-primary focus:outline-none text-lg transition-all" oninput="searchClients(this.value)" />
                                    <i class="fas fa-search absolute left-4 top-1/2 transform -translate-y-1/2 text-text-secondary"></i>
                                </div>

                                <!-- Client List -->
                                <div id="clients-list" class="space-y-3">
                                    <div class="client-option bg-gradient-to-r from-white to-blue-50 p-4 rounded-2xl border border-blue-100 hover:shadow-lg transition-all cursor-pointer" onclick="selectClient('محمد العبدالله', '1234567890', 'mohammed@example.com', 'الرياض، المملكة العربية السعودية')">
                                        <div class="flex items-center gap-4">
                                            <div class="w-12 h-12 bg-gradient-to-br from-primary to-primary-600 rounded-2xl flex items-center justify-center text-white font-bold">م.ع</div>
                                            <div class="flex-1">
                                                <h4 class="font-bold text-text-primary text-lg">محمد العبدالله</h4>
                                                <p class="text-sm text-text-secondary">الهاتف: 1234567890 • البريد: mohammed@example.com</p>
                                                <p class="text-xs text-text-secondary">الرياض، المملكة العربية السعودية</p>
                                            </div>
                                            <div class="text-success">
                                                <i class="fas fa-check-circle text-2xl"></i>
                                            </div>
                                        </div>
                                    </div>

                                    <div class="client-option bg-gradient-to-r from-white to-green-50 p-4 rounded-2xl border border-green-100 hover:shadow-lg transition-all cursor-pointer" onclick="selectClient('شركة الأندلس للمقاولات', '9876543210', 'info@andalus.com', 'جدة، المملكة العربية السعودية')">
                                        <div class="flex items-center gap-4">
                                            <div class="w-12 h-12 bg-gradient-to-br from-success to-success-600 rounded-2xl flex items-center justify-center text-white font-bold">ش.أ</div>
                                            <div class="flex-1">
                                                <h4 class="font-bold text-text-primary text-lg">شركة الأندلس للمقاولات</h4>
                                                <p class="text-sm text-text-secondary">الهاتف: 9876543210 • البريد: info@andalus.com</p>
                                                <p class="text-xs text-text-secondary">جدة، المملكة العربية السعودية</p>
                                            </div>
                                            <div class="text-success">
                                                <i class="fas fa-check-circle text-2xl"></i>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- New Client Form -->
                            <div id="new-client-form" class="hidden">
                                <div class="bg-gradient-to-r from-white to-green-50 rounded-2xl p-6 border border-green-100">
                                    <h3 class="text-xl font-bold text-text-primary mb-6 flex items-center gap-3">
                                        <i class="fas fa-user-plus text-success"></i>
                                        إضافة عميل جديد
                                    </h3>
                                    
                                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label class="block text-sm font-bold text-text-primary mb-2">اسم العميل *</label>
                                            <input type="text" id="new-client-name" placeholder="أدخل اسم العميل" class="w-full px-4 py-3 rounded-2xl bg-white/60 border border-white/30 focus:bg-white focus:border-primary focus:outline-none transition-all" />
                                        </div>
                                        
                                        <div>
                                            <label class="block text-sm font-bold text-text-primary mb-2">رقم الهاتف *</label>
                                            <input type="tel" id="new-client-phone" placeholder="+966 5X XXX XXXX" class="w-full px-4 py-3 rounded-2xl bg-white/60 border border-white/30 focus:bg-white focus:border-primary focus:outline-none transition-all" />
                                        </div>
                                        
                                        <div>
                                            <label class="block text-sm font-bold text-text-primary mb-2">البريد الإلكتروني</label>
                                            <input type="email" id="new-client-email" placeholder="client@example.com" class="w-full px-4 py-3 rounded-2xl bg-white/60 border border-white/30 focus:bg-white focus:border-primary focus:outline-none transition-all" />
                                        </div>
                                        
                                        <div>
                                            <label class="block text-sm font-bold text-text-primary mb-2">الرقم الضريبي</label>
                                            <input type="text" id="new-client-tax-id" placeholder="300000000000003" class="w-full px-4 py-3 rounded-2xl bg-white/60 border border-white/30 focus:bg-white focus:border-primary focus:outline-none transition-all" />
                                        </div>
                                        
                                        <div class="md:col-span-2">
                                            <label class="block text-sm font-bold text-text-primary mb-2">العنوان *</label>
                                            <textarea id="new-client-address" placeholder="العنوان الكامل للعميل" rows="3" class="w-full px-4 py-3 rounded-2xl bg-white/60 border border-white/30 focus:bg-white focus:border-primary focus:outline-none transition-all resize-none"></textarea>
                                        </div>
                                    </div>
                                    
                                    <div class="flex items-center gap-4 mt-6">
                                        <button onclick="saveNewClient()" class="bg-gradient-to-r from-success to-success-600 text-white px-6 py-3 rounded-2xl font-bold hover:shadow-lg transition-all flex items-center gap-2">
                                            <i class="fas fa-save"></i>
                                            حفظ العميل
                                        </button>
                                        <button onclick="toggleClientForm()" class="bg-gray-200 text-text-secondary px-6 py-3 rounded-2xl font-bold hover:bg-gray-300 transition-all">
                                            إلغاء
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <!-- Selected Client Display -->
                            <div id="selected-client" class="hidden">
                                <div class="bg-gradient-to-r from-primary-50 to-primary-100 p-6 rounded-2xl border border-primary-200">
                                    <div class="flex items-center justify-between mb-4">
                                        <h3 class="text-xl font-bold text-primary">العميل المحدد</h3>
                                        <button onclick="clearSelectedClient()" class="text-error hover:bg-error-100 rounded-xl p-2 transition-all">
                                            <i class="fas fa-times"></i>
                                        </button>
                                    </div>
                                    
                                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label class="text-sm font-bold text-text-primary">اسم العميل</label>
                                            <p id="selected-client-name" class="text-lg font-bold text-text-primary">-</p>
                                        </div>
                                        <div>
                                            <label class="text-sm font-bold text-text-primary">رقم الهاتف</label>
                                            <p id="selected-client-phone" class="text-lg font-medium text-text-secondary">-</p>
                                        </div>
                                        <div>
                                            <label class="text-sm font-bold text-text-primary">البريد الإلكتروني</label>
                                            <p id="selected-client-email" class="text-lg font-medium text-text-secondary">-</p>
                                        </div>
                                        <div>
                                            <label class="text-sm font-bold text-text-primary">العنوان</label>
                                            <p id="selected-client-address" class="text-lg font-medium text-text-secondary">-</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Project Association -->
                        <div class="mb-8">
                            <label class="block text-lg font-bold text-text-primary mb-4">ربط المشروع (اختياري)</label>
                            <select id="project-select" class="w-full px-6 py-4 rounded-2xl bg-white/60 border border-white/30 focus:bg-white focus:border-primary focus:outline-none text-lg transition-all">
                                <option value>اختر مشروع (اختياري)</option>
                                <option value="villa-riyadh">فيلا الرياض الحديثة</option>
                                <option value="complex-jeddah">مجمع تجاري جدة</option>
                                <option value="residential-dammam">مشروع سكني الدمام</option>
                            </select>
                        </div>

                        <!-- Action Buttons -->
                        <div class="flex items-center justify-between pt-6 border-t border-white/30">
                            <div></div>
                            <button onclick="nextStep()" id="