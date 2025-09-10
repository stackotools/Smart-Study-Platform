import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import notesService from '../../services/notesService';
import toast from 'react-hot-toast';

const NotePreview = () => {
  const { id } = useParams();
  const [note, setNote] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const response = await notesService.getNote(id);
        setNote(response.data || response);
      } catch (e) {
        toast.error('Failed to load note');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="container" style={{ padding: '24px' }}>
        <p>Loading preview...</p>
      </div>
    );
  }

  if (!note) {
    return (
      <div className="container" style={{ padding: '24px' }}>
        <p>Note not found.</p>
      </div>
    );
  }

  const fileUrl = note.cloudinarySecureUrl || note.cloudinaryUrl || note.filePath || '';
  const isPdf = (note.mimeType || '').includes('pdf') || (note.fileType || '').toLowerCase() === 'pdf' || fileUrl.toLowerCase().endsWith('.pdf');

  return (
    <div className="container" style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>{note.title}</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <Link className="btn btn-secondary" to="/dashboard">Back</Link>
          <button
            className="btn btn-primary"
            onClick={() => notesService.downloadNote(note._id, note.originalFileName || note.title || 'download')}
          >
            Download
          </button>
        </div>
      </div>

      {isPdf ? (
        <div style={{ width: '100%', height: '800px', border: '1px solid #ddd', borderRadius: '8px' }}>
          <iframe 
            title="PDF Preview" 
            src={fileUrl} 
            width="100%" 
            height="100%" 
            style={{ border: 'none', borderRadius: '8px' }}
          />
        </div>
      ) : (
        fileUrl ? (
          <div style={{ width: '100%', height: '800px', border: '1px solid #ddd', borderRadius: '8px' }}>
            <iframe 
              title="File Preview" 
              src={fileUrl} 
              width="100%" 
              height="100%" 
              style={{ border: 'none', borderRadius: '8px' }}
            />
          </div>
        ) : (
          <div style={{ 
            padding: '2rem', 
            textAlign: 'center', 
            border: '1px solid #ddd', 
            borderRadius: '8px',
            backgroundColor: '#f8f9fa'
          }}>
            <i className="fas fa-file" style={{ fontSize: '3rem', color: '#6c757d', marginBottom: '1rem' }}></i>
            <p style={{ margin: 0, color: '#6c757d' }}>No file attached to this note.</p>
          </div>
        )
      )}
    </div>
  );
};

export default NotePreview;


