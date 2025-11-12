"use client";

import Link from "next/link";
import { Mail, Phone, MapPin } from "lucide-react";

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-white border-t border-gray-200 mt-auto">
      {/* Main Footer */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Company Info */}
          <div>
            <h3 className="text-orange-600 text-xl font-bold mb-3">DGTech</h3>
            <p className="text-gray-600 text-sm leading-relaxed">
              Điểm đến cho những sản phẩm công nghệ mới nhất và tốt nhất.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-gray-900 font-semibold mb-3">Liên kết nhanh</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/" className="text-gray-600 hover:text-orange-600 transition-colors">
                  Trang chủ
                </Link>
              </li>
              <li>
                <Link href="/shop" className="text-gray-600 hover:text-orange-600 transition-colors">
                  Sản phẩm
                </Link>
              </li>
              <li>
                <Link href="/about" className="text-gray-600 hover:text-orange-600 transition-colors">
                  Về chúng tôi
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="text-gray-900 font-semibold mb-3">Liên hệ</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-start">
                <MapPin className="h-4 w-4 mr-2 mt-1 shrink-0 text-orange-600" />
                <span>Hà Đông - Hà Nội</span>
              </li>
              <li className="flex items-center">
                <Phone className="h-4 w-4 mr-2 shrink-0 text-orange-600" />
                <a href="tel:0123456789" className="hover:text-orange-600 transition-colors">
                  0123 456 789
                </a>
              </li>
              <li className="flex items-center">
                <Mail className="h-4 w-4 mr-2 shrink-0 text-orange-600" />
                <a href="mailto:contact@dgtech.com" className="hover:text-orange-600 transition-colors">
                  contact@dgtech.com
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="bg-orange-600 py-2">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-white text-sm">&copy; {currentYear} DGTech. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
