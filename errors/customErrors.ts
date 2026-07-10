export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public errorCode: string = "INTERNAL_SERVER_ERROR",
    public details?: unknown
  ) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 400, "VALIDATION_ERROR", details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = "Unauthorized access") {
    super(message, 401, "UNAUTHORIZED");
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = "Access forbidden") {
    super(message, 403, "FORBIDDEN");
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = "Resource not found") {
    super(message, 404, "NOT_FOUND");
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, "CONFLICT");
  }
}

export class TokenNotFoundError extends AppError {
  constructor() {
    // Token may have been deleted by cleanup after expiry — give the same guidance as TokenExpiredError.
    super(
      "ลิงก์ไม่ถูกต้องหรืออาจหมดอายุแล้ว กรุณาเข้าเมนู Approve เพื่อดำเนินการ / Link is invalid or may have expired. Please use the Approve menu.",
      404,
      "TOKEN_NOT_FOUND"
    );
  }
}

export class TokenRevokedError extends AppError {
  constructor() {
    super(
      "รายการนี้ถูกยกเลิกหรือแก้ไขแล้ว กรุณาตรวจสอบ inbox สำหรับลิงก์ใหม่ / This item has been recalled or updated. Please check your inbox for a new link.",
      410,
      "TOKEN_REVOKED"
    );
  }
}

export class TokenExpiredError extends AppError {
  constructor() {
    super(
      "ลิงก์หมดอายุแล้ว กรุณาเข้าเมนู Approve เพื่อดำเนินการ / This link has expired. Please use the Approve menu.",
      410,
      "TOKEN_EXPIRED"
    );
  }
}

export class TokenOwnerError extends AppError {
  constructor() {
    super("ลิงก์นี้ไม่ได้ออกให้คุณ / This link was not issued for you.", 403, "TOKEN_OWNER_MISMATCH");
  }
}
