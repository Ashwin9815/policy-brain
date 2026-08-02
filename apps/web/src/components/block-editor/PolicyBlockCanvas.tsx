"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  useDroppable,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { AlertCircle, Plus, Save } from "lucide-react";
import {
  dslToNaturalLanguage,
  validateRuleDsl,
  type RuleDsl,
  type RuleBlock,
} from "@policy-brain/shared";
import { BlockPalette } from "./BlockPalette";
import { SortableBlockCard } from "./SortableBlockCard";
import { BlockInspector } from "./BlockInspector";
import { createDefaultBlock, getBlockConfig, type BlockType } from "./block-config";

interface PolicyBlockCanvasProps {
  dsl: RuleDsl;
  onChange: (dsl: RuleDsl) => void;
  onSave: () => void;
  saving?: boolean;
}

function newKey() {
  return `blk-${crypto.randomUUID()}`;
}

function CanvasDropZone({ children, isEmpty }: { children: React.ReactNode; isEmpty: boolean }) {
  const { setNodeRef, isOver } = useDroppable({ id: "canvas-drop" });

  return (
    <div
      ref={setNodeRef}
      className={`min-h-[400px] rounded-2xl border-2 border-dashed p-6 transition-colors ${
        isOver
          ? "border-accent bg-blue-50/50"
          : isEmpty
            ? "border-slate-300 bg-slate-50/50"
            : "border-transparent bg-gradient-to-b from-slate-50 to-white"
      }`}
    >
      {children}
    </div>
  );
}

function AppendDropZone() {
  const { setNodeRef, isOver } = useDroppable({ id: "canvas-append" });

  return (
    <div
      ref={setNodeRef}
      className={`mt-2 flex w-full max-w-lg items-center justify-center rounded-xl border-2 border-dashed py-4 text-sm transition-colors ${
        isOver ? "border-accent bg-blue-50 text-accent" : "border-slate-200 text-slate-400"
      }`}
    >
      <Plus className="mr-2 h-4 w-4" />
      Drop block here
    </div>
  );
}

