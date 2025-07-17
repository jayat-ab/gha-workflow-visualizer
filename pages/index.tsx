import React, { useState } from "react";
import YAML from "js-yaml";
import dynamic from "next/dynamic";

const Mermaid = dynamic(() => import("../components/Mermaid"), { ssr: false });

export default function Home() {
  const [yamlInput, setYamlInput] = useState("");
  const [diagram, setDiagram] = useState("");

  function handleYamlChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setYamlInput(e.target.value);
  }

  function handleVisualize() {
    try {
      const workflow = YAML.load(yamlInput);
      const graph = generateMermaid(workflow);
      setDiagram(graph);
    } catch (err) {
      setDiagram("%% Error parsing YAML");
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