"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Tag,
  Users,
  Filter,
  AlertTriangle,
  CheckCircle,
  FileText,
  GripVertical,
  Trash2,
} from "lucide-react";
import { getBlockConfig, summarizeBlock } from "./block-config";
import type { RuleBlock } from "@policy-brain/shared";

const ICONS = {
  Tag,
  Users,
  Filter,
  AlertTriangle,
  CheckCircle,
  FileText,
} as const;

interface SortableBlockCardProps {
  id: string;
  block: RuleBlock;
  index: number;
  selected: boolean;
  onSelect: () => void;
  onRemove: () => void;
  isLast: boolean;
}

export function SortableBlockCard({
  id,
  block,
  index,
  selected,
  onSelect,
  onRemove,
  isLast,
}: SortableBlockCardProps) {
  const config = getBlockConfig(block.type);
  const Icon = ICONS[config.icon as keyof typeof ICONS];

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative flex flex-col items-center">
      <div
        onClick={onSelect}
        className={`group w-full max-w-lg cursor-pointer rounded-2xl border-2 p-4 shadow-sm transition-all ${
          config.border
        } ${config.bg} ${
          selected
            ? "ring-2 ring-accent ring-offset-2"
            : "hover:shadow-md"
        } ${isDragging ? "z-50 opacity-90 shadow-xl" : ""}`}
      >
        <div className="flex items-start gap-3">
          <button
            type="button"
            className="mt-0.5 cursor-grab touch-none text-slate-400 hover:text-slate-600 active:cursor-grabbing"
            {...attributes}
            {...listeners}
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical className="h-5 w-5" />
          </button>

          <div className={`rounded-lg bg-white/80 p-2 ${config.color}`}>
            <Icon className="h-5 w-5" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wide text-slate-400">
                {index + 1}
              </span>
              <span className={`text-sm font-bold ${config.color}`}>{config.label}</span>
            </div>
            <p className="mt-1 text-sm text-slate-700">{summarizeBlock(block)}</p>
            {block.type === "decision" && block.outcome && (
              <div className="mt-2 inline-flex rounded-full bg-white px-3 py-1 text-sm font-bold text-emerald-700 shadow-sm">
                {block.outcome}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className="rounded-lg p-1.5 text-slate-400 opacity-0 transition hover:bg-red-50 hover:text-red-600 group-hover:opacity-100"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {!isLast && (
        <div className="flex flex-col items-center py-1">
          <div className="h-4 w-0.5 bg-slate-300" />
          <div className="h-0 w-0 border-x-[6px] border-t-[8px] border-x-transparent border-t-slate-300" />
        </div>
      )}
    </div>
  );
}
