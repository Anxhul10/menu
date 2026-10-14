export function errorHandler(error, _request, response, _next) {
  const isDuplicateConstraint = error.code === "P2002";
  const isMalformedJson = error.type === "entity.parse.failed";
  const statusCode = isDuplicateConstraint ? 409 : isMalformedJson ? 400 : error.statusCode ?? 500;
  const message = isDuplicateConstraint
    ? "Email or restaurant slug already exists"
    : isMalformedJson
      ? "Request body must contain valid JSON"
      : statusCode >= 500
        ? "Internal server error"
        : error.message;

  response.status(statusCode).json({
    error: {
      message
    }
  });
}
