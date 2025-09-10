// API Configuration
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// File Upload Configuration
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
export const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation'
];

// User Roles
export const USER_ROLES = {
  STUDENT: 'student',
  TEACHER: 'teacher'
};

// Note Categories
export const NOTE_CATEGORIES = [
  'lecture-notes',
  'assignments',
  'exams',
  'reference-materials',
  'presentations',
  'other'
];

// Grade Levels
export const GRADE_LEVELS = [
  '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th',
  '11th', '12th', 'Undergraduate', 'Graduate', 'Postgraduate'
];

// Subjects
export const SUBJECTS = [
  'Mathematics', 'Science', 'Physics', 'Chemistry', 'Biology',
  'English', 'History', 'Geography', 'Computer Science',
  'Economics', 'Business Studies', 'Art', 'Music', 'Physical Education',
  'Other'
];

// Toast Configuration
export const TOAST_CONFIG = {
  position: 'top-right',
  duration: 4000,
  style: {
    background: '#363636',
    color: '#fff',
  },
  success: {
    duration: 3000,
    theme: {
      primary: 'green',
      secondary: 'black',
    },
  },
  error: {
    duration: 4000,
    theme: {
      primary: 'red',
      secondary: 'black',
    },
  },
};
