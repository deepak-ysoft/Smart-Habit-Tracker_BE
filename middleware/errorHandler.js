const { error } = require("../utils/response");

module.exports = (err, req, res, next) => {
  console.error("🔥 Global Error:", err);

  // If response already sent, delegate to Express
  if (res.headersSent) {
    return next(err);
  }

  return error(res, err.message || "Internal server error");
};
