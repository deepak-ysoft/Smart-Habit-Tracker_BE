const success = (res, message, data = null, status = 200) => {
  return res.status(status).json({
    success: true,
    message,
    data,
  });
};

const error = (res, message, status = 500, errors = null) => {
  return res.status(status).json({
    success: false,
    message,
    errors,
  });
};

const validationFailed = (res, errors) => {
  return res.status(400).json({
    success: false,
    message: "Validation failed",
    errors,
  });
};

module.exports = { success, error, validationFailed };
