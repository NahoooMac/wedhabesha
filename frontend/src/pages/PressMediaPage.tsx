import React from 'react';
import { 
  Heart, 
  Users,
  Award,
  Newspaper,
  Mail,
  Phone,
  Globe
} from 'lucide-react';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';

const PressMediaPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      <Header />
      
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-rose-50 to-pink-50 dark:from-gray-900 dark:to-gray-800 py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <div className="flex items-center justify-center gap-2 mb-6">
              <div className="w-12 h-12 bg-rose-600 rounded-xl flex items-center justify-center">
                <Newspaper className="w-6 h-6 text-white" />
              </div>
              <span className="text-2xl font-bold font-menbere">Press & Media</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6 font-menbere">
              WedHabesha in the News
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 leading-relaxed">
              Discover our story, download media assets, and get the latest updates 
              about WedHabesha's mission to revolutionize Ethiopian wedding planning.
            </p>
          </div>
        </div>
      </section>

      {/* Company Stats */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-6 font-menbere">
              By the Numbers
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300">
              WedHabesha's impact on the Ethiopian wedding industry
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-rose-100 dark:bg-rose-900/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-rose-600" />
              </div>
              <div className="text-3xl font-bold text-gray-900 dark:text-white mb-2">25,000+</div>
              <div className="text-gray-600 dark:text-gray-300">Registered Users</div>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-rose-100 dark:bg-rose-900/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Heart className="w-8 h-8 text-rose-600" />
              </div>
              <div className="text-3xl font-bold text-gray-900 dark:text-white mb-2">5,000+</div>
              <div className="text-gray-600 dark:text-gray-300">Successful Weddings</div>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-rose-100 dark:bg-rose-900/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Award className="w-8 h-8 text-rose-600" />
              </div>
              <div className="text-3xl font-bold text-gray-900 dark:text-white mb-2">1,200+</div>
              <div className="text-gray-600 dark:text-gray-300">Verified Vendors</div>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-rose-100 dark:bg-rose-900/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Globe className="w-8 h-8 text-rose-600" />
              </div>
              <div className="text-3xl font-bold text-gray-900 dark:text-white mb-2">15+</div>
              <div className="text-gray-600 dark:text-gray-300">Countries Served</div>
            </div>
          </div>
        </div>
      </section>

      {/* Media Contact */}
      <section id="contact" className="py-20 bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-6 font-menbere">
              Media Contact
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 mb-8">
              For press inquiries, interviews, or media partnerships
            </p>
            
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 border border-gray-200 dark:border-gray-700">
              <div className="space-y-6">
                <div className="flex items-center justify-center gap-3">
                  <Mail className="w-5 h-5 text-rose-600" />
                  <a href="mailto:press@wedhabesha.com" className="text-lg text-gray-900 dark:text-white hover:text-rose-600">
                    press@wedhabesha.com
                  </a>
                </div>
                <div className="flex items-center justify-center gap-3">
                  <Phone className="w-5 h-5 text-rose-600" />
                  <a href="tel:+251911234567" className="text-lg text-gray-900 dark:text-white hover:text-rose-600">
                    +251 911 234 567
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default PressMediaPage;