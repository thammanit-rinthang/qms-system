import { redirect } from 'next/navigation';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: "New Document",
};

export default function NewDocumentControlPage() {
  redirect('/qms/document-controls');
}
