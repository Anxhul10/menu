import { resolvePublicTable } from "../services/table.service.js";

export async function publicTable(request, response, next) {
  try {
    response.status(200).json(await resolvePublicTable(request.params.qrToken));
  } catch (error) {
    next(error);
  }
}
