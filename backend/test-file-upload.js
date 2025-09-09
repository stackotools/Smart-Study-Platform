const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const axios = require('axios');

// Configuration
const API_BASE_URL = 'http://localhost:3001/api';
const TEST_FILES_DIR = path.join(__dirname, 'test-files');

// Test credentials - replace with actual test accounts
const TEACHER_CREDENTIALS = {
  email: 'teacher@test.com',
  password: 'Test123!@#'
};

const STUDENT_CREDENTIALS = {
  email: 'student@test.com', 
  password: 'Test123!@#'
};

// Create test files directory
if (!fs.existsSync(TEST_FILES_DIR)) {
  fs.mkdirSync(TEST_FILES_DIR);
}

// Create test files
const createTestFiles = () => {
  const testFiles = {
    'test-document.pdf': Buffer.from('PDF test content'), // Mock PDF
    'test-document.txt': 'This is a test text file content.',
    'test-document.docx': Buffer.from('DOCX test content'), // Mock DOCX
    'large-file.pdf': Buffer.alloc(15 * 1024 * 1024, 'x'), // 15MB file (should fail)
    'invalid-file.xyz': 'Invalid file type content'
  };

  Object.keys(testFiles).forEach(filename => {
    const filePath = path.join(TEST_FILES_DIR, filename);
    fs.writeFileSync(filePath, testFiles[filename]);
  });

  console.log('✅ Test files created');
};

// Authentication helper
let teacherToken = null;
let studentToken = null;

const authenticate = async (credentials, userType) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/auth/login`, credentials);
    const token = response.data.token;
    console.log(`✅ ${userType} authenticated successfully`);
    return token;
  } catch (error) {
    console.error(`❌ ${userType} authentication failed:`, error.response?.data?.message || error.message);
    return null;
  }
};

// Test file upload validation
const testFileUploadValidation = async () => {
  console.log('\n🧪 Testing File Upload Validation...');
  
  const tests = [
    {
      name: 'Valid PDF upload',
      file: 'test-document.pdf',
      shouldPass: true
    },
    {
      name: 'Valid TXT upload',
      file: 'test-document.txt',
      shouldPass: true
    },
    {
      name: 'Large file upload (>10MB)',
      file: 'large-file.pdf',
      shouldPass: false,
      expectedError: 'File too large'
    },
    {
      name: 'Invalid file type',
      file: 'invalid-file.xyz',
      shouldPass: false,
      expectedError: 'Only pdf, doc, docx, txt, jpg, jpeg, png, ppt, pptx files are allowed'
    }
  ];

  for (const test of tests) {
    try {
      const filePath = path.join(TEST_FILES_DIR, test.file);
      
      const formData = new FormData();
      formData.append('title', 'Test Note');
      formData.append('description', 'Test Description');
      formData.append('subject', 'Test Subject');
      formData.append('grade', '10th');
      formData.append('category', 'lecture-notes');
      
      if (fs.existsSync(filePath)) {
        formData.append('file', fs.createReadStream(filePath));
      }

      const response = await axios.post(`${API_BASE_URL}/notes`, formData, {
        headers: {
          ...formData.getHeaders(),
          'Authorization': `Bearer ${teacherToken}`
        },
        timeout: 30000
      });

      if (test.shouldPass) {
        console.log(`  ✅ ${test.name}: PASSED`);
      } else {
        console.log(`  ❌ ${test.name}: FAILED (should have been rejected)`);
      }
    } catch (error) {
      if (!test.shouldPass) {
        const errorMessage = error.response?.data?.message || error.message;
        if (test.expectedError && errorMessage.includes(test.expectedError.toLowerCase()) || 
            errorMessage.includes('file') || errorMessage.includes('size') || errorMessage.includes('type')) {
          console.log(`  ✅ ${test.name}: PASSED (correctly rejected)`);
        } else {
          console.log(`  ⚠️  ${test.name}: FAILED (wrong error: ${errorMessage})`);
        }
      } else {
        console.log(`  ❌ ${test.name}: FAILED (${error.response?.data?.message || error.message})`);
      }
    }
  }
};

// Test note upload without file
const testNoteWithoutFile = async () => {
  console.log('\n🧪 Testing Note Upload Without File...');
  
  try {
    const response = await axios.post(`${API_BASE_URL}/notes`, {
      title: 'Text Only Note',
      description: 'This is a note without any file attachment',
      subject: 'General',
      grade: '11th',
      category: 'lecture-notes'
    }, {
      headers: {
        'Authorization': `Bearer ${teacherToken}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('  ✅ Note without file: PASSED');
  } catch (error) {
    console.log('  ❌ Note without file: FAILED', error.response?.data?.message || error.message);
  }
};

// Test file download
const testFileDownload = async () => {
  console.log('\n🧪 Testing File Download...');
  
  try {
    // First upload a file
    const filePath = path.join(TEST_FILES_DIR, 'test-document.txt');
    const formData = new FormData();
    formData.append('title', 'Download Test Note');
    formData.append('description', 'Test Description');
    formData.append('subject', 'Test Subject');
    formData.append('grade', '10th');
    formData.append('file', fs.createReadStream(filePath));

    const uploadResponse = await axios.post(`${API_BASE_URL}/notes`, formData, {
      headers: {
        ...formData.getHeaders(),
        'Authorization': `Bearer ${teacherToken}`
      }
    });

    const noteId = uploadResponse.data.data._id;

    // Test download
    const downloadResponse = await axios.get(`${API_BASE_URL}/notes/${noteId}/download`, {
      responseType: 'stream'
    });

    if (downloadResponse.status === 200) {
      console.log('  ✅ File download: PASSED');
      
      // Test student access
      const studentDownloadResponse = await axios.get(`${API_BASE_URL}/notes/${noteId}/download`, {
        headers: {
          'Authorization': `Bearer ${studentToken}`
        },
        responseType: 'stream'
      });
      
      if (studentDownloadResponse.status === 200) {
        console.log('  ✅ Student file download: PASSED');
      }
    }
  } catch (error) {
    console.log('  ❌ File download: FAILED', error.response?.data?.message || error.message);
  }
};

// Test student upload restriction
const testStudentUploadRestriction = async () => {
  console.log('\n🧪 Testing Student Upload Restriction...');
  
  try {
    const response = await axios.post(`${API_BASE_URL}/notes`, {
      title: 'Student Note',
      description: 'This should fail',
      subject: 'Math'
    }, {
      headers: {
        'Authorization': `Bearer ${studentToken}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('  ❌ Student upload restriction: FAILED (should have been blocked)');
  } catch (error) {
    if (error.response?.status === 403) {
      console.log('  ✅ Student upload restriction: PASSED (correctly blocked)');
    } else {
      console.log('  ⚠️  Student upload restriction: PARTIAL (wrong error:', error.response?.data?.message || error.message, ')');
    }
  }
};

// Main test runner
const runTests = async () => {
  console.log('🚀 Starting File Upload Functionality Tests...\n');
  
  // Create test files
  createTestFiles();
  
  // Authenticate users
  teacherToken = await authenticate(TEACHER_CREDENTIALS, 'Teacher');
  studentToken = await authenticate(STUDENT_CREDENTIALS, 'Student');
  
  if (!teacherToken) {
    console.error('❌ Cannot run tests without teacher authentication');
    return;
  }
  
  // Run tests
  await testFileUploadValidation();
  await testNoteWithoutFile();
  await testFileDownload();
  
  if (studentToken) {
    await testStudentUploadRestriction();
  }
  
  // Cleanup
  console.log('\n🧹 Cleaning up test files...');
  fs.rmSync(TEST_FILES_DIR, { recursive: true, force: true });
  console.log('✅ Test files cleaned up');
  
  console.log('\n🎉 File upload tests completed!');
};

// Handle errors
process.on('unhandledRejection', (error) => {
  console.error('Unhandled promise rejection:', error);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  process.exit(1);
});

// Run tests
runTests().catch(console.error);
