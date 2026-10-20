export type Country = "UK" | "Spain" | "Italy";
export type Currency = "GBP" | "EUR";
export type Language = "en" | "es" | "it";
export type Role = "Admin" | "Operations" | "Finance" | "Owner";
export type TaskStatus = "Queued" | "In progress" | "Complete" | "Blocked";
export interface Property {
  id: string;
  name: string;
  country: Country;
  city: string;
  type: string;
  capacity: number;
  bedrooms: number;
  currency: Currency;
  timezone: string;
  ownerId: string;
  address: string;
  amenities: string[];
  baseRate: number;
  minRate: number;
  maxRate: number;
  clean: boolean;
  inspection: boolean;
  photo: boolean;
  rules: string;
  checkin: string;
  onboarded: boolean;
}
export interface Owner {
  id: string;
  name: string;
  email: string;
  feeBps: number;
}
export interface Booking {
  id: string;
  propertyId: string;
  guest: string;
  email: string;
  guests: number;
  start: string;
  end: string;
  channel: string;
  status: "Confirmed" | "Cancelled" | "Checked in" | "Checked out";
  amount: number;
  cleaning: number;
  paid: number;
  currency: Currency;
  requests: string;
  created: string;
  history: string[];
}
export interface Task {
  id: string;
  propertyId: string;
  title: string;
  kind:
    "Cleaning" | "Inspection" | "Maintenance" | "Guest" | "Growth" | "Document";
  status: TaskStatus;
  due: string;
  assignee: string;
  sourceId: string;
  checklist: boolean[];
  photo: boolean;
  photoData?: string;
  notes: string;
}
export interface Issue {
  id: string;
  propertyId: string;
  title: string;
  priority: "Critical" | "High" | "Normal";
  status:
    | "Open"
    | "Assigned"
    | "In progress"
    | "Awaiting approval"
    | "Scheduled"
    | "Resolved"
    | "Closed";
  quote: number;
  currency: Currency;
  version: number;
  supplier: string;
  asset: string;
  evidence: boolean;
  verified: boolean;
  ownerResponsibility: boolean;
  notes: string;
}
export interface Approval {
  id: string;
  type: "Quote" | "Pricing" | "Purchase" | "Finance" | "Message";
  entityId: string;
  propertyId: string;
  title: string;
  amount: number;
  currency: Currency;
  status: "Pending" | "Approved" | "Rejected" | "Stale";
  version: number;
  evidence: string[];
  requested: string;
  approver?: string;
}
export interface Message {
  id: string;
  propertyId: string;
  bookingId: string;
  guest: string;
  channel: string;
  language: Language;
  sentiment: "Positive" | "Neutral" | "Negative";
  urgency: "Routine" | "Urgent" | "Review";
  text: string;
  direction: "Inbound" | "Outbound" | "Draft";
  time: string;
  assigned: string;
}
export interface Inventory {
  id: string;
  propertyId: string;
  name: string;
  quantity: number;
  minimum: number;
  unitCost: number;
  ordered: number;
  received: boolean;
  version: number;
}
export interface Staff {
  id: string;
  name: string;
  role: string;
  country: Country;
  city: string;
  shift: string;
  available: boolean;
  skills: string[];
}
export interface Bill {
  id: string;
  propertyId: string;
  supplier: string;
  reference: string;
  amount: number;
  currency: Currency;
  status: "Draft" | "Posted" | "Duplicate" | "Matched";
  category: string;
  date: string;
  duplicateOf?: string;
}
export interface Document {
  id: string;
  propertyId: string;
  title: string;
  due: string;
  status: "Current" | "Needs review" | "Unknown";
}
export interface Review {
  id: string;
  propertyId: string;
  guest: string;
  rating: number;
  text: string;
  response: string;
  bookingId: string;
}
export interface Rate {
  id: string;
  propertyId: string;
  date: string;
  amount: number;
  original: number;
}
export interface PricingBatch {
  id: string;
  propertyId: string;
  dates: string[];
  before: number[];
  proposed: number[];
  version: number;
  applied: boolean;
  undone: boolean;
  appliedRevision?: number;
}
export interface Event {
  id: string;
  time: string;
  title: string;
  sourceId: string;
  propertyId: string;
  actor: string;
}
export type RunStatus =
  | "queued"
  | "analysing"
  | "needs information"
  | "proposed"
  | "awaiting approval"
  | "executing"
  | "completed"
  | "failed"
  | "escalated"
  | "cancelled";
