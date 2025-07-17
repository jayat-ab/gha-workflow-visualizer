import React, { useState } from "react";
import YAML from "js-yaml";
import dynamic from "next/dynamic";
import Head from "next/head";

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

// --------- Connect to GitHub Repo (Public or Token) ---------
function RepoWorkflowSection({
  onWorkflowLoaded,
}: {
  onWorkflowLoaded: (yaml: string) => void;
}) {
  const [repoUrl, setRepoUrl] = useState("");
  const [token, setToken] = useState("");
  const [workflows, setWorkflows] = useState<{ name: string; path: string }[]>([]);
  const [selectedWorkflow, setSelectedWorkflow] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  type GitHubFile = {
    name: string;
    path: string;
    type: string;
    [key: string]: any;
  };

  function parseRepoInfo(url: string) {
    url = url.replace(/\.git$/, "");
    const match = url.match(/github\.com[:\/]([^\/]+)\/([^\/]+)(\/)?/i);
    if (!match) return null;
    return { owner: match[1], repo: match[2] };
  }

  async function handleFetchWorkflows() {
    setError("");
    setWorkflows([]);
    setSelectedWorkflow("");
    const info = parseRepoInfo(repoUrl);
    if (!info) {
      setError("Invalid GitHub repository URL.");
      return;
    }
    setLoading(true);
    try {
      const apiUrl = `https://api.github.com/repos/${info.owner}/${info.repo}/contents/.github/workflows`;
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const resp = await fetch(apiUrl, { headers });
      if (!resp.ok) {
        if (resp.status === 404) {
          throw new Error("No workflows found or repository does not exist.");
        } else if (resp.status === 401 || resp.status === 403) {
          throw new Error("Authentication failed or you do not have permission to access this repository.");
        } else {
          throw new Error(`Failed to fetch workflows. HTTP status: ${resp.status}`);
        }
      }
      const files = await resp.json();
      const ymls = files
        .filter((f: GitHubFile) =>
          (f.type === "file") &&
          (f.name.endsWith(".yml") || f.name.endsWith(".yaml"))
        )
        .map((f: GitHubFile) => ({ name: f.name, path: f.path }));
      if (ymls.length === 0) throw new Error("No workflow files found in this repo.");
      setWorkflows(ymls);
    } catch (err: any) {
      setError(err.message || "Unknown error fetching workflows.");
    } finally {
      setLoading(false);
    }
  }

  async function handleLoadSelectedWorkflow() {
    setError("");
    const info = parseRepoInfo(repoUrl);
    if (!info || !selectedWorkflow) {
      setError("Invalid repo or workflow selection.");
      return;
    }
    setLoading(true);
    try {
      const apiUrl = `https://api.github.com/repos/${info.owner}/${info.repo}/contents/${selectedWorkflow}`;
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const resp = await fetch(apiUrl, { headers });
      if (!resp.ok) {
        if (resp.status === 404) {
          throw new Error("Workflow file not found (404).");
        } else if (resp.status === 401 || resp.status === 403) {
          throw new Error("Authentication or permission issue (401/403).");
        } else {
          throw new Error(`Failed to fetch workflow file (status: ${resp.status}).`);
        }
      }

      let yaml: string;
      const text = await resp.text();
      try {
        const file = JSON.parse(text);
        if (!file.content) throw new Error("Workflow file has no content.");
        yaml = atob(file.content.replace(/\n/g, ""));
      } catch (err) {
        yaml = text;
      }
      onWorkflowLoaded(yaml);
    } catch (err: any) {
      setError(err.message || "Unknown error loading workflow.");
    } finally {
      setLoading(false);
    }
  }

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
      <h2 style={{ marginTop: 0, fontSize: "1.4rem", borderBottom: "2px solid #eaeaea", paddingBottom: 8 }}>
        Connect to GitHub Repo
      </h2>
      <div style={{ marginBottom: 10 }}>
        <input
          type="text"
          value={repoUrl}
          onChange={e => setRepoUrl(e.target.value)}
          placeholder="Paste GitHub repo URL (e.g. https://github.com/owner/repo)"
          style={{
            width: "55%",
            padding: "9px 12px",
            fontSize: "1rem",
            borderRadius: 7,
            border: "1px solid #e3e8ee",
            background: "#f9fafb",
            marginRight: 10,
            fontFamily: "inherit"
          }}
        />
        <input
          type="password"
          value={token}
          onChange={e => setToken(e.target.value)}
          placeholder="Personal Access Token (optional for private repos)"
          style={{
            width: "35%",
            padding: "9px 12px",
            fontSize: "1rem",
            borderRadius: 7,
            border: "1px solid #e3e8ee",
            background: "#f9fafb",
            fontFamily: "inherit"
          }}
        />
      </div>
      <div style={{ fontSize: "0.95rem", color: "#888", marginBottom: 10 }}>
        For private repositories, enter a GitHub Personal Access Token with <code>repo</code> scope. Your token is only used in your browser.
      </div>
      <div style={{ marginBottom: 18 }}>
        <button
          onClick={handleFetchWorkflows}
          disabled={loading}
          style={{
            padding: "9px 20px",
            fontWeight: 500,
            fontSize: "1rem",
            background: "#3167e0",
            color: "#fff",
            border: "none",
            borderRadius: 7,
            cursor: "pointer"
          }}
        >
          {loading ? "Loading..." : "Fetch Workflows"}
        </button>
      </div>
      {error && <div style={{ color: "#c00", marginBottom: 14 }}>{error}</div>}
      {workflows.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontWeight: 500, marginRight: 8 }}>Select Workflow File:</label>
          <select
            value={selectedWorkflow}
            onChange={e => setSelectedWorkflow(e.target.value)}
            style={{
              padding: "8px 12px",
              fontSize: "1rem",
              borderRadius: 7,
              border: "1px solid #e3e8ee",
              background: "#f9fafb",
              fontFamily: "inherit",
              marginRight: 10,
            }}
          >
            <option value="">-- Choose --</option>
            {workflows.map(f => (
              <option key={f.path} value={f.path}>{f.name}</option>
            ))}
          </select>
          <button
            onClick={handleLoadSelectedWorkflow}
            disabled={loading || !selectedWorkflow}
            style={{
              padding: "8px 16px",
              fontWeight: 500,
              fontSize: "1rem",
              background: "#1ca772",
              color: "#fff",
              border: "none",
              borderRadius: 7,
              cursor: "pointer"
            }}
          >
            {loading ? "Loading..." : "Load Selected Workflow"}
          </button>
        </div>
      )}
    </section>
  );
}

