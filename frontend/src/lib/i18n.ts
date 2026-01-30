import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Translation resources
const resources = {
  en: {
    translation: {
      // Navigation
      nav: {
        home: 'Home',
        vendors: 'Vendors',
        login: 'Login',
        register: 'Register',
        dashboard: 'Dashboard',
        logout: 'Logout',
        profile: 'Profile',
        darkMode: 'Dark Mode',
        lightMode: 'Light Mode'
      },
      // Common UI
      common: {
        loading: 'Loading...',
        save: 'Save',
        cancel: 'Cancel',
        delete: 'Delete',
        edit: 'Edit',
        submit: 'Submit',
        back: 'Back',
        next: 'Next',
        previous: 'Previous',
        search: 'Search',
        filter: 'Filter',
        clear: 'Clear',
        close: 'Close',
        open: 'Open',
        yes: 'Yes',
        no: 'No',
        ok: 'OK',
        error: 'Error',
        success: 'Success',
        warning: 'Warning',
        info: 'Information'
      },
      // Home page
      home: {
        title: 'Plan Your Perfect Ethiopian Wedding',
        subtitle: 'Connect with verified vendors, manage guests, and create unforgettable memories with WedHabesha',
        getStarted: 'Get Started',
        learnMore: 'Learn More',
        features: {
          guestManagement: {
            title: 'Smart Guest Management',
            description: 'Effortlessly manage your guest list with QR codes, real-time check-in, and SMS invitations in Amharic and English.',
            stats: '500+ Guests Managed Daily'
          },
          vendorNetwork: {
            title: 'Verified Vendor Network',
            description: 'Connect with verified wedding vendors across Ethiopia. From traditional Melse dress makers to modern photographers.',
            stats: '200+ Verified Vendors'
          },
          budgetTracking: {
            title: 'Smart Budget Tracking',
            description: 'Track expenses with comprehensive budget planning tools in Ethiopian Birr. Get alerts and insights.',
            stats: 'Average 30% Cost Savings'
          }
        },
        vendorCategories: {
          photography: 'Photography',
          catering: 'Catering',
          music: 'Music & DJ',
          decor: 'Decor',
          transport: 'Transport',
          makeup: 'Makeup'
        },
        testimonials: {
          title: 'What Couples Say About Us',
          testimonial1: {
            text: 'WedHabesha made our wedding planning so much easier. The guest management system was perfect!',
            author: 'Meron & Daniel',
            location: 'Addis Ababa'
          },
          testimonial2: {
            text: 'Found amazing vendors through the platform. Our photographer was incredible and understood our traditions.',
            author: 'Sara & Michael',
            location: 'Bahir Dar'
          },
          testimonial3: {
            text: 'The budget tracking helped us stay on track with our finances without stress. Highly recommend!',
            author: 'Hanan & Yonas',
            location: 'Hawassa'
          }
        }
      },
      // About page
      about: {
        title: 'About WedHabesha',
        subtitle: 'Celebrating Love, Honoring Tradition',
        description: 'We\'re on a mission to make Ethiopian wedding planning effortless while preserving the rich cultural traditions that make each celebration unique and meaningful.',
        stats: {
          couples: 'Happy Couples',
          vendors: 'Verified Vendors', 
          cities: 'Cities Covered',
          success: 'Success Rate'
        },
        story: {
          title: 'Our Story',
          content: 'WedHabesha was born from a simple observation: Ethiopian weddings are incredibly beautiful and complex, but planning them shouldn\'t be overwhelming.'
        },
        values: {
          title: 'Our Values',
          subtitle: 'These core principles guide everything we do and every decision we make.',
          heritage: {
            title: 'Cultural Heritage',
            description: 'We celebrate and preserve Ethiopian wedding traditions while embracing modern convenience.'
          },
          trust: {
            title: 'Trust & Security', 
            description: 'Your personal information and wedding details are protected with enterprise-grade security.'
          },
          community: {
            title: 'Community First',
            description: 'We\'re built by Ethiopians, for Ethiopians, understanding the unique needs of our community.'
          },
          excellence: {
            title: 'Excellence',
            description: 'We strive for perfection in every detail, just like your special day deserves.'
          }
        },
        journey: {
          title: 'Our Journey',
          subtitle: 'From a simple idea to serving thousands of couples worldwide.'
        },
        team: {
          title: 'Meet Our Team',
          subtitle: 'Passionate individuals dedicated to making your wedding dreams come true.'
        },
        contact: {
          title: 'Get In Touch',
          subtitle: 'Have questions? We\'d love to hear from you. Send us a message and we\'ll respond as soon as possible.',
          email: 'Email Us',
          phone: 'Call Us',
          visit: 'Visit Us'
        },
        cta: {
          title: 'Ready to Start Planning?',
          subtitle: 'Join thousands of Ethiopian couples who trust WedHabesha to make their special day perfect.',
          getStarted: 'Get Started Free',
          browseVendors: 'Browse Vendors'
        }
      },
      // Authentication
      auth: {
        login: {
          title: 'Welcome Back',
          subtitle: 'Sign in to your account',
          email: 'Email',
          phone: 'Phone Number',
          password: 'Password',
          loginButton: 'Sign In',
          forgotPassword: 'Forgot Password?',
          noAccount: "Don't have an account?",
          signUp: 'Sign up',
          googleLogin: 'Continue with Google',
          or: 'or',
          emailPlaceholder: 'Enter your email',
          phonePlaceholder: 'Enter your phone number',
          passwordPlaceholder: 'Enter your password'
        },
        register: {
          title: 'Create Account',
          subtitle: 'Join WedHabesha today',
          firstName: 'First Name',
          lastName: 'Last Name',
          email: 'Email',
          phone: 'Phone Number',
          password: 'Password',
          confirmPassword: 'Confirm Password',
          userType: 'I am a',
          couple: 'Couple',
          vendor: 'Vendor',
          registerButton: 'Create Account',
          hasAccount: 'Already have an account?',
          signIn: 'Sign in',
          terms: 'I agree to the Terms of Service and Privacy Policy'
        },
        errors: {
          invalidCredentials: 'Invalid email or password',
          networkError: 'Network error. Please check your connection.',
          serverError: 'Server error. Please try again later.',
          validationError: 'Please check your input and try again.',
          twoFactorRequired: '2FA verification required',
          invalidCode: 'Invalid verification code',
          expiredCode: 'Verification code has expired',
          tooManyAttempts: 'Too many attempts. Please try again later.'
        }
      },
      // Dashboard
      dashboard: {
        welcome: 'Welcome back',
        overview: 'Overview',
        guests: 'Guests',
        vendors: 'Vendors',
        budget: 'Budget',
        timeline: 'Timeline',
        messages: 'Messages',
        settings: 'Settings'
      },
      // Language switcher
      language: {
        english: 'English',
        amharic: 'አማርኛ',
        switchTo: 'Switch to {{language}}'
      }
    }
  },
  am: {
    translation: {
      // Navigation
      nav: {
        home: 'መነሻ',
        vendors: 'አቅራቢዎች',
        login: 'ግባ',
        register: 'ተመዝገብ',
        dashboard: 'ዳሽቦርድ',
        logout: 'ውጣ',
        profile: 'መገለጫ',
        darkMode: 'ጨለማ ገጽታ',
        lightMode: 'ብሩህ ገጽታ'
      },
      // Common UI
      common: {
        loading: 'በመጫን ላይ...',
        save: 'አስቀምጥ',
        cancel: 'ሰርዝ',
        delete: 'ሰርዝ',
        edit: 'አርም',
        submit: 'ላክ',
        back: 'ተመለስ',
        next: 'ቀጣይ',
        previous: 'ቀዳሚ',
        search: 'ፈልግ',
        filter: 'አጣራ',
        clear: 'አጽዳ',
        close: 'ዝጋ',
        open: 'ክፈት',
        yes: 'አዎ',
        no: 'አይ',
        ok: 'እሺ',
        error: 'ስህተት',
        success: 'ተሳክቷል',
        warning: 'ማስጠንቀቂያ',
        info: 'መረጃ'
      },
      // Home page
      home: {
        title: 'የእርስዎን ፍጹም የኢትዮጵያ ሰርግ ያቅዱ',
        subtitle: 'ከተረጋገጡ አቅራቢዎች ጋር ይገናኙ፣ እንግዶችን ያስተዳድሩ እና ከWedHabesha ጋር የማይረሱ ትዝታዎችን ይፍጠሩ',
        getStarted: 'ጀምር',
        learnMore: 'የበለጠ ለመረዳት',
        features: {
          guestManagement: {
            title: 'ብልህ የእንግዳ አስተዳደር',
            description: 'በQR ኮዶች፣ በቅጽበታዊ ምዝገባ እና በአማርኛ እና እንግሊዝኛ SMS ግብዣዎች የእንግዳ ዝርዝርዎን በቀላሉ ያስተዳድሩ።',
            stats: 'በቀን 500+ እንግዶች ተስተዳድረዋል'
          },
          vendorNetwork: {
            title: 'የተረጋገጠ የአቅራቢዎች አውታረ መረብ',
            description: 'በኢትዮጵያ ውስጥ ካሉ የተረጋገጡ የሰርግ አቅራቢዎች ጋር ይገናኙ። ከባህላዊ የመልሴ ልብስ ሰሪዎች እስከ ዘመናዊ ፎቶግራፈሮች።',
            stats: '200+ የተረጋገጡ አቅራቢዎች'
          },
          budgetTracking: {
            title: 'ብልህ የበጀት ክትትል',
            description: 'በኢትዮጵያ ብር ውስጥ ባሉ ሰፊ የበጀት እቅድ መሳሪያዎች ወጪዎችን ይከታተሉ። ማስጠንቀቂያዎችን እና ግንዛቤዎችን ያግኙ።',
            stats: 'በአማካይ 30% የወጪ ቁጠባ'
          }
        },
        vendorCategories: {
          photography: 'ፎቶግራፊ',
          catering: 'የምግብ አቅርቦት',
          music: 'ሙዚቃ እና ዲጄ',
          decor: 'ማስዋቢያ',
          transport: 'መጓጓዣ',
          makeup: 'ሜካፕ'
        },
        testimonials: {
          title: 'ጥንዶች ስለ እኛ ምን ይላሉ',
          testimonial1: {
            text: 'WedHabesha የሰርግ እቅዳችንን በጣም ቀላል አድርጎታል። የእንግዳ አስተዳደር ስርዓቱ ፍጹም ነበር!',
            author: 'መሮን እና ዳንኤል',
            location: 'አዲስ አበባ'
          },
          testimonial2: {
            text: 'በመድረኩ በኩል አስደናቂ አቅራቢዎችን አግኝተናል። ፎቶግራፈራችን አስደናቂ ነበር እና ባህላችንን ተረድቷል።',
            author: 'ሳራ እና ሚካኤል',
            location: 'ባሕር ዳር'
          },
          testimonial3: {
            text: 'የበጀት ክትትሉ ያለ ጭንቀት በገንዘባችን ላይ እንድንቆይ ረድቶናል። በጣም እመክራለሁ!',
            author: 'ሐናን እና ዮናስ',
            location: 'ሐዋሳ'
          }
        }
      },
      // About page
      about: {
        title: 'ስለ WedHabesha',
        subtitle: 'ፍቅርን ማክበር፣ ባህልን ማክበር',
        description: 'የኢትዮጵያ የሰርግ እቅድ ቀላል ማድረግ እና እያንዳንዱን በዓል ልዩ እና ትርጉም ያለው የሚያደርጉትን ባህላዊ ወጎች መጠበቅ የእኛ ተልእኮ ነው።',
        stats: {
          couples: 'ደስተኛ ጥንዶች',
          vendors: 'የተረጋገጡ አቅራቢዎች', 
          cities: 'የተሸፈኑ ከተሞች',
          success: 'የስኬት መጠን'
        },
        story: {
          title: 'የእኛ ታሪክ',
          content: 'WedHabesha ከቀላል ምልከታ የተወለደ ነው፡ የኢትዮጵያ ሰርጎች በሚያስደንቅ ሁኔታ ቆንጆ እና ውስብስብ ናቸው፣ ነገር ግን እቅዳቸው አድካሚ መሆን የለበትም።'
        },
        values: {
          title: 'የእኛ እሴቶች',
          subtitle: 'እነዚህ ዋና መርሆዎች የምናደርገውን ሁሉ እና የምንወስደውን ውሳኔ ሁሉ ይመራሉ።',
          heritage: {
            title: 'ባህላዊ ውርስ',
            description: 'ዘመናዊ ምቾትን እየተቀበልን የኢትዮጵያ የሰርግ ወጎችን እናከብራለን እና እንጠብቃለን።'
          },
          trust: {
            title: 'እምነት እና ደህንነት', 
            description: 'የእርስዎ የግል መረጃ እና የሰርግ ዝርዝሮች በድርጅት ደረጃ ደህንነት የተጠበቁ ናቸው።'
          },
          community: {
            title: 'ማህበረሰብ በመጀመሪያ',
            description: 'በኢትዮጵያውያን የተገነባን፣ ለኢትዮጵያውያን፣ የማህበረሰባችንን ልዩ ፍላጎቶች እንረዳለን።'
          },
          excellence: {
            title: 'ብቃት',
            description: 'የእርስዎ ልዩ ቀን እንደሚገባው በእያንዳንዱ ዝርዝር ውስጥ ፍጽምናን እንፈልጋለን።'
          }
        },
        journey: {
          title: 'የእኛ ጉዞ',
          subtitle: 'ከቀላል ሀሳብ እስከ በሺዎች የሚቆጠሩ ጥንዶችን በዓለም ዙሪያ ማገልገል።'
        },
        team: {
          title: 'የእኛን ቡድን ይወቁ',
          subtitle: 'የሰርግ ህልሞችዎን እውን ለማድረግ የተወሰኑ ተሳታፊ ግለሰቦች።'
        },
        contact: {
          title: 'ይገናኙ',
          subtitle: 'ጥያቄዎች አሉዎት? ከእርስዎ መስማት እንወዳለን። መልእክት ይላኩልን እና በተቻለ ፍጥነት እንመልሳለን።',
          email: 'ኢሜይል ይላኩ',
          phone: 'ይደውሉ',
          visit: 'ይጎብኙን'
        },
        cta: {
          title: 'ማቀድ ለመጀመር ዝግጁ ነዎት?',
          subtitle: 'ልዩ ቀናቸውን ፍጹም ለማድረግ WedHabeshaን የሚያምኑ በሺዎች የሚቆጠሩ የኢትዮጵያ ጥንዶችን ይቀላቀሉ።',
          getStarted: 'በነጻ ይጀምሩ',
          browseVendors: 'አቅራቢዎችን ያስሱ'
        }
      },
      // Authentication
      auth: {
        login: {
          title: 'እንኳን ደህና መጡ',
          subtitle: 'ወደ መለያዎ ይግቡ',
          email: 'ኢሜይል',
          phone: 'ስልክ ቁጥር',
          password: 'የይለፍ ቃል',
          loginButton: 'ግባ',
          forgotPassword: 'የይለፍ ቃልዎን ረሱት?',
          noAccount: 'መለያ የለዎትም?',
          signUp: 'ተመዝገቡ',
          googleLogin: 'በGoogle ይቀጥሉ',
          or: 'ወይም',
          emailPlaceholder: 'ኢሜይልዎን ያስገቡ',
          phonePlaceholder: 'ስልክ ቁጥርዎን ያስገቡ',
          passwordPlaceholder: 'የይለፍ ቃልዎን ያስገቡ'
        },
        register: {
          title: 'መለያ ፍጠር',
          subtitle: 'ዛሬ WedHabesha ይቀላቀሉ',
          firstName: 'ስም',
          lastName: 'የአባት ስም',
          email: 'ኢሜይል',
          phone: 'ስልክ ቁጥር',
          password: 'የይለፍ ቃል',
          confirmPassword: 'የይለፍ ቃል አረጋግጥ',
          userType: 'እኔ',
          couple: 'ጥንድ',
          vendor: 'አቅራቢ',
          registerButton: 'መለያ ፍጠር',
          hasAccount: 'ቀደም ሲል መለያ አለዎት?',
          signIn: 'ግቡ',
          terms: 'የአገልግሎት ውሎችን እና የግላዊነት ፖሊሲን እቀበላለሁ'
        },
        errors: {
          invalidCredentials: 'ልክ ያልሆነ ኢሜይል ወይም የይለፍ ቃል',
          networkError: 'የአውታረ መረብ ስህተት። እባክዎ ግንኙነትዎን ይፈትሹ።',
          serverError: 'የአገልጋይ ስህተት። እባክዎ ቆይተው ይሞክሩ።',
          validationError: 'እባክዎ ግቤትዎን ይፈትሹ እና እንደገና ይሞክሩ።',
          twoFactorRequired: '2FA ማረጋገጫ ያስፈልጋል',
          invalidCode: 'ልክ ያልሆነ የማረጋገጫ ኮድ',
          expiredCode: 'የማረጋገጫ ኮዱ ጊዜው አልፏል',
          tooManyAttempts: 'በጣም ብዙ ሙከራዎች። እባክዎ ቆይተው ይሞክሩ።'
        }
      },
      // Dashboard
      dashboard: {
        welcome: 'እንኳን ደህና መጡ',
        overview: 'አጠቃላይ እይታ',
        guests: 'እንግዶች',
        vendors: 'አቅራቢዎች',
        budget: 'በጀት',
        timeline: 'የጊዜ መስመር',
        messages: 'መልዕክቶች',
        settings: 'ቅንብሮች'
      },
      // Language switcher
      language: {
        english: 'English',
        amharic: 'አማርኛ',
        switchTo: 'ወደ {{language}} ቀይር'
      }
    }
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    debug: process.env.NODE_ENV === 'development',
    
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng'
    },

    interpolation: {
      escapeValue: false, // React already escapes values
    },

    react: {
      useSuspense: false
    }
  });

export default i18n;