# Standard Text Card Specification (Shadow, Border, Rounded)

This document defines the organization-wide design and code standard for **Text Cards** with custom shadow, border, and rounded corner specifications. It can be directly copied, adapted, and used across any web platform or UI technology (React, Next.js, Vue, Angular, Plain HTML/CSS, Tailwind CSS).

---

## 1. Design Tokens & Geometry Specs

| Token Attribute | Value (CSS Unit) | Tailwind Class | Usage / Description |
| :--- | :--- | :--- | :--- |
| **Corner Radius** | `16px` / `1rem` | `rounded-2xl` (Recommended)<br>`rounded-xl` (`12px` - Compact) | Soft, modern rounded edges |
| **Border Width** | `1px` | `border` | Subtle structural boundary |
| **Border Color** | `#F1F5F9` / `#E2E8F0` | `border-slate-100` / `border-slate-200` | Light neutral border preventing visual harshness |
| **Background Color** | `#FFFFFF` | `bg-white` | Pure surface white |
| **Card Shadow** | `0 8px 30px rgba(0, 0, 0, 0.04)` | `shadow-[0_8px_30px_rgb(0,0,0,0.04)]` | Soft ambient elevation |
| **Hover Elevation** | `0 12px 32px rgba(15, 16, 89, 0.08)` | `hover:shadow-md hover:-translate-y-0.5` | Interactive lift effect |
| **Padding** | `24px` / `1.5rem` | `p-6` (Standard)<br>`p-4` (`16px` - Mobile/Compact) | Inner content breathing room |

---

## 2. Typography Standard Inside Text Cards

| Text Element | CSS Specifications | Tailwind Classes | Text Color Code |
| :--- | :--- | :--- | :--- |
| **Card Header / Title** | `font-size: 1.125rem; font-weight: 600; line-height: 1.3` | `text-lg font-semibold text-slate-800` | `#1E293B` |
| **Subtitle / Meta** | `font-size: 0.75rem; font-weight: 500;` | `text-xs font-medium text-slate-500` | `#64748B` |
| **Body Content** | `font-size: 0.875rem; font-weight: 400; line-height: 1.6` | `text-sm text-slate-700 leading-relaxed` | `#334155` |
| **Caption / Footer** | `font-size: 0.75rem; color: #94A3B8` | `text-xs text-slate-400` | `#94A3B8` |

---

## 3. Ready-to-Use Code Implementations

### Option A: Pure HTML + CSS (Vanilla / Framework-Agnostic)

Best for standalone web pages, PHP, ASP.NET, Java Spring, or custom CSS systems.

```html
<!-- HTML Structure -->
<article class="text-card text-card-hover">
  <div class="text-card-header">
    <div class="text-card-title-group">
      <span class="text-card-subtitle">Category / Topic</span>
      <h3 class="text-card-title">Standard Card Title</h3>
    </div>
    <span class="text-card-badge">Active</span>
  </div>
  <div class="text-card-body">
    <p>This is the standard body text inside the card. Designed with optimal line height and color contrast for corporate applications.</p>
  </div>
  <div class="text-card-footer">
    <span>Updated 2 hours ago</span>
    <a href="#" class="text-card-action">Read more &rarr;</a>
  </div>
</article>
```

```css
/* CSS Stylesheet (variables + class definitions) */
:root {
  --card-bg: #ffffff;
  --card-border: #f1f5f9;
  --card-border-hover: #e2e8f0;
  --card-radius: 1rem; /* 16px */
  --card-shadow: 0 8px 30px rgba(0, 0, 0, 0.04);
  --card-shadow-hover: 0 12px 32px rgba(15, 16, 89, 0.08);
  
  --card-text-title: #1e293b;
  --card-text-body: #334155;
  --card-text-muted: #64748b;
  --card-primary-accent: #0f1059;
}

/* Base Text Card */
.text-card {
  background-color: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: var(--card-radius);
  box-shadow: var(--card-shadow);
  padding: 1.5rem; /* 24px */
  display: flex;
  flex-direction: column;
  gap: 1rem;
  transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1),
              box-shadow 0.2s cubic-bezier(0.4, 0, 0.2, 1),
              border-color 0.2s ease;
}

/* Interactive Hover State */
.text-card-hover:hover {
  transform: translateY(-2px);
  box-shadow: var(--card-shadow-hover);
  border-color: var(--card-border-hover);
}

/* Card Header */
.text-card-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
}

.text-card-title-group {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.text-card-subtitle {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--card-text-muted);
}

.text-card-title {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 600;
  line-height: 1.3;
  color: var(--card-text-title);
}

/* Badge Utility */
.text-card-badge {
  font-size: 0.75rem;
  font-weight: 500;
  padding: 0.25rem 0.625rem;
  border-radius: 9999px;
  background-color: #ecfdf5;
  color: #059669;
  white-space: nowrap;
}

/* Body Content */
.text-card-body {
  font-size: 0.875rem;
  line-height: 1.6;
  color: var(--card-text-body);
}

.text-card-body p {
  margin: 0 0 0.5rem 0;
}
.text-card-body p:last-child {
  margin-bottom: 0;
}

/* Footer Section */
.text-card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 0.75rem;
  border-top: 1px solid #f8fafc;
  font-size: 0.75rem;
  color: var(--card-text-muted);
}

.text-card-action {
  color: var(--card-primary-accent);
  font-weight: 600;
  text-decoration: none;
}
.text-card-action:hover {
  text-decoration: underline;
}

/* Dark Mode Support (Optional) */
@media (prefers-color-scheme: dark) {
  :root {
    --card-bg: #1e293b;
    --card-border: #334155;
    --card-shadow: 0 8px 30px rgba(0, 0, 0, 0.2);
    --card-text-title: #f8fafc;
    --card-text-body: #cbd5e1;
    --card-text-muted: #94a3b8;
  }
}
```

---

### Option B: Tailwind CSS Utility Classes (v3 & v4)

Copy-paste Tailwind snippet for Next.js, React, Vue, or HTML templates.

#### 1. Standard Text Card
```html
<div class="rounded-2xl border border-slate-100 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
  <h3 class="text-lg font-semibold text-slate-800">Card Header Title</h3>
  <p class="mt-2 text-sm text-slate-600 leading-relaxed">
    This text card uses rounded-2xl (16px), border-slate-100, and a ambient soft shadow for maximum legibility.
  </p>
</div>
```

#### 2. Interactive / Hover Text Card
```html
<div class="group rounded-2xl border border-slate-100 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all duration-200 ease-in-out hover:-translate-y-0.5 hover:border-slate-200 hover:shadow-[0_12px_32px_rgb(15,16,89,0.08)] cursor-pointer">
  <div class="flex items-center justify-between">
    <span class="text-xs font-medium text-slate-500 uppercase tracking-wider">Announcement</span>
    <span class="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-600">New</span>
  </div>
  <h3 class="mt-3 text-lg font-semibold text-slate-800 group-hover:text-[#0F1059] transition-colors">
    Interactive Card Title
  </h3>
  <p class="mt-2 text-sm text-slate-600 leading-relaxed">
    Hover state smoothly elevates the card upwards by 2px and applies a deeper elevation shadow.
  </p>
</div>
```

#### 3. Accent Left-Bar Text Card (High Priority / Notice)
```html
<div class="relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
  <!-- Accent Line -->
  <div class="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-[#0F1059] to-[#1D6A8A]"></div>
  <div class="pl-2">
    <h3 class="text-lg font-semibold text-slate-800">Important System Notice</h3>
    <p class="mt-2 text-sm text-slate-600 leading-relaxed">
      This card variant includes a left accent bar for drawing visual emphasis to status or key information.
    </p>
  </div>
</div>
```

---

### Option C: React / Next.js Component (TypeScript + Tailwind)

Save as `TextCard.tsx` in any React/Next.js codebase.

```tsx
import React from "react";

export interface TextCardProps {
  title: string;
  subtitle?: string;
  badgeText?: string;
  badgeVariant?: "success" | "warning" | "error" | "info" | "neutral";
  children: React.ReactNode;
  footer?: React.ReactNode;
  accentBar?: boolean;
  hoverable?: boolean;
  className?: string;
  onClick?: () => void;
}

const badgeStyles = {
  success: "bg-emerald-50 text-emerald-700 border-emerald-200",
  warning: "bg-amber-50 text-amber-700 border-amber-200",
  error: "bg-rose-50 text-rose-700 border-rose-200",
  info: "bg-sky-50 text-sky-700 border-sky-200",
  neutral: "bg-slate-100 text-slate-700 border-slate-200",
};

export const TextCard: React.FC<TextCardProps> = ({
  title,
  subtitle,
  badgeText,
  badgeVariant = "info",
  children,
  footer,
  accentBar = false,
  hoverable = false,
  className = "",
  onClick,
}) => {
  return (
    <div
      onClick={onClick}
      className={`
        relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-6
        shadow-[0_8px_30px_rgb(0,0,0,0.04)] text-slate-900
        transition-all duration-200 ease-in-out
        ${hoverable ? "hover:-translate-y-0.5 hover:border-slate-200 hover:shadow-[0_12px_32px_rgb(15,16,89,0.08)] cursor-pointer" : ""}
        ${className}
      `}
    >
      {/* Optional Accent Bar */}
      {accentBar && (
        <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-[#0F1059] to-[#1D6A8A]" />
      )}

      {/* Header */}
      <div className={`flex items-start justify-between gap-4 ${accentBar ? "pl-2" : ""}`}>
        <div>
          {subtitle && (
            <span className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
              {subtitle}
            </span>
          )}
          <h3 className="text-lg font-semibold text-slate-800 leading-tight">
            {title}
          </h3>
        </div>
        {badgeText && (
          <span
            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${badgeStyles[badgeVariant]}`}
          >
            {badgeText}
          </span>
        )}
      </div>

      {/* Body */}
      <div className={`mt-3 text-sm text-slate-600 leading-relaxed ${accentBar ? "pl-2" : ""}`}>
        {children}
      </div>

      {/* Footer */}
      {footer && (
        <div className={`mt-4 pt-3 border-t border-slate-50 flex items-center justify-between text-xs text-slate-400 ${accentBar ? "pl-2" : ""}`}>
          {footer}
        </div>
      )}
    </div>
  );
};
```

---

### Option D: Vue 3 Single File Component (SFC)

Save as `TextCard.vue`.

```vue
<template>
  <div
    :class="[
      'relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all duration-200 ease-in-out',
      hoverable ? 'hover:-translate-y-0.5 hover:border-slate-200 hover:shadow-[0_12px_32px_rgb(15,16,89,0.08)] cursor-pointer' : ''
    ]"
  >
    <div v-if="accentBar" class="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-[#0F1059] to-[#1D6A8A]" />
    
    <div class="flex items-start justify-between gap-4">
      <div>
        <span v-if="subtitle" class="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
          {{ subtitle }}
        </span>
        <h3 class="text-lg font-semibold text-slate-800 leading-tight">
          {{ title }}
        </h3>
      </div>
      <slot name="badge" />
    </div>

    <div class="mt-3 text-sm text-slate-600 leading-relaxed">
      <slot />
    </div>

    <div v-if="$slots.footer" class="mt-4 pt-3 border-t border-slate-50 text-xs text-slate-400">
      <slot name="footer" />
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  title: string
  subtitle?: string
  accentBar?: boolean
  hoverable?: boolean
}>()
</script>
```

---

## 4. Design Guidelines & Rules for Adoption

1. **Border Rule**: Always keep a subtle 1px border (`border-slate-100` or `#F1F5F9`). Do not use borderless white cards on light grey backgrounds as visual boundary definition is lost.
2. **Shadow Rule**: Use soft ambient shadow values (alpha between `0.03` and `0.06`). Avoid hard, heavy dark shadows (`rgba(0,0,0,0.2)`) on light themes.
3. **Corner Radius Consistency**: Standardize on `16px` (`rounded-2xl`) for main content cards, and `12px` (`rounded-xl`) for dense inner nested cards.
4. **Spacing & Padding**: Keep minimum inner padding at `20px` (`p-5`) to `24px` (`p-6`) for desktop, and `16px` (`p-4`) for mobile responsive screens.
