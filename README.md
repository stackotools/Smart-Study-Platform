# Smart Study Platform

A comprehensive platform for teachers to upload educational materials and students to access, download, and review them.

## Features

### For Teachers:
- 🔐 **Secure Authentication** - Role-based login system
- 📚 **Upload Notes** - Upload various file formats (PDF, DOC, PPT, etc.)
- ✏️ **Edit & Manage** - Update or delete uploaded materials
- 📊 **Analytics** - View download counts and ratings for uploads
- 🏷️ **Categorization** - Organize content by subject, grade, and difficulty

### For Students:
- 🔐 **Secure Authentication** - Role-based login system  
- 🔍 **Browse Materials** - Filter and search educational content
- 📥 **Download Files** - Access materials for offline study
- ⭐ **Rate & Review** - Provide feedback on materials
- 📝 **Track Activity** - View download history and reviews

### Technology Stack:
- **Frontend**: React 19.1.1 with Vite, Framer Motion animations
- **Backend**: Node.js with Express.js
- **Database**: MongoDB with Mongoose
- **File Storage**: Cloudinary for secure cloud storage
- **Authentication**: JWT tokens with bcrypt password hashing
- **Validation**: Express-validator with comprehensive error handling

## Setup Instructions

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (local or Atlas)
- Cloudinary account (for file storage)

### 1. Clone the Repository
```bash
git clone https://github.com/stackotools/Smart-Study-Platform
cd Smart-Study-Platform
```

### 2. Backend Setup

#### Install Dependencies
```bash
cd backend
npm install
```

#### Environment Configuration
Create a `.env` file in the backend directory with the following variables:

```env
# Database
MONGODB_URI=mongodb://localhost:27017/smart-study-platform
# Or use MongoDB Atlas: mongodb+srv://username:password@cluster.mongodb.net/smart-study-platform

# JWT
JWT_SECRET=your_super_secret_jwt_key_here_make_it_very_long_and_secure
JWT_EXPIRE=7d

# Server
PORT=5000
NODE_ENV=development

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:5173

# File upload settings
MAX_FILE_SIZE=10485760  # 10MB in bytes
ALLOWED_FILE_TYPES=pdf,doc,docx,txt,jpg,jpeg,png,ppt,pptx

# Rate limiting
RATE_LIMIT_MAX=100  # requests per windowMs
RATE_LIMIT_WINDOW=15  # 15 minutes in minutes

# Cloudinary Configuration (Required for file uploads)
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
CLOUDINARY_FOLDER=smart-study-platform  # Folder name in cloudinary to organize files
```

#### Cloudinary Setup
1. Sign up for a free account at [Cloudinary](https://cloudinary.com)
2. Go to your Dashboard and copy:
   - Cloud Name
   - API Key  
   - API Secret
3. Update the `.env` file with these credentials

### 3. Frontend Setup

#### Install Dependencies
```bash
cd ../my-app
npm install
```

### 4. Start the Application

#### Option 1: Start from Root (Recommended)
```bash
cd ..
node index.js
```

#### Option 2: Start Backend and Frontend Separately
```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend  
cd my-app
npm run dev
```

### 5. Access the Application
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:5000
- **API Documentation**: http://localhost:5000/api
- **Health Check**: http://localhost:5000/api/health

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user (teacher/student)
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user profile
- `PUT /api/auth/profile` - Update user profile
- `PUT /api/auth/password` - Change password
- `POST /api/auth/logout` - Logout user

### Notes (Educational Materials)
- `GET /api/notes` - Get all notes (with filtering)
- `GET /api/notes/:id` - Get single note
- `POST /api/notes` - Upload new note (Teachers only)
- `PUT /api/notes/:id` - Update note (Teachers only)
- `DELETE /api/notes/:id` - Delete note (Teachers only)
- `GET /api/notes/my-uploads` - Get teacher's uploads
- `GET /api/notes/:id/download` - Download note file
- `GET /api/notes/stats` - Get platform statistics

### Reviews & Feedback
- `GET /api/reviews/note/:noteId` - Get reviews for a note
- `POST /api/reviews` - Create review (Students only)
- `PUT /api/reviews/:id` - Update review (Students only)
- `DELETE /api/reviews/:id` - Delete review (Students only)
- `GET /api/reviews/my-reviews` - Get student's reviews
- `POST /api/reviews/:id/vote` - Vote on review helpfulness
- `GET /api/reviews/stats/:noteId` - Get review statistics

## User Roles & Permissions

### Teachers
- ✅ Upload, edit, and delete educational materials
- ✅ View analytics for their uploads
- ✅ Manage their profile and materials
- ❌ Cannot create reviews (conflict of interest)

### Students  
- ✅ Browse and download materials
- ✅ Create, edit, and delete their own reviews
- ✅ Vote on review helpfulness
- ❌ Cannot upload or modify educational materials

## File Upload Support

Supported file formats:
- **Documents**: PDF, DOC, DOCX, TXT
- **Images**: JPG, JPEG, PNG
- **Presentations**: PPT, PPTX

**Maximum file size**: 10MB
**Storage**: Cloudinary cloud storage for scalability and reliability

## Security Features

- 🔒 **JWT Authentication** - Secure token-based authentication
- 🛡️ **Password Hashing** - bcrypt with salt rounds
- 🚫 **Rate Limiting** - Prevents API abuse
- ✅ **Input Validation** - Comprehensive request validation
- 🔐 **Role-based Access** - Separate permissions for teachers and students
- 🛡️ **CORS Protection** - Configured for security
- 🔍 **File Validation** - MIME type and extension checking

## Error Handling

The application includes comprehensive error handling:
- **Async Error Wrapper** - Automatic error catching for async routes
- **Custom Error Classes** - Structured error responses
- **MongoDB Error Handling** - Specific handling for database errors
- **File Upload Errors** - Detailed file upload error messages
- **Validation Errors** - Clear validation error messages

## Development

### Project Structure
```
Smart-Study-Platform/
├── index.js                 # Root entry point
├── my-app/                  # React frontend
│   ├── src/
│   │   ├── components/      # Reusable components
│   │   ├── pages/          # Page components
│   │   └── ...
│   └── package.json
├── backend/                 # Node.js backend
│   ├── config/             # Configuration files
│   ├── controllers/        # Route controllers
│   ├── middleware/         # Custom middleware
│   ├── models/            # MongoDB models
│   ├── routes/            # API routes
│   ├── uploads/           # Local file storage (fallback)
│   ├── server.js          # Express server
│   └── package.json
└── README.md
```

### Available Scripts

#### Backend
- `npm run dev` - Start development server with nodemon
- `npm start` - Start production server

#### Frontend  
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run lint` - Run ESLint

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the ISC License.

## Support

For support, please open an issue in the GitHub repository or contact the development team.

---

**Happy Learning! 📚✨**
