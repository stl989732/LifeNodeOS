"use client";

import { useMemo, useState } from "react";
import { LayoutGrid, Pencil, Plus, Trash2 } from "lucide-react";
import {
  AURA_BTN_PRIMARY,
  AURA_GLASS_CLASS,
  AURA_GLASS_STYLE,
  AURA_INPUT_CLASS,
  AURA_TEXT,
} from "@/src/components/lifePulse/lifePulseAura";
import {
  createKanbanBoard,
  createKanbanCard,
  createKanbanColumn,
} from "@/src/lib/kanban/storage";
import {
  KANBAN_COLUMN_PRESETS,
  type KanbanBoard,
  type KanbanCard,
  type KanbanColumn,
  type KanbanColumnPreset,
  type KanbanStore,
} from "@/src/lib/kanban/types";

import { transferInboxDrop } from "@/src/hooks/useInboxDropTransfer";

const KANBAN_DRAG_MIME = "application/x-lifenode-kanban-card";

type KanbanBoardSectionProps = {
  store: KanbanStore;
  userId: string | null;
  onStoreChange: (next: KanbanStore) => void;
};

export default function KanbanBoardSection({
  store,
  userId,
  onStoreChange,
}: KanbanBoardSectionProps) {
  const [newBoardName, setNewBoardName] = useState("");
  const [showNewBoard, setShowNewBoard] = useState(false);
  const [newCardTitle, setNewCardTitle] = useState<Record<string, string>>({});
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editTargetDate, setEditTargetDate] = useState("");
  const [addColumnLabel, setAddColumnLabel] = useState<KanbanColumnPreset>(
    KANBAN_COLUMN_PRESETS[0],
  );

  const activeBoard = useMemo(
    () =>
      store.boards.find((b) => b.id === store.activeBoardId) ?? store.boards[0],
    [store.activeBoardId, store.boards],
  );

  const boardCards = useMemo(
    () =>
      activeBoard
        ? store.cards
            .filter((c) => c.boardId === activeBoard.id)
            .sort((a, b) => a.order - b.order)
        : [],
    [activeBoard, store.cards],
  );

  const columns = useMemo(
    () =>
      activeBoard
        ? [...activeBoard.columns].sort((a, b) => a.order - b.order)
        : [],
    [activeBoard],
  );

  function persist(next: KanbanStore) {
    onStoreChange(next);
  }

  function cardsInColumn(columnId: string) {
    return boardCards.filter((c) => c.columnId === columnId);
  }

  function handleCreateBoard() {
    const board = createKanbanBoard(newBoardName);
    persist({
      ...store,
      boards: [...store.boards, board],
      activeBoardId: board.id,
    });
    setNewBoardName("");
    setShowNewBoard(false);
  }

  function handleAddColumn() {
    if (!activeBoard) return;
    const label = addColumnLabel.trim();
    if (!label) return;
    if (activeBoard.columns.some((c) => c.label === label)) return;
    const col = createKanbanColumn(label, activeBoard.columns.length);
    const boards = store.boards.map((b) =>
      b.id === activeBoard.id
        ? {
            ...b,
            columns: [...b.columns, col],
            updatedAt: new Date().toISOString(),
          }
        : b,
    );
    persist({ ...store, boards });
  }

  function handleAddCard(columnId: string) {
    if (!activeBoard) return;
    const title = (newCardTitle[columnId] ?? "").trim();
    if (!title) return;
    const order = cardsInColumn(columnId).length;
    const card = createKanbanCard(activeBoard.id, columnId, title, order);
    persist({ ...store, cards: [...store.cards, card] });
    setNewCardTitle((prev) => ({ ...prev, [columnId]: "" }));
  }

  function handleMoveCard(cardId: string, targetColumnId: string) {
    const cards = store.cards.map((c) =>
      c.id === cardId
        ? {
            ...c,
            columnId: targetColumnId,
            order: cardsInColumn(targetColumnId).length,
            updatedAt: new Date().toISOString(),
          }
        : c,
    );
    persist({ ...store, cards });
  }

  function handleDeleteCard(cardId: string) {
    if (!window.confirm("Delete this Kanban card?")) return;
    if (editingCardId === cardId) setEditingCardId(null);
    persist({ ...store, cards: store.cards.filter((c) => c.id !== cardId) });
  }

  function startEditCard(card: KanbanCard) {
    setEditingCardId(card.id);
    setEditTitle(card.title);
    setEditNotes(card.notes ?? "");
    setEditTargetDate(card.targetDate ?? "");
  }

  function saveEditCard() {
    if (!editingCardId) return;
    const trimmed = editTitle.trim();
    if (!trimmed) return;
    const cards = store.cards.map((c) =>
      c.id === editingCardId
        ? {
            ...c,
            title: trimmed,
            notes: editNotes.trim() || undefined,
            targetDate: editTargetDate || undefined,
            updatedAt: new Date().toISOString(),
          }
        : c,
    );
    persist({ ...store, cards });
    setEditingCardId(null);
  }

  function handleDeleteBoard() {
    if (!activeBoard || store.boards.length <= 1) return;
    if (!window.confirm(`Delete board "${activeBoard.name}"?`)) return;
    const boards = store.boards.filter((b) => b.id !== activeBoard.id);
    const cards = store.cards.filter((c) => c.boardId !== activeBoard.id);
    persist({
      boards,
      cards,
      activeBoardId: boards[0]?.id ?? null,
    });
  }

  if (!activeBoard) return null;

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <LayoutGrid className="h-5 w-5 text-slate-800" />
          <h2 className={`text-lg font-bold ${AURA_TEXT.title}`}>
            Kanban boards
          </h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="sr-only" htmlFor="kanban-board-select">
            Active board
          </label>
          <select
            id="kanban-board-select"
            className={`${AURA_INPUT_CLASS} min-w-[10rem] text-sm font-semibold`}
            value={store.activeBoardId ?? activeBoard.id}
            onChange={(e) =>
              persist({ ...store, activeBoardId: e.target.value })
            }
          >
            {store.boards.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="rounded-lg border border-slate-400/70 bg-white px-3 py-2 text-xs font-bold text-slate-900 shadow-sm hover:border-teal-600 hover:bg-teal-50"
            onClick={() => setShowNewBoard((v) => !v)}
          >
            <Plus className="mr-1 inline h-3.5 w-3.5" />
            New board
          </button>
          {store.boards.length > 1 ? (
            <button
              type="button"
              className="rounded-lg border border-red-300/80 bg-white px-3 py-2 text-xs font-bold text-red-800 hover:bg-red-50"
              onClick={handleDeleteBoard}
            >
              Delete board
            </button>
          ) : null}
        </div>
      </div>

      {showNewBoard ? (
        <div
          className={`flex flex-wrap items-center gap-2 ${AURA_GLASS_CLASS} p-3`}
          style={AURA_GLASS_STYLE}
        >
          <input
            className={`min-w-[12rem] flex-1 ${AURA_INPUT_CLASS}`}
            placeholder="Board name"
            value={newBoardName}
            onChange={(e) => setNewBoardName(e.target.value)}
          />
          <button
            type="button"
            className={AURA_BTN_PRIMARY}
            onClick={handleCreateBoard}
          >
            Create
          </button>
        </div>
      ) : null}

      <div
        className={`${AURA_GLASS_CLASS} p-4`}
        style={AURA_GLASS_STYLE}
      >
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <label className="sr-only" htmlFor="kanban-add-column">
            Column label
          </label>
          <select
            id="kanban-add-column"
            className={`${AURA_INPUT_CLASS} text-sm`}
            value={addColumnLabel}
            onChange={(e) =>
              setAddColumnLabel(e.target.value as KanbanColumnPreset)
            }
          >
            {KANBAN_COLUMN_PRESETS.map((label) => (
              <option key={label} value={label}>
                {label}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="rounded-lg border border-slate-400/70 bg-white px-3 py-2 text-xs font-bold text-slate-900 hover:border-teal-600 hover:bg-teal-50"
            onClick={handleAddColumn}
          >
            Add column
          </button>
        </div>

        <div className="flex gap-3 overflow-x-auto pb-2">
          {columns.map((column) => (
            <KanbanColumnView
              key={column.id}
              column={column}
              cards={cardsInColumn(column.id)}
              newCardTitle={newCardTitle[column.id] ?? ""}
              editingCardId={editingCardId}
              editTitle={editTitle}
              editNotes={editNotes}
              editTargetDate={editTargetDate}
              onNewCardTitleChange={(v) =>
                setNewCardTitle((prev) => ({ ...prev, [column.id]: v }))
              }
              onAddCard={() => handleAddCard(column.id)}
              onDropCard={(cardId) => handleMoveCard(cardId, column.id)}
              onStartEdit={startEditCard}
              onDeleteCard={handleDeleteCard}
              onEditTitleChange={setEditTitle}
              onEditNotesChange={setEditNotes}
              onEditTargetDateChange={setEditTargetDate}
              onSaveEdit={saveEditCard}
              onCancelEdit={() => setEditingCardId(null)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

type KanbanColumnViewProps = {
  column: KanbanColumn;
  cards: KanbanCard[];
  newCardTitle: string;
  editingCardId: string | null;
  editTitle: string;
  editNotes: string;
  editTargetDate: string;
  onNewCardTitleChange: (value: string) => void;
  onAddCard: () => void;
  onDropCard: (cardId: string) => void;
  onStartEdit: (card: KanbanCard) => void;
  onDeleteCard: (cardId: string) => void;
  onEditTitleChange: (value: string) => void;
  onEditNotesChange: (value: string) => void;
  onEditTargetDateChange: (value: string) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
};

function KanbanColumnView({
  column,
  cards,
  newCardTitle,
  editingCardId,
  editTitle,
  editNotes,
  editTargetDate,
  onNewCardTitleChange,
  onAddCard,
  onDropCard,
  onStartEdit,
  onDeleteCard,
  onEditTitleChange,
  onEditNotesChange,
  onEditTargetDateChange,
  onSaveEdit,
  onCancelEdit,
}: KanbanColumnViewProps) {
  return (
    <div
      className="flex w-56 shrink-0 flex-col rounded-xl border border-white/30 bg-white/20"
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
      }}
      onDrop={(e) => {
        e.preventDefault();
        void transferInboxDrop(e, { type: "backlog" }).then((ok) => {
          if (ok) return;
          const raw =
            e.dataTransfer.getData(KANBAN_DRAG_MIME) ||
            e.dataTransfer.getData("text/plain");
          if (!raw) return;
          try {
            const parsed = JSON.parse(raw) as { cardId?: string };
            if (parsed.cardId) onDropCard(parsed.cardId);
          } catch {
            /* ignore */
          }
        });
      }}
    >
      <div className="border-b border-white/25 px-3 py-2">
        <h4 className="text-xs font-bold text-slate-900">{column.label}</h4>
        <p className="text-[10px] text-slate-500">{cards.length} cards</p>
      </div>
      <div className="min-h-[8rem] flex-1 space-y-2 overflow-y-auto p-2">
        {cards.map((card) =>
          editingCardId === card.id ? (
            <div
              key={card.id}
              className="space-y-1.5 rounded-lg border border-teal-500/40 bg-white/90 p-2"
            >
              <input
                className={`w-full ${AURA_INPUT_CLASS} text-xs`}
                value={editTitle}
                onChange={(e) => onEditTitleChange(e.target.value)}
              />
              <input
                type="date"
                className={`w-full ${AURA_INPUT_CLASS} text-xs`}
                value={editTargetDate}
                onChange={(e) => onEditTargetDateChange(e.target.value)}
              />
              <textarea
                className={`min-h-[48px] w-full resize-y ${AURA_INPUT_CLASS} text-xs`}
                placeholder="Notes"
                value={editNotes}
                onChange={(e) => onEditNotesChange(e.target.value)}
              />
              <div className="flex gap-1">
                <button
                  type="button"
                  className="flex-1 rounded-lg bg-teal-700 px-2 py-1 text-[10px] font-bold text-white"
                  onClick={onSaveEdit}
                >
                  Save
                </button>
                <button
                  type="button"
                  className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-[10px] font-bold"
                  onClick={onCancelEdit}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div
              key={card.id}
              draggable
              onDragStart={(e) => {
                const payload = JSON.stringify({ cardId: card.id });
                e.dataTransfer.setData(KANBAN_DRAG_MIME, payload);
                e.dataTransfer.setData("text/plain", payload);
                e.dataTransfer.effectAllowed = "move";
              }}
              className="cursor-grab rounded-lg border border-white/40 bg-white/75 p-2 shadow-sm active:cursor-grabbing"
            >
              <p className="text-xs font-bold text-slate-900">{card.title}</p>
              {card.targetDate ? (
                <p className="mt-0.5 text-[10px] text-slate-600">
                  Target: {card.targetDate}
                </p>
              ) : null}
              {card.notes ? (
                <p className="mt-1 line-clamp-2 text-[10px] text-slate-500">
                  {card.notes}
                </p>
              ) : null}
              <div className="mt-2 flex justify-end gap-0.5">
                <button
                  type="button"
                  className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-teal-800"
                  aria-label={`Edit ${card.title}`}
                  onClick={() => onStartEdit(card)}
                >
                  <Pencil className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  className="rounded p-1 text-slate-500 hover:bg-red-50 hover:text-red-700"
                  aria-label={`Delete ${card.title}`}
                  onClick={() => onDeleteCard(card.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </div>
          ),
        )}
      </div>
      <div className="border-t border-white/25 p-2">
        <input
          className={`mb-1.5 w-full ${AURA_INPUT_CLASS} text-xs`}
          placeholder="New card…"
          value={newCardTitle}
          onChange={(e) => onNewCardTitleChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onAddCard();
          }}
        />
        <button
          type="button"
          className="w-full rounded-lg border border-slate-300/80 bg-white/80 py-1 text-[10px] font-bold text-slate-800 hover:bg-teal-50"
          onClick={onAddCard}
        >
          Add card
        </button>
      </div>
    </div>
  );
}
