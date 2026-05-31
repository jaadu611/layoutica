# Layoutica

A professional Visual Website Builder for modern web development. Build layouts visually and export clean, production-ready React + Tailwind CSS code instantly.

## Features

### Visual Design Canvas (Frontend)
- Figma-inspired Editor: A high-performance canvas to design layouts with precision.
- Precision Styling: Control over typography, spacing, layouts (Flexbox & Grid), glassmorphism, and gradients.
- Hover & Active States: Craft interactive elements with dedicated state-based styling.
- Rich Element Library: Over 40+ semantic elements including sections, navbars, cards, media, and interactive buttons.
- Reusable Components: Save any designed element as a custom component and reuse it across multiple pages.
- Textarea Editing: Restored multi-line textarea editing for all text-bearing elements.

### Node-based Architecture Mapper (Backend)
- File & Module Mapping: Design project module structures visually with nodes representing files/folders.
- Imports/Exports Visualization: Visual connection lines with mid-point hover disconnection actions and direction indicators.
- Orphan File Detection: Warns and visualizes orphan modules lacking import/export connections.
- Color Tagging: Customize node border colors using a native popover color picker.
- Folder BADGE Count: Folder nodes show exact file counts instead of generic placeholders.

### Developer Experience & VS Code Integration
- Workspace Sync: Files are written directly to your VS Code workspace in real-time as you design.
- Dual-Canvas Persistence: Generates clean `workspace.json` (for backend engines) and saves full UI states to `layout.json` (backend) and `ui_layout.json` (frontend).
- Zero-Config Hydration: Instantly resumes and hydrates project states from JSON files on VS Code reload, bypassing configuration prompts.
- Undo/Redo & Shortcuts: Robust 50-step history tracking only essential changes (ignoring minor layout drags) and canvas duplicate shortcuts.

## Tech Stack

- Framework: Next.js 16 (App Router)
- State Management: Zustand
- Styling: Tailwind CSS 4
- Icons: Lucide React
- Animations: GSAP
- Programming: TypeScript

## Getting Started

1. Clone & Install
```bash
git clone https://github.com/your-username/layoutica.git
cd layoutica
npm install
```

2. Launch Development Server
```bash
npm run dev
```

Open http://localhost:3000 with your browser to start building.

## How to Use

1. Add Elements: Select elements from the side menu to add them to the canvas.
2. Style Elements: Click any element to open the Properties Panel for customization.
3. Manage Pages: Use the toolbar to create or switch between pages.
4. Export Work: Click Export Code to view the generated source code.
5. Save Project: Download a project file to save your work for future sessions.

---

Built by Jaadu
