# GitHub Actions Workflow Visualizer

A web app to visualize GitHub Actions workflow dependencies using Mermaid diagrams.

## Features

- Paste your GitHub Actions workflow YAML
- Instantly see a Mermaid diagram of job dependencies
- Built with Next.js, React, Mermaid, and js-yaml
- Automated releases with GitHub Actions

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
.github/
  workflows/
    release.yml       # Automated release workflow
```

## Release Workflow

This project uses GitHub Actions for automated releases:

- On every push to `main`, the workflow:
  - Installs dependencies
  - Runs `npm run release` (using [standard-version](https://github.com/conventional-changelog/standard-version))
  - Pushes version bumps and tags
  - Publishes a GitHub Release with the changelog

See [`.github/workflows/release.yml`](.github/workflows/release.yml) for details.

## Technologies Used

- [Next.js](https://nextjs.org/)
- [React](https://react.dev/)
- [Mermaid](https://mermaid-js.github.io/)
- [js-yaml](https://github.com/nodeca/js-yaml)
- [standard-version](https://github.com/conventional-changelog/standard-version)
- TypeScript

## License

Apache 2.0. See [LICENSE](LICENSE).

---

**Contributions welcome!**  
Feel free to open issues or pull requests.
