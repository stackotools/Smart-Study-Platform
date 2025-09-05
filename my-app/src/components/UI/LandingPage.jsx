import React, { useState, useEffect, useRef } from "react";
import { 
  FaBook, FaGraduationCap, FaPlay, FaCheck, 
  FaRocket, FaChartLine, FaShieldAlt, FaLock, FaArrowUp 
} from "react-icons/fa";
import { TbBooks } from "react-icons/tb";
import { IoMdSchool } from "react-icons/io";
import { motion, useAnimation, AnimatePresence } from "framer-motion";

import Header from "./Header.jsx";
import Footer from "./Footer.jsx";

import "./LandingPage.css";

function LandingPage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeFeature, setActiveFeature] = useState(0);
  const controls = useAnimation();
  const featuresRef = useRef(null);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveFeature((prev) => (prev + 1) % 4);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const sequence = async () => {
      await controls.start({
        opacity: 1,
        y: 0,
        transition: { duration: 0.8 },
      });
    };
    sequence();
  }, [controls]);

  const features = [
    {
      icon: <TbBooks />,
      title: "Organized Content",
      description:
        "Find materials by subject and difficulty level with our intuitive categorization system.",
    },
    {
      icon: <IoMdSchool />,
      title: "Multimedia Support",
      description:
        "Access videos, PDFs, interactive quizzes, and more in one unified platform.",
    },
    {
      icon: <FaRocket />,
      title: "AI-Powered Recommendations",
      description:
        "Get personalized content suggestions based on your learning patterns and goals.",
    },
    {
      icon: <FaChartLine />,
      title: "Progress Analytics",
      description:
        "Track your learning journey with detailed analytics and performance insights.",
    },
  ];

  return (
    <div className="LandingPage">
      {/* Header */}
      <Header />

      {/* Animated Background Elements */}
      <div className="animated-bg">
        <div className="shape shape-1"></div>
        <div className="shape shape-2"></div>
        <div className="shape shape-3"></div>
        <div className="floating-icon">
          <FaBook />
        </div>
        <div className="floating-icon">
          <FaGraduationCap />
        </div>
        <div className="floating-icon">
          <FaRocket />
        </div>
      </div>





      {/* Hero Section */}
      <section id="home" className="hero">
        <div className="container">
          <div className="hero-content">
            <motion.h1
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              Revolutionize Your{" "}
              <span className="gradient-text">Learning Experience</span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
            >
              Access curated study materials powered by AI, track your progress
              with advanced analytics, and join a community of passionate
              learners.
            </motion.p>
            <motion.div
              className="hero-buttons"
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
            >
              <button className="btn-primary">
                Get Started Free
                <motion.span
                  className="btn-hover-effect"
                  whileHover={{ scale: 1.1 }}
                  transition={{ duration: 0.2 }}
                />
              </button>
              <button className="btn-secondary">
                <FaPlay className="play-icon" /> Watch Demo
              </button>
            </motion.div>
          </div>
          <motion.div
            className="hero-visual"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.8 }}
          >
            <div className="main-visual">
              <div className="visual-element"></div>
              <div className="visual-element"></div>
              <div className="visual-element"></div>
              <div className="floating-card card-1">
                <FaBook />
                <p>Study Materials</p>
              </div>
              <div className="floating-card card-2">
                <FaGraduationCap />
                <p>Courses</p>
              </div>
              <div className="floating-card card-3">
                <FaChartLine />
                <p>Analytics</p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="features" ref={featuresRef}>
        <div className="container">
          <motion.h2
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            Powerful Features for{" "}
            <span className="gradient-text">Effective Learning</span>
          </motion.h2>

          <div className="features-container">
            <div className="features-selector">
              {features.map((feature, index) => (
                <motion.div
                  key={index}
                  className={`feature-tab ${
                    activeFeature === index ? "active" : ""
                  }`}
                  onClick={() => setActiveFeature(index)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <div className="feature-tab-icon">{feature.icon}</div>
                  <h4>{feature.title}</h4>
                </motion.div>
              ))}
            </div>

            <div className="feature-display">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeFeature}
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -50 }}
                  transition={{ duration: 0.5 }}
                  className="feature-content"
                >
                  <div className="feature-icon">
                    {features[activeFeature].icon}
                  </div>
                  <h3>{features[activeFeature].title}</h3>
                  <p>{features[activeFeature].description}</p>
                  <button className="feature-cta">Learn more</button>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="stats">
        <div className="container">
          {[
            { value: "10K+", label: "Study Materials" },
            { value: "95%", label: "Student Satisfaction" },
            { value: "50K+", label: "Active Users" },
            { value: "24/7", label: "Accessibility" },
          ].map((stat, i) => (
            <motion.div
              key={i}
              className="stat-item"
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 * (i + 1) }}
              viewport={{ once: true }}
            >
              <h3>{stat.value}</h3>
              <p>{stat.label}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta">
        <div className="container">
          <div className="cta-content">
            <motion.div
              className="cta-badge"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              viewport={{ once: true }}
            >
              <FaRocket className="badge-icon" />
              <span>Join Today</span>
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7 }}
              viewport={{ once: true }}
              className="cta-title"
            >
              Transform Your{" "}
              <span className="gradient-text">Learning Journey</span> Today
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.2 }}
              viewport={{ once: true }}
              className="cta-description"
            >
              Join thousands of students achieving academic excellence with
              SmartStudy. Get access to curated materials, AI-powered
              recommendations, and progress tracking.
            </motion.p>

            <motion.div
              className="cta-buttons"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.4 }}
              viewport={{ once: true }}
            >
              <motion.button
                className="btn-primary large"
                whileHover={{
                  scale: 1.05,
                  boxShadow: "0 10px 25px rgba(99, 102, 241, 0.3)",
                }}
                whileTap={{ scale: 0.95 }}
              >
                Start Learning Free
              </motion.button>
            </motion.div>

            <motion.div
              className="cta-features"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{ duration: 0.7, delay: 0.6 }}
              viewport={{ once: true }}
            >
              <div className="cta-feature">
                <FaCheck className="feature-check" />
                <span>No credit card required</span>
              </div>
              <div className="cta-feature">
                <FaCheck className="feature-check" />
                <span>Free to access</span>
              </div>
            </motion.div>
          </div>

          {/* Visual elements */}
          <div className="cta-visuals">
            <div className="cta-visual-element"></div>
            <div className="cta-visual-element"></div>
            <div className="cta-visual-element"></div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer />

      {/* Back to Top Button */}
      <motion.button
        className="back-to-top"
        onClick={() =>
          window.scrollTo({ top: 0, behavior: "smooth" })
        }
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        <FaArrowUp />
      </motion.button>
    </div>
  );
}
export default LandingPage;