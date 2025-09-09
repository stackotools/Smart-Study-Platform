import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import notesService from '../../services/notesService';
import reviewsService from '../../services/reviewsService';
import { useApi } from '../../hooks/useApi.js';
import { formatDate, formatFileSize, getFileIcon } from '../../utils/helpers.js';
import toast from 'react-hot-toast';

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
  const [uploadData, setUploadData] = useState({
    title: '',
    description: '',
    subject: '',
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
          } catch (_) {}
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

  const validateFile = (file) => {
    if (!file) return { valid: false, error: 'Please select a file' };
    
    // Check file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return { valid: false, error: 'File too large. Maximum size is 10MB' };
    }
    
    // Check file type
    const allowedTypes = ['pdf', 'doc', 'docx', 'txt', 'ppt', 'pptx', 'jpg', 'jpeg', 'png'];
    const fileExt = file.name.split('.').pop()?.toLowerCase();
    if (!allowedTypes.includes(fileExt)) {
      return { valid: false, error: `Invalid file type. Allowed: ${allowedTypes.join(', ')}` };
    }
    
    return { valid: true, error: null };
  };

  const handleFileUpload = async (e) => {
    e.preventDefault();

    // Basic form validation
    if (!uploadData.title || !uploadData.description || !uploadData.subject) {
      toast.error('Please fill in all required fields');
      return;
    }
    
    // File validation (only if file is provided)
    if (uploadData.file) {
      const fileValidation = validateFile(uploadData.file);
      if (!fileValidation.valid) {
        toast.error(fileValidation.error);
        return;
      }
    }

    try {
      await execute(async () => {
        const formData = new FormData();
        formData.append('title', uploadData.title);
        formData.append('description', uploadData.description);
        formData.append('subject', uploadData.subject);
        
        // Only append file if one is selected
        if (uploadData.file) {
          formData.append('file', uploadData.file);
        }

        await notesService.uploadNote(formData);

        setShowUploadModal(false);
        setUploadData({ title: '', description: '', subject: '', file: null });

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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Teacher Dashboard</h1>
              <p className="text-gray-600 mt-1">Welcome back, <span className="font-semibold">{user.name}</span>!</p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowUploadModal(true)}
                className="bg-indigo-600 text-white px-5 py-2 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
              >
                Upload Note
              </button>
              <button
                onClick={logout}
                className="text-gray-600 hover:text-gray-900 px-4 py-2 rounded-md text-sm font-medium transition"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-8 sm:px-6 lg:px-8">
        {/* Stats Cards */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          {[
            { icon: '📚', label: 'Total Notes', value: stats.totalNotes },
            { icon: '📥', label: 'Total Downloads', value: stats.totalDownloads },
            { icon: '💬', label: 'Total Reviews', value: stats.totalReviews },
            { icon: '⭐', label: 'Average Rating', value: `${stats.averageRating.toFixed(1)}/5` }
          ].map(({ icon, label, value }) => (
            <div key={label} className="bg-white shadow rounded-lg p-5 flex items-center space-x-4">
              <div className="text-3xl">{icon}</div>
              <div>
                <dt className="text-sm font-medium text-gray-500">{label}</dt>
                <dd className="text-xl font-semibold text-gray-900">{value}</dd>
              </div>
            </div>
          ))}
        </section>

        {/* Notes List */}
        <section className="bg-white shadow rounded-lg p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-6">Your Notes</h3>

          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-10 w-10 border-4 border-indigo-600 border-t-transparent mx-auto"></div>
              <p className="text-gray-500 mt-3">Loading...</p>
            </div>
          ) : notes.length === 0 ? (
            <div className="text-center py-16">
              <span className="text-5xl mb-5 block">📝</span>
              <p className="text-gray-500 mb-6 text-lg">No notes uploaded yet</p>
              <button
                onClick={() => setShowUploadModal(true)}
                className="bg-indigo-600 text-white px-6 py-2 rounded-md hover:bg-indigo-700 transition"
              >
                Upload Your First Note
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {notes.map((note) => (
                <div
                  key={note._id}
                  className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition flex justify-between items-start"
                >
                  <div className="flex items-start space-x-4">
                    <span className="text-3xl">{getFileIcon(note.fileName || note.filename || note.originalFileName || '')}</span>
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900">{note.title}</h4>
                      <p className="text-sm text-gray-600 mt-1">{note.description}</p>
                      <div className="flex flex-wrap gap-x-6 gap-y-1 mt-2 text-sm text-gray-500">
                        <span><strong>Subject:</strong> {note.subject}</span>
                        <span><strong>Size:</strong> {formatFileSize(note.fileSize || 0)}</span>
                        <span><strong>Downloads:</strong> {note.downloadCount || 0}</span>
                        <span><strong>Uploaded:</strong> {formatDate(note.createdAt, { format: 'short' })}</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <button
                      onClick={() => handleDeleteNote(note._id)}
                      className="text-red-600 hover:text-red-800 px-3 py-1 rounded-md text-sm font-medium transition"
                    >
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
        <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-start justify-center overflow-auto z-50">
          <div className="relative mt-24 w-full max-w-md p-6 bg-white rounded-md shadow-lg">
            <h3 className="text-xl font-semibold text-gray-900 mb-5">Upload New Note</h3>
            <form onSubmit={handleFileUpload}>
              <div className="mb-4">
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                  Title
                </label>
                <input
                  id="title"
                  type="text"
                  value={uploadData.title}
                  onChange={(e) => setUploadData({ ...uploadData, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  required
                />
              </div>

              <div className="mb-4">
                <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-1">
                  Subject
                </label>
                <input
                  id="subject"
                  type="text"
                  value={uploadData.subject}
                  onChange={(e) => setUploadData({ ...uploadData, subject: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  required
                />
              </div>

              <div className="mb-4">
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  id="description"
                  value={uploadData.description}
                  onChange={(e) => setUploadData({ ...uploadData, description: e.target.value })}
                  rows="3"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  required
                />
              </div>

              <div className="mb-6">
                <label htmlFor="file" className="block text-sm font-medium text-gray-700 mb-1">
                  File (Optional)
                </label>
                <input
                  id="file"
                  type="file"
                  onChange={(e) => {
                    const file = e.target.files[0];
                    if (file) {
                      const validation = validateFile(file);
                      if (!validation.valid) {
                        toast.error(validation.error);
                        e.target.value = ''; // Clear invalid file
                        return;
                      }
                    }
                    setUploadData({ ...uploadData, file });
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  accept=".pdf,.doc,.docx,.txt,.ppt,.pptx,.jpg,.jpeg,.png"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Supported formats: PDF, DOC, DOCX, TXT, PPT, PPTX, JPG, PNG (Max: 10MB)
                </p>
                {uploadData.file && (
                  <p className="text-xs text-green-600 mt-1">
                    ✓ Selected: {uploadData.file.name} ({Math.round(uploadData.file.size / 1024)} KB)
                  </p>
                )}
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 transition"
                >
                  {loading ? 'Uploading...' : 'Upload'}
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
