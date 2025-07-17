import React, { useState } from "react";
import YAML from "js-yaml";
import dynamic from "next/dynamic";

const Mermaid = dynamic(() => import("../components/Mermaid"), { ssr: false });

type StepDetail = {
  name?: string;
  uses?: string;
  run?: string;
};

type JobSteps = {
  jobName: string;
  steps: StepDetail[];
};

type TriggerDetail = {
  event: string;
  details?: string;
  detailsObj?: any;
};

const triggerExamples: Record<string, string> = {
  push: "When code is pushed to the repository.",
  pull_request: "When a pull request is opened or updated.",
  schedule: "On a schedule (see cron expression below).",
  issue_comment: "When someone comments on an issue.",
  workflow_dispatch: "Manual trigger from the GitHub UI.",
  workflow_call: "Called by another workflow.",
  release: "When a release is published, edited, or deleted.",
};

function formatTriggerDetail(event: string, detail: any): React.ReactNode {
  if (!detail || typeof detail !== "object") return null;
  if (event === "push" || event === "pull_request") {
    const items: React.ReactNode[] = [];
    if (detail.branches) {
      items.push(<li key="branches">Branches: <code>{detail.branches.join(", ")}</code></li>);
    }
    if (detail.paths) {
      items.push(<li key="paths">Paths: <code>{detail.paths.join(", ")}</code></li>);
    }
    if (detail.types) {
      items.push(<li key="types">Types: <code>{detail.types.join(", ")}</code></li>);
    }
    return <ul style={{ margin: 0, paddingLeft: 20 }}>{items}</ul>;
  }
  if (event === "issue_comment" || event === "release") {
    if (detail.types) {
      return <ul style={{ margin: 0, paddingLeft: 20 }}><li>Types: <code>{detail.types.join(", ")}</code></li></ul>;
    }
  }
  if (event === "schedule" && Array.isArray(detail)) {
    return (
      <ul style={{ margin: 0, paddingLeft: 20 }}>
        {detail.map((sched: any, idx: number) =>
          <li key={idx}>Cron: <code>{sched.cron}</code></li>
        )}
      </ul>
    );
  }
  return <pre style={{ background: "#f8f8fa", padding: 8, borderRadius: 5 }}>{JSON.stringify(detail, null, 2)}</pre>;
}

