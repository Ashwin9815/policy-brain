"use client";

import { useDraggable } from "@dnd-kit/core";
import {
  Tag,
  Users,
  Filter,
  AlertTriangle,
  CheckCircle,
  FileText,
  GripVertical,
} from "lucide-react";
import { BLOCK_PALETTE, type BlockType } from "./block-config";

const ICONS = {
  Tag,
  Users,
  Filter,
  AlertTriangle,
  CheckCircle,
  FileText,
} as const;

export function BlockPalette({ onAddBlock }: { onAddBlock?: (type: BlockType) => void }) {
  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-navy">Block Palette</h3>
        <p className="text-xs text-slate-500">Drag or click to add blocks</p>
      </div>
      <div className="space-y-2">
        {BLOCK_PALETTE.map((item) => (
          <PaletteItem key={item.type} type={item.type} onAdd={() => onAddBlock?.(item.type)} />
        ))}
      </div>
    </div>
  );
}

function PaletteItem({ type, onAdd }: { type: BlockType; onAdd?: () => void }) {
  const config = BLOCK_PALETTE.find((b) => b.type === type)!;
  const Icon = ICONS[config.icon as keyof typeof ICONS];

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `palette-${type}`,
    data: { fromPalette: true, blockType: type },
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onDoubleClick={onAdd}
      title="Drag to canvas or double-click to add"
      className={`flex cursor-grab items-center gap-3 rounded-xl border-2 ${config.border} ${config.bg} p-3 transition-shadow active:cursor-grabbing ${
        isDragging ? "opacity-40 shadow-lg" : "hover:shadow-md"
      }`}
    >
      <GripVertical className="h-4 w-4 shrink-0 text-slate-400" />
      <Icon className={`h-5 w-5 shrink-0 ${config.color}`} />
      <div className="min-w-0">
        <div className={`text-sm font-semibold ${config.color}`}>{config.label}</div>
        <div className="truncate text-xs text-slate-500">{config.description}</div>
      </div>
    </div>
  );
}
