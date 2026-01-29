import React from 'react';
import { Link } from 'react-router-dom';

const Footer: React.FC = () => {
  return (
    <footer className="bg-secondary-900 text-white">
      <div className="container mx-auto px-4 py-12">
        <div className="grid md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-1">
            <h3 className="text-2xl font-bold text-primary-400 mb-4">WedHabesha</h3>
            <p className="text-secondary-300 text-sm">
              The complete wedding platform for Ethiopian couples. Plan your perfect day with our comprehensive tools.
            </p>
          </div>

          {/* For Couples */}
          <div>
            <h4 className="font-semibold mb-4">For Couples</h4>
            <ul className="space-y-2 text-sm text-secondary-300">
              <li>
                <Link to="/register" className="hover:text-white transition-colors">
                  Start Planning
                </Link>
              </li>
              <li>
                <Link to="/vendors" className="hover:text-white transition-colors">
                  Find Vendors
                </Link>
              </li>
              <li>
                <span className="text-secondary-400">Guest Management</span>
              </li>
              <li>
                <span className="text-secondary-400">Budget Planning</span>
              </li>
            </ul>
          </div>

          {/* For Vendors */}
          <div>
            <h4 className="font-semibold mb-4">For Vendors</h4>
            <ul className="space-y-2 text-sm text-secondary-300">
              <li>
                <span className="text-secondary-400">Join Marketplace</span>
              </li>
              <li>
                <span className="text-secondary-400">Manage Leads</span>
              </li>
              <li>
                <span className="text-secondary-400">Business Analytics</span>
              </li>
              <li>
                <span className="text-secondary-400">Customer Reviews</span>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="font-semibold mb-4">Support</h4>
            <ul className="space-y-2 text-sm text-secondary-300">
              <li>
                <span className="text-secondary-400">Help Center</span>
              </li>
              <li>
                <span className="text-secondary-400">Contact Us</span>
              </li>
              <li>
                <span className="text-secondary-400">Privacy Policy</span>
              </li>
              <li>
                <span className="text-secondary-400">Terms of Service</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-secondary-700 mt-8 pt-8 text-center">
          <p className="text-secondary-400 text-sm">
            © 2024 WedHabesha. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;