/**
 * Async handler wrapper to catch async/await errors
 * Eliminates the need for try/catch blocks in every async route
 * 
 * Usage:
 * router.get('/route', asyncHandler(async (req, res, next) => {
 *   // Your async code here
 *   const data = await someAsyncOperation();
 *   res.json(data);
 * }));
 */

const asyncHandler = (fn) => {
  return (req, res, next) => {
    // Make sure to catch any errors and pass them to next()
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

module.exports = asyncHandler;
