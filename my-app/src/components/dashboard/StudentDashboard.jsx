import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import notesService from '../../services/notesService';
import reviewsService from '../../services/reviewsService';
import downloadHistoryService from '../../services/downloadHistoryService';
import { useApi } from '../../hooks/useApi';
import { formatDate, formatFileSize, getFileIcon, debounce } from '../../utils/helpers';
import toast from 'react-hot-toast';
import ProgressAnalytics from '../analytics/ProgressAnalytics';
import './StudentDashboard.css';

const StudentDashboard = () => {
  const { user, logout } = useAuth();
  const { loading, execute } = useApi();

  const [notes, setNotes] = useState([]);
  const [reviews, setReviews] = useState({});
  const [downloadHistory, setDownloadHistory] = useState([]);
  const [downloadStats, setDownloadStats] = useState(null);
  const [filters, setFilters] = useState({
    search: '',
    subject: '',
    sortBy: 'createdAt',
    order: 'desc',
  });
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedNote, setSelectedNote] = useState(null);
  const [reviewData, setReviewData] = useState({
    rating: 5,
    comment: '',
  });
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [activeTab, setActiveTab] = useState('materials');

  const debouncedSearch = useCallback(
    debounce((searchTerm) => {
      setFilters((prev) => ({ ...prev, search: searchTerm }));
    }, 300),
    []
  );

  useEffect(() => {
    loadNotes();
  }, [filters]);

  useEffect(() => {
    if (notes.length > 0) {
      loadReviews();
    } else {
      setReviews({});
    }
  }, [notes]);

  useEffect(() => {
    if (activeTab === 'history') {
      loadDownloadHistory();
      loadDownloadStats();
    }
  }, [activeTab]);

  const loadNotes = async () => {
    try {
      await execute(async () => {
        const response = await notesService.getNotes(filters);
        const list = Array.isArray(response?.data)
          ? response.data
          : (response?.data?.data || response?.data?.notes || response?.notes || []);
        setNotes(list);
      });
    } catch {
      toast.error('Failed to load notes');
    }
  };

  const loadReviews = async () => {
    try {
      const reviewsData = {};
      await Promise.all(
        notes.map(async (note) => {
          try {
            const response = await reviewsService.getReviewsForNote(note._id);
            reviewsData[note._id] = response.data?.data || response.data?.reviews || [];
          } catch {
            reviewsData[note._id] = [];
          }
        })
      );
      setReviews(reviewsData);
    } catch {
      toast.error('Failed to load reviews');
    }
  };

  const loadDownloadHistory = async () => {
    try {
      await execute(async () => {
        const response = await downloadHistoryService.getDownloadHistory();
        setDownloadHistory(response.data || []);
      });
    } catch {
      toast.error('Failed to load download history');
    }
  };

  const loadDownloadStats = async () => {
    try {
      const response = await downloadHistoryService.getDownloadStats();
      setDownloadStats(response.data);
    } catch {
      console.error('Failed to load download stats');
    }
  };

  const handleDownload = async (note) => {
    try {
      await execute(async () => {
        await notesService.downloadNote(note._id, note.originalFileName || note.fileName || 'download');
        
        // Refresh download history if we're on the history tab
        if (activeTab === 'history') {
          await loadDownloadHistory();
          await loadDownloadStats();
        }
      }, {
        showSuccessToast: true,
        successMessage: 'File downloaded successfully!',
      });
    } catch {
      toast.error('Download failed');
    }
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();

    if (!reviewData.comment.trim()) {
      toast.error('Please write a review comment');
      return;
    }

    try {
      await execute(async () => {
        await reviewsService.createReview({
          noteId: selectedNote._id,
          rating: parseInt(reviewData.rating, 10),
          comment: reviewData.comment.trim(),
        });

        setShowReviewModal(false);
        setSelectedNote(null);
        setReviewData({ rating: 5, comment: '' });
        await loadReviews();
        toast.success('Review submitted successfully!');
      });
    } catch {
      toast.error('Failed to submit review');
    }
  };

  const handleVoteReview = async (reviewId, voteType) => {
    try {
      await execute(async () => {
        await reviewsService.voteReview(reviewId, voteType);
        await loadReviews();
      });
    } catch {
      toast.error('Failed to submit vote');
    }
  };

  const getAverageRating = (noteId) => {
    const noteReviews = reviews[noteId] || [];
    if (noteReviews.length === 0) return 0;

    const sum = noteReviews.reduce((acc, review) => acc + review.rating, 0);
    return (sum / noteReviews.length).toFixed(1);
  };

  const renderStars = (rating) => {
    return [...Array(5)].map((_, i) => (
      <i
        key={i}
        className={`fas fa-star${i < rating ? '' : '-half-alt'} ${i < rating ? 'text-warning' : 'text-muted'}`}
        aria-hidden="true"
      />
    ));
  };

  const userHasReviewed = (noteId) => {
    const noteReviews = reviews[noteId] || [];
    return noteReviews.some((review) => (review.studentId?._id || review.student?._id) === user._id);
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      subject: '',
      sortBy: 'createdAt',
      order: 'desc',
    });
  };

  return (
    <div className="student-dashboard">
      {/* Header */}
      <header className="dashboard-header">
        <div className="header-container">
          <div className="header-left">
            <button
              className="sidebar-toggle"
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              aria-label="Toggle menu"
            >
              <i className="fas fa-bars"></i>
            </button>
            <div className="header-brand">
              <div className="brand-icon">
                <i className="fas fa-graduation-cap"></i>
              </div>
              <h1 className="dashboard-title">Student Portal</h1>
            </div>
          </div>

          <div className="header-right">
            <div className="user-info">
              <div className="user-details">
                <span className="user-name">{user.name}</span>
                <span className="user-role">Student</span>
              </div>
              <div className="user-avatar">
                {user?.name?.charAt(0).toUpperCase() || "S"}
              </div>
            </div>
            <button className="menu-item desktop-logout" onClick={logout}>
              <i className="fas fa-sign-out-alt"></i>
              <span>Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Sidebar */}
      <div className={`mobile-sidebar ${showMobileMenu ? 'active' : ''}`}>
        <div className="sidebar-header">
          <div className="user-info">
            <div className="user-avatar large">
              {user?.name?.charAt(0).toUpperCase() || "S"}
            </div>
            <div className="user-details">
              <span className="user-name">{user.name}</span>
              <span className="user-role">Student</span>
            </div>
          </div>
          <button
            className="sidebar-close"
            onClick={() => setShowMobileMenu(false)}
            aria-label="Close menu"
          >
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className="sidebar-menu">
          <div className="menu-section">
            <h3>Dashboard</h3>
            <button 
              className={`menu-item ${activeTab === 'materials' ? 'active' : ''}`}
              onClick={() => setActiveTab('materials')}
            >
              <i className="fas fa-book"></i>
              <span>Study Materials</span>
            </button>
            <button 
              className={`menu-item ${activeTab === 'history' ? 'active' : ''}`}
              onClick={() => setActiveTab('history')}
            >
              <i className="fas fa-history"></i>
              <span>Download History</span>
            </button>
            <button 
              className={`menu-item ${activeTab === 'analytics' ? 'active' : ''}`}
              onClick={() => setActiveTab('analytics')}
            >
              <i className="fas fa-chart-line"></i>
              <span>Progress Analytics</span>
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
      {showMobileMenu && (
        <div
          className="sidebar-overlay"
          onClick={() => setShowMobileMenu(false)}
        ></div>
      )}

      <main className="dashboard-main">
        {/* Dashboard Tabs */}
        <div className="dashboard-tabs">
          <button 
            className={`tab-item ${activeTab === 'materials' ? 'active' : ''}`}
            onClick={() => setActiveTab('materials')}
          >
            <i className="fas fa-book"></i>
            Study Materials
          </button>
          <button 
            className={`tab-item ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            <i className="fas fa-history"></i>
            Download History
          </button>
          <button 
            className={`tab-item ${activeTab === 'analytics' ? 'active' : ''}`}
            onClick={() => setActiveTab('analytics')}
          >
            <i className="fas fa-chart-line"></i>
            Progress Analytics
          </button>
        </div>

        {activeTab === 'materials' && (
          <>
            {/* Filters Section */}
            <section className="filters-section">
              <div className="section-header">
                <h2 className="section-title">Study Materials</h2>
                <p className="section-subtitle">Access learning resources shared by your teachers</p>
              </div>

              <div className="filters-card">
                <div className="filter-header">
                  <h3>Filter Resources</h3>
                  <button 
                    className="btn btn-link"
                    onClick={clearFilters}
                    disabled={!filters.search && !filters.subject}
                  >
                    Clear Filters
                  </button>
                </div>
                
                <div className="filter-grid">
                  <div className="filter-group">
                    <label htmlFor="search" className="filter-label">Search Notes</label>
                    <div className="search-box">
                      <i className="fas fa-search search-icon"></i>
                      <input
                        id="search"
                        type="search"
                        className="search-input"
                        placeholder="Search by title, description, or subject"
                        value={filters.search}
                        onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                        aria-label="Search notes"
                      />
                    </div>
                  </div>

                  <div className="filter-group">
                    <label htmlFor="subject" className="filter-label">Subject</label>
                    <select
                      id="subject"
                      className="filter-select"
                      value={filters.subject}
                      onChange={(e) => setFilters((prev) => ({ ...prev, subject: e.target.value }))}
                      aria-label="Filter by subject"
                    >
                      <option value="">All Subjects</option>
                      <option value="Mathematics">Mathematics</option>
                      <option value="Science">Science</option>
                      <option value="Physics">Physics</option>
                      <option value="Chemistry">Chemistry</option>
                      <option value="Biology">Biology</option>
                      <option value="English">English</option>
                      <option value="History">History</option>
                      <option value="Geography">Geography</option>
                      <option value="Computer Science">Computer Science</option>
                    </select>
                  </div>

                  <div className="filter-group">
                    <label htmlFor="sortBy" className="filter-label">Sort By</label>
                    <select
                      id="sortBy"
                      className="filter-select"
                      value={filters.sortBy}
                      onChange={(e) => setFilters((prev) => ({ ...prev, sortBy: e.target.value }))}
                      aria-label="Sort notes by"
                    >
                      <option value="createdAt">Date Added</option>
                      <option value="title">Title</option>
                      <option value="subject">Subject</option>
                      <option value="downloadCount">Downloads</option>
                      <option value="rating">Rating</option>
                    </select>
                  </div>

                  <div className="filter-group">
                    <label htmlFor="order" className="filter-label">Order</label>
                    <select
                      id="order"
                      className="filter-select"
                      value={filters.order}
                      onChange={(e) => setFilters((prev) => ({ ...prev, order: e.target.value }))}
                      aria-label="Order of notes"
                    >
                      <option value="desc">Descending</option>
                      <option value="asc">Ascending</option>
                    </select>
                  </div>
                </div>
              </div>
            </section>

            {/* Notes list */}
            {loading ? (
              <div className="loading-state">
                <div className="spinner"></div>
                <p>Loading study materials...</p>
              </div>
            ) : notes.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">
                  <i className="fas fa-book-open"></i>
                </div>
                <h3>No study materials found</h3>
                <p>Try adjusting your search filters or check back later for new content.</p>
                {(filters.search || filters.subject) && (
                  <button className="btn btn-primary" onClick={clearFilters}>
                    Clear Filters
                  </button>
                )}
              </div>
            ) : (
              <section className="notes-section">
                <div className="notes-header">
                  <h3>Available Resources ({notes.length})</h3>
                  <span className="results-info">
                    Showing {notes.length} of {notes.length} materials
                  </span>
                </div>
                
                <div className="notes-grid">
                  {notes.map(note => {
                    const avgRating = parseFloat(getAverageRating(note._id));
                    const noteReviews = reviews[note._id] || [];
                    const hasReviewed = userHasReviewed(note._id);

                    return (
                      <div key={note._id} className="note-card">
                        <div className="note-header">
                          <div className="note-icon">
                            {getFileIcon(note.fileName || note.filename || note.originalFileName || '')}
                          </div>
                          <div className="note-title-section">
                            <h3 className="note-title">{note.title}</h3>
                            <div className="note-meta-header">
                              <span className="note-subject">{note.subject}</span>
                              <span className="note-grade">{note.grade}</span>
                            </div>
                          </div>
                        </div>

                        <p className="note-description">{note.description}</p>

                        <div className="note-meta">
                          <div className="meta-item">
                            <i className="fas fa-database"></i>
                            <span>{formatFileSize(note.fileSize || 0)}</span>
                          </div>
                          <div className="meta-item">
                            <i className="fas fa-download"></i>
                            <span>{note.downloadCount || 0} downloads</span>
                          </div>
                          <div className="meta-item">
                            <i className="fas fa-user-graduate"></i>
                            <span>{note.uploadedBy?.name || note.teacher?.name || 'Unknown Teacher'}</span>
                          </div>
                          <div className="meta-item">
                            <i className="fas fa-calendar"></i>
                            <span>{formatDate(note.createdAt, { format: 'short' })}</span>
                          </div>
                        </div>

                        {/* Rating */}
                        <div className="note-rating">
                          <div className="stars">
                            {renderStars(Math.round(avgRating))}
                            <span className="rating-text">
                              {avgRating > 0 ? `${avgRating} (${noteReviews.length} review${noteReviews.length > 1 ? 's' : ''})` : 'No reviews yet'}
                            </span>
                          </div>
                        </div>

                        <div className="note-actions">
                          <button
                            className="btn btn-primary"
                            onClick={() => handleDownload(note)}
                            aria-label={`Download ${note.title}`}
                          >
                            <i className="fas fa-download"></i> Download
                          </button>
                          {!hasReviewed ? (
                            <button
                              className="btn btn-secondary"
                              onClick={() => {
                                setSelectedNote(note);
                                setShowReviewModal(true);
                              }}
                              aria-label={`Add review for ${note.title}`}
                            >
                              <i className="fas fa-star"></i> Review
                            </button>
                          ) : (
                            <span className="badge reviewed">
                              <i className="fas fa-check"></i> Reviewed
                            </span>
                          )}
                        </div>

                        {/* Reviews snippet */}
                        {noteReviews.length > 0 && (
                          <div className="note-reviews">
                            <h4>Recent Reviews</h4>
                            <div className="reviews-list">
                              {noteReviews.slice(0, 2).map(review => {
                                const helpfulCount = review.helpfulCount || 0;
                                const totalVotes = review.totalVotes || 0;
                                const downVotes = totalVotes - helpfulCount;

                                return (
                                  <div key={review._id} className="review-item">
                                    <div className="review-header">
                                      <div className="reviewer-info">
                                        <strong>{review.studentId?.name || review.student?.name || 'Anonymous'}</strong>
                                        <div className="review-stars">
                                          {renderStars(review.rating)}
                                        </div>
                                      </div>
                                      <span className="review-date">{formatDate(review.createdAt, { format: 'relative' })}</span>
                                    </div>
                                    <p className="review-comment">{review.comment}</p>
                                    <div className="review-footer">
                                      <div className="review-votes">
                                        <button
                                          className="vote-btn upvote"
                                          onClick={() => handleVoteReview(review._id, true)}
                                          aria-label={`Upvote review by ${review.studentId?.name || 'Anonymous'}`}
                                        >
                                          <i className="fas fa-thumbs-up"></i> {helpfulCount}
                                        </button>
                                        <button
                                          className="vote-btn downvote"
                                          onClick={() => handleVoteReview(review._id, false)}
                                          aria-label={`Downvote review by ${review.studentId?.name || 'Anonymous'}`}
                                        >
                                          <i className="fas fa-thumbs-down"></i> {downVotes}
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            )}
          </>
        )}

        {activeTab === 'history' && (
          <section className="history-section">
            <div className="section-header">
              <h2 className="section-title">Download History</h2>
              <p className="section-subtitle">Track your downloaded study materials</p>
            </div>
            
            {downloadStats && (
              <div className="stats-cards">
                <div className="stat-card">
                  <div className="stat-icon">
                    <i className="fas fa-download"></i>
                  </div>
                  <div className="stat-content">
                    <h3>{downloadStats.totalDownloads || 0}</h3>
                    <p>Total Downloads</p>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon">
                    <i className="fas fa-book"></i>
                  </div>
                  <div className="stat-content">
                    <h3>{downloadStats.uniqueNotesCount || 0}</h3>
                    <p>Unique Materials</p>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon">
                    <i className="fas fa-database"></i>
                  </div>
                  <div className="stat-content">
                    <h3>{formatFileSize(downloadStats.totalFileSize || 0)}</h3>
                    <p>Total Size</p>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon">
                    <i className="fas fa-calendar-week"></i>
                  </div>
                  <div className="stat-content">
                    <h3>{downloadStats.recentDownloads || 0}</h3>
                    <p>This Week</p>
                  </div>
                </div>
              </div>
            )}

            {loading ? (
              <div className="loading-state">
                <div className="spinner"></div>
                <p>Loading download history...</p>
              </div>
            ) : downloadHistory.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">
                  <i className="fas fa-history"></i>
                </div>
                <h3>No download history yet</h3>
                <p>Your downloaded materials will appear here once you start downloading resources.</p>
              </div>
            ) : (
              <div className="download-history-list">
                <div className="history-header">
                  <h3>Recent Downloads ({downloadHistory.length})</h3>
                </div>
                
                <div className="history-items">
                  {downloadHistory.map((download) => (
                    <div key={download._id} className="history-item">
                      <div className="history-icon">
                        {getFileIcon(download.fileName)}
                      </div>
                      <div className="history-content">
                        <h4 className="history-title">{download.noteTitle}</h4>
                        <div className="history-meta">
                          <span className="history-subject">{download.noteSubject}</span>
                          <span className="history-grade">{download.noteGrade}</span>
                          <span className="history-size">{formatFileSize(download.fileSize)}</span>
                        </div>
                        <div className="history-details">
                          <span className="history-teacher">
                            <i className="fas fa-user-graduate"></i>
                            {download.uploadedBy?.name || 'Unknown Teacher'}
                          </span>
                          <span className="history-date">
                            <i className="fas fa-calendar"></i>
                            {formatDate(download.downloadedAt, { format: 'relative' })}
                          </span>
                        </div>
                      </div>
                      {/* <div className="history-actions">
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => handleDownload({
                            _id: download.noteId,
                            originalFileName: download.fileName,
                            fileName: download.fileName
                          })}
                          title="Download again"
                        >
                          <i className="fas fa-download"></i>
                        </button>
                      </div> */}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {activeTab === 'analytics' && (
          <ProgressAnalytics />
        )}
      </main>

      {/* Review Modal */}
      {showReviewModal && selectedNote && (
        <div className="modal-overlay" onClick={() => setShowReviewModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">
                <i className="fas fa-star"></i>
                Review: {selectedNote.title}
              </h2>
              <button
                className="modal-close"
                onClick={() => setShowReviewModal(false)}
                aria-label="Close modal"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            <form onSubmit={handleReviewSubmit} className="modal-form">
              <div className="form-group">
                <label htmlFor="rating" className="form-label">
                  Rating
                </label>
                <div className="rating-selector">
                  {[1, 2, 3, 4, 5].map((r) => (
                    <button
                      key={r}
                      type="button"
                      className={`rating-option ${reviewData.rating === r ? 'selected' : ''}`}
                      onClick={() => setReviewData((prev) => ({ ...prev, rating: r }))}
                      aria-label={`${r} stars`}
                    >
                      {r} <i className="fas fa-star"></i>
                    </button>
                  ))}
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="comment" className="form-label">
                  Comment
                </label>
                <textarea
                  id="comment"
                  className="form-textarea"
                  rows="4"
                  value={reviewData.comment}
                  onChange={(e) => setReviewData((prev) => ({ ...prev, comment: e.target.value }))}
                  required
                  placeholder="Share your experience with this study material..."
                ></textarea>
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  onClick={() => setShowReviewModal(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Submit Review
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentDashboard;