const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const DEFAULT_MIN_LIMIT = 5;
const DEFAULT_MAX_LIMIT = 15;

const parsePositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
};

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const buildPageItems = (currentPage, totalPages) => {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  if (currentPage <= 4) {
    return [1, 2, 3, 4, 5, 'ellipsis', totalPages];
  }

  if (currentPage >= totalPages - 3) {
    return [
      1,
      'ellipsis',
      totalPages - 4,
      totalPages - 3,
      totalPages - 2,
      totalPages - 1,
      totalPages,
    ];
  }

  return [
    1,
    'ellipsis',
    currentPage - 1,
    currentPage,
    currentPage + 1,
    'ellipsis',
    totalPages,
  ];
};

const buildLimitOptions = (minLimit, maxLimit, step = 5) => {
  const options = [];
  for (let value = minLimit; value <= maxLimit; value += step) {
    options.push(value);
  }

  return options;
};

exports.getPaginationMeta = ({
  total,
  page,
  limit,
  minLimit = DEFAULT_MIN_LIMIT,
  maxLimit = DEFAULT_MAX_LIMIT,
}) => {
  const safeMinLimit = Math.max(1, minLimit);
  const safeMaxLimit = Math.max(safeMinLimit, maxLimit);

  const parsedLimit = clamp(
    parsePositiveInt(limit, DEFAULT_LIMIT),
    safeMinLimit,
    safeMaxLimit
  );

  const totalPages = Math.max(Math.ceil(total / parsedLimit), 1);
  const currentPage = clamp(
    parsePositiveInt(page, DEFAULT_PAGE),
    DEFAULT_PAGE,
    totalPages
  );
  const skip = (currentPage - 1) * parsedLimit;

  return {
    total,
    currentPage,
    limit: parsedLimit,
    skip,
    totalPages,
    pageItems: buildPageItems(currentPage, totalPages),
    limitOptions: buildLimitOptions(safeMinLimit, safeMaxLimit),
  };
};
