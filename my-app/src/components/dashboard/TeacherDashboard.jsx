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

  const handleFileUpload = async (e) => {
    e.preventDefault();
    
    if (!uploadData.title || !uploadData.description || !uploadData.subject || !uploadData.file) {
      toast.error('Please fill in all fields and select a file');
      return;
    }

    try {
      await execute(async () => {
        const formData = new FormData();
        formData.append('title', uploadData.title);
        formData.append('description', uploadData.description);
        formData.append('subject', uploadData.subject);
        formData.append('file', uploadData.file);

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
              <p className="text-gray-600">Welcome back, {user.name}!</p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowUploadModal(true)}
                className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                Upload Note
              </button>
              <button
                onClick={logout}
                className="text-gray-500 hover:text-gray-700 px-3 py-2 rounded-md text-sm font-medium"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <span className="text-2xl">📚</span>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Total Notes
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {stats.totalNotes}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <span className="text-2xl">📥</span>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Total Downloads
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {stats.totalDownloads}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <span className="text-2xl">💬</span>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Total Reviews
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {stats.totalReviews}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <span className="text-2xl">⭐</span>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Average Rating
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {stats.averageRating.toFixed(1)}/5
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Notes List */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              Your Notes
            </h3>
            
            {loading ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                <p className="text-gray-500 mt-2">Loading...</p>
              </div>
            ) : notes.length === 0 ? (
              <div className="text-center py-8">
                <span className="text-4xl mb-4 block">📝</span>
                <p className="text-gray-500">No notes uploaded yet</p>
                <button
                  onClick={() => setShowUploadModal(true)}
                  className="mt-4 bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
                >
                  Upload Your First Note
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {notes.map((note) => (
                  <div key={note._id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3">
                        <span className="text-2xl">{getFileIcon(note.fileName || note.filename || note.originalFileName || '')}</span>
                        <div>
                          <h4 className="text-lg font-medium text-gray-900">{note.title}</h4>
                          <p className="text-sm text-gray-600 mt-1">{note.description}</p>
                          <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                            <span>Subject: {note.subject}</span>
                            <span>Size: {formatFileSize(note.fileSize || 0)}</span>
                            <span>Downloads: {note.downloadCount || 0}</span>
                            <span>Uploaded: {formatDate(note.createdAt, { format: 'short' })}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleDeleteNote(note._id)}
                          className="text-red-600 hover:text-red-800 px-3 py-1 text-sm font-medium"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Upload New Note</h3>
              <form onSubmit={handleFileUpload}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Title
                  </label>
                  <input
                    type="text"
                    value={uploadData.title}
                    onChange={(e) => setUploadData({ ...uploadData, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    required
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Subject
                  </label>
                  <input
                    type="text"
                    value={uploadData.subject}
                    onChange={(e) => setUploadData({ ...uploadData, subject: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    required
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={uploadData.description}
                    onChange={(e) => setUploadData({ ...uploadData, description: e.target.value })}
                    rows="3"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    required
                  />
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    File
                  </label>
                  <input
                    type="file"
                    onChange={(e) => setUploadData({ ...uploadData, file: e.target.files[0] })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    accept=".pdf,.doc,.docx,.txt,.ppt,.pptx"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Supported formats: PDF, DOC, DOCX, TXT, PPT, PPTX
                  </p>
                </div>

                <div className="flex items-center justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowUploadModal(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                  >
                    {loading ? 'Uploading...' : 'Upload'}
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

export default TeacherDashboard;
