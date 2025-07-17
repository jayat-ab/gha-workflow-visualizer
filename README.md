# GitHub Actions Workflow Visualizer

A web app to visualize GitHub Actions workflow dependencies using Mermaid diagrams.

## Features

- Paste your GitHub Actions workflow YAML
- Instantly see a Mermaid diagram of job dependencies
- Built with Next.js, React, Mermaid, and js-yaml

## Getting Started

### Prerequisites

- Node.js (v18+ recommended)
- npm

### Installation

```bash
git clone https://github.com/yourusername/github-actions-visualizer.git
cd github-actions-visualizer
npm install
```

### Running Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

1. Paste your GitHub Actions workflow YAML into the textarea.
2. Click **Visualize Workflow**.
3. View the generated Mermaid diagram showing job dependencies.

## Project Structure

```
components/
  Mermaid.tsx         # Renders Mermaid diagrams
pages/
  index.tsx           # Main UI for workflow input and visualization
allfiles.txt          # List of project files (for reference)
next-env.d.ts         # Next.js TypeScript environment
package.json          # Project dependencies and scripts
tsconfig.json         # TypeScript configuration
README.md             # Project documentation
LICENSE               # Apache 2.0 License
```

## Technologies Used

- [Next.js](https://nextjs.org/)
- [React](https://react.dev/)
- [Mermaid](https://mermaid-js.github.io/)
- [js-yaml](https://github.com/nodeca/js-yaml)
- TypeScript

## License

Apache 2.0. See [LICENSE](LICENSE).

---

**Contributions welcome!**  
Feel free to open issues or pull 
