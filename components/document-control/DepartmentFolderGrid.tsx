"use client";

import Link from "next/link";
import { FolderOpen, FileText, Plus } from "lucide-react";
import { ActionIconButton } from "@/components/common/ActionButtons";
import EmptyState from "@/components/common/EmptyState";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";

interface DepartmentCard {
  id: string;
  name: string;
  categoryCount: number;
  documentCount: number;
  emailGroup?: string | null;
  isActive?: boolean;
}

interface DepartmentFolderGridProps {
  departments: DepartmentCard[];
  canManage: boolean;
  onAdd: () => void;
  onEdit: (dept: DepartmentCard) => void;
  onDelete: (dept: DepartmentCard) => void;
}

export function DepartmentFolderGrid({
  departments,
  canManage,
  onAdd,
  onEdit,
  onDelete,
}: DepartmentFolderGridProps) {
  const t = useT();

  return (
    <div className="space-y-4">
      {canManage && (
        <div className="flex justify-end">
          <Button onClick={onAdd} className="gap-1.5">
            <Plus className="w-4 h-4" />
            {t("documentDepartment.button.add")}
          </Button>
        </div>
      )}

      {!departments.length ? (
        <div className="card-premium p-16 flex justify-center items-center">
          <EmptyState
            title={t("documentDepartment.empty")}
            description={
              canManage ? t("documentDepartment.emptyDesc") : undefined
            }
          />
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 ">
          {departments.map((dept) => (
            <div
              key={dept.id}
              className="group relative flex flex-col gap-3 p-5   bg-linear-to-br from-[#101257] to-[#080936] rounded-xl"
            >
              <div className="absolute -top-5 -right-5 w-16 h-16 bg-white/5 rounded-full border border-white/5 pointer-events-none transition-transform duration-500 group-hover:scale-110" />
              {/* Clickable overlay to navigate */}
              <Link
                href={`/qms/document-controls/dept/${dept.id}`}
                className="absolute inset-0 rounded-xl"
                aria-label={dept.name}
              />

              {/* Folder icon */}
              <div className="w-11 h-11 rounded-xl bg-white/10 flex items-center justify-center group-hover:bg-white/20 transition-colors">
                <FolderOpen className="w-5 h-5 text-white" />
              </div>

              {/* Dept name */}
              <p className="font-semibold text-sm text-white leading-snug line-clamp-2 pr-6">
                {dept.name}
              </p>

              {/* Stats */}
              <div className="flex items-center gap-3 text-xs text-white mt-auto">
                <div className="flex items-center gap-1">
                  <FolderOpen className="w-3 h-3" />
                  <span>{dept.categoryCount}</span>
                </div>
                <div className="flex items-center gap-1">
                  <FileText className="w-3 h-3" />
                  <span>{dept.documentCount}</span>
                </div>
              </div>

              {/* Hover actions — raised above Link overlay */}
              {canManage && (
                <div className="absolute top-3 right-3 z-10 hidden group-hover:flex gap-1">
                  <ActionIconButton
                    tone="edit"
                    label="Edit"
                    onClick={(e) => {
                      e.preventDefault();
                      onEdit(dept);
                    }}
                    className="h-7 w-7 shadow-sm"
                  />
                  <ActionIconButton
                    tone="delete"
                    label="Delete"
                    onClick={(e) => {
                      e.preventDefault();
                      onDelete(dept);
                    }}
                    className="h-7 w-7 shadow-sm"
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
