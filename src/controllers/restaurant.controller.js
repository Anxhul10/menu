import {
  archiveRestaurant,
  createRestaurant,
  getRestaurant,
  listRestaurants,
  updateRestaurant
} from "../services/restaurant.service.js";

export async function create(request, response, next) {
  try {
    const restaurant = await createRestaurant(request.auth.userId, request.body);
    response.status(201).json({ restaurant });
  } catch (error) {
    next(error);
  }
}

export async function list(request, response, next) {
  try {
    const restaurants = await listRestaurants(request.auth.userId);
    response.status(200).json({ restaurants });
  } catch (error) {
    next(error);
  }
}

export async function get(request, response, next) {
  try {
    const restaurant = await getRestaurant(request.auth.userId, request.params.id);
    response.status(200).json({ restaurant });
  } catch (error) {
    next(error);
  }
}

export async function update(request, response, next) {
  try {
    const restaurant = await updateRestaurant(request.auth.userId, request.params.id, request.body);
    response.status(200).json({ restaurant });
  } catch (error) {
    next(error);
  }
}

export async function remove(request, response, next) {
  try {
    const restaurant = await archiveRestaurant(request.auth.userId, request.params.id);
    response.status(200).json({ restaurant });
  } catch (error) {
    next(error);
  }
}
