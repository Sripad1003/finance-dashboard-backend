exports.successResponse = (res, data, statusCode = 200) => {
  res.status(statusCode).json({ success: true, data });
};

exports.createdResponse = (res, data) => {
  res.status(201).json({ success: true, data });
};