export function PolicyBlockCanvas({ dsl, onChange, onSave, saving }: PolicyBlockCanvasProps) {
  const [view, setView] = useState<"canvas" | "natural" | "json">("canvas");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [activeDrag, setActiveDrag] = useState<{ type: BlockType } | null>(null);
  const [blockKeys, setBlockKeys] = useState<string[]>(() => dsl.blocks.map(() => newKey()));

  useEffect(() => {
    setBlockKeys((keys) => {
      if (keys.length === dsl.blocks.length) return keys;
      if (keys.length < dsl.blocks.length) {
        const extra = Array.from({ length: dsl.blocks.length - keys.length }, () => newKey());
        return [...keys, ...extra];
      }
      return keys.slice(0, dsl.blocks.length);
    });
  }, [dsl.blocks.length]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } })
  );

  const validation = useMemo(() => validateRuleDsl(dsl), [dsl]);
  const selectedBlock = dsl.blocks[selectedIndex];

  const applyBlocks = useCallback(
    (blocks: RuleBlock[], keys: string[], selectIndex?: number) => {
      setBlockKeys(keys);
      onChange({ ...dsl, blocks });
      if (selectIndex !== undefined) setSelectedIndex(selectIndex);
    },
    [dsl, onChange]
  );

  const insertBlock = useCallback(
    (type: BlockType, atIndex?: number) => {
      const blocks = [...dsl.blocks];
      const keys = [...blockKeys];
      const index = atIndex ?? blocks.length;
      blocks.splice(index, 0, createDefaultBlock(type));
      keys.splice(index, 0, newKey());
      applyBlocks(blocks, keys, index);
    },
    [dsl.blocks, blockKeys, applyBlocks]
  );

  const removeBlock = useCallback(
    (index: number) => {
      const blocks = dsl.blocks.filter((_, i) => i !== index);
      const keys = blockKeys.filter((_, i) => i !== index);
      if (!blocks.length) {
        applyBlocks([createDefaultBlock("condition")], [newKey()], 0);
      } else {
        applyBlocks(blocks, keys, Math.max(0, index - 1));
      }
    },
    [dsl.blocks, blockKeys, applyBlocks]
  );

  const updateBlock = useCallback(
    (index: number, block: RuleBlock) => {
      const blocks = [...dsl.blocks];
      blocks[index] = block;
      onChange({ ...dsl, blocks });
    },
    [dsl, onChange]
  );

  function handleDragStart(event: DragStartEvent) {
    if (event.active.data.current?.fromPalette) {
      setActiveDrag({ type: event.active.data.current.blockType as BlockType });
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveDrag(null);
    const { active, over } = event;
    if (!over) return;

    if (active.data.current?.fromPalette) {
      const type = active.data.current.blockType as BlockType;
      const overId = String(over.id);
      if (overId === "canvas-drop" || overId === "canvas-append") {
        insertBlock(type, dsl.blocks.length);
        return;
      }
      const overIndex = blockKeys.indexOf(overId);
      if (overIndex >= 0) insertBlock(type, overIndex);
      return;
    }

    const activeId = String(active.id);
    const overId = String(over.id);
    if (activeId === overId) return;

    const oldIndex = blockKeys.indexOf(activeId);
    let newIndex = blockKeys.indexOf(overId);
    if (overId === "canvas-append") newIndex = blockKeys.length - 1;

    if (oldIndex >= 0 && newIndex >= 0 && oldIndex !== newIndex) {
      applyBlocks(
        arrayMove(dsl.blocks, oldIndex, newIndex),
        arrayMove(blockKeys, oldIndex, newIndex),
        newIndex
      );
    }
  }

  const dragOverlayConfig = activeDrag ? getBlockConfig(activeDrag.type) : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
            {(["canvas", "natural", "json"] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                className={`rounded-lg px-4 py-2 text-xs font-semibold capitalize ${
                  view === v ? "bg-navy text-white" : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {v === "natural" ? "Natural Language" : v === "canvas" ? "Live Canvas" : "JSON"}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={onSave}
            disabled={saving || !validation.success}
            className="inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-accent-dark disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {saving ? "Saving…" : "Save Rule"}
          </button>
        </div>

        {!validation.success && (
          <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <strong>Validation errors</strong>
              <ul className="mt-1 list-inside list-disc">
                {validation.errors?.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {view === "canvas" && (
          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <BlockPalette onAddBlock={insertBlock} />
            </div>

            <div className="col-span-5">
              <div className="mb-2 text-center text-xs font-semibold uppercase tracking-widest text-slate-400">
                Policy Flow
              </div>
              <CanvasDropZone isEmpty={dsl.blocks.length === 0}>
                {dsl.blocks.length === 0 ? (
                  <div className="flex h-64 flex-col items-center justify-center text-center text-slate-400">
                    <p className="text-sm font-medium">Drop blocks here to build your rule</p>
                    <p className="mt-1 text-xs">Drag from the palette or click a block type</p>
                  </div>
                ) : (
                  <SortableContext items={blockKeys} strategy={verticalListSortingStrategy}>
                    <div className="flex flex-col items-center">
                      {dsl.blocks.map((block, i) => (
                        <SortableBlockCard
                          key={blockKeys[i]}
                          id={blockKeys[i]!}
                          block={block}
                          index={i}
                          selected={selectedIndex === i}
                          onSelect={() => setSelectedIndex(i)}
                          onRemove={() => removeBlock(i)}
                          isLast={i === dsl.blocks.length - 1}
                        />
                      ))}
                      <AppendDropZone />
                    </div>
                  </SortableContext>
                )}
              </CanvasDropZone>
            </div>

            <div className="col-span-4 space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                {selectedBlock ? (
                  <BlockInspector
                    block={selectedBlock}
                    blockIndex={selectedIndex}
                    onChange={(b) => updateBlock(selectedIndex, b)}
                  />
                ) : (
                  <p className="text-sm text-slate-400">Select a block to edit</p>
                )}
              </div>

              <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-navy to-accent-dark p-4 text-white shadow-sm">
                <div className="text-xs font-bold uppercase tracking-wider text-white/70">
                  Live Preview
                </div>
                <pre className="mt-2 whitespace-pre-wrap font-sans text-sm leading-relaxed text-white/95">
                  {dslToNaturalLanguage(dsl)}
                </pre>
              </div>
            </div>
          </div>
        )}

        {view === "natural" && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <pre className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
              {dslToNaturalLanguage(dsl)}
            </pre>
          </div>
        )}

        {view === "json" && (
          <pre className="max-h-[500px] overflow-auto rounded-2xl border border-slate-800 bg-slate-900 p-6 text-xs text-green-400 shadow-sm">
            {JSON.stringify(dsl, null, 2)}
          </pre>
        )}
      </div>

      <DragOverlay dropAnimation={null}>
        {activeDrag && dragOverlayConfig && (
          <div
            className={`rounded-xl border-2 ${dragOverlayConfig.border} ${dragOverlayConfig.bg} px-4 py-3 shadow-2xl`}
          >
            <span className={`text-sm font-bold ${dragOverlayConfig.color}`}>
              {dragOverlayConfig.label}
            </span>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
