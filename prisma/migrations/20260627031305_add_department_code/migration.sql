-- CreateTable
CREATE TABLE "DepartmentCode" (
    "id" TEXT NOT NULL,
    "auth_dept_id" TEXT NOT NULL,
    "department_name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DepartmentCode_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DepartmentCode_auth_dept_id_key" ON "DepartmentCode"("auth_dept_id");

-- CreateIndex
CREATE UNIQUE INDEX "DepartmentCode_code_key" ON "DepartmentCode"("code");
