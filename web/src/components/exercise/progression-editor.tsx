"use client";

import { useMemo, useState } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useExercises } from "@/hooks/use-exercises";
import { useTranslation } from "@/i18n";

export interface ProgressionItem {
  id: number;
  title: string;
}

const iconButton =
  "rounded px-1.5 py-0.5 text-sm text-gray-500 hover:bg-gray-100 disabled:opacity-30 dark:text-gray-400 dark:hover:bg-gray-700";

function SortableRow({
  item,
  index,
  count,
  onMove,
  onRemove,
}: {
  item: ProgressionItem;
  index: number;
  count: number;
  onMove: (from: number, to: number) => void;
  onRemove: () => void;
}) {
  const { t } = useTranslation();
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id });

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      data-testid={`progression-row-${item.id}`}
      className={`flex items-center gap-2 rounded-md border border-gray-200 bg-white px-2 py-1.5 dark:border-gray-700 dark:bg-gray-800 ${
        isDragging ? "relative z-10 shadow-md" : ""
      }`}
    >
      <button
        type="button"
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        aria-label={t("exerciseForm.dragHandle", { title: item.title })}
        className="cursor-grab touch-none px-1 text-gray-400 hover:text-gray-600 active:cursor-grabbing dark:text-gray-500"
      >
        ⠿
      </button>
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-medium dark:bg-gray-700 dark:text-gray-300">
        {index + 1}
      </span>
      <span className="min-w-0 flex-1 truncate text-sm text-gray-900 dark:text-gray-100">{item.title}</span>
      <button
        type="button"
        onClick={() => onMove(index, index - 1)}
        disabled={index === 0}
        aria-label={t("exerciseForm.moveUp", { title: item.title })}
        className={iconButton}
      >
        ↑
      </button>
      <button
        type="button"
        onClick={() => onMove(index, index + 1)}
        disabled={index === count - 1}
        aria-label={t("exerciseForm.moveDown", { title: item.title })}
        className={iconButton}
      >
        ↓
      </button>
      <button
        type="button"
        onClick={onRemove}
        className="text-sm text-red-400 hover:text-red-600"
      >
        {t("common.remove")}
      </button>
    </li>
  );
}

/**
 * Ordered list of progression steps (child exercises) with drag-and-drop,
 * up/down buttons and a picker to add more of the user's own exercises.
 */
export default function ProgressionEditor({
  value,
  onChange,
  excludeIds = [],
}: {
  value: ProgressionItem[];
  onChange: (next: ProgressionItem[]) => void;
  /** Exercises that must not be offered (the exercise itself, its parents). */
  excludeIds?: number[];
}) {
  const { t } = useTranslation();
  const { data } = useExercises(1, "mine");
  const [selected, setSelected] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const candidates = useMemo(() => {
    const taken = new Set([...value.map((v) => v.id), ...excludeIds]);
    return (data?.data ?? []).filter((e) => !taken.has(e.id));
  }, [data, value, excludeIds]);

  const move = (from: number, to: number) => {
    if (to < 0 || to >= value.length) return;
    onChange(arrayMove(value, from, to));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = value.findIndex((v) => v.id === active.id);
    const to = value.findIndex((v) => v.id === over.id);
    if (from >= 0 && to >= 0) move(from, to);
  };

  const add = () => {
    const exercise = candidates.find((e) => String(e.id) === selected);
    if (!exercise) return;
    onChange([...value, { id: exercise.id, title: exercise.title }]);
    setSelected("");
  };

  return (
    <div>
      <p className="text-xs text-gray-500 dark:text-gray-400">{t("exerciseForm.progressionsHint")}</p>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={value.map((v) => v.id)} strategy={verticalListSortingStrategy}>
          <ul className="mt-2 space-y-2">
            {value.map((item, index) => (
              <SortableRow
                key={item.id}
                item={item}
                index={index}
                count={value.length}
                onMove={move}
                onRemove={() => onChange(value.filter((v) => v.id !== item.id))}
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>
      <div className="mt-2 flex items-center gap-2">
        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          aria-label={t("exerciseForm.addProgression")}
          className="min-w-0 flex-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
        >
          <option value="">
            {candidates.length === 0 ? t("exerciseForm.noProgressionCandidates") : t("exerciseForm.selectProgression")}
          </option>
          {candidates.map((e) => (
            <option key={e.id} value={e.id}>
              {e.title}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={add}
          disabled={!selected}
          className="rounded-md bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-40 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
          aria-label={t("exerciseForm.addProgression")}
        >
          +
        </button>
      </div>
    </div>
  );
}
