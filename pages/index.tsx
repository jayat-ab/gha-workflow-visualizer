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

export default function Home() {
  const [yamlInput, setYamlInput] = useState("");
  const [diagram, setDiagram] = useState("");
  const [jobSteps, setJobSteps] = useState<JobSteps[]>([]);

  function handleYamlChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setYamlInput(e.target.value);
  }

  function handleVisualize() {
    try {
      const workflow = YAML.load(yamlInput);
      const graph = generateMermaid(workflow);
      setDiagram(graph);
      setJobSteps(extractJobSteps(workflow));
    } catch (err) {
      setDiagram("%% Error parsing YAML");
      setJobSteps([]);
    }
  }

  return (
    <main style={{ padding: 24, maxWidth: 800, margin: "auto" }}>
      <h1>GitHub Actions Workflow Visualizer</h1>
      <textarea
        value={yamlInput}
        onChange={handleYamlChange}
        rows={12}
        style={{ width: "100%", marginBottom: 12 }}
        placeholder="Paste your GitHub Actions workflow YAML here..."
      />
      <button onClick={handleVisualize}>Visualize Workflow</button>
      <div style={{ marginTop: 24 }}>
        {diagram && <Mermaid chart={diagram} />}
      </div>
      <div style={{ marginTop: 32 }}>
        {jobSteps.length > 0 && <JobStepsList jobSteps={jobSteps} />}
      </div>
    </main>
  );
}

// Helper: Convert workflow object to Mermaid graph
function generateMermaid(workflow: any): string {
  if (!workflow || !workflow.jobs) return "%% Invalid workflow";
  let graph = "graph TD\n";
  for (const [jobName, jobDef] of Object.entries(workflow.jobs)) {
    const job = jobDef as { needs?: string | string[] };
    if (job.needs) {
      const needs = Array.isArray(job.needs) ? job.needs : [job.needs];
      needs.forEach((need: string) => {
        graph += `  ${need} --> ${jobName}\n`;
      });
    } else {
      graph += `  ${jobName}\n`;
    }
  }
  return graph;
}

// Extract steps for each job
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

// UI for job steps
function JobStepsList({ jobSteps }: { jobSteps: JobSteps[] }) {
  return (
    <section>
      <h2>Job Step Details</h2>
      {jobSteps.map(({ jobName, steps }) => (
        <div key={jobName} style={{ marginBottom: 24 }}>
          <h3 style={{ marginBottom: 8 }}>{jobName}</h3>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", borderBottom: "1px solid #ccc" }}>Step Name</th>
                <th style={{ textAlign: "left", borderBottom: "1px solid #ccc" }}>Uses</th>
                <th style={{ textAlign: "left", borderBottom: "1px solid #ccc" }}>Run</th>
              </tr>
            </thead>
            <tbody>
              {steps.map((step, i) => (
                <tr key={step.name || `${jobName}-${i}`}>
                  <td>{step.name || <span aria-label="Unnamed step" style={{ fontStyle: "italic" }}>(unnamed)</span>}</td>
                  <td>{step.uses || ""}</td>
                  <td>{step.run || ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </section>
  );
}