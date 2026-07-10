import type { Board, Collaborator, PresenceEntry } from "../types";

export const collaborators: Collaborator[] = [
  { id: "u1", name: "Josh Colon", initials: "JC", color: "#FF8A3D" },
  { id: "u2", name: "Mara Diallo", initials: "MD", color: "#3DDC97" },
  { id: "u3", name: "Peter Lin", initials: "PL", color: "#6FA8FF" },
];

export const presence: PresenceEntry[] = [
  { collaboratorId: "u1", viewingCardId: "c3", lastActiveAt: new Date().toISOString() },
  { collaboratorId: "u2", viewingCardId: "c1", lastActiveAt: new Date().toISOString() },
];

export const initialBoard: Board = {
  id: "b1",
  title: "Ops Board — Weather Dashboard Launch",
  lists: [
    { id: "l1", title: "Backlog", order: 0 },
    { id: "l2", title: "In Progress", order: 1 },
    { id: "l3", title: "Review", order: 2 },
    { id: "l4", title: "Done", order: 3 },
  ],
  cards: [
    {
      id: "c1",
      code: "MAN-001",
      title: "Wire up Supabase Realtime channel",
      description: "Subscribe to postgres_changes on the cards table and reconcile local state.",
      priority: "urgent",
      assigneeId: "u2",
      listId: "l2",
      order: 0,
      comments: [],
      updatedAt: new Date().toISOString(),
    },
    {
      id: "c2",
      code: "MAN-002",
      title: "Row Level Security policies for board access",
      description: "Only board members can read/write cards for a given board_id.",
      priority: "standard",
      assigneeId: "u1",
      listId: "l1",
      order: 0,
      comments: [],
      updatedAt: new Date().toISOString(),
    },
    {
      id: "c3",
      code: "MAN-003",
      title: "Presence indicator on card hover",
      description: "Show a pulsing ring on any avatar currently viewing a card.",
      priority: "standard",
      assigneeId: "u1",
      listId: "l2",
      order: 1,
      comments: [],
      updatedAt: new Date().toISOString(),
    },
    {
      id: "c4",
      code: "MAN-004",
      title: "Drag-and-drop between lists",
      description: "dnd-kit sortable context across list boundaries with optimistic reorder.",
      priority: "urgent",
      assigneeId: "u3",
      listId: "l3",
      order: 0,
      comments: [],
      updatedAt: new Date().toISOString(),
    },
    {
      id: "c5",
      code: "MAN-005",
      title: "Project scaffold + Tailwind theme",
      description: "Vite + React + TS scaffold with manifest-board design tokens.",
      priority: "low",
      assigneeId: "u1",
      listId: "l4",
      order: 0,
      comments: [],
      updatedAt: new Date().toISOString(),
    },
  ],
};
