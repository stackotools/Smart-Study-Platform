import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import notesService from '../../services/notesService';
import reviewsService from '../../services/reviewsService';
import { useApi } from '../../hooks/useApi';
import { formatDate, formatFileSize, getFileIcon, debounce } from '../../utils/helpers';
import toast from 'react-hot-toast';

const StudentDashboard = () => {
  const { user, logout } = useAuth();
  const { loading, execute } = useApi();
  
  const [notes, setNotes] = useState([]);
  const [reviews, setReviews] = useState({});
  const [filters, setFilters] = useState({
    search: '',
    subject: '',
    sortBy: 'createdAt',
    order: 'desc'
  });
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedNote, setSelectedNote] = useState(null);
  const [reviewData, setReviewData] = useState({
    rating: 5,
    comment: ''
  });

  useEffect(() => {
    loadNotes();
  }, [filters]);

  useEffect(() => {
    if (notes.length > 0) {
      loadReviews();
    }
  }, [notes]);

  const debouncedSearch = debounce((searchTerm) => {
    setFilters(prev => ({ ...prev, search: searchTerm }));
  }, 300);

  const loadNotes = async () => {
    try {
      await execute(async () => {
        const response = await notesService.getNotes(filters);
        setNotes(response.data.notes || []);
      });
    } catch (error) {
      console.error('Error loading notes:', error);
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
          } catch (error) {
            console.error(`Error loading reviews for note ${note._id}:`, error);
            reviewsData[note._id] = [];
          }
        })
      );
      setReviews(reviewsData);
    } catch (error) {
      console.error('Error loading reviews:', error);
    }
  };

  const handleDownload = async (note) => {
    try {
      await execute(async () => {
        await notesService.downloadNote(note._id, note.originalFileName || note.fileName || 'download');
      }, {
        showSuccessToast: true,
        successMessage: 'File downloaded successfully!'
      });
    } catch (error) {
      console.error('Download error:', error);
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
          rating: parseInt(reviewData.rating),
          comment: reviewData.comment.trim()
        });
        
        setShowReviewModal(false);
        setSelectedNote(null);
        setReviewData({ rating: 5, comment: '' });
        
        // Reload reviews
        await loadReviews();
      }, {
        showSuccessToast: true,
        successMessage: 'Review submitted successfully!'
      });
    } catch (error) {
      console.error('Review submit error:', error);
    }
  };

  const handleVoteReview = async (reviewId, voteType) => {
    try {
      await execute(async () => {
        await reviewsService.voteReview(reviewId, voteType);
        await loadReviews();
      });
    } catch (error) {
      console.error('Vote error:', error);
    }
  };

  const getAverageRating = (noteId) => {
    const noteReviews = reviews[noteId] || [];
    if (noteReviews.length === 0) return 0;
    
    const sum = noteReviews.reduce((acc, review) => acc + review.rating, 0);
    return (sum / noteReviews.length).toFixed(1);
  };

  const renderStars = (rating) => {
    return Array.from({ length: 5 }, (_, i) => (
      <span key={i} className={i < rating ? 'text-yellow-400' : 'text-gray-300'}>
        ⭐
      </span>
    ));
  };

  const userHasReviewed = (noteId) => {
    const noteReviews = reviews[noteId] || [];
    return noteReviews.some(review => (review.studentId?._id || review.student?._id) === user._id);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Student Dashboard</h1>
              <p className="text-gray-600">Welcome back, {user.name}!</p>
            </div>
            <button
              onClick={logout}
              className="text-gray-500 hover:text-gray-700 px-3 py-2 rounded-md text-sm font-medium"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Filters */}
        <div className="bg-white shadow rounded-lg mb-6">
          <div className="px-4 py-5 sm:p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Search
                </label>
                <input
                  type="text"
                  placeholder="Search notes..."
                  onChange={(e) => debouncedSearch(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Subject
                </label>
                <select
                  value={filters.subject}
                  onChange={(e) => setFilters(prev => ({ ...prev, subject: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">All Subjects</option>
                  <option value="Mathematics">Mathematics</option>
                  <option value="Science">Science</option>
                  <option value="English">English</option>
                  <option value="History">History</option>
                  <option value="Computer Science">Computer Science</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sort By
                </label>
                <select
                  value={filters.sortBy}
                  onChange={(e) => setFilters(prev => ({ ...prev, sortBy: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="createdAt">Date</option>
                  <option value="title">Title</option>
                  <option value="subject">Subject</option>
                  <option value="downloadCount">Downloads</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Order
                </label>
                <select
                  value={filters.order}
                  onChange={(e) => setFilters(prev => ({ ...prev, order: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="desc">Descending</option>
                  <option value="asc">Ascending</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Notes Grid */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              Available Study Notes
            </h3>
            
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                <p className="text-gray-500 mt-2">Loading notes...</p>
              </div>
            ) : notes.length === 0 ? (
              <div className="text-center py-8">
                <span className="text-4xl mb-4 block">📚</span>
                <p className="text-gray-500">No notes found matching your criteria</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {notes.map((note) => {
                  const avgRating = parseFloat(getAverageRating(note._id));
                  const noteReviews = reviews[note._id] || [];
                  const hasReviewed = userHasReviewed(note._id);
                  
                  return (
                    <div key={note._id} className="border border-gray-200 rounded-lg p-4 hover:shadow-lg transition-shadow">
                      <div className="flex items-start space-x-3 mb-3">
                        <span className="text-3xl">{getFileIcon(note.fileName || note.filename || note.originalFileName || '')}</span>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-lg font-medium text-gray-900 truncate">{note.title}</h4>
                          <p className="text-sm text-gray-600 mt-1">{note.subject}</p>
                        </div>
                      </div>

                      <p className="text-sm text-gray-700 mb-3 line-clamp-2">{note.description}</p>

                      <div className="flex items-center justify-between text-sm text-gray-500 mb-3">
                        <span>Size: {formatFileSize(note.fileSize || 0)}</span>
                        <span>Downloads: {note.downloadCount || 0}</span>
                      </div>

                      {/* Rating */}
                      <div className="flex items-center space-x-2 mb-3">
                        <div className="flex">
                          {renderStars(Math.round(avgRating))}
                        </div>
                        <span className="text-sm text-gray-600">
                          {avgRating > 0 ? `${avgRating} (${noteReviews.length} reviews)` : 'No reviews yet'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                        <span>By: {note.uploadedBy?.name || note.teacher?.name || 'Unknown'}</span>
                        <span>{formatDate(note.createdAt, { format: 'short' })}</span>
                      </div>

                      {/* Actions */}
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleDownload(note)}
                          className="flex-1 bg-indigo-600 text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                          Download
                        </button>
                        {!hasReviewed && (
                          <button
                            onClick={() => {
                              setSelectedNote(note);
                              setShowReviewModal(true);
                            }}
                            className="flex-1 bg-green-600 text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                          >
                            Review
                          </button>
                        )}
                      </div>

                      {/* Reviews Section */}
                      {noteReviews.length > 0 && (
                        <div className="mt-4 border-t pt-4">
                          <h5 className="text-sm font-medium text-gray-900 mb-2">Recent Reviews</h5>
                          <div className="space-y-3 max-h-40 overflow-y-auto">
                            {noteReviews.slice(0, 3).map((review) => (
                              <div key={review._id} className="bg-gray-50 rounded-md p-3">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-sm font-medium text-gray-900">
                                    {review.studentId?.name || review.student?.name || 'Anonymous'}
                                  </span>
                                  <div className="flex">
                                    {renderStars(review.rating)}
                                  </div>
                                </div>
                                <p className="text-sm text-gray-700 mb-2">{review.comment}</p>
                                <div className="flex items-center justify-between text-xs text-gray-500">
                                  <span>{formatDate(review.createdAt, { format: 'relative' })}</span>
                                  <div className="flex space-x-2">
                                    <button
                                      onClick={() => handleVoteReview(review._id, true)}
                                      className="text-green-600 hover:text-green-800"
                                    >
                                      👍 {review.helpfulCount || 0}
                                    </button>
                                    <button
                                      onClick={() => handleVoteReview(review._id, false)}
                                      className="text-red-600 hover:text-red-800"
                                    >
                                      👎 {(review.totalVotes || 0) - (review.helpfulVotes || 0)}
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Review Modal */}
      {showReviewModal && selectedNote && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Review: {selectedNote.title}
              </h3>
              <form onSubmit={handleReviewSubmit}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Rating
                  </label>
                  <select
                    value={reviewData.rating}
                    onChange={(e) => setReviewData({ ...reviewData, rating: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value={5}>⭐⭐⭐⭐⭐ Excellent</option>
                    <option value={4}>⭐⭐⭐⭐ Good</option>
                    <option value={3}>⭐⭐⭐ Average</option>
                    <option value={2}>⭐⭐ Poor</option>
                    <option value={1}>⭐ Very Poor</option>
                  </select>
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Comment
                  </label>
                  <textarea
                    value={reviewData.comment}
                    onChange={(e) => setReviewData({ ...reviewData, comment: e.target.value })}
                    rows="4"
                    placeholder="Share your thoughts about this note..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    required
                  />
                </div>

                <div className="flex items-center justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowReviewModal(false);
                      setSelectedNote(null);
                      setReviewData({ rating: 5, comment: '' });
                    }}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                  >
                    {loading ? 'Submitting...' : 'Submit Review'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentDashboard;
