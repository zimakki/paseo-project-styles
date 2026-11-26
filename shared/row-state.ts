// Works out what each sidebar row should show from the agents behind it.
//
// Paseo gives a row one status from its most urgent agent: needs input, failed, running, finished,
// idle. It counts an agent's background work (a background shell, a monitor, a heartbeat) as
// running, and ranks running above finished. So a row with only a background task sweeps like a
// working agent, and an agent that finished while another one works never shows as finished.
//
// This plugin instead gives each row:
//   primary      the state that needs you most: needs input, failed, finished, working, idle.
//                Background work never counts as working.
//   alsoWorking  an agent is working, but a more urgent state owns the row
//   background   how many background tasks are running
//
// A sub-agent (one another agent started) that has closed never turns its row green or red. Its
// parent already read its result, Paseo gives it no tab, and Paseo keeps it flagged unread until
// someone opens it, so without this the row stays coloured with nothing visible to open.

export type Primary = "needs_input" | "failed" | "attention" | "running" | "done";

export interface AgentState {
  status: string;
  requiresAttention?: boolean;
  attentionReason?: string | null;
  pendingPermissionCount: number;
  backgroundCount: number;
  subAgent?: boolean;
}

export interface RowState {
  primary: Primary;
  alsoWorking: boolean;
  background: number;
}

const RANK: Record<Primary, number> = { needs_input: 0, failed: 1, attention: 2, running: 3, done: 4 };

function agentPrimary(agent: AgentState): Primary {
  if (agent.pendingPermissionCount > 0 || agent.attentionReason === "permission") return "needs_input";
  if (agent.subAgent && agent.status === "closed") return "done";
  if (agent.requiresAttention && agent.attentionReason === "error") return "failed";
  if (agent.requiresAttention) return "attention";
  if (agent.status === "running") return "running";
  return "done";
}

export function rowState(agents: Iterable<AgentState>): RowState {
  let primary: Primary = "done";
  let working = false;
  let background = 0;
  for (const agent of agents) {
    const own = agentPrimary(agent);
    if (RANK[own] < RANK[primary]) primary = own;
    if (agent.status === "running") working = true;
    background += agent.backgroundCount;
  }
  return { primary, alsoWorking: working && primary !== "running", background };
}
