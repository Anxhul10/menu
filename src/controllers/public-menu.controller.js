import { getPublicMenu } from "../services/menu.service.js";

export async function publicMenu(request, response, next) {
  try {
    response.status(200).json(await getPublicMenu(request.params.slug));
  } catch (error) {
    next(error);
  }
}
