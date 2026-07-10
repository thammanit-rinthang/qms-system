import { requireAuth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { DocumentControlsLevelOneClient } from '@/components/document-control/DocumentControlsLevelOneClient';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Document Control",
};

export default async function DocumentControlsPage() {
  const session = await requireAuth();
  if (!session) redirect('/');

  const canManage = ['QMS', 'IT', 'MR'].includes(session.user.role);

  const [depts, categories] = await Promise.all([
    db.docControlDept.findMany({ orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] }),
    db.documentCategory.findMany({
      include: { _count: { select: { documents: true } } },
    }),
  ]);

  const categoriesByDept = new Map<string, typeof categories>();
  for (const cat of categories) {
    const list = categoriesByDept.get(cat.departmentId) ?? [];
    list.push(cat);
    categoriesByDept.set(cat.departmentId, list);
  }

  const deptCards = depts.map((dept) => {
    const deptCats = categoriesByDept.get(dept.id) ?? [];
    return {
      id: dept.id,
      name: dept.name,
      emailGroup: dept.emailGroup,
      isActive: dept.isActive,
      categoryCount: deptCats.length,
      documentCount: deptCats.reduce((sum, c) => sum + c._count.documents, 0),
    };
  });

  return (
    <div className="px-4 md:px-6 lg:px-8 py-6 max-w-7xl mx-auto space-y-6">
      <DocumentControlsLevelOneClient departments={deptCards} canManage={canManage} />
    </div>
  );
}
