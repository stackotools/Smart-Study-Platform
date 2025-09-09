import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import notesService from '../../services/notesService';
import reviewsService from '../../services/reviewsService';
import { useApi } from '../../hooks/useApi';
import { formatDate, formatFileSize, getFileIcon, debounce } from '../../utils/helpers';
import toast from 'react-hot-toast';
import '../../index.css'; // custom styles below

const StudentDashboard = () => {
  const { user, logout } = useAuth();
  const { loading, execute } = useApi();

  const [notes, setNotes] = useState([]);
  const [reviews, setReviews] = useState({});
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

  const loadNotes = async () => {
    try {
      await execute(async () => {
        const response = await notesService.getNotes(filters);
        setNotes(response.data.notes || []);
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

  const handleDownload = async (note) => {
    try {
      await execute(async () => {
        await notesService.downloadNote(note._id, note.originalFileName || note.fileName || 'download');
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
        await reviewsService.createReview(selectedNote._id, {
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
        className={`bi bi-star${i < rating ? '-fill' : ''} text-warning`}
        aria-hidden="true"
      />
    ));
  };

  const userHasReviewed = (noteId) => {
    const noteReviews = reviews[noteId] || [];
    return noteReviews.some((review) => (review.studentId?._id || review.student?._id) === user._id);
  };

  return (
    <>
      <nav className="navbar navbar-expand-lg navbar-light bg-light shadow-sm mb-4">
        <div className="container">
          <a className="navbar-brand" href="#">Student Dashboard</a>
          <div className="d-flex align-items-center">
            <span className="me-3">Welcome, <strong>{user.name}</strong></span>
            <button onClick={logout} className="btn btn-outline-danger btn-sm">Logout</button>
          </div>
        </div>
      </nav>

      <main className="container mb-5">
        {/* Filters */}
        <div className="card mb-4 shadow-sm">
          <div className="card-body">
            <form className="row g-3">
              <div className="col-md-4">
                <label htmlFor="search" className="form-label">Search Notes</label>
                <input
                  id="search"
                  type="search"
                  className="form-control"
                  placeholder="Search by title or description"
                  onChange={(e) => debouncedSearch(e.target.value)}
                  aria-label="Search notes"
                />
              </div>
              <div className="col-md-3">
                <label htmlFor="subject" className="form-label">Subject</label>
                <select
                  id="subject"
                  className="form-select"
                  value={filters.subject}
                  onChange={(e) => setFilters((prev) => ({ ...prev, subject: e.target.value }))}
                  aria-label="Filter by subject"
                >
                  <option value="">All Subjects</option>
                  <option>Mathematics</option>
                  <option>Science</option>
                  <option>English</option>
                  <option>History</option>
                  <option>Computer Science</option>
                </select>
              </div>
              <div className="col-md-3">
                <label htmlFor="sortBy" className="form-label">Sort By</label>
                <select
                  id="sortBy"
                  className="form-select"
                  value={filters.sortBy}
                  onChange={(e) => setFilters((prev) => ({ ...prev, sortBy: e.target.value }))}
                  aria-label="Sort notes by"
                >
                  <option value="createdAt">Date</option>
                  <option value="title">Title</option>
                  <option value="subject">Subject</option>
                  <option value="downloadCount">Downloads</option>
                </select>
              </div>
              <div className="col-md-2">
                <label htmlFor="order" className="form-label">Order</label>
                <select
                  id="order"
                  className="form-select"
                  value={filters.order}
                  onChange={(e) => setFilters((prev) => ({ ...prev, order: e.target.value }))}
                  aria-label="Order of notes"
                >
                  <option value="desc">Descending</option>
                  <option value="asc">Ascending</option>
                </select>
              </div>
            </form>
          </div>
        </div>

        {/* Notes list */}
        {loading ? (
          <div className="text-center my-5">
            <div className="spinner-border text-primary" role="status" aria-label="Loading notes">
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
        ) : notes.length === 0 ? (
          <div className="text-center my-5 text-muted fs-4">
            <i className="bi bi-journal-x"></i> No notes found.
          </div>
        ) : (
          <div className="row row-cols-1 row-cols-md-3 g-4">
            {notes.map(note => {
              const avgRating = parseFloat(getAverageRating(note._id));
              const noteReviews = reviews[note._id] || [];
              const hasReviewed = userHasReviewed(note._id);

              return (
                <div key={note._id} className="col">
                  <div className="card h-100 shadow-sm">
                    <div className="card-body d-flex flex-column">
                      <div className="d-flex align-items-center mb-3">
                        <span className="fs-1 me-3">{getFileIcon(note.fileName || note.filename || note.originalFileName || '')}</span>
                        <div>
                          <h5 className="card-title mb-1 text-truncate" title={note.title}>{note.title}</h5>
                          <p className="text-muted mb-0">{note.subject}</p>
                        </div>
                      </div>
                      <p className="card-text flex-grow-1 text-truncate">{note.description}</p>
                      <ul className="list-inline small text-muted mb-3">
                        <li className="list-inline-item">Size: {formatFileSize(note.fileSize || 0)}</li>
                        <li className="list-inline-item">Downloads: {note.downloadCount || 0}</li>
                        <li className="list-inline-item">Uploaded by: {note.uploadedBy?.name || note.teacher?.name || 'Unknown'}</li>
                        <li className="list-inline-item">Date: {formatDate(note.createdAt, { format: 'short' })}</li>
                      </ul>

                      {/* Rating */}
                      <div className="mb-3">
                        {renderStars(Math.round(avgRating))}
                        <small className="ms-2 text-muted">
                          {avgRating > 0 ? `${avgRating} (${noteReviews.length} review${noteReviews.length > 1 ? 's' : ''})` : 'No reviews yet'}
                        </small>
                      </div>

                      <div className="d-flex gap-2">
                        <button
                          className="btn btn-primary flex-grow-1"
                          onClick={() => handleDownload(note)}
                          aria-label={`Download ${note.title}`}
                        >
                          <i className="bi bi-download"></i> Download
                        </button>
                        {!hasReviewed && (
                          <button
                            className="btn btn-success flex-grow-1"
                            onClick={() => {
                              setSelectedNote(note);
                              setShowReviewModal(true);
                            }}
                            aria-label={`Add review for ${note.title}`}
                          >
                            <i className="bi bi-pencil-square"></i> Review
                          </button>
                        )}
                      </div>

                      {/* Reviews snippet */}
                      {noteReviews.length > 0 && (
                        <div className="mt-4 border-top pt-3 overflow-auto custom-scrollbar" style={{ maxHeight: '150px' }} aria-live="polite">
                          <h6>Recent Reviews</h6>
                          {noteReviews.slice(0, 3).map(review => {
                            const helpfulCount = review.helpfulCount || 0;
                            const totalVotes = review.totalVotes || 0;
                            const downVotes = totalVotes - helpfulCount;

                            return (
                              <div key={review._id} className="mb-3 p-2 bg-light rounded">
                                <div className="d-flex justify-content-between align-items-center mb-1">
                                  <strong>{review.studentId?.name || review.student?.name || 'Anonymous'}</strong>
                                  <div>{renderStars(review.rating)}</div>
                                </div>
                                <p className="mb-2">{review.comment}</p>
                                <div className="d-flex justify-content-between align-items-center text-muted small">
                                  <span>{formatDate(review.createdAt, { format: 'relative' })}</span>
                                  <div>
                                    <button
                                      className="btn btn-sm btn-outline-success me-2"
                                      onClick={() => handleVoteReview(review._id, true)}
                                      aria-label={`Upvote review by ${review.studentId?.name || 'Anonymous'}`}
                                    >
                                      👍 {helpfulCount}
                                    </button>
                                    <button
                                      className="btn btn-sm btn-outline-danger"
                                      onClick={() => handleVoteReview(review._id, false)}
                                      aria-label={`Downvote review by ${review.studentId?.name || 'Anonymous'}`}
                                    >
                                      👎 {downVotes}
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Review Modal */}
      {showReviewModal && selectedNote && (
        <div
          className="modal show fade d-block"
          tabIndex="-1"
          role="dialog"
          aria-modal="true"
          aria-labelledby="reviewModalLabel"
        >
          <div className="modal-dialog" role="document">
            <div className="modal-content">
              <form onSubmit={handleReviewSubmit}>
                <div className="modal-header">
                  <h5 className="modal-title" id="reviewModalLabel">
                    Review: {selectedNote.title}
                  </h5>
                  <button
                    type="button"
                    className="btn-close"
                    aria-label="Close"
                    onClick={() => setShowReviewModal(false)}
                  ></button>
                </div>
                <div className="modal-body">
                  <div className="mb-3">
                    <label htmlFor="rating" className="form-label">
                      Rating
                    </label>
                    <select
                      id="rating"
                      className="form-select"
                      value={reviewData.rating}
                      onChange={(e) => setReviewData((prev) => ({ ...prev, rating: e.target.value }))}
                      required
                    >
                      {[5, 4, 3, 2, 1].map((r) => (
                        <option key={r} value={r}>
                          {r} Star{r > 1 ? 's' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="mb-3">
                    <label htmlFor="comment" className="form-label">
                      Comment
                    </label>
                    <textarea
                      id="comment"
                      className="form-control"
                      rows="3"
                      value={reviewData.comment}
                      onChange={(e) => setReviewData((prev) => ({ ...prev, comment: e.target.value }))}
                      required
                      placeholder="Write your review here..."
                    ></textarea>
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowReviewModal(false)}
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
          <div className="modal-backdrop fade show"></div>
        </div>
      )}
    </>
  );
};

export default StudentDashboard;