// ------ Export helpers ------
function exportSVG(svgContent: string, filename?: string) {
  const blob = new Blob([svgContent], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename || `workflow-diagram-${Date.now()}.svg`;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
}

export default function Home() {
  const [yamlInput, setYamlInput] = useState("");
  const [diagram, setDiagram] = useState("");
  const [jobSteps, setJobSteps] = useState<JobSteps[]>([]);
  const [triggers, setTriggers] = useState<TriggerDetail[]>([]);
  const [error, setError] = useState<string>("");
  const [svgExport, setSvgExport] = useState<string>("");

  function handleYamlChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setYamlInput(e.target.value);
  }

  function handleVisualize() {
    try {
      const workflow = YAML.load(yamlInput);
      const graph = generateMermaid(workflow);
      if (graph.startsWith("graph ")) {
        setDiagram(graph);
        setError("");
      } else {
        setDiagram("");
        setError("Could not visualize workflow: Invalid or missing jobs section in YAML.");
      }
      setJobSteps(extractJobSteps(workflow));
      setTriggers(extractTriggers(workflow));
    } catch (err: any) {
      setDiagram("");
      setJobSteps([]);
      setTriggers([]);
      setError("Error parsing YAML: " + (err?.message ?? "Unknown error"));
    }
  }

  function handleClear() {
    setYamlInput("");
    setDiagram("");
    setJobSteps([]);
    setTriggers([]);
    setError("");
    setSvgExport("");
  }

  function handleWorkflowLoaded(yaml: string) {
    setYamlInput(yaml);
    setDiagram("");
    setJobSteps([]);
    setTriggers([]);
    setError("");
    setSvgExport("");
  }

  function handleExportSVG() {
    if (!svgExport) return;
    exportSVG(svgExport);
  }

  return (
    <>
      <Head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </Head>
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
          <RepoWorkflowSection onWorkflowLoaded={handleWorkflowLoaded} />
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
            {error && (
              <section
                style={{
                  color: "#c00",
                  background: "#fff8f8",
                  borderRadius: 8,
                  padding: 16,
                  marginBottom: 24,
                  border: "1px solid #ffbaba",
                }}
              >
                <strong>{error}</strong>
              </section>
            )}
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
                  <Mermaid chart={diagram} onExportReady={setSvgExport} />
                </div>
                <div style={{ marginTop: 18, display: "flex", gap: 16 }}>
                  <button
                    onClick={handleExportSVG}
                    disabled={!svgExport}
                    style={{
                      padding: "7px 18px",
                      fontWeight: 500,
                      fontSize: "1rem",
                      background: "#2c5aa0",
                      color: "#fff",
                      border: "none",
                      borderRadius: 7,
                      cursor: "pointer"
                    }}
                  >
                    Export as SVG
                  </button>
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
  if (!workflow || !workflow.jobs || Object.keys(workflow.jobs).length === 0) return "";
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