import { getAuthenticatedProfile, loginUser, registerUser } from "../services/auth.service.js";

export async function register(request, response, next) {
  try {
    const result = await registerUser(request.body);
    response.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

export async function login(request, response, next) {
  try {
    const result = await loginUser(request.body);
    response.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function me(request, response, next) {
  try {
    const result = await getAuthenticatedProfile(request.auth.userId);
    response.status(200).json(result);
  } catch (error) {
    next(error);
  }
}
