# Visual Builder

A Figma-like visual website builder that exports clean React + Tailwind CSS code.

## Setup

### 1. Install dependencies

```bash
npm install zustand
```

### 2. Drop files into your Next.js project

```
your-nextjs-app/
├── app/
│   └── page.tsx
├── components/
│   └── builder/
│       ├── Canvas.tsx
│       ├── Sidebar.tsx
│       ├── Toolbar.tsx
│       ├── PropertiesPanel.tsx
│       └── CodeExportModal.tsx
└── lib/
    └── builder/
        ├── types.ts
        ├── store.ts
        └── codeGenerator.ts
```

### 3. Make sure Tailwind is set up

Your `tailwind.config.ts` should include:

```js
content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"];
```

### 4. Run

```bash
npm run dev
```

---

## How it works

- **Left panel** — Click any element to add it to the canvas
- **Canvas** — Click any element to select it, hover to see controls
- **Right panel** — Edit the selected element's content, styles, layout
- **Pages tab** — Add/rename/delete pages
- **Export Code** — Generates production-ready React + Tailwind files for all pages
