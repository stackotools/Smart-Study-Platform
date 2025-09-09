const express = require('express');
const router = express.Router();

const {
  getNotes,
  getNote,
  uploadNote,
  updateNote,
  deleteNote,
  getMyUploads,
  downloadNote,
  getNotesStats,
  validateNote,
  validateNoteUpdate,
  validateNoteQuery
} = require('../controllers/notesController');

const { protect, teacherOnly, checkOwnership, optionalAuth } = require('../middleware/auth');
const { uploadSingle, uploadOptional } = require('../middleware/fileUpload');
const Note = require('../models/Note');

// Public routes (no authentication required)
// @desc    Get notes statistics
// @route   GET /api/notes/stats
// @access  Public
router.get('/stats', getNotesStats);

// @desc    Get all notes with filtering
// @route   GET /api/notes
// @access  Public
router.get('/', validateNoteQuery, optionalAuth, getNotes);

// Protected routes (authentication required)
// @desc    Get notes uploaded by current teacher
// @route   GET /api/notes/my-uploads
// @access  Private (Teachers only)
router.get('/my-uploads', protect, teacherOnly, getMyUploads);

// @desc    Download note file
// @route   GET /api/notes/:id/download
// @access  Public
router.get('/:id/download', downloadNote);

// @desc    Get single note
// @route   GET /api/notes/:id
// @access  Public
router.get('/:id', getNote);

// @desc    Upload a new note
// @route   POST /api/notes
// @access  Private (Teachers only)
router.post(
  '/', 
  protect, 
  teacherOnly, 
  uploadOptional('file'), 
  validateNote, 
  uploadNote
);

// @desc    Update note
// @route   PUT /api/notes/:id
// @access  Private (Teachers only - own notes)
router.put(
  '/:id',
  protect,
  teacherOnly,
  checkOwnership(Note),
  uploadOptional('file'),
  validateNoteUpdate,
  updateNote
);

// @desc    Delete note
// @route   DELETE /api/notes/:id
// @access  Private (Teachers only - own notes)
router.delete(
  '/:id',
  protect,
  teacherOnly,
  checkOwnership(Note),
  deleteNote
);

module.exports = router;
