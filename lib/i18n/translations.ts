export type SupportedLanguage = 'en' | 'am' | 'sw' | 'ar' | 'fr' | 'es' | 'om' | 'ti';

export interface LanguageMeta {
    code: SupportedLanguage;
    label: string;
    nativeName: string;
    direction: 'ltr' | 'rtl';
    flag: string;
}

export const SUPPORTED_LANGUAGES: Record<SupportedLanguage, LanguageMeta> = {
    en: { code: 'en', label: 'English', nativeName: 'English', direction: 'ltr', flag: 'GB' },
    am: { code: 'am', label: 'Amharic', nativeName: 'አማርኛ', direction: 'ltr', flag: 'ET' },
    sw: { code: 'sw', label: 'Swahili', nativeName: 'Kiswahili', direction: 'ltr', flag: 'KE' },
    ar: { code: 'ar', label: 'Arabic', nativeName: 'العربية', direction: 'rtl', flag: 'SA' },
    fr: { code: 'fr', label: 'French', nativeName: 'Français', direction: 'ltr', flag: 'FR' },
    es: { code: 'es', label: 'Spanish', nativeName: 'Español', direction: 'ltr', flag: 'ES' },
    om: { code: 'om', label: 'Oromo', nativeName: 'Afaan Oromoo', direction: 'ltr', flag: 'ET' },
    ti: { code: 'ti', label: 'Tigrinya', nativeName: 'ትግርኛ', direction: 'ltr', flag: 'ER' }
};

