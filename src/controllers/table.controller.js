import {
  createTable,
  deleteTable,
  generateTableQr,
  getTable,
  listTables,
  setTableAvailability,
  resetTable,
  updateTable,
} from "../services/table.service.js";

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

export const createTableController = handle(
  async (request) => ({
    table: await createTable(
      request.auth.userId,
      request.params.restaurantId,
      request.body,
    ),
  }),
  201,
);

export const listTablesController = handle(async (request) => ({
  tables: await listTables(request.auth.userId, request.params.restaurantId),
}));

export const getTableController = handle(async (request) => ({
  table: await getTable(
    request.auth.userId,
    request.params.restaurantId,
    request.params.tableId,
  ),
}));

export const updateTableController = handle(async (request) => ({
  table: await updateTable(
    request.auth.userId,
    request.params.restaurantId,
    request.params.tableId,
    request.body,
  ),
}));

export const tableAvailabilityController = handle(async (request) => ({
  table: await setTableAvailability(
    request.auth.userId,
    request.params.restaurantId,
    request.params.tableId,
    request.body,
  ),
}));

export const resetTableController = handle(async (request) => ({
  table: await resetTable(
    request.auth.userId,
    request.params.restaurantId,
    request.params.tableId,
  ),
}));

export const deleteTableController = handle(
  (request) =>
    deleteTable(
      request.auth.userId,
      request.params.restaurantId,
      request.params.tableId,
    ),
  204,
);

export const tableQrController = handle(async (request) =>
  generateTableQr(
    request.auth.userId,
    request.params.restaurantId,
    request.params.tableId,
  ),
);
