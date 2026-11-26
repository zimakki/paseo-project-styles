import { getPaseoClient } from "@getpaseo/plugin/client";
import { type AgentState, rowState, type RowState } from "../shared/row-state";

interface AgentLike {
  id: string;
  status: string;
  workspaceId?: string;
  requiresAttention?: boolean;
  attentionReason?: string | null;
  pendingPermissions?: readonly unknown[];
  backgroundWork?: { count?: number; runningCount?: number };
  parentAgentId?: string | null;
  labels?: Readonly<Record<string, string>>;
}
interface ProjectLike {
  projectKey: string;
}
interface AgentUpdate {
  type: string;
  payload:
    | { kind: "upsert"; agent: AgentLike; project?: ProjectLike | null }
    | { kind: "remove"; agentId: string };
}

interface Tracked extends AgentState {
  workspaceId?: string;
  projectKey?: string;
}

/** Row states for one host, keyed the way the sidebar's test IDs are. */
export interface SidebarRows {
  /** `<serverId>:<workspaceId>` → state of that workspace row */
  workspaces: Map<string, RowState>;
  /** project row test ID suffix → state of that project's collapsed row */
  projects: Map<string, RowState>;
}

export interface AgentTracker {
  /** Row states, or null until every watched host has sent its agent list. */
  rows(): SidebarRows | null;
  /** Starts watching any hosts not yet watched. */
  watch(serverIds: Iterable<string>): void;
  dispose(): void;
}

function track(agent: AgentLike, projectKey: string | undefined): Tracked {
  const work = agent.backgroundWork;
  return {
    status: agent.status,
    requiresAttention: agent.requiresAttention,
    attentionReason: agent.attentionReason,
    pendingPermissionCount: agent.pendingPermissions?.length ?? 0,
    backgroundCount: work?.runningCount ?? work?.count ?? 0,
    subAgent: Boolean(agent.parentAgentId ?? agent.labels?.["paseo.parent-agent-id"]),
    workspaceId: agent.workspaceId,
    projectKey,
  };
}

function group<K>(agents: Iterable<Tracked>, key: (agent: Tracked) => K | undefined): Map<K, Tracked[]> {
  const groups = new Map<K, Tracked[]>();
  for (const agent of agents) {
    const k = key(agent);
    if (k === undefined) continue;
    const list = groups.get(k);
    if (list) list.push(agent);
    else groups.set(k, [agent]);
  }
  return groups;
}

// Paseo keys a project row by the project key, or by JSON ["<serverId>","<projectKey>"] when it
// does not merge the project across hosts. Both forms get the same state.
function projectRowKeys(serverId: string, projectKey: string): string[] {
  return [projectKey, JSON.stringify([serverId, projectKey])];
}

export function trackAgents(onChange: () => void): AgentTracker {
  const hosts = new Map<string, { agents: Map<string, Tracked>; ready: boolean; release: () => void }>();
  let disposed = false;

  const watchHost = (serverId: string) => {
    const host = { agents: new Map<string, Tracked>(), ready: false, release: () => {} };
    hosts.set(serverId, host);
    let api;
    try {
      api = getPaseoClient(serverId);
    } catch {
      hosts.delete(serverId); // host not online yet; try again on the next sidebar change
      return;
    }
    const load = (entries: readonly { agent: AgentLike; project: ProjectLike }[]) => {
      host.agents.clear();
      for (const { agent, project } of entries) host.agents.set(agent.id, track(agent, project.projectKey));
      host.ready = true;
      onChange();
    };
    api.agents
      .list({ subscribe: {} })
      .then(({ subscription }) => {
        if (disposed) return void subscription.release();
        const unsubscribe = subscription.subscribe({
          snapshot: (snapshot) => load(snapshot.entries),
          update(message) {
            const update = message as unknown as AgentUpdate;
            if (update.type !== "agent_update") return;
            const payload = update.payload;
            if (payload.kind === "upsert") {
              const projectKey = payload.project?.projectKey ?? host.agents.get(payload.agent.id)?.projectKey;
              host.agents.set(payload.agent.id, track(payload.agent, projectKey));
            } else host.agents.delete(payload.agentId);
            onChange();
          },
        });
        host.release = () => {
          unsubscribe();
          void subscription.release();
        };
      })
      .catch(() => {
        hosts.delete(serverId);
      });
  };

  return {
    rows() {
      if (hosts.size === 0 || [...hosts.values()].some((host) => !host.ready)) return null;
      const workspaces = new Map<string, RowState>();
      const projectAgents = new Map<string, Tracked[]>();
      for (const [serverId, host] of hosts) {
        for (const [workspaceId, agents] of group(host.agents.values(), (a) => a.workspaceId))
          workspaces.set(`${serverId}:${workspaceId}`, rowState(agents));
        // A project merged across hosts has one row, so its key collects agents from every host.
        for (const [projectKey, agents] of group(host.agents.values(), (a) => a.projectKey))
          for (const key of projectRowKeys(serverId, projectKey))
            projectAgents.set(key, [...(projectAgents.get(key) ?? []), ...agents]);
      }
      const projects = new Map([...projectAgents].map(([key, agents]) => [key, rowState(agents)] as const));
      return { workspaces, projects };
    },
    watch(serverIds) {
      if (disposed) return;
      for (const serverId of serverIds) if (!hosts.has(serverId)) watchHost(serverId);
    },
    dispose() {
      disposed = true;
      for (const host of hosts.values()) host.release();
      hosts.clear();
    },
  };
}
