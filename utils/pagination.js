exports.paginate = async (
  Model,
  query,
  page = 1,
  limit = 20,
  sort = { createdAt: -1 }
) => {
  const skip = (page - 1) * limit;

  const [results, total] = await Promise.all([
    Model.find(query).sort(sort).skip(skip).limit(limit),
    Model.countDocuments(query),
  ]);

  return {
    results,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
};
