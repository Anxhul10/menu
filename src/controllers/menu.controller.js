import {
  createCategory,
  createItem,
  deleteCategory,
  deleteItem,
  getItem,
  listCategories,
  listItems,
  setItemAvailability,
  updateCategory,
  updateItem,
} from "../services/menu.service.js";

function handle(operation, statusCode = 200) {
  return async (request, response, next) => {
    try {
      const result = await operation(request);
      if (result === undefined) return response.status(statusCode).send();
      return response.status(statusCode).json(result);
    } catch (error) {
      return next(error);
    }
  };
}

export const createCategoryController = handle(
  async (request) => ({
    category: await createCategory(
      request.auth.userId,
      request.params.restaurantId,
      request.body,
    ),
  }),
  201,
);

export const listCategoriesController = handle(async (request) => ({
  categories: await listCategories(
    request.auth.userId,
    request.params.restaurantId,
  ),
}));

export const updateCategoryController = handle(async (request) => ({
  category: await updateCategory(
    request.auth.userId,
    request.params.restaurantId,
    request.params.categoryId,
    request.body,
  ),
}));

export const deleteCategoryController = handle(
  (request) =>
    deleteCategory(
      request.auth.userId,
      request.params.restaurantId,
      request.params.categoryId,
    ),
  204,
);

export const createItemController = handle(
  async (request) => ({
    item: await createItem(
      request.auth.userId,
      request.params.restaurantId,
      request.body,
    ),
  }),
  201,
);

export const listItemsController = handle(async (request) => ({
  items: await listItems(request.auth.userId, request.params.restaurantId),
}));

export const getItemController = handle(async (request) => ({
  item: await getItem(
    request.auth.userId,
    request.params.restaurantId,
    request.params.itemId,
  ),
}));

export const updateItemController = handle(async (request) => ({
  item: await updateItem(
    request.auth.userId,
    request.params.restaurantId,
    request.params.itemId,
    request.body,
  ),
}));

export const deleteItemController = handle(
  (request) =>
    deleteItem(
      request.auth.userId,
      request.params.restaurantId,
      request.params.itemId,
    ),
  204,
);

export const availabilityController = handle(async (request) => ({
  item: await setItemAvailability(
    request.auth.userId,
    request.params.restaurantId,
    request.params.itemId,
    request.body,
  ),
}));
