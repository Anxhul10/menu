import { AppError } from "../errors/app-error.js";
import { verifyAccessToken } from "../services/auth.service.js";

export function requireAuthentication(request, _response, next) {
  const authorization = request.get("authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return next(new AppError("Authentication required", 401));
  }

  const token = authorization.slice("Bearer ".length).trim();
  if (!token) {
    return next(new AppError("Authentication required", 401));
  }

  try {
    const payload = verifyAccessToken(token);
    request.auth = { userId: payload.sub };
    return next();
  } catch (error) {
    return next(error);
  }
}
