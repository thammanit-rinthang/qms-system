import { db } from "../lib/db";

async function main() {
  const users = await db.localRoleGrant.findMany();
  console.log("Local Role Grants Count:", users.length);
  console.log("Local Role Grants:", JSON.stringify(users, null, 2));

  const depts = await db.departmentCode.findMany();
  console.log("Department Codes Count:", depts.length);
  console.log("Department Codes:", JSON.stringify(depts, null, 2));
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());
