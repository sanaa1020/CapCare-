// Express 4 doesn't catch rejected promises from async handlers; this forwards
// them to the error handler in index.js instead of leaving the request hanging.
module.exports = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
