
import { redirect } from "next/navigation";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "IT Admin",
};

export default function ItIndexPage() {
  redirect("/it/users");
}
