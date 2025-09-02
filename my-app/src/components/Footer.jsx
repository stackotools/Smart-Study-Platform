import React from "react";
import { FaBook, FaRocket, FaFacebook, FaTwitter, FaInstagram, FaLinkedin, FaShieldAlt, FaLock } from "react-icons/fa";
import { motion } from "framer-motion";
import "./Footer.css";

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-content">
          {/* Footer Sections */}
          <div className="footer-section">
            <div className="logo">
              <motion.div
                className="logo-icon"
                whileHover={{ rotate: 360 }}
                transition={{ duration: 0.5 }}
              >
                <FaBook />
              </motion.div>
              <span>SmartStudy</span>
            </div>
            <p>Revolutionizing education through technology and innovation.</p>

            <div className="newsletter">
              <h4>Stay Updated</h4>
              <div className="newsletter-form">
                <input type="email" placeholder="Enter your email" />
                <button>
                  <FaRocket />
                </button>
              </div>
            </div>

            <div className="social-icons">
              {[FaFacebook, FaTwitter, FaInstagram, FaLinkedin].map((Icon, i) => (
                <motion.a
                  href="#"
                  key={i}
                  whileHover={{ y: -5 }}
                  transition={{ duration: 0.2 }}
                >
                  <Icon />
                </motion.a>
              ))}
            </div>
          </div>

          <div className="footer-section">
            <h4>Product</h4>
            <a href="#materials">Study Materials</a>
            <a href="#features">Features</a>
            <a href="#">Pricing</a>
            <a href="#">Case Studies</a>
            <a href="#">Testimonials</a>
          </div>

          <div className="footer-section">
            <h4>Company</h4>
            <a href="#about">About Us</a>
            <a href="#">Careers</a>
            <a href="#">Contact</a>
            <a href="#">Blog</a>
            <a href="#">Press Kit</a>
          </div>

          <div className="footer-section">
            <h4>Support</h4>
            <a href="#">FAQ</a>
            <a href="#">Help Center</a>
            <a href="#">Privacy Policy</a>
            <a href="#">Terms of Service</a>
            <a href="#">Cookie Policy</a>
          </div>
        </div>

        <div className="footer-bottom">
          <div className="footer-bottom-content">
            <p>&copy; {new Date().getFullYear()} SmartStudy. All rights reserved.</p>
            <div className="footer-bottom-links">
              <a href="#">Legal</a>
              <a href="#">Privacy</a>
              <a href="#">Sitemap</a>
              <a href="#">Accessibility</a>
            </div>
          </div>
          <div className="trust-badges">
            <div className="trust-badge">
              <FaShieldAlt /> SSL Secured
            </div>
            <div className="trust-badge">
              <FaLock /> Privacy Protected
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}