import { requireAuth } from '@/lib/auth';
import { redirect, notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { CategoryListClient } from '@/components/document-control/CategoryListClient';

export async function generateMetadata({ params }: { params: Promise<{ deptId: string }> }) {
  const { deptId } = await params;
  const dept = await db.docControlDept.findUnique({ where: { id: deptId }, select: { name: true } });
  return { title: dept ? `${dept.name} — Document Categories` : 'Document Categories' };
}

export default async function DeptCategoryPage({ params }: { params: Promise<{ deptId: string }> }) {
  const session = await requireAuth();
  if (!session) redirect('/');

  const { deptId } = await params;
  const dept = await db.docControlDept.findUnique({ where: { id: deptId } });
  if (!dept) notFound();

  const canManage = ['QMS', 'IT', 'MR'].includes(session.user.role);

  return (
    <div className="px-4 md:px-6 lg:px-8 py-6 max-w-7xl mx-auto">
      <CategoryListClient department={{ id: dept.id, name: dept.name }} canManage={canManage} />
    </div>
  );
}
