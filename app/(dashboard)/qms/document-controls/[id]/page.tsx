import { requireRole } from '@/lib/auth';
import { redirect, notFound } from 'next/navigation';
import { DocumentControlDetailClient } from '@/components/document-control/DocumentControlDetailClient';
import { db } from '@/lib/db';

type Params = Promise<{ id: string }>;

export async function generateMetadata({ params }: { params: Params }) {
  const { id } = await params;
  const doc = await db.documentControl.findUnique({ where: { id }, select: { docNumber: true } });
  return { title: doc ? `${doc.docNumber} — Document Details` : "Document Details" };
}

async function getDocument(id: string, token?: string) {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/document-controls/${id}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export default async function DocumentControlDetailPage(props: { params: Params }) {
  const session = await requireRole('QMS', 'IT', 'MR', 'USER');
  if (!session) redirect('/');

  const params = await props.params;
  const response = await getDocument(params.id);

  if (!response?.data) {
    notFound();
  }

  const document = response.data;
  const canEdit = ['QMS', 'IT', 'MR'].includes(session.user.role);
  const canDelete = ['QMS', 'IT', 'MR'].includes(session.user.role);

  return (
    <div className="px-4 md:px-6 lg:px-8 py-6 max-w-7xl mx-auto">
      <DocumentControlDetailClient
        document={document}
        canEdit={canEdit}
        canDelete={canDelete}
      />
    </div>
  );
}