export interface AgentRun {
  id: string;
  agent: string;
  trigger: string;
  time: string;
  sources: string[];
  evidence: string;
  policy: string;
  action: string;
  expected: string;
  result: string;
  verification: string;
  status: RunStatus;
}
export interface AgentPolicy {
  paused: boolean;
  autoTasks: boolean;
  routineReplies: boolean;
}
export interface Scenario {
  id: number;
  country: Country;
  propertyId: string;
  step: number;
  playing: boolean;
  status: string;
  before: string;
}
export interface Chat {
  id: string;
  role: "user" | "assistant";
  text: string;
  sources: string[];
  action?: string;
}
export interface State {
  schema: 1;
  revision: number;
  sequence: number;
  taxBps: number;
  now: string;
  playing: boolean;
  speed: number;
  agentsPaused: boolean;
  policies: AgentPolicy;
  language: Language;
  role: Role;
  ownerId: string;
  motion: boolean;
  properties: Property[];
  owners: Owner[];
  bookings: Booking[];
  tasks: Task[];
  issues: Issue[];
  approvals: Approval[];
  messages: Message[];
  inventory: Inventory[];
  staff: Staff[];
  bills: Bill[];
  documents: Document[];
  reviews: Review[];
  rates: Rate[];
  blockedNights: {
    id: string;
    propertyId: string;
    date: string;
    reason: string;
  }[];
  batches: PricingBatch[];
  events: Event[];
  runs: AgentRun[];
  processed: string[];
  scenario: Scenario | null;
  chat: Chat[];
  notifications: string[];
  lastCheck: string;
}
export type Command =
  | { type: "updateOwner"; id: string; feeBps: number }
  | { type: "categorizeBill"; id: string; category: string }
  | { type: "blockNight"; propertyId: string; date: string; reason: string }
  | { type: "unblockNight"; propertyId: string; date: string }
  | {
      type: "createBooking";
      booking: Omit<Booking, "id" | "history" | "created">;
      key?: string;
    }
  | {
      type: "editBooking";
      id: string;
      start: string;
      end: string;
      guests: number;
    }
  | { type: "cancelBooking"; id: string }
  | { type: "saveProperty"; property: Property }
  | {
      type: "createTask";
      propertyId: string;
      title: string;
      kind: Task["kind"];
      sourceId: string;
      key?: string;
    }
  | { type: "assignTask"; id: string; staffId: string }
  | {
      type: "updateTask";
      id: string;
      status?: TaskStatus;
      check?: number;
      photo?: boolean;
      photoData?: string;
      notes?: string;
    }
  | { type: "inspect"; propertyId: string; pass: boolean }
  | { type: "requestQuote"; id: string }
  | { type: "approve"; id: string; reject?: boolean }
  | {
      type: "updateIssue";
      id: string;
      status: Issue["status"];
      evidence?: boolean;
    }
  | { type: "reviseQuote"; id: string; amount: number }
  | {
      type: "createIssue";
      propertyId: string;
      title: string;
      priority: Issue["priority"];
    }
  | { type: "verifyRepair"; id: string }
  | { type: "proposePricing"; propertyId: string; key?: string }
  | { type: "undoPricing"; id: string }
  | { type: "purchase"; id: string }
  | { type: "receive"; id: string }
  | { type: "consume"; id: string; quantity: number; key: string }
  | { type: "resolveBill"; id: string }
  | { type: "postBill"; id: string }
  | {
      type: "createBill";
      propertyId: string;
      amount: number;
      reference: string;
    }
  | { type: "draftReply"; id: string; language: Language }
  | { type: "sendMessage"; id: string }
  | { type: "reviewReply"; id: string }
  | { type: "growthPlan"; propertyId: string }
  | { type: "runAgents" }
  | { type: "tick"; minutes: number }
  | {
      type: "settings";
      values: Partial<
        Pick<
          State,
          | "playing"
          | "speed"
          | "agentsPaused"
          | "language"
          | "role"
          | "ownerId"
          | "motion"
          | "taxBps"
        >
      >;
    }
  | { type: "policy"; values: Partial<AgentPolicy> }
  | { type: "startScenario"; id: number; country: Country }
  | { type: "stepScenario" }
  | { type: "scenarioPlay"; playing: boolean }
  | { type: "retryIntegration"; propertyId: string }
  | { type: "chat"; message: Chat };
export interface Filters {
  country: Country | "All";
  city: string;
  propertyId: string;
  team: string;
  from: string;
  to: string;
  currency: Currency;
  search: string;
}
