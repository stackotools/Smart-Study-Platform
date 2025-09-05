import api, { endpoints } from './api';
import toast from 'react-hot-toast';

class ReviewsService {
  // Get reviews for a specific note
  async getReviewsForNote(noteId, page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc') {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        sortBy,
        sortOrder,
      });

      const response = await api.get(`${endpoints.reviews.list(noteId)}?${params}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Create a new review (students only)
  async createReview(reviewData) {
    try {
      const response = await api.post(endpoints.reviews.create, reviewData);
      toast.success('Review submitted successfully!');
      return response.data.data;
    } catch (error) {
      throw error;
    }
  }

  // Update a review (students only - own reviews)
  async updateReview(id, reviewData) {
    try {
      const response = await api.put(endpoints.reviews.update(id), reviewData);
      toast.success('Review updated successfully!');
      return response.data.data;
    } catch (error) {
      throw error;
    }
  }

  // Delete a review (students only - own reviews)
  async deleteReview(id) {
    try {
      await api.delete(endpoints.reviews.delete(id));
      toast.success('Review deleted successfully!');
    } catch (error) {
      throw error;
    }
  }

  // Get current student's reviews
  async getMyReviews(page = 1, limit = 10) {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });

      const response = await api.get(`${endpoints.reviews.myReviews}?${params}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Vote on review helpfulness
  async voteOnReview(id, isHelpful) {
    try {
      const response = await api.post(endpoints.reviews.vote(id), {
        helpful: isHelpful
      });
      
      toast.success('Vote recorded successfully!');
      return response.data.data;
    } catch (error) {
      throw error;
    }
  }

  // Report a review
  async reportReview(id, reason) {
    try {
      await api.post(endpoints.reviews.report(id), { reason });
      toast.success('Review reported successfully. Thank you for helping maintain quality.');
    } catch (error) {
      throw error;
    }
  }

  // Get review statistics for a note
  async getReviewStats(noteId) {
    try {
      const response = await api.get(endpoints.reviews.stats(noteId));
      return response.data.data;
    } catch (error) {
      throw error;
    }
  }

  // Get reviews by a specific student (public)
  async getStudentReviews(studentId, page = 1, limit = 10) {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });

      const response = await api.get(`/reviews/student/${studentId}?${params}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Check if current user can review a note
  async canReviewNote(noteId) {
    try {
      // Get reviews for the note and check if current user already reviewed
      const reviews = await this.getMyReviews();
      const existingReview = reviews.data?.find(review => review.noteId._id === noteId);
      return !existingReview;
    } catch (error) {
      return false;
    }
  }

  // Get user's review for a specific note
  async getMyReviewForNote(noteId) {
    try {
      const reviews = await this.getMyReviews();
      return reviews.data?.find(review => review.noteId._id === noteId) || null;
    } catch (error) {
      return null;
    }
  }

  // Calculate average rating from reviews
  calculateAverageRating(reviews) {
    if (!reviews || reviews.length === 0) return 0;
    
    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
    return Math.round((totalRating / reviews.length) * 10) / 10;
  }

  // Get rating distribution
  getRatingDistribution(reviews) {
    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    
    if (!reviews || reviews.length === 0) return distribution;
    
    reviews.forEach(review => {
      if (distribution.hasOwnProperty(review.rating)) {
        distribution[review.rating]++;
      }
    });
    
    return distribution;
  }

  // Format review categories for display
  formatCategories(categories) {
    const categoryLabels = {
      helpful: 'Helpful',
      clear: 'Clear',
      complete: 'Complete',
      accurate: 'Accurate'
    };

    return Object.entries(categories || {})
      .filter(([_, value]) => value === true)
      .map(([key, _]) => categoryLabels[key] || key);
  }
}

export default new ReviewsService();
