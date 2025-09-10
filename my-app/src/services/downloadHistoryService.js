import api, { endpoints } from './api';

class DownloadHistoryService {
  // Get download history for current student
  async getDownloadHistory(page = 1, limit = 10) {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString()
      });

      const response = await api.get(`${endpoints.downloadHistory.list}?${params}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Get download statistics for current student
  async getDownloadStats() {
    try {
      const response = await api.get(endpoints.downloadHistory.stats);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Delete download history record
  async deleteDownloadHistory(id) {
    try {
      const response = await api.delete(endpoints.downloadHistory.delete(id));
      return response.data;
    } catch (error) {
      throw error;
    }
  }
}

export default new DownloadHistoryService();
