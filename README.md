# Layoutica

> **Visual Next.js & Tailwind CSS Website Builder Extension for VS Code**  
> Craft responsive web layouts visually and export clean, production-ready React + Tailwind CSS code instantly.

[![GitHub license](https://img.shields.io/github/license/jaadu611/layoutica)](https://github.com/jaadu611/layoutica)
[![GitHub stars](https://img.shields.io/github/stars/jaadu611/layoutica)](https://github.com/jaadu611/layoutica/stargazers)
[![VS Code Extension](https://img.shields.io/badge/VS%20Code-Extension-blue.svg)](https://github.com/jaadu611/layoutica)

---

## Overview

Layoutica brings visual design directly into your VS Code development workflow. Create pixel-perfect Next.js web applications, build responsive sections with CSS Flexbox & Grid, configure design tokens, simulate layout reflow across breakpoints, and export clean, production-grade React components with zero lock-in.

---

## Features

### Visual Design Canvas
- **Figma-Inspired Editor**: High-performance canvas designed for fluid manipulation and precision layouts.
- **Modern Styling System**: Full control over typography, flex layouts, gap, padding, borders, backdrop blur (glassmorphism), and multi-stop gradient backgrounds.
- **Interactive State Styles**: Dedicated editors for `:hover`, `:active`, and `:focus` states.
- **Semantic Element Library**: Over 40+ semantic components including sections, navbars, cards, buttons, badges, lists, tables, and media.
- **Reusable Component Architecture**: Save any element tree as a reusable custom component across your site pages.
- **Direct Content Editing**: In-place typography and multiline textarea editing for text, headings, and buttons.

### Responsive Design & Preview
- **Multi-Device Breakpoints**: Instant switching between Desktop (1440px), Laptop (1024px), Tablet (768px), and Mobile (390px).
- **Reflow Simulator**: Interactive container query and responsive stress-testing modal.
- **Live In-Browser Preview**: One-click local HTTP server to preview your site natively in Chrome or Firefox.

### Developer Experience & Code Generation
- **Clean React + Tailwind Export**: Exports pure, idiomatic TypeScript JSX and Tailwind utility classes.
- **Workspace File Sync**: Automatically synchronizes generated pages and components with your project directory.
- **Zero-Lockin JSON State**: Hydrate and resume projects seamlessly with `.layoutica/ui_layout.json`.
- **50-Step Undo / Redo**: Robust history stack with keyboard shortcuts (`Cmd/Ctrl + Z`, `Cmd/Ctrl + Shift + Z`).

---

## Tech Stack

- **Framework**: Next.js (App Router) & React 19
- **Extension Runtime**: VS Code Extension API
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Icons**: Lucide React
- **Animations**: GSAP
- **Language**: TypeScript

---

## Getting Started

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/jaadu611/layoutica.git
cd layoutica
npm install
```

### 2. Run the Development Server
```bash
npm run dev
```
Open `http://localhost:3000` in your browser.

### 3. Build Extension / Webview Bundle
```bash
npm run build
```

---

## How to Use

1. **Add Elements**: Select components from the left sidebar to add them to your canvas.
2. **Style & Customize**: Click any element to customize styles, layout, typography, borders, and colors in the Properties Panel.
3. **Manage Pages**: Create, rename, or switch between pages from the toolbar.
4. **Preview in Browser**: Click the Globe preview icon to view the live site in your browser.
5. **Export Code**: Click **Export Code** to copy or write out React + Tailwind components.

---

## License

MIT © [jaadu611](https://github.com/jaadu611)
