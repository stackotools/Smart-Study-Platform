import api, { endpoints, createFormData } from './api';
import toast from 'react-hot-toast';

class NotesService {
  // Get all notes with optional filters
  async getNotes(filters = {}, page = 1, limit = 10) {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...filters
      });

      const response = await api.get(`${endpoints.notes.list}?${params}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Get single note
  async getNote(id) {
    try {
      const response = await api.get(endpoints.notes.get(id));
      return response.data.data;
    } catch (error) {
      throw error;
    }
  }

  // Upload new note (teachers only)
  async uploadNote(noteData) {
    try {
      const formData = createFormData(noteData, 'file');
      
      const response = await api.post(endpoints.notes.create, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 60000, // 60 seconds for file uploads
      });

      toast.success('Note uploaded successfully!');
      return response.data.data;
    } catch (error) {
      throw error;
    }
  }

  // Update note (teachers only)
  async updateNote(id, noteData) {
    try {
      let payload;
      let headers = {};

      // Check if there's a file to upload
      if (noteData.file) {
        payload = createFormData(noteData, 'file');
        headers['Content-Type'] = 'multipart/form-data';
      } else {
        payload = noteData;
        headers['Content-Type'] = 'application/json';
      }

      const response = await api.put(endpoints.notes.update(id), payload, {
        headers,
        timeout: 60000,
      });

      toast.success('Note updated successfully!');
      return response.data.data;
    } catch (error) {
      throw error;
    }
  }

  // Delete note (teachers only)
  async deleteNote(id) {
    try {
      await api.delete(endpoints.notes.delete(id));
      toast.success('Note deleted successfully!');
    } catch (error) {
      throw error;
    }
  }

  // Get teacher's uploaded notes
  async getMyUploads(page = 1, limit = 10) {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });

      const response = await api.get(`${endpoints.notes.myUploads}?${params}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Download note file
  async downloadNote(id, filename = 'download') {
    try {
      const response = await api.get(endpoints.notes.download(id), {
        responseType: 'blob',
      });

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      
      // Get filename from response headers or use provided filename
      const contentDisposition = response.headers['content-disposition'];
      let downloadFilename = filename;
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) {
          downloadFilename = filenameMatch[1];
        }
      }
      
      link.setAttribute('download', downloadFilename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success('File downloaded successfully!');
    } catch (error) {
      throw error;
    }
  }

  // Get platform statistics
  async getStats() {
    try {
      const response = await api.get(endpoints.notes.stats);
      return response.data.data;
    } catch (error) {
      throw error;
    }
  }

  // Search notes
  async searchNotes(searchTerm, filters = {}, page = 1, limit = 10) {
    try {
      const searchFilters = {
        ...filters,
        search: searchTerm,
      };
      
      return this.getNotes(searchFilters, page, limit);
    } catch (error) {
      throw error;
    }
  }

  // Get notes by subject
  async getNotesBySubject(subject, page = 1, limit = 10) {
    try {
      return this.getNotes({ subject }, page, limit);
    } catch (error) {
      throw error;
    }
  }

  // Get notes by grade
  async getNotesByGrade(grade, page = 1, limit = 10) {
    try {
      return this.getNotes({ grade }, page, limit);
    } catch (error) {
      throw error;
    }
  }

  // Get notes by category
  async getNotesByCategory(category, page = 1, limit = 10) {
    try {
      return this.getNotes({ category }, page, limit);
    } catch (error) {
      throw error;
    }
  }

  // Get notes by difficulty
  async getNotesByDifficulty(difficulty, page = 1, limit = 10) {
    try {
      return this.getNotes({ difficulty }, page, limit);
    } catch (error) {
      throw error;
    }
  }
}

export default new NotesService();
