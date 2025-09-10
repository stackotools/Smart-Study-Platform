import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import notesService from '../../services/notesService';
import reviewsService from '../../services/reviewsService';
import { useApi } from '../../hooks/useApi.js';
import { formatDate, formatFileSize, getFileIcon, validateFileForUpload } from '../../utils/helpers.js';
import toast from 'react-hot-toast';
import "./TeacherDashboard.css";

const TeacherDashboard = () => {
  const { user, logout } = useAuth();
  const { loading, execute } = useApi();

  const [stats, setStats] = useState({
    totalNotes: 0,
    totalDownloads: 0,
    totalReviews: 0,
    averageRating: 0
  });

  const [notes, setNotes] = useState([]);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [uploadData, setUploadData] = useState({
    title: '',
    description: '',
    subject: '',
    grade: '',
    file: null
  });

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      await execute(async () => {
        // Load teacher's uploads
        const uploadsResponse = await notesService.getMyUploads(1, 50);
        const myNotes = uploadsResponse.data || uploadsResponse.notes || uploadsResponse?.data?.notes || [];
        setNotes(myNotes);

        // Calculate stats from teacher's uploads
        const totalNotes = myNotes.length;
        const totalDownloads = myNotes.reduce((sum, note) => sum + (note.downloadCount || 0), 0);

        // Aggregate review stats across notes (best-effort)
        let totalReviews = 0;
        let averageRating = 0;
        for (const note of myNotes.slice(0, 10)) { // limit to 10 for performance
          try {
            const stat = await reviewsService.getReviewStats(note._id);
            totalReviews += stat.totalReviews || 0;
            averageRating += stat.averageRating || 0;
          } catch (_) { }
        }
        if (myNotes.length > 0) {
          averageRating = Math.round((averageRating / Math.min(myNotes.length, 10)) * 10) / 10;
        }

        setStats({
          totalNotes,
          totalDownloads,
          totalReviews,
          averageRating
        });
      });
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    }
  };

  // Close modals on ESC key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setShowUploadModal(false);
        setShowMobileSidebar(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Close sidebar when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (showMobileSidebar && !e.target.closest('.mobile-sidebar') && !e.target.closest('.sidebar-toggle')) {
        setShowMobileSidebar(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMobileSidebar]);

  const handleFileUpload = async (e) => {
    e.preventDefault();

    // Basic form validation aligned with backend validators
    const title = uploadData.title?.trim();
    const description = uploadData.description?.trim();
    const subject = uploadData.subject?.trim();
    const grade = uploadData.grade?.trim();

    if (!title || title.length < 3 || title.length > 100) {
      toast.error('Title must be between 3 and 100 characters');
      return;
    }
    if (!description || description.length < 10 || description.length > 1000) {
      toast.error('Description must be between 10 and 1000 characters');
      return;
    }
    if (!subject) {
      toast.error('Subject is required');
      return;
    }
    if (!grade) {
      toast.error('Grade is required');
      return;
    }

    // File validation (only if file is provided)
    if (uploadData.file) {
      const fileValidation = validateFileForUpload(uploadData.file);
      if (!fileValidation.valid) {
        toast.error(fileValidation.error);
        return;
      }
    }

    try {
      await execute(async () => {
        const formData = new FormData();
        formData.append('title', title);
        formData.append('description', description);
        formData.append('subject', subject);
        formData.append('grade', grade);

        // Only append file if one is selected
        if (uploadData.file) {
          formData.append('file', uploadData.file);
        }

        await notesService.uploadNote(formData);

        setShowUploadModal(false);
        setUploadData({ title: '', description: '', subject: '', grade: '', file: null });

        // Reload data
        await loadDashboardData();
      }, {
        showSuccessToast: true,
        successMessage: 'Note uploaded successfully!'
      });
    } catch (error) {
      console.error('Upload error:', error);
    }
  };

  const handleDeleteNote = async (noteId) => {
    if (!window.confirm('Are you sure you want to delete this note?')) {
      return;
    }

    try {
      await execute(async () => {
        await notesService.deleteNote(noteId);
        await loadDashboardData();
      }, {
        showSuccessToast: true,
        successMessage: 'Note deleted successfully!'
      });
    } catch (error) {
      console.error('Delete error:', error);
    }
  };

  return (
    <div className="teacher-dashboard">
      {/* Header */}
      <header className="dashboard-header">
        <div className="header-container">
          <div className="header-left">
            {/* <button 
              className="sidebar-toggle"
              onClick={() => setShowMobileSidebar(!showMobileSidebar)}
            >
              <i className="fas fa-bars"></i>
            </button> */}
            <div className="header-brand">
              <div className="brand-icon">
                <i className="fas fa-chalkboard-teacher"></i>
              </div>
              <h1 className="dashboard-title">Teacher Portal</h1>
            </div>
          </div>

          <div className="header-right">
            {/* <div className="user-info">
              <div className="user-details">
                <span className="user-name">{user.name}</span>
                <span className="user-role">Educator</span>
              </div>
              <div className="user-avatar">
                {user?.name?.charAt(0).toUpperCase() || "U"}
              </div>
            </div> */}
            <button className="menu-item" onClick={logout}>
              <i className="fas fa-sign-out-alt"></i>
              <span>Logout</span>
            </button>
          </div>
          <button
            className="sidebar-toggle"
            onClick={() => setShowMobileSidebar(!showMobileSidebar)}
          >
            <i className="fas fa-bars"></i>
          </button>
        </div>
      </header>

      {/* Mobile Sidebar */}
      <div className={`mobile-sidebar ${showMobileSidebar ? 'active' : ''}`}>
        <div className="sidebar-header">
          <div className="user-info">
            <div className="user-avatar large">
              {user?.name?.charAt(0).toUpperCase() || "T"}
            </div>
            <div className="user-details">
              <span className="user-name">{user.name}</span>
              <span className="user-role">Educator</span>
            </div>
          </div>
          <button
            className="sidebar-close"
            onClick={() => setShowMobileSidebar(false)}
          >
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className="sidebar-menu">
          <div className="menu-section">
            <h3>Dashboard</h3>
            <button className="menu-item active">
              <i className="fas fa-home"></i>
              <span>Overview</span>
            </button>
            <button className="menu-item">
              <i className="fas fa-analytics"></i>
              <span>Analytics</span>
            </button>
          </div>

          <div className="menu-section">
            <h3>Content</h3>
            <button className="menu-item">
              <i className="fas fa-book"></i>
              <span>My Materials</span>
            </button>
            <button
              className="menu-item"
              onClick={() => setShowUploadModal(true)}
            >
              <i className="fas fa-upload"></i>
              <span>Upload New</span>
            </button>
          </div>

          <div className="menu-section">
            <h3>Account</h3>
            <button className="menu-item">
              <i className="fas fa-user-cog"></i>
              <span>Profile Settings</span>
            </button>
            <button className="menu-item" onClick={logout}>
              <i className="fas fa-sign-out-alt"></i>
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>

      {/* Overlay for mobile sidebar */}
      {showMobileSidebar && (
        <div
          className="sidebar-overlay"
          onClick={() => setShowMobileSidebar(false)}
        ></div>
      )}

      <main className="dashboard-main">
        {/* Stats Cards */}
        <section className="stats-section">
          <div className="section-header">
            <h2 className="section-title">Dashboard Overview</h2>
          </div>
          <div className="stats-grid">
            {[
              { icon: 'fas fa-book-open', label: 'Total Notes', value: stats.totalNotes, color: 'blue' },
              { icon: 'fas fa-download', label: 'Total Downloads', value: stats.totalDownloads, color: 'green' },
              { icon: 'fas fa-star-half-alt', label: 'Total Reviews', value: stats.totalReviews, color: 'purple' },
              { icon: 'fas fa-star', label: 'Average Rating', value: `${stats.averageRating.toFixed(1)}/5`, color: 'amber' }
            ].map(({ icon, label, value, color }) => (
              <div key={label} className={`stat-card stat-card--${color}`}>
                <div className="stat-icon">
                  <i className={icon}></i>
                </div>
                <div className="stat-content">
                  <h3 className="stat-value">{value}</h3>
                  <p className="stat-label">{label}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Notes List */}
        <section className="notes-section">
          <div className="section-header">
            <h2 className="section-title">Study Materials</h2>

            <button
              onClick={() => setShowUploadModal(true)}
              className="btn btn-primary"
            >
              <i className="fas fa-plus"></i>
              Add Material
            </button>

          </div>

          {loading ? (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Loading your materials...</p>
            </div>
          ) : notes.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">
                <i className="fas fa-file-import"></i>
              </div>
              <h3>No study materials yet</h3>
              <p>Begin by uploading your first educational resource</p>
              <button
                onClick={() => setShowUploadModal(true)}
                className="btn btn-primary btn-center"
              >
                <i className="fas fa-cloud-upload-alt"></i>
                Upload Your Notes
              </button>
            </div>
          ) : (
            <div className="notes-list">
              {notes.map((note) => (
                <div
                  key={note._id}
                  className="note-card"
                >
                  <div className="note-content">
                    <div className="note-icon">
                      {getFileIcon(note.fileName || note.filename || note.originalFileName || '')}
                    </div>
                    <div className="note-details">
                      <h4 className="note-title">{note.title}</h4>
                      <p className="note-description">{note.description}</p>
                      <div className="note-meta">
                        <span className="meta-tag subject">
                          <i className="fas fa-book"></i>
                          {note.subject}
                        </span>
                        <span className="meta-tag grade">
                          <i className="fas fa-graduation-cap"></i>
                          {note.grade}
                        </span>
                        <span className="meta-tag downloads">
                          <i className="fas fa-download"></i>
                          {note.downloadCount || 0} downloads
                        </span>
                        <span className="meta-tag size">
                          <i className="fas fa-database"></i>
                          {formatFileSize(note.fileSize || 0)}
                        </span>
                        <span className="meta-tag date">
                          <i className="fas fa-calendar"></i>
                          {formatDate(note.createdAt, { format: 'short' })}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="note-actions">
                    <Link
                      to={`/preview/${note._id}`}
                      className="btn btn-secondary btn-sm"
                      title="Preview"
                    >
                      <i className="fas fa-eye"></i>
                      Preview
                    </Link>
                    <button
                      onClick={() => handleDeleteNote(note._id)}
                      className="btn btn-danger btn-sm"
                    >
                      <i className="fas fa-trash"></i>
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="modal-overlay" onClick={() => setShowUploadModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">
                <i className="fas fa-cloud-upload-alt"></i>
                Upload New Study Material
              </h2>
              <p className="modal-subtitle">Share knowledge with your students</p>
              <button
                className="modal-close"
                onClick={() => setShowUploadModal(false)}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            <form onSubmit={handleFileUpload} className="modal-form">
              <div className="form-group">
                <label htmlFor="title" className="form-label">
                  Title *
                </label>
                <input
                  id="title"
                  type="text"
                  value={uploadData.title}
                  onChange={(e) => setUploadData({ ...uploadData, title: e.target.value })}
                  className="form-input"
                  placeholder="Enter note title"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="subject" className="form-label">
                  Subject *
                </label>
                <input
                  id="subject"
                  type="text"
                  value={uploadData.subject}
                  onChange={(e) => setUploadData({ ...uploadData, subject: e.target.value })}
                  className="form-input"
                  placeholder="e.g. Mathematics, Physics"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="grade" className="form-label">
                  Grade Level *
                </label>
                <input
                  id="grade"
                  type="text"
                  value={uploadData.grade}
                  onChange={(e) => setUploadData({ ...uploadData, grade: e.target.value })}
                  className="form-input"
                  placeholder="e.g. 10th, 12th, College"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="description" className="form-label">
                  Description *
                </label>
                <textarea
                  id="description"
                  value={uploadData.description}
                  onChange={(e) => setUploadData({ ...uploadData, description: e.target.value })}
                  rows="3"
                  className="form-textarea"
                  placeholder="Describe this study material..."
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="file" className="form-label">
                  File (Optional)
                </label>
                <div className="file-upload">
                  <input
                    id="file"
                    type="file"
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (file) {
                        const validation = validateFileForUpload(file);
                        if (!validation.valid) {
                          toast.error(validation.error);
                          e.target.value = '';
                          return;
                        }
                      }
                      setUploadData({ ...uploadData, file });
                    }}
                    className="file-input"
                    accept=".pdf,.doc,.docx,.txt,.ppt,.pptx,.jpg,.jpeg,.png"
                  />
                  <label htmlFor="file" className="file-dropzone">
                    <div className="file-placeholder">
                      <i className="fas fa-cloud-upload-alt"></i>
                      <p className="file-text">
                        {uploadData.file ? (
                          <span className="file-name">{uploadData.file.name}</span>
                        ) : (
                          <>
                            <span>Click to upload</span> or drag and drop
                          </>
                        )}
                      </p>
                      <p className="file-hint">
                        PDF, DOC, PPT, TXT, JPG, PNG (Max: 10MB)
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn-primary"
                >
                  {loading ? (
                    <>
                      <i className="fas fa-spinner fa-spin"></i>
                      Uploading...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-upload"></i>
                      Upload Material
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherDashboard;