import { Page } from "./types";

const NAV_LINK_STYLE = {
  color: "rgba(255, 255, 255, 0.7)",
  fontSize: "13px",
  fontWeight: "500",
  textDecoration: "none",
  padding: "6px 12px",
  borderRadius: "6px",
  cursor: "pointer",
  transition: "color 0.2s, background-color 0.2s",
};

const createNavbar = (prefix: string, activePath: string) => ({
  id: `${prefix}-navbar`,
  type: "header",
  metadata: { name: "Navbar Header" },
  styles: {
    backgroundColor: "rgba(18, 18, 20, 0.85)",
    backdropFilter: "blur(16px)",
    borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
    padding: "0px 32px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    height: "64px",
    width: "100%",
    position: "sticky",
    top: "0px",
    zIndex: 40,
    boxSizing: "border-box",
  },
  children: [
    {
      id: `${prefix}-nav-brand`,
      type: "link",
      content: "✦ Layoutica",
      href: "/",
      metadata: { name: "Brand Logo" },
      styles: {
        fontSize: "17px",
        fontWeight: "800",
        color: "#ffffff",
        textDecoration: "none",
        letterSpacing: "-0.02em",
        display: "flex",
        alignItems: "center",
        gap: "8px",
      },
    },
    {
      id: `${prefix}-nav-links`,
      type: "nav",
      metadata: { name: "Nav Links" },
      styles: {
        display: "flex",
        alignItems: "center",
        gap: "6px",
      },
      children: [
        {
          id: `${prefix}-nav-home`,
          type: "link",
          content: "Home",
          href: "/",
          metadata: { name: "Nav Link Home" },
          styles: {
            ...NAV_LINK_STYLE,
            color: activePath === "/" ? "#ffffff" : "rgba(255, 255, 255, 0.7)",
            backgroundColor: activePath === "/" ? "rgba(255, 255, 255, 0.08)" : "transparent",
          },
        },
        {
          id: `${prefix}-nav-features`,
          type: "link",
          content: "Features",
          href: "/features",
          metadata: { name: "Nav Link Features" },
          styles: {
            ...NAV_LINK_STYLE,
            color: activePath === "/features" ? "#ffffff" : "rgba(255, 255, 255, 0.7)",
            backgroundColor: activePath === "/features" ? "rgba(255, 255, 255, 0.08)" : "transparent",
          },
        },
        {
          id: `${prefix}-nav-pricing`,
          type: "link",
          content: "Pricing",
          href: "/pricing",
          metadata: { name: "Nav Link Pricing" },
          styles: {
            ...NAV_LINK_STYLE,
            color: activePath === "/pricing" ? "#ffffff" : "rgba(255, 255, 255, 0.7)",
            backgroundColor: activePath === "/pricing" ? "rgba(255, 255, 255, 0.08)" : "transparent",
          },
        },
        {
          id: `${prefix}-nav-about`,
          type: "link",
          content: "About",
          href: "/about",
          metadata: { name: "Nav Link About" },
          styles: {
            ...NAV_LINK_STYLE,
            color: activePath === "/about" ? "#ffffff" : "rgba(255, 255, 255, 0.7)",
            backgroundColor: activePath === "/about" ? "rgba(255, 255, 255, 0.08)" : "transparent",
          },
        },
      ],
    },
    {
      id: `${prefix}-nav-cta`,
      type: "button",
      content: "Get Started Free",
      href: "/pricing",
      metadata: { name: "Nav CTA Button" },
      styles: {
        backgroundColor: "#0d99ff",
        color: "#ffffff",
        fontSize: "12px",
        fontWeight: "600",
        padding: "8px 16px",
        borderRadius: "8px",
        border: "none",
        cursor: "pointer",
        textDecoration: "none",
        display: "inline-block",
        transition: "background-color 0.2s",
      },
    },
  ],
});

const createFooter = (prefix: string) => ({
  id: `${prefix}-footer`,
  type: "footer",
  metadata: { name: "Site Footer" },
  styles: {
    backgroundColor: "#0d0d0f",
    borderTop: "1px solid rgba(255, 255, 255, 0.06)",
    padding: "48px 32px 32px 32px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "24px",
    width: "100%",
    boxSizing: "border-box",
  },
  children: [
    {
      id: `${prefix}-footer-links`,
      type: "div",
      metadata: { name: "Footer Links" },
      styles: {
        display: "flex",
        alignItems: "center",
        gap: "24px",
      },
      children: [
        {
          id: `${prefix}-footer-home`,
          type: "link",
          content: "Home",
          href: "/",
          styles: { ...NAV_LINK_STYLE, fontSize: "12px" },
        },
        {
          id: `${prefix}-footer-features`,
          type: "link",
          content: "Features",
          href: "/features",
          styles: { ...NAV_LINK_STYLE, fontSize: "12px" },
        },
        {
          id: `${prefix}-footer-pricing`,
          type: "link",
          content: "Pricing",
          href: "/pricing",
          styles: { ...NAV_LINK_STYLE, fontSize: "12px" },
        },
        {
          id: `${prefix}-footer-about`,
          type: "link",
          content: "About",
          href: "/about",
          styles: { ...NAV_LINK_STYLE, fontSize: "12px" },
        },
      ],
    },
    {
      id: `${prefix}-footer-copy`,
      type: "paragraph",
      content: "© 2026 Layoutica. Built for high-velocity design and development teams.",
      metadata: { name: "Copyright Text" },
      styles: {
        fontSize: "12px",
        color: "rgba(255, 255, 255, 0.35)",
        textAlign: "center",
      },
    },
  ],
});

export const DEFAULT_MOCK_PAGES: Page[] = [
  // ── 1. HOME PAGE ────────────────────────────────────────────────────────────
  {
    id: "page-default-home",
    name: "Home",
    slug: "/",
    role: "page",
    elements: [
      createNavbar("home", "/") as any,

      // Hero Section
      {
        id: "home-hero-section",
        type: "section",
        metadata: { name: "Hero Section" },
        styles: {
          backgroundColor: "#121214",
          padding: "80px 32px 64px 32px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "24px",
          width: "100%",
          boxSizing: "border-box",
        },
        children: [
          {
            id: "home-hero-badge",
            type: "badge",
            content: "✨ Layoutica 2.0 · Visual Web Development",
            metadata: { name: "Hero Badge" },
            styles: {
              backgroundColor: "rgba(13, 153, 255, 0.12)",
              color: "#38bdf8",
              border: "1px solid rgba(13, 153, 255, 0.25)",
              fontSize: "12px",
              fontWeight: "600",
              padding: "6px 14px",
              borderRadius: "999px",
              display: "inline-block",
            },
          },
          {
            id: "home-hero-title",
            type: "heading",
            content: "Build Modern Web Apps at the Speed of Thought",
            metadata: { name: "Hero Title" },
            styles: {
              fontSize: "52px",
              fontWeight: "800",
              color: "#ffffff",
              textAlign: "center",
              lineHeight: "1.15",
              maxWidth: "800px",
              letterSpacing: "-0.03em",
            },
          },
          {
            id: "home-hero-desc",
            type: "paragraph",
            content:
              "Design responsive components visually, sync changes live with your local workspace, and preview interactive multi-page websites directly in your browser with zero bloat.",
            metadata: { name: "Hero Description" },
            styles: {
              fontSize: "17px",
              color: "rgba(255, 255, 255, 0.65)",
              textAlign: "center",
              maxWidth: "600px",
              lineHeight: "1.65",
            },
          },
          // Action Buttons Row
          {
            id: "home-hero-buttons",
            type: "div",
            metadata: { name: "Hero Action Buttons" },
            styles: {
              display: "flex",
              alignItems: "center",
              gap: "14px",
              marginTop: "8px",
            },
            children: [
              {
                id: "home-hero-cta-primary",
                type: "button",
                content: "Start Free Trial →",
                href: "/pricing",
                metadata: { name: "Primary CTA" },
                styles: {
                  backgroundColor: "#0d99ff",
                  color: "#ffffff",
                  fontSize: "14px",
                  fontWeight: "600",
                  padding: "12px 28px",
                  borderRadius: "10px",
                  cursor: "pointer",
                  textDecoration: "none",
                  display: "inline-block",
                  boxShadow: "0 10px 25px rgba(13, 153, 255, 0.3)",
                },
              },
              {
                id: "home-hero-cta-secondary",
                type: "button",
                content: "Explore Features",
                href: "/features",
                metadata: { name: "Secondary CTA" },
                styles: {
                  backgroundColor: "rgba(255, 255, 255, 0.05)",
                  color: "#ffffff",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  fontSize: "14px",
                  fontWeight: "600",
                  padding: "12px 24px",
                  borderRadius: "10px",
                  cursor: "pointer",
                  textDecoration: "none",
                  display: "inline-block",
                },
              },
            ],
          },
        ],
      },

      // Feature Cards Section
      {
        id: "home-features-section",
        type: "section",
        metadata: { name: "Feature Cards Section" },
        styles: {
          backgroundColor: "#0d0d0f",
          padding: "72px 32px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "40px",
          width: "100%",
          boxSizing: "border-box",
        },
        children: [
          {
            id: "home-features-header",
            type: "div",
            metadata: { name: "Features Header" },
            styles: {
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "10px",
              textAlign: "center",
            },
            children: [
              {
                id: "home-features-subtitle",
                type: "badge",
                content: "CORE CAPABILITIES",
                styles: {
                  color: "#0d99ff",
                  fontSize: "11px",
                  fontWeight: "700",
                  letterSpacing: "0.08em",
                },
              },
              {
                id: "home-features-title",
                type: "heading2",
                content: "Everything You Need to Ship Faster",
                styles: {
                  fontSize: "32px",
                  fontWeight: "700",
                  color: "#ffffff",
                  letterSpacing: "-0.02em",
                },
              },
            ],
          },
          // Cards Row
          {
            id: "home-cards-row",
            type: "div",
            metadata: { name: "Features Grid Row" },
            styles: {
              display: "flex",
              flexDirection: "row",
              justifyContent: "center",
              gap: "24px",
              width: "100%",
              maxWidth: "1080px",
              flexWrap: "wrap",
            },
            children: [
              {
                id: "card-canvas",
                type: "div",
                metadata: { name: "Feature Card 1" },
                styles: {
                  backgroundColor: "#18181b",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  borderRadius: "14px",
                  padding: "28px",
                  flex: "1",
                  minWidth: "280px",
                  maxWidth: "340px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                },
                children: [
                  {
                    id: "c1-badge",
                    type: "badge",
                    content: "⚡️ Precision Canvas",
                    styles: {
                      color: "#38bdf8",
                      fontSize: "12px",
                      fontWeight: "600",
                    },
                  },
                  {
                    id: "c1-heading",
                    type: "heading3",
                    content: "Visual Drag & Drop",
                    styles: {
                      fontSize: "18px",
                      fontWeight: "700",
                      color: "#ffffff",
                    },
                  },
                  {
                    id: "c1-desc",
                    type: "paragraph",
                    content:
                      "Fluidly compose components, arrange hierarchical elements, and adjust design tokens with real-time feedback.",
                    styles: {
                      fontSize: "13px",
                      color: "rgba(255, 255, 255, 0.6)",
                      lineHeight: "1.6",
                    },
                  },
                ],
              },
              {
                id: "card-preview",
                type: "div",
                metadata: { name: "Feature Card 2" },
                styles: {
                  backgroundColor: "#18181b",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  borderRadius: "14px",
                  padding: "28px",
                  flex: "1",
                  minWidth: "280px",
                  maxWidth: "340px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                },
                children: [
                  {
                    id: "c2-badge",
                    type: "badge",
                    content: "🌐 Realtime Preview",
                    styles: {
                      color: "#a78bfa",
                      fontSize: "12px",
                      fontWeight: "600",
                    },
                  },
                  {
                    id: "c2-heading",
                    type: "heading3",
                    content: "Live Browser Testing",
                    styles: {
                      fontSize: "18px",
                      fontWeight: "700",
                      color: "#ffffff",
                    },
                  },
                  {
                    id: "c2-desc",
                    type: "paragraph",
                    content:
                      "One-click launch to your native system browser at localhost. Seamlessly click between linked pages and inspect states.",
                    styles: {
                      fontSize: "13px",
                      color: "rgba(255, 255, 255, 0.6)",
                      lineHeight: "1.6",
                    },
                  },
                ],
              },
              {
                id: "card-sync",
                type: "div",
                metadata: { name: "Feature Card 3" },
                styles: {
                  backgroundColor: "#18181b",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  borderRadius: "14px",
                  padding: "28px",
                  flex: "1",
                  minWidth: "280px",
                  maxWidth: "340px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                },
                children: [
                  {
                    id: "c3-badge",
                    type: "badge",
                    content: "💻 Workspace Sync",
                    styles: {
                      color: "#34d399",
                      fontSize: "12px",
                      fontWeight: "600",
                    },
                  },
                  {
                    id: "c3-heading",
                    type: "heading3",
                    content: "Clean Next.js Code",
                    styles: {
                      fontSize: "18px",
                      fontWeight: "700",
                      color: "#ffffff",
                    },
                  },
                  {
                    id: "c3-desc",
                    type: "paragraph",
                    content:
                      "Automatic live sync writes standard Next.js App Router and Tailwind CSS code straight into your project folders.",
                    styles: {
                      fontSize: "13px",
                      color: "rgba(255, 255, 255, 0.6)",
                      lineHeight: "1.6",
                    },
                  },
                ],
              },
            ],
          },
        ],
      },

      createFooter("home") as any,
    ],
  },

  // ── 2. FEATURES PAGE ────────────────────────────────────────────────────────
  {
    id: "page-features",
    name: "Features",
    slug: "/features",
    role: "page",
    elements: [
      createNavbar("features", "/features") as any,

      {
        id: "feat-hero",
        type: "section",
        metadata: { name: "Features Hero" },
        styles: {
          backgroundColor: "#121214",
          padding: "64px 32px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "16px",
          width: "100%",
          boxSizing: "border-box",
        },
        children: [
          {
            id: "feat-badge",
            type: "badge",
            content: "DEEP CAPABILITIES",
            styles: {
              backgroundColor: "rgba(167, 139, 250, 0.15)",
              color: "#c084fc",
              fontSize: "11px",
              fontWeight: "700",
              padding: "4px 12px",
              borderRadius: "999px",
            },
          },
          {
            id: "feat-title",
            type: "heading",
            content: "Built for Professional Production",
            styles: {
              fontSize: "42px",
              fontWeight: "800",
              color: "#ffffff",
              textAlign: "center",
              letterSpacing: "-0.02em",
            },
          },
          {
            id: "feat-desc",
            type: "paragraph",
            content:
              "Explore the architectural superpowers that make Layoutica both an ultra-responsive visual tool and a developer-grade environment.",
            styles: {
              fontSize: "16px",
              color: "rgba(255, 255, 255, 0.6)",
              textAlign: "center",
              maxWidth: "560px",
              lineHeight: "1.6",
            },
          },
        ],
      },

      // Grid of detailed features
      {
        id: "feat-grid-section",
        type: "section",
        metadata: { name: "Feature Grid" },
        styles: {
          backgroundColor: "#0d0d0f",
          padding: "48px 32px 80px 32px",
          display: "flex",
          flexDirection: "row",
          justifyContent: "center",
          gap: "24px",
          flexWrap: "wrap",
          width: "100%",
          boxSizing: "border-box",
        },
        children: [
          {
            id: "fg-1",
            type: "div",
            styles: {
              backgroundColor: "#18181b",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "12px",
              padding: "24px",
              width: "320px",
              display: "flex",
              flexDirection: "column",
              gap: "10px",
            },
            children: [
              {
                id: "fg-1-title",
                type: "heading3",
                content: "Multi-Page Site Linking",
                styles: { fontSize: "16px", fontWeight: "700", color: "#ffffff" },
              },
              {
                id: "fg-1-desc",
                type: "paragraph",
                content:
                  "Create routes such as /pricing, /about, and nested paths. Links in preview mode navigate seamlessly across your entire web architecture.",
                styles: { fontSize: "13px", color: "rgba(255,255,255,0.6)", lineHeight: "1.6" },
              },
            ],
          },
          {
            id: "fg-2",
            type: "div",
            styles: {
              backgroundColor: "#18181b",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "12px",
              padding: "24px",
              width: "320px",
              display: "flex",
              flexDirection: "column",
              gap: "10px",
            },
            children: [
              {
                id: "fg-2-title",
                type: "heading3",
                content: "Responsive Breakpoints",
                styles: { fontSize: "16px", fontWeight: "700", color: "#ffffff" },
              },
              {
                id: "fg-2-desc",
                type: "paragraph",
                content:
                  "Toggle between Desktop, Tablet, and Mobile viewport presets with custom dimensions and zoom controls.",
                styles: { fontSize: "13px", color: "rgba(255,255,255,0.6)", lineHeight: "1.6" },
              },
            ],
          },
          {
            id: "fg-3",
            type: "div",
            styles: {
              backgroundColor: "#18181b",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "12px",
              padding: "24px",
              width: "320px",
              display: "flex",
              flexDirection: "column",
              gap: "10px",
            },
            children: [
              {
                id: "fg-3-title",
                type: "heading3",
                content: "Design Tokens & Palettes",
                styles: { fontSize: "16px", fontWeight: "700", color: "#ffffff" },
              },
              {
                id: "fg-3-desc",
                type: "paragraph",
                content:
                  "Manage cohesive color swatches, typography scales, and global tokens that update across all pages simultaneously.",
                styles: { fontSize: "13px", color: "rgba(255,255,255,0.6)", lineHeight: "1.6" },
              },
            ],
          },
        ],
      },

      createFooter("features") as any,
    ],
  },

  // ── 3. PRICING PAGE ─────────────────────────────────────────────────────────
  {
    id: "page-pricing",
    name: "Pricing",
    slug: "/pricing",
    role: "page",
    elements: [
      createNavbar("pricing", "/pricing") as any,

      {
        id: "pricing-hero",
        type: "section",
        metadata: { name: "Pricing Hero" },
        styles: {
          backgroundColor: "#121214",
          padding: "64px 32px 48px 32px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "16px",
          width: "100%",
          boxSizing: "border-box",
        },
        children: [
          {
            id: "pricing-badge",
            type: "badge",
            content: "TRANSPARENT PLANS",
            styles: {
              backgroundColor: "rgba(52, 211, 153, 0.15)",
              color: "#34d399",
              fontSize: "11px",
              fontWeight: "700",
              padding: "4px 12px",
              borderRadius: "999px",
            },
          },
          {
            id: "pricing-title",
            type: "heading",
            content: "Simple, Predictable Pricing",
            styles: {
              fontSize: "42px",
              fontWeight: "800",
              color: "#ffffff",
              textAlign: "center",
              letterSpacing: "-0.02em",
            },
          },
          {
            id: "pricing-desc",
            type: "paragraph",
            content: "Start for free and scale as your projects grow. No hidden lock-in.",
            styles: {
              fontSize: "16px",
              color: "rgba(255, 255, 255, 0.6)",
              textAlign: "center",
              maxWidth: "520px",
            },
          },
        ],
      },

      // Pricing Tiers Row
      {
        id: "pricing-cards-section",
        type: "section",
        metadata: { name: "Pricing Cards" },
        styles: {
          backgroundColor: "#0d0d0f",
          padding: "40px 32px 80px 32px",
          display: "flex",
          flexDirection: "row",
          justifyContent: "center",
          gap: "24px",
          flexWrap: "wrap",
          width: "100%",
          boxSizing: "border-box",
        },
        children: [
          // Starter Plan
          {
            id: "plan-starter",
            type: "div",
            styles: {
              backgroundColor: "#18181b",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "16px",
              padding: "32px",
              width: "290px",
              display: "flex",
              flexDirection: "column",
              gap: "16px",
            },
            children: [
              {
                id: "ps-name",
                type: "heading3",
                content: "Starter",
                styles: { fontSize: "18px", fontWeight: "700", color: "#ffffff" },
              },
              {
                id: "ps-price",
                type: "heading",
                content: "$0",
                styles: { fontSize: "36px", fontWeight: "800", color: "#ffffff" },
              },
              {
                id: "ps-desc",
                type: "paragraph",
                content: "Perfect for personal experiments, portfolios, and learning.",
                styles: { fontSize: "13px", color: "rgba(255,255,255,0.55)", lineHeight: "1.5" },
              },
              {
                id: "ps-btn",
                type: "button",
                content: "Get Started Free",
                href: "/",
                styles: {
                  backgroundColor: "rgba(255, 255, 255, 0.08)",
                  color: "#ffffff",
                  fontSize: "13px",
                  fontWeight: "600",
                  padding: "10px",
                  borderRadius: "8px",
                  textAlign: "center",
                  cursor: "pointer",
                  textDecoration: "none",
                  display: "block",
                  marginTop: "8px",
                },
              },
            ],
          },

          // Pro Plan
          {
            id: "plan-pro",
            type: "div",
            styles: {
              backgroundColor: "#18181b",
              border: "2px solid #0d99ff",
              borderRadius: "16px",
              padding: "32px",
              width: "290px",
              display: "flex",
              flexDirection: "column",
              gap: "16px",
              boxShadow: "0 16px 40px rgba(13, 153, 255, 0.15)",
            },
            children: [
              {
                id: "pp-badge",
                type: "badge",
                content: "MOST POPULAR",
                styles: { color: "#38bdf8", fontSize: "10px", fontWeight: "800", letterSpacing: "0.06em" },
              },
              {
                id: "pp-name",
                type: "heading3",
                content: "Professional",
                styles: { fontSize: "18px", fontWeight: "700", color: "#ffffff" },
              },
              {
                id: "pp-price",
                type: "heading",
                content: "$29",
                styles: { fontSize: "36px", fontWeight: "800", color: "#ffffff" },
              },
              {
                id: "pp-desc",
                type: "paragraph",
                content: "Unlimited projects, multi-page routing, live workspace sync, and priority exports.",
                styles: { fontSize: "13px", color: "rgba(255,255,255,0.55)", lineHeight: "1.5" },
              },
              {
                id: "pp-btn",
                type: "button",
                content: "Upgrade to Pro",
                href: "/",
                styles: {
                  backgroundColor: "#0d99ff",
                  color: "#ffffff",
                  fontSize: "13px",
                  fontWeight: "600",
                  padding: "10px",
                  borderRadius: "8px",
                  textAlign: "center",
                  cursor: "pointer",
                  textDecoration: "none",
                  display: "block",
                  marginTop: "8px",
                },
              },
            ],
          },

          // Team Plan
          {
            id: "plan-team",
            type: "div",
            styles: {
              backgroundColor: "#18181b",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "16px",
              padding: "32px",
              width: "290px",
              display: "flex",
              flexDirection: "column",
              gap: "16px",
            },
            children: [
              {
                id: "pt-name",
                type: "heading3",
                content: "Team / Agency",
                styles: { fontSize: "18px", fontWeight: "700", color: "#ffffff" },
              },
              {
                id: "pt-price",
                type: "heading",
                content: "$79",
                styles: { fontSize: "36px", fontWeight: "800", color: "#ffffff" },
              },
              {
                id: "pt-desc",
                type: "paragraph",
                content: "Collaborative design systems, shared component libraries, and custom domains.",
                styles: { fontSize: "13px", color: "rgba(255,255,255,0.55)", lineHeight: "1.5" },
              },
              {
                id: "pt-btn",
                type: "button",
                content: "Contact Sales",
                href: "/about",
                styles: {
                  backgroundColor: "rgba(255, 255, 255, 0.08)",
                  color: "#ffffff",
                  fontSize: "13px",
                  fontWeight: "600",
                  padding: "10px",
                  borderRadius: "8px",
                  textAlign: "center",
                  cursor: "pointer",
                  textDecoration: "none",
                  display: "block",
                  marginTop: "8px",
                },
              },
            ],
          },
        ],
      },

      createFooter("pricing") as any,
    ],
  },

  // ── 4. ABOUT PAGE ───────────────────────────────────────────────────────────
  {
    id: "page-about",
    name: "About",
    slug: "/about",
    role: "page",
    elements: [
      createNavbar("about", "/about") as any,

      {
        id: "about-hero",
        type: "section",
        metadata: { name: "About Hero" },
        styles: {
          backgroundColor: "#121214",
          padding: "72px 32px 56px 32px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "18px",
          width: "100%",
          boxSizing: "border-box",
        },
        children: [
          {
            id: "about-badge",
            type: "badge",
            content: "OUR MISSION",
            styles: {
              backgroundColor: "rgba(245, 158, 11, 0.15)",
              color: "#fbbf24",
              fontSize: "11px",
              fontWeight: "700",
              padding: "4px 12px",
              borderRadius: "999px",
            },
          },
          {
            id: "about-title",
            type: "heading",
            content: "Bridging the Gap Between Design and Code",
            styles: {
              fontSize: "44px",
              fontWeight: "800",
              color: "#ffffff",
              textAlign: "center",
              letterSpacing: "-0.02em",
              maxWidth: "700px",
            },
          },
          {
            id: "about-desc",
            type: "paragraph",
            content:
              "We believe visual web development should never mean compromised code quality. Layoutica merges design canvas fluidity with clean, native TypeScript and React output.",
            styles: {
              fontSize: "16px",
              color: "rgba(255, 255, 255, 0.6)",
              textAlign: "center",
              maxWidth: "580px",
              lineHeight: "1.65",
            },
          },
        ],
      },

      createFooter("about") as any,
    ],
  },
];
