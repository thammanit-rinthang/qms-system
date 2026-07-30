import { redirect } from 'next/navigation';
import { db } from '@/lib/db';

type Params = Promise<{ id: string }>;

export async function generateMetadata({ params }: { params: Params }) {
  const { id } = await params;
  const doc = await db.documentControl.findUnique({ where: { id }, select: { docNumber: true } });
  return { title: doc ? `Edit Document ${doc.docNumber}` : "Edit Document" };
}

export default async function EditDocumentControlPage(props: { params: Params }) {
  const { id } = await props.params;
  redirect(`/qms/document-controls/${id}`);
}