export const translations = {
    en: {
        common: {
            appName: "LUCY OS",
            tagline: "Autonomous Educational Operating System",
            loading: "Loading...",
            save: "Save Changes",
            saving: "Saving...",
            cancel: "Cancel",
            confirm: "Confirm",
            delete: "Delete",
            edit: "Edit",
            create: "Create",
            search: "Search...",
            filter: "Filter",
            export: "Export",
            status: "Status",
            actions: "Actions",
            success: "Success",
            error: "Error",
            offlineAlert: "You are offline. Your work is safely cached locally and will sync when restored.",
            onlineAlert: "Connection restored. All cached submissions synced seamlessly.",
            connectionLost: "Connection Interrupted",
            connectionRestored: "Telemetry Restored",
            language: "Language",
            selectLanguage: "Select Language"
        },
        auth: {
            signIn: "Sign In",
            signOut: "Sign Out",
            email: "Email Address",
            password: "Password",
            enterEmail: "Enter institutional email",
            forgotPassword: "Forgot Password?",
            loginButton: "Authenticate into Portal"
        },
        dashboard: {
            welcome: "Welcome back",
            overview: "Institutional Overview",
            students: "Students",
            teachers: "Staff & Faculty",
            classes: "Cohorts & Classes",
            attendance: "Live Attendance",
            finance: "Financial Ledger",
            assignments: "Assignments & Curricula",
            exams: "Assessment Engine",
            analytics: "Real-time Telemetry"
        },
        exam: {
            timeRemaining: "Time Remaining",
            submitExam: "Finalize & Submit Exam",
            submitting: "Submitting...",
            question: "Question",
            of: "of",
            next: "Next Question",
            previous: "Previous Question",
            offlineCacheNotice: "Offline auto-saving active",
            confirmSubmission: "Are you sure you want to finalize this exam?"
        },
        finance: {
            totalRevenue: "Gross Revenue",
            pendingInvoices: "Uncollected Balances",
            payroll: "Staff Compensation",
            efficiency: "Collection Efficiency",
            recordPayment: "Record Manual Payment",
            verifyPayment: "Verify & Approve",
            receiptUpload: "Upload Proof Receipt"
        }
    },
    am: {
        common: {
            appName: "ሉሲ ኦኤስ",
            tagline: "ራስ-ገዝየትምህርት ቤት አስተዳደር ሥርዓት",
            loading: "በመጫን ላይ...",
            save: "ለውጦችን አስቀምጥ",
            saving: "በማስቀመጥ ላይ...",
            cancel: "ሰርዝ",
            confirm: "አረጋግጥ",
            delete: "አጥፋ",
            edit: "አስተካክል",
            create: "ፍጠር",
            search: "ፈልግ...",
            filter: "አጣራ",
            export: "ላክ",
            status: "ሁኔታ",
            actions: "እርምጃዎች",
            success: "ተሳክቷል",
            error: "ስህተት",
            offlineAlert: "የኢንተርኔት ግንኙነት ተቋርጧል። ስራዎ በመሳሪያዎ ላይ ተቀምጧል፣ ግንኙነቱ ሲመለስ በራስ-ሰር ይተላለፋል።",
            onlineAlert: "የኢንተርኔት ግንኙነት ተመልሷል። የተቀመጡ መረጃዎች በሙሉ ተመሳስለዋል።",
            connectionLost: "ግንኙነት ተቋርጧል",
            connectionRestored: "ግንኙነት ተመልሷል",
            language: "ቋንቋ",
            selectLanguage: "ቋንቋ ይምረጡ"
        },
        auth: {
            signIn: "ግባ",
            signOut: "ውጣ",
            email: "ኢሜይል",
            password: "የይለፍ ቃል",
            enterEmail: "የተቋሙን ኢሜይል ያስገቡ",
            forgotPassword: "የይለፍ ቃል ረሱ?",
            loginButton: "ወደ መግቢያ ግባ"
        },
        dashboard: {
            welcome: "እንኳን ደህና መጡ",
            overview: "አጠቃላይ እይታ",
            students: "ተማሪዎች",
            teachers: "አስተማሪዎችና ሠራተኞች",
            classes: "ክፍሎች",
            attendance: "የቀን መገኘት",
            finance: "የፋይናንስ መዝገብ",
            assignments: "የቤት ሥራዎች",
            exams: "ፈተናዎች",
            analytics: "ትንታኔዎች"
        },
        exam: {
            timeRemaining: "የቀረ ጊዜ",
            submitExam: "ፈተናውን ጨርስና አስረክብ",
            submitting: "በማስረከብ ላይ...",
            question: "ጥያቄ",
            of: "ከ",
            next: "ቀጣይ ጥያቄ",
            previous: "ያለፈው ጥያቄ",
            offlineCacheNotice: "ያለ ኢንተርኔት በራስ-ሰር በመቀመጥ ላይ",
            confirmSubmission: "ፈተናውን ለማስረከብ እርግጠኛ ኖት?"
        },
        finance: {
            totalRevenue: "ጠቅላላ ገቢ",
            pendingInvoices: "ያልተሰበሰበ ክፍያ",
            payroll: "የሠራተኞች ደመወዝ",
            efficiency: "የስብስብ ብቃት",
            recordPayment: "ክፍያ መዝግብ",
            verifyPayment: "አረጋግጥና አጽድቅ",
            receiptUpload: "ደረሰኝ ስቀል"
        }
    },
    sw: {
        common: {
            appName: "LUCY OS",
            tagline: "Mfumo wa Uendeshaji wa Elimu Unaotawala Kiotomatiki",
            loading: "Inapakia...",
            save: "Hifadhi Mabadiliko",
            saving: "Inahifadhi...",
            cancel: "Ghairi",
            confirm: "Thibitisha",
            delete: "Futa",
            edit: "Hariri",
            create: "Tengeneza",
            search: "Tafuta...",
            filter: "Chuja",
            export: "Hamisha",
            status: "Hali",
            actions: "Vitendo",
            success: "Mafanikio",
            error: "Hitilafu",
            offlineAlert: "Huna mtandao. Kazi yako imehifadhiwa salama kwenye kifaa chako na itatumwa mtandao ukirejea.",
            onlineAlert: "Mtandao umerejea. Kazi zote zilizohifadhiwa zimetumwa kikamilifu.",
            connectionLost: "Muunganisho Umekatika",
            connectionRestored: "Muunganisho Umerejea",
            language: "Lugha",
            selectLanguage: "Chagua Lugha"
        },
        auth: {
            signIn: "Ingia",
            signOut: "Toka",
            email: "Barua Pepe",
            password: "Nenosiri",
            enterEmail: "Weka barua pepe ya taasisi",
            forgotPassword: "Umesahau Nenosiri?",
            loginButton: "Ingia Kwenye Tovuti"
        },
        dashboard: {
            welcome: "Karibu tena",
            overview: "Muhtasari wa Taasisi",
            students: "Wanafunzi",
            teachers: "Walimu na Wafanyakazi",
            classes: "Madarasa",
            attendance: "Mahudhurio ya Moja kwa Moja",
            finance: "Leja ya Fedha",
            assignments: "Kazi za Nyumbani",
            exams: "Mitihani",
            analytics: "Takwimu za Moja kwa Moja"
        },
        exam: {
            timeRemaining: "Muda Uliobaki",
            submitExam: "Kamilisha na Tuma Mtihani",
            submitting: "Inatuma...",
            question: "Swali",
            of: "kati ya",
            next: "Swali Linalofuata",
            previous: "Swali Lililopita",
            offlineCacheNotice: "Inahifadhi kiotomatiki nje ya mtandao",
            confirmSubmission: "Je, una uhakika unataka kukamilisha mtihani huu?"
        },
        finance: {
            totalRevenue: "Mapato Jumla",
            pendingInvoices: "Madeni Yasiyolipwa",
            payroll: "Mishahara ya Wafanyakazi",
            efficiency: "Ufanisi wa Ukusanyaji",
            recordPayment: "Rekodi Malipo",
            verifyPayment: "Thibitisha na Idhinisha",
            receiptUpload: "Pakia Risiti"
        }
    },
    ar: {
        common: {
            appName: "نظام لوسي",
            tagline: "نظام التشغيل التعليمي الذاتي المتكامل",
            loading: "جاري التحميل...",
            save: "حفظ التغييرات",
            saving: "جاري الحفظ...",
            cancel: "إلغاء",
            confirm: "تأكيد",
            delete: "حذف",
            edit: "تعديل",
            create: "إنشاء",
            search: "بحث...",
            filter: "تصفية",
            export: "تصدير",
            status: "الحالة",
            actions: "الإجراءات",
            success: "تم بنجاح",
            error: "خطأ",
            offlineAlert: "أنت غير متصل بالإنترنت. تم حفظ عملك محلياً وسيتم مزامنته تلقائياً عند استعادة الاتصال.",
            onlineAlert: "تمت استعادة الاتصال بالإنترنت ومزامنة جميع البيانات المحفوظة.",
            connectionLost: "انقطع الاتصال",
            connectionRestored: "تمت استعادة الاتصال",
            language: "اللغة",
            selectLanguage: "اختر اللغة"
        },
        auth: {
            signIn: "تسجيل الدخول",
            signOut: "تسجيل الخروج",
            email: "البريد الإلكتروني",
            password: "كلمة المرور",
            enterEmail: "أدخل البريد الإلكتروني للمؤسسة",
            forgotPassword: "هل نسيت كلمة المرور؟",
            loginButton: "الدخول إلى المنصة"
        },
        dashboard: {
            welcome: "مرحباً بك مجدداً",
            overview: "نظرة عامة على المؤسسة",
            students: "الطلاب",
            teachers: "أعضاء هيئة التدريس والموظفون",
            classes: "الصفوف والشعب",
            attendance: "الحضور المباشر",
            finance: "السجل المالي",
            assignments: "الواجبات والمناهج",
            exams: "محرك الاختبارات",
            analytics: "التحليلات اللحظية"
        },
        exam: {
            timeRemaining: "الوقت المتبقي",
            submitExam: "إنهاء وتسليم الاختبار",
            submitting: "جاري التسليم...",
            question: "السؤال",
            of: "من",
            next: "السؤال التالي",
            previous: "السؤال السابق",
            offlineCacheNotice: "الحفظ التلقائي دون اتصال نشط",
            confirmSubmission: "هل أنت متأكد من رغبتك في تسليم هذا الاختبار؟"
        },
        finance: {
            totalRevenue: "إجمالي الإيرادات",
            pendingInvoices: "الفواتير المعلقة",
            payroll: "رواتب الموظفين",
            efficiency: "كفاءة التحصيل",
            recordPayment: "تسجيل دفعة يدوية",
            verifyPayment: "التحقق والاعتماد",
            receiptUpload: "رفع إيصال الدفع"
        }
    },
    fr: {
        common: {
            appName: "LUCY OS",
            tagline: "Système d'Exploitation Éducatif Autonome",
            loading: "Chargement...",
            save: "Enregistrer les modifications",
            saving: "Enregistrement...",
            cancel: "Annuler",
            confirm: "Confirmer",
            delete: "Supprimer",
            edit: "Modifier",
            create: "Créer",
            search: "Rechercher...",
            filter: "Filtrer",
            export: "Exporter",
            status: "Statut",
            actions: "Actions",
            success: "Succès",
            error: "Erreur",
            offlineAlert: "Vous êtes hors ligne. Votre travail est sauvegardé localement et sera synchronisé automatiquement.",
            onlineAlert: "Connexion rétablie. Toutes les données en cache ont été synchronisées.",
            connectionLost: "Connexion Interrompue",
            connectionRestored: "Connexion Rétablie",
            language: "Langue",
            selectLanguage: "Sélectionner la langue"
        },
        auth: {
            signIn: "Se connecter",
            signOut: "Se déconnecter",
            email: "Adresse e-mail",
            password: "Mot de passe",
            enterEmail: "Entrez votre e-mail institutionnel",
            forgotPassword: "Mot de passe oublié ?",
            loginButton: "Accéder au Portail"
        },
        dashboard: {
            welcome: "Bienvenue",
            overview: "Aperçu de l'établissement",
            students: "Élèves",
            teachers: "Corps enseignant & Personnel",
            classes: "Classes & Cohortes",
            attendance: "Présences en direct",
            finance: "Grand livre financier",
            assignments: "Devoirs & Programmes",
            exams: "Moteur d'évaluations",
            analytics: "Télémétrie en temps réel"
        },
        exam: {
            timeRemaining: "Temps Restant",
            submitExam: "Finaliser et Soumettre l'Examen",
            submitting: "Soumission en cours...",
            question: "Question",
            of: "sur",
            next: "Question Suivante",
            previous: "Question Précédente",
            offlineCacheNotice: "Sauvegarde locale active hors ligne",
            confirmSubmission: "Êtes-vous sûr de vouloir soumettre cet examen ?"
        },
        finance: {
            totalRevenue: "Revenu Brut",
            pendingInvoices: "Soldes en Attente",
            payroll: "Rémunération du Personnel",
            efficiency: "Efficacité du Recouvrement",
            recordPayment: "Enregistrer un Paiement Manuel",
            verifyPayment: "Vérifier et Approuver",
            receiptUpload: "Téléverser le Reçu"
        }
    },
    es: {
        common: {
            appName: "LUCY OS",
            tagline: "Sistema Operativo Educativo Autónomo",
            loading: "Cargando...",
            save: "Guardar Cambios",
            saving: "Guardando...",
            cancel: "Cancelar",
            confirm: "Confirmar",
            delete: "Eliminar",
            edit: "Editar",
            create: "Crear",
            search: "Buscar...",
            filter: "Filtrar",
            export: "Exportar",
            status: "Estado",
            actions: "Acciones",
            success: "Éxito",
            error: "Error",
            offlineAlert: "Estás sin conexión. Tu trabajo está guardado localmente y se sincronizará al reconectarse.",
            onlineAlert: "Conexión restaurada. Todos los datos guardados se sincronizaron con éxito.",
            connectionLost: "Conexión Interrumpida",
            connectionRestored: "Conexión Restaurada",
            language: "Idioma",
            selectLanguage: "Seleccionar Idioma"
        },
        auth: {
            signIn: "Iniciar Sesión",
            signOut: "Cerrar Sesión",
            email: "Correo Electrónico",
            password: "Contraseña",
            enterEmail: "Ingrese correo institucional",
            forgotPassword: "¿Olvidó su contraseña?",
            loginButton: "Autenticar en Portal"
        },
        dashboard: {
            welcome: "Bienvenido de nuevo",
            overview: "Resumen Institucional",
            students: "Estudiantes",
            teachers: "Personal y Profesores",
            classes: "Clases y Secciones",
            attendance: "Asistencia en Vivo",
            finance: "Libro Mayor Financiero",
            assignments: "Tareas y Currículo",
            exams: "Motor de Exámenes",
            analytics: "Telemetría en Tiempo Real"
        },
        exam: {
            timeRemaining: "Tiempo Restante",
            submitExam: "Finalizar y Entregar Examen",
            submitting: "Entregando...",
            question: "Pregunta",
            of: "de",
            next: "Siguiente Pregunta",
            previous: "Pregunta Anterior",
            offlineCacheNotice: "Autoguardado sin conexión activo",
            confirmSubmission: "¿Está seguro de que desea entregar este examen?"
        },
        finance: {
            totalRevenue: "Ingresos Brutos",
            pendingInvoices: "Saldos Pendientes",
            payroll: "Nómina de Personal",
            efficiency: "Eficiencia de Cobro",
            recordPayment: "Registrar Pago Manual",
            verifyPayment: "Verificar y Aprobar",
            receiptUpload: "Subir Comprobante"
        }
    },
    om: {
        common: {
            appName: "LUCY OS",
            tagline: "Sirna Bulchiinsa Mana Barumsaa Of-Danda'aa",
            loading: "Fe'aa jira...",
            save: "Jijjiirama Galmeessi",
            saving: "Galmeessaa jira...",
            cancel: "Dhiisi",
            confirm: "Mirkaneessi",
            delete: "Haqi",
            edit: "Gulaali",
            create: "Uumi",
            search: "Barbaadi...",
            filter: "Calali",
            export: "Ergi",
            status: "Haala",
            actions: "Tarkaanfiiwwan",
            success: "Milkaa'eera",
            error: "Dogongora",
            offlineAlert: "Interneetii hin qabdan. Hojiin keessan meeshaa keessan irratti qabameera, yeroo deebi'u ofumaan ergama.",
            onlineAlert: "Interneetiin deebi'eera. Hojiin qabame hundi sirnaan wal-qabateera.",
            connectionLost: "Wal-qunnamtiin Cite",
            connectionRestored: "Wal-qunnamtiin Deebi'e",
            language: "Afaan",
            selectLanguage: "Afaan Filadhu"
        },
        auth: {
            signIn: "Seeni",
            signOut: "Bahi",
            email: "Imeelii",
            password: "Jecha Icceetii",
            enterEmail: "Imeelii dhaabbataa galchaa",
            forgotPassword: "Jecha icceetii irraanfattee?",
            loginButton: "Gara Sirnaatti Seeni"
        },
        dashboard: {
            welcome: "Baga nagaan deebitan",
            overview: "Ilaalcha Waliigalaa",
            students: "Barattoota",
            teachers: "Barsiisota fi Hojjattoota",
            classes: "Kutaalee",
            attendance: "Hordoffii Argamaa",
            finance: "Galmee Maallaqaa",
            assignments: "Hojii Manneen",
            exams: "Qormaatawwan",
            analytics: "Xiinxala Yeroo Qabatamaa"
        },
        exam: {
            timeRemaining: "Yeroo Hafe",
            submitExam: "Qormaata Xumuriitii Galchi",
            submitting: "Galchaa jira...",
            question: "Gaaffii",
            of: "keessaa",
            next: "Gaaffii Itti Aanu",
            previous: "Gaaffii Duraa",
            offlineCacheNotice: "Interneetii malee ofumaan galmeessuun banaadha",
            confirmSubmission: "Qormaata kana xumuruu keessan mirkaneessituu?"
        },
        finance: {
            totalRevenue: "Galii Waliigalaa",
            pendingInvoices: "Kaffaltii Hin Kaffalamne",
            payroll: "Mindaa Hojjattootaa",
            efficiency: "Dandeettii Walitti Qabuu",
            recordPayment: "Kaffaltii Galmeessi",
            verifyPayment: "Mirkaneessi & Eeyyami",
            receiptUpload: "Nagahee Ol-kaayi"
        }
    },
    ti: {
        common: {
            appName: "ሉሲ ኦኤስ",
            tagline: "ርእሰ-ምሕደራዊ ስርዓት ምሕደራ ትምህርቲ",
            loading: "ይጽዕን ኣሎ...",
            save: "ለውጥታት ኣቐምጥ",
            saving: "የቐምጥ ኣሎ...",
            cancel: "ሰርዝ",
            confirm: "ኣረጋግጽ",
            delete: "ኣጥፍእ",
            edit: "ኣዐሪ",
            create: "ፍጠር",
            search: "ድለ...",
            filter: "ኣጻሪ",
            export: "ሰደድ",
            status: "ኩነታት",
            actions: "ስጉምትታት",
            success: "ተዓዊቱ",
            error: "ጌጋ",
            offlineAlert: "ኢንተርነት የለን። ስራሕኩም ኣብዚ ተዓቂቡ ኣሎ፡ ኢንተርነት ምስ ተመልሰ ብቐጥታ ክሰጋገፅ እዩ።",
            onlineAlert: "ኢንተርነት ተመሊሱ ኣሎ። ኩሉ ዝተዓቀበ ሓበሬታ ብትኽክል ተሰጋጊሩ።",
            connectionLost: "ርክብ ተቛሪጹ",
            connectionRestored: "ርክብ ተመሊሱ",
            language: "ቋንቋ",
            selectLanguage: "ቋንቋ ምረጽ"
        },
        auth: {
            signIn: "እቶ",
            signOut: "ውጻእ",
            email: "ኢመይል",
            password: "መሕለፊ ቃል",
            enterEmail: "ናይቲ ትካል ኢመይል ኣእቱ",
            forgotPassword: "መሕለፊ ቃል ረሲዕካዮ?",
            loginButton: "ናብቲ ፖርታል እቶ"
        },
        dashboard: {
            welcome: "እንቋዕ ብደሓን መጻእኩም",
            overview: "ሓፈሻዊ ትሕዝቶ",
            students: "ተመሃሮ",
            teachers: "መምህራንን ሰራሕተኛታትን",
            classes: "ክፍልታት",
            attendance: "ናይ ቀረባ ተረኽቦ",
            finance: "ፋይናንሳዊ መዝገብ",
            assignments: "ዕዮ ገዛ",
            exams: "ፈተናታት",
            analytics: "ትንተናታት"
        },
        exam: {
            timeRemaining: "ዝተረፈ ግዜ",
            submitExam: "ፈተና ወዲእካ ኣረክብ",
            submitting: "የረክብ ኣሎ...",
            question: "ሕቶ",
            of: "ካብ",
            next: "ዝቕጽል ሕቶ",
            previous: "ዝሓለፈ ሕቶ",
            offlineCacheNotice: "ብዘይ ኢንተርነት ባዕሉ ምዕቃብ ይሰርሕ ኣሎ",
            confirmSubmission: "ነዚ ፈተና ንምርካብ ርግጸኛ ዲኻ?"
        },
        finance: {
            totalRevenue: "ሓፈሻዊ ኣታዊ",
            pendingInvoices: "ዘይተኸፍለ ዕዳ",
            payroll: "መሃያ ሰራሕተኛታት",
            efficiency: "ብቕዓት ምእካብ",
            recordPayment: "ክፍሊት መዝግብ",
            verifyPayment: "ኣረጋግጽን ኣጽድቕን",
            receiptUpload: "ቅብሊት ጽዓን"
        }
    }
};

export function getTranslation(lang: SupportedLanguage = 'en') {
    return translations[lang] || translations.en;
}
