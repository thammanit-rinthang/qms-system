"use client";

import { Download, Printer } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

type PrintPageActionsProps = {
  downloadHint?: string;
};

export default function PrintPageActions({
  downloadHint = "สำหรับการ Download ให้เลือกปลายทาง (Destination) เป็น 'Save as PDF' ในหน้าต่าง Print",
}: PrintPageActionsProps) {
  function handleDownloadPdf() {
    toast.info(downloadHint, { duration: 4000 });
    window.print();
  }

  return (
    <div className="no-print mx-auto mb-4 flex max-w-[194mm] justify-end gap-3">
      <Button type="button" variant="outline" onClick={handleDownloadPdf}>
        <Download className="mr-2 h-4 w-4" />
        Download PDF
      </Button>
      <Button type="button" onClick={() => window.print()}>
        <Printer className="mr-2 h-4 w-4" />
        Print
      </Button>
    </div>
  );
}
