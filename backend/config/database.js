const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      // These options are no longer needed in mongoose 6+, but kept for compatibility
      // useNewUrlParser: true,
      // useUnifiedTopology: true,
    });

    console.log(`MongoDB Connected: ${conn.connection.host}`.cyan.underline.bold);
    
    // Handle connection errors after initial connection
    mongoose.connection.on('error', (err) => {
      console.error(`Database connection error: ${err}`.red);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('Database disconnected'.yellow);
    });

    // Graceful exit
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      console.log('Database connection closed through app termination'.cyan);
      process.exit(0);
    });

  } catch (error) {
    console.error(`Error connecting to database: ${error.message}`.red.underline.bold);
    process.exit(1);
  }
};

module.exports = connectDB;
