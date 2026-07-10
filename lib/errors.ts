// Re-export base from the canonical error hierarchy used by handleApiError.
// This ensures `instanceof AppError` checks work across both lib/errors and errors/customErrors.
export { AppError, UnauthorizedError, ForbiddenError, ValidationError } from '@/errors/customErrors';

import { AppError } from '@/errors/customErrors';

// NotFoundError keeps its resource-name constructor API (new NotFoundError('Document'))
export class NotFoundError extends AppError {
  constructor(resource = "Resource") {
    super(`${resource} not found`, 404, "NOT_FOUND");
  }
}