function TriggersList({ triggers }: { triggers: TriggerDetail[] }) {
  return (
    <section
      style={{
        background: "#fff",
        borderRadius: 12,
        boxShadow: "0 2px 6px rgba(0,0,0,0.04)",
        padding: "24px 32px",
        marginBottom: 32,
        border: "1px solid #ececec",
      }}
    >
      <h2 style={{ marginTop: 0, fontSize: "1.4rem", borderBottom: "2px solid #eaeaea", paddingBottom: 8 }}>Workflow Triggers</h2>
      <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {triggers.map((trigger, i) => (
          <li key={i} style={{ marginBottom: 20, paddingBottom: 14, borderBottom: "1px solid #f3f3f3" }}>
            <span style={{ fontWeight: 600, fontSize: "1.08rem" }}>{trigger.event}</span>
            <div style={{ fontStyle: "italic", color: "#555", marginTop: 2 }}>
              {triggerExamples[trigger.event] || "Triggered by event: " + trigger.event}
            </div>
            {trigger.detailsObj && (
              <div style={{ marginLeft: 18, marginTop: 4 }}>{formatTriggerDetail(trigger.event, trigger.detailsObj)}</div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

function JobStepsList({ jobSteps }: { jobSteps: JobSteps[] }) {
  return (
    <section
      style={{
        background: "#fff",
        borderRadius: 12,
        boxShadow: "0 2px 6px rgba(0,0,0,0.04)",
        padding: "24px 32px",
        marginBottom: 32,
        border: "1px solid #ececec",
      }}
    >
      <h2 style={{ marginTop: 0, fontSize: "1.4rem", borderBottom: "2px solid #eaeaea", paddingBottom: 8 }}>Job Step Details</h2>
      {jobSteps.map(({ jobName, steps }) => (
        <div key={jobName} style={{ marginBottom: 28 }}>
          <h3 style={{ marginBottom: 8, fontWeight: 500, fontSize: "1.1rem" }}>{jobName}</h3>
          <table style={{
            width: "100%",
            borderCollapse: "collapse",
            background: "#fafafc",
            borderRadius: 7,
            overflow: "hidden",
            boxShadow: "0 1px 3px rgba(0,0,0,0.03)"
          }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", borderBottom: "2px solid #ececec", padding: "8px 10px" }}>Step Name</th>
                <th style={{ textAlign: "left", borderBottom: "2px solid #ececec", padding: "8px 10px" }}>Uses</th>
                <th style={{ textAlign: "left", borderBottom: "2px solid #ececec", padding: "8px 10px" }}>Run</th>
              </tr>
            </thead>
            <tbody>
              {steps.map((step, i) => (
                <tr key={i}>
                  <td style={{ padding: "7px 10px", borderBottom: "1px solid #f1f1f1" }}>{step.name || <i>(unnamed)</i>}</td>
                  <td style={{ padding: "7px 10px", borderBottom: "1px solid #f1f1f1" }}>{step.uses || ""}</td>
                  <td style={{ padding: "7px 10px", borderBottom: "1px solid #f1f1f1" }}>{step.run || ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </section>
  );
}

export default function Home() {
  const [yamlInput, setYamlInput] = useState("");
  const [diagram, setDiagram] = useState("");
  const [jobSteps, setJobSteps] = useState<JobSteps[]>([]);
  const [triggers, setTriggers] = useState<TriggerDetail[]>([]);

  function handleYamlChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setYamlInput(e.target.value);
  }

  function handleVisualize() {
    try {
      const workflow = YAML.load(yamlInput);
      const graph = generateMermaid(workflow);
      setDiagram(graph);
      setJobSteps(extractJobSteps(workflow));
      setTriggers(extractTriggers(workflow));
    } catch (err) {
      setDiagram("%% Error parsing YAML");
      setJobSteps([]);
      setTriggers([]);
    }
  }

  function handleClear() {
    setYamlInput("");
    setDiagram("");
    setJobSteps([]);
    setTriggers([]);
  }

  return (
    <>
      {/* Professional font - Inter from Google Fonts */}
      <link
        href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
        rel="stylesheet"
      />
      <main
        style={{
          fontFamily: "'Inter', Arial, Helvetica, sans-serif",
          background: "#f6f8fa",
          minHeight: "100vh",
          padding: 0,
        }}
      >
        <div style={{ maxWidth: 900, margin: "auto", padding: 32 }}>
          <h1 style={{
            fontWeight: 700,
            fontSize: "2.05rem",
            letterSpacing: "-1px",
            marginBottom: 10,
            color: "#1d232a"
          }}>
            GitHub Actions Workflow Visualizer
          </h1>
          <textarea
            value={yamlInput}
            onChange={handleYamlChange}
            rows={12}
            style={{
              width: "100%",
              marginBottom: 12,
              fontFamily: "inherit",
              fontSize: "1.07rem",
              border: "1px solid #e3e8ee",
              borderRadius: 8,
              padding: "13px 16px",
              background: "#f9fafb",
              color: "#20232a",
              boxShadow: "0 0.5px 2px rgba(0,0,0,0.03)"
            }}
            placeholder="Paste your GitHub Actions workflow YAML here..."
          />
          <div style={{ display: "flex", gap: 10, marginBottom: 18, marginTop: 2 }}>
            <button
              onClick={handleVisualize}
              style={{
                padding: "9px 22px",
                fontWeight: 500,
                fontSize: "1rem",
                background: "#3167e0",
                color: "#fff",
                border: "none",
                borderRadius: 7,
                boxShadow: "0 2px 6px rgba(49,103,224,0.09)",
                cursor: "pointer"
              }}
            >
              Visualize Workflow
            </button>
            <button
              onClick={handleClear}
              style={{
                padding: "9px 22px",
                fontWeight: 500,
                fontSize: "1rem",
                background: "#f3f4f7",
                color: "#3167e0",
                border: "1px solid #e3e8ee",
                borderRadius: 7,
                cursor: "pointer"
              }}
            >
              Clear
            </button>
          </div>
          <div style={{ marginTop: 8 }}>
            {triggers.length > 0 && <TriggersList triggers={triggers} />}
            {diagram && (
              <section
                style={{
                  background: "#fff",
                  borderRadius: 12,
                  boxShadow: "0 2px 6px rgba(0,0,0,0.04)",
                  padding: "24px 32px",
                  marginBottom: 32,
                  border: "1px solid #ececec",
                }}
              >
                <h2 style={{
                  marginTop: 0,
                  fontSize: "1.4rem",
                  borderBottom: "2px solid #eaeaea",
                  paddingBottom: 8,
                  marginBottom: 20
                }}>Workflow Diagram</h2>
                <div>
                  <Mermaid chart={diagram} />
                </div>
              </section>
            )}
            {jobSteps.length > 0 && <JobStepsList jobSteps={jobSteps} />}
            {/* Future features can go here! */}
          </div>
        </div>
      </main>
    </>
  );
}

function generateMermaid(workflow: any): string {
  if (!workflow || !workflow.jobs) return "%% Invalid workflow";
  let graph = "graph TD\n";
  for (const [jobName, jobDefRaw] of Object.entries(workflow.jobs)) {
    const jobDef = jobDefRaw as { needs?: string | string[] };
    if (jobDef.needs) {
      const needs = Array.isArray(jobDef.needs) ? jobDef.needs : [jobDef.needs];
      needs.forEach((need: string) => {
        graph += `  ${need} --> ${jobName}\n`;
      });
    } else {
      graph += `  ${jobName}\n`;
    }
  }
  return graph;
}

function extractJobSteps(workflow: any): JobSteps[] {
  if (!workflow || !workflow.jobs) return [];
  const result: JobSteps[] = [];
  for (const [jobName, jobDef] of Object.entries<any>(workflow.jobs)) {
    const steps: StepDetail[] = [];
    if (Array.isArray(jobDef.steps)) {
      for (const step of jobDef.steps) {
        steps.push({
          name: step.name,
          uses: step.uses,
          run: step.run,
        });
      }
    }
    result.push({ jobName, steps });
  }
  return result;
}

function extractTriggers(workflow: any): TriggerDetail[] {
  if (!workflow || !workflow.on) return [];
  const triggers: TriggerDetail[] = [];
  const on = workflow.on;
  if (Array.isArray(on)) {
    on.forEach((evt: string) => triggers.push({ event: evt }));
  } else if (typeof on === "object") {
    Object.entries(on).forEach(([event, detail]) => {
      if (detail === null || detail === undefined || detail === "") {
        triggers.push({ event });
      } else if (typeof detail === "object") {
        triggers.push({
          event,
          details: "",
          detailsObj: detail,
        });
      } else {
        triggers.push({ event, details: String(detail) });
      }
    });
  } else if (typeof on === "string") {
    triggers.push({ event: on });
  }
  return triggers;
}