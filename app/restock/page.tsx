"use client";

import { CheckCircle2, ClipboardList, Loader2, PackageOpen, UserPlus } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { API_V1, request } from "@/lib/api/client";
import { useAuth } from "@/lib/auth/context";
import { cn } from "@/lib/utils";

interface Task {
  id: number;
  status: "open" | "assigned" | "done" | "cancelled";
  shelf_code: string;
  shelf_name: string;
  row_position: number;
  product_name: string;
  sku: string;
  on_shelf: number;
  capacity: number;
  units_needed: number;
  assigned_to: string | null;
  assigned_to_id: number | null;
}

interface Person {
  id: number;
  name: string;
  role: string;
}

/**
 * The refill queue.
 *
 * One list, filtered by who is looking, rather than three screens. The
 * coordinator sees everything and hands work out; staff see their own jobs
 * first because that is the only part they can act on; a manager sees the whole
 * board without being expected to work it.
 *
 * Ordered by how empty the shelf is, not by how long the job has been waiting:
 * an empty row is losing sales now, one just under its buffer is not.
 */
export default function RestockPage() {
  const { user, can } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      const list = await request<Task[]>(`${API_V1}/restock/tasks`);
      setTasks(list);
      if (can("restock:assign")) {
        setPeople(await request<Person[]>(`${API_V1}/restock/staff`));
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load the jobs.");
    } finally {
      setIsLoading(false);
    }
  }, [can]);

  useEffect(() => {
    void load();
  }, [load]);

  const act = async (taskId: number, action: () => Promise<unknown>) => {
    setBusy(taskId);
    setError(null);
    try {
      await action();
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "That did not work.");
    } finally {
      setBusy(null);
    }
  };

  const mine = tasks.filter((task) => task.assigned_to_id === user?.id);
  const others = tasks.filter((task) => task.assigned_to_id !== user?.id);

  return (
    <PageShell
      title="Refill jobs"
      subtitle={
        can("restock:assign")
          ? "Give each job to someone and check it off when it is done"
          : "Shelves that need filling"
      }
    >
      {error ? (
        <p className="shrink-0 rounded-xl bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {isLoading ? (
        <Loader2 className="m-auto h-6 w-6 animate-spin text-muted-foreground" />
      ) : tasks.length === 0 ? (
        <div className="rounded-2xl bg-card p-10 text-center">
          <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-success" aria-hidden />
          <p className="text-base font-semibold">Every shelf is stocked</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Jobs appear here on their own when a shelf runs low.
          </p>
        </div>
      ) : (
        <div className="scroll-slim min-h-0 flex-1 space-y-5 overflow-y-auto pr-1">
          {mine.length > 0 ? (
            <section>
              <h2 className="text-label mb-2.5 text-muted-foreground">
                Yours — {mine.length} to do
              </h2>
              <ul className="space-y-2.5">
                {mine.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    people={people}
                    canAssign={can("restock:assign")}
                    busy={busy === task.id}
                    highlight
                    onAssign={(id) =>
                      act(task.id, () =>
                        request(`${API_V1}/restock/tasks/${task.id}/assign`, {
                          method: "POST",
                          body: { assignee_id: id },
                        }),
                      )
                    }
                    onComplete={() =>
                      act(task.id, () =>
                        request(`${API_V1}/restock/tasks/${task.id}/complete`, { method: "POST" }),
                      )
                    }
                  />
                ))}
              </ul>
            </section>
          ) : null}

          <section>
            <h2 className="text-label mb-2.5 text-muted-foreground">
              {mine.length > 0 ? "Everything else" : `${others.length} job(s) waiting`}
            </h2>
            <ul className="space-y-2.5">
              {others.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  people={people}
                  canAssign={can("restock:assign")}
                  busy={busy === task.id}
                  onAssign={(id) =>
                    act(task.id, () =>
                      request(`${API_V1}/restock/tasks/${task.id}/assign`, {
                        method: "POST",
                        body: { assignee_id: id },
                      }),
                    )
                  }
                  onComplete={() =>
                    act(task.id, () =>
                      request(`${API_V1}/restock/tasks/${task.id}/complete`, { method: "POST" }),
                    )
                  }
                />
              ))}
            </ul>
          </section>
        </div>
      )}
    </PageShell>
  );
}

function TaskCard({
  task,
  people,
  canAssign,
  busy,
  highlight,
  onAssign,
  onComplete,
}: {
  task: Task;
  people: Person[];
  canAssign: boolean;
  busy: boolean;
  highlight?: boolean;
  onAssign: (assigneeId: number) => void;
  onComplete: () => void;
}) {
  const [picking, setPicking] = useState(false);
  const empty = task.on_shelf === 0;

  return (
    <li
      className={cn(
        "rounded-xl p-4",
        highlight ? "bg-brand-soft" : "bg-card",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-bold">{task.product_name}</span>
            {empty ? (
              <span className="rounded-full bg-destructive px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wide text-destructive-foreground">
                Shelf empty
              </span>
            ) : (
              <span className="rounded-full bg-warning/15 px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wide text-warning">
                Running low
              </span>
            )}
          </div>

          {/* Where to go, in the words a person would use walking there. */}
          <p className="mt-1 text-sm">
            {task.shelf_name} · <span className="font-semibold">row {task.row_position}</span>
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            <span className="tabular">{task.on_shelf}</span> on the shelf of{" "}
            <span className="tabular">{task.capacity}</span> · bring{" "}
            <span className="tabular font-semibold text-foreground">{task.units_needed}</span>
          </p>

          {task.assigned_to ? (
            <p className="mt-1.5 text-xs font-medium">
              Given to {task.assigned_to}
            </p>
          ) : null}
        </div>

        <div className="flex shrink-0 flex-col gap-1.5">
          {canAssign && !picking ? (
            <Button size="sm" variant="outline" onClick={() => setPicking(true)} disabled={busy}>
              <UserPlus className="h-3.5 w-3.5" aria-hidden />
              {task.assigned_to ? "Reassign" : "Give to…"}
            </Button>
          ) : null}
          <Button size="sm" onClick={onComplete} disabled={busy}>
            {busy ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
            ) : (
              <PackageOpen className="h-3.5 w-3.5" aria-hidden />
            )}
            Done
          </Button>
        </div>
      </div>

      {picking ? (
        <div className="mt-3 flex flex-wrap gap-1.5 border-t border-border pt-3">
          {people.map((person) => (
            <button
              key={person.id}
              type="button"
              onClick={() => {
                setPicking(false);
                onAssign(person.id);
              }}
              className="rounded-lg bg-secondary px-3 py-1.5 text-xs font-semibold transition-colors hover:bg-accent"
            >
              {person.name}
              <span className="ml-1.5 font-normal capitalize text-muted-foreground">
                {person.role}
              </span>
            </button>
          ))}
          <button
            type="button"
            onClick={() => setPicking(false)}
            className="rounded-lg px-3 py-1.5 text-xs text-muted-foreground hover:bg-accent"
          >
            Cancel
          </button>
        </div>
      ) : null}
    </li>
  );
}
