import api, { endpoints } from './api';

class AnalyticsService {
  // Get student progress analytics
  async getStudentProgress() {
    try {
      const response = await api.get(endpoints.analytics.studentProgress);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Get teacher analytics
  async getTeacherAnalytics() {
    try {
      const response = await api.get(endpoints.analytics.teacherAnalytics);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Get platform analytics
  async getPlatformAnalytics() {
    try {
      const response = await api.get(endpoints.analytics.platform);
      return response.data;
    } catch (error) {
      throw error;
    }
  }
}

export default new AnalyticsService();
