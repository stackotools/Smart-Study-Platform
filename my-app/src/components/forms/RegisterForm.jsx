import React, { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { isValidEmail, isStrongPassword } from "../../utils/helpers";
import "../../index.css";
import { Link, useNavigate } from "react-router-dom";
import toast from 'react-hot-toast';

const RegisterForm = () => {
  const { register, loading } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "student",
    grade: "",
    interests: "",
    subject: "",
    qualification: "",
    experience: "",
  });

  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = "Name is required";
    else if (formData.name.length < 2) newErrors.name = "Too short";

    if (!formData.email.trim()) newErrors.email = "Email is required";
    else if (!isValidEmail(formData.email)) newErrors.email = "Invalid email";

    if (!formData.password) newErrors.password = "Password is required";
    else if (!isStrongPassword(formData.password))
      newErrors.password =
        "Must be 8+ characters and include uppercase, lowercase, number, and symbol";

    if (!formData.confirmPassword)
      newErrors.confirmPassword = "Please confirm your password";
    else if (formData.password !== formData.confirmPassword)
      newErrors.confirmPassword = "Passwords do not match";

    if (!formData.role) newErrors.role = "Role is required";

    if (formData.role === "student") {
      if (!formData.grade.trim()) newErrors.grade = "Grade is required";
    }

    if (formData.role === "teacher") {
      if (!formData.subject.trim()) newErrors.subject = "Subject is required";
      if (!formData.qualification.trim())
        newErrors.qualification = "Qualification is required";
      if (formData.experience === "" || isNaN(formData.experience))
        newErrors.experience = "Valid experience is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      const payload = {
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        role: formData.role,
      };

      if (formData.role === "student") {
        payload.grade = formData.grade.trim();
        if (formData.interests?.trim()) {
          payload.interests = formData.interests
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);
        }
      } else if (formData.role === "teacher") {
        payload.subject = formData.subject.trim();
        payload.qualification = formData.qualification.trim();
        payload.experience = parseInt(formData.experience, 10) || 0;
      }

      const user = await register(payload);
      
      // Redirect based on user role
      if (user.role === 'teacher') {
        navigate('/dashboard');
        toast.success(`Welcome, ${user.name}! Your teacher account is ready.`);
      } else if (user.role === 'student') {
        navigate('/dashboard');
        toast.success(`Welcome, ${user.name}! Your student account is ready.`);
      } else {
        navigate('/dashboard');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Registration failed. Please try again.');
    }
  };

  return (
    <div className=" register-container">
      <div className="register-card">
        <h2 className="text-center mb-4">Create an Account</h2>

        <form onSubmit={handleSubmit} className="register-form">
          <div className="form-group">
            <label htmlFor="name">Full Name</label>
            <input
              id="name"
              name="name"
              type="text"
              placeholder="Enter your full name"
              className={`form-control-custom ${
                errors.name ? "is-invalid" : ""
              }`}
              value={formData.name}
              onChange={handleChange}
              disabled={loading}
            />
            {errors.name && <div className="error-text">{errors.name}</div>}
          </div>

          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="Enter your email"
              className={`form-control-custom ${
                errors.email ? "is-invalid" : ""
              }`}
              value={formData.email}
              onChange={handleChange}
              disabled={loading}
            />
            {errors.email && <div className="error-text">{errors.email}</div>}
          </div>

          <div className="form-group">
            <label htmlFor="role">Role</label>
            <select
              id="role"
              name="role"
              className={`form-control-custom ${
                errors.role ? "is-invalid" : ""
              }`}
              value={formData.role}
              onChange={handleChange}
              disabled={loading}
            >
              <option value="">Select your role</option>
              <option value="student">Student</option>
              <option value="teacher">Teacher</option>
            </select>
            {errors.role && <div className="error-text">{errors.role}</div>}
          </div>

          {formData.role === "student" && (
            <>
              <div className="form-group">
                <label htmlFor="grade">Grade</label>
                <input
                  id="grade"
                  name="grade"
                  type="text"
                  placeholder="e.g. 10th, 12th"
                  className={`form-control-custom ${
                    errors.grade ? "is-invalid" : ""
                  }`}
                  value={formData.grade}
                  onChange={handleChange}
                  disabled={loading}
                />
                {errors.grade && (
                  <div className="error-text">{errors.grade}</div>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="interests">Interests (comma separated)</label>
                <input
                  id="interests"
                  name="interests"
                  type="text"
                  placeholder="e.g. Math, Science"
                  className="form-control-custom"
                  value={formData.interests}
                  onChange={handleChange}
                  disabled={loading}
                />
              </div>
            </>
          )}

          {formData.role === "teacher" && (
            <>
              <div className="form-group">
                <label htmlFor="subject">Subject</label>
                <input
                  id="subject"
                  name="subject"
                  type="text"
                  placeholder="Enter subject expertise"
                  className={`form-control-custom ${
                    errors.subject ? "is-invalid" : ""
                  }`}
                  value={formData.subject}
                  onChange={handleChange}
                  disabled={loading}
                />
                {errors.subject && (
                  <div className="error-text">{errors.subject}</div>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="qualification">Qualification</label>
                <input
                  id="qualification"
                  name="qualification"
                  type="text"
                  placeholder="e.g. B.Ed, M.Sc"
                  className={`form-control-custom ${
                    errors.qualification ? "is-invalid" : ""
                  }`}
                  value={formData.qualification}
                  onChange={handleChange}
                  disabled={loading}
                />
                {errors.qualification && (
                  <div className="error-text">{errors.qualification}</div>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="experience">Experience (years)</label>
                <input
                  id="experience"
                  name="experience"
                  type="number"
                  placeholder="Enter years of experience"
                  className={`form-control-custom ${
                    errors.experience ? "is-invalid" : ""
                  }`}
                  value={formData.experience}
                  onChange={handleChange}
                  disabled={loading}
                />
                {errors.experience && (
                  <div className="error-text">{errors.experience}</div>
                )}
              </div>
            </>
          )}

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <div className="password-wrapper">
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                className={`form-control-custom ${
                  errors.password ? "is-invalid" : ""
                }`}
                value={formData.password}
                onChange={handleChange}
                disabled={loading}
              />
              <button
                type="button"
                className="toggle-password"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
            {errors.password && (
              <div className="error-text">{errors.password}</div>
            )}
            <div className="hint-text">
              Must include uppercase, lowercase, number, and special character
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              placeholder="Re-enter your password"
              className={`form-control-custom ${
                errors.confirmPassword ? "is-invalid" : ""
              }`}
              value={formData.confirmPassword}
              onChange={handleChange}
              disabled={loading}
            />
            {errors.confirmPassword && (
              <div className="error-text">{errors.confirmPassword}</div>
            )}
          </div>

          <button type="submit" className="btn-custom" disabled={loading}>
            {loading ? "Creating account..." : "Create Account"}
          </button>

          <div className="text-center mt-3">
            <Link to="/login" className="link-button">
              Already have an account? Sign in
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RegisterForm;
