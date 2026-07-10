import { signOutAction } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

type Props = { label?: string };

export default function SignOutButton({ label = "ออกจากระบบ" }: Props) {
  return (
    <form action={signOutAction} className="w-full">
      <Button
        type="submit"
        variant="ghost"
        className="w-full flex items-center justify-start gap-2.5 px-3 py-2 rounded-xl text-[13px] text-rose-600 hover:bg-rose-50 hover:text-rose-700 h-auto font-normal"
      >
        <LogOut className="h-4 w-4 shrink-0" />
        {label}
      </Button>
    </form>
  );
}
