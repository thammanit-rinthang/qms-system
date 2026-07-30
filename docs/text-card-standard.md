# Standard Text Card Specification (Shadow, Border, Rounded)

เอกสารข้อกำหนดมาตรฐานการออกแบบและการพัฒนา **Standard Text Card (Shadow, Border, Rounded)** สำหรับองค์กรและระบบงานต่าง ๆ
เอกสารนี้ถูกออกแบบให้เป็น **Single Source of Truth** ที่ครอบคลุมทั้งแนวคิดทาง UX/UI Design Tokens, CSS Geometry Math, WCAG Accessibility และโค้ดสำหรับนำไปใช้งาน (Copy-Paste Ready) ในทุก Tech Stack (Vanilla HTML/CSS, Tailwind CSS v3/v4, React/Next.js, Vue 3, Angular และ Web Components)

---

## 📋สารบัญ (Table of Contents)

1. [ภาพรวมและปรัชญาการออกแบบ (Design Philosophy)](#1-ภาพรวมและปรัชญาการออกแบบ-design-philosophy)
2. [ข้อกำหนด Design Tokens & Geometry Specs](#2-ข้อกำหนด-design-tokens--geometry-specs)
   - [2.1 Corner Radius (ความมน)](#21-corner-radius-ความมน)
   - [2.2 Border & Line Weights (เส้นขอบ)](#22-border--line-weights-เส้นขอบ)
   - [2.3 Box Shadow & Elevation System (ระบบเงาและมิติ)](#23-box-shadow--elevation-system-ระบบเงาและมิติ)
   - [2.4 Surface & Background Colors (สีพื้นหลัง)](#24-surface--background-colors-สีพื้นหลัง)
   - [2.5 Typography Hierarchy (ระบบลำดับตัวอักษร)](#25-typography-hierarchy-ระบบลำดับตัวอักษร)
   - [2.6 Padding & Spacing Matrix (ระยะห่างภายใน)](#26-padding--spacing-matrix-ระยะห่างภายใน)
3. [โครงสร้างและองค์ประกอบ Card Anatomy](#3-โครงสร้างและองค์ประกอบ-card-anatomy)
4. [โค้ดสมบูรณ์สำหรับนำไปใช้ในระบบอื่น (Code Implementations)](#4-โค้ดสมบูรณ์สำหรับนำไปใช้ในระบบอื่น-code-implementations)
   - [Stack A: Pure HTML5 + Vanilla CSS3 (Custom Variables & Dark Mode)](#stack-a-pure-html5--vanilla-css3-custom-variables--dark-mode)
   - [Stack B: Tailwind CSS v3 & v4 (Utility Classes & Variants)](#stack-b-tailwind-css-v3--v4-utility-classes--variants)
   - [Stack C: React / Next.js Component (TypeScript + Tailwind)](#stack-c-react--nextjs-component-typescript--tailwind)
   - [Stack D: Vue 3 Component (Composition API SFC)](#stack-d-vue-3-component-composition-api-sfc)
   - [Stack E: Angular Standalone Component (TS + SCSS)](#stack-e-angular-standalone-component-ts--scss)
   - [Stack F: Framework-Agnostic Web Component (Shadow DOM)](#stack-f-framework-agnostic-web-component-shadow-dom)
5. [ข้อกำหนดสำหรับ UX/UI Designer (Figma Design Tokens)](#5-ข้อกำหนดสำหรับ-uxui-designer-figma-design-tokens)
6. [การรองรับ Responsive & Accessibility (a11y)](#6-การรองรับ-responsive--accessibility-a11y)

---

## 1. ภาพรวมและปรัชญาการออกแบบ (Design Philosophy)

**Text Card Standard** ถูกคิดค้นขึ้นเพื่อให้การแสดงผลข้อความ สารสนเทศ ข่าวสาร และองค์ประกอบแบบการ์ดในระบบ enterprise มีความสม่ำเสมอ ล้ำสมัย และดูสะอาดตา (Clean & Premium Aesthetics)

### ปรัชญา 3 ประการ:
1. **Subtle Boundaries over Heavy Outlines**: เส้นขอบ (Border) ต้องบางเบา ไม่แข็งกระด้าง (`1px border-slate-100` / `#F1F5F9`) เพื่อสร้างขอบเขตโดยไม่แย่งความสนใจจากเนื้อหา
2. **Ambient Elevation**: ใช้เงา (Box Shadow) ฟุ้งกระจายในระดับกว้างแต่น้ำหนักเบา (`0 8px 30px rgba(0,0,0,0.04)`) แทนเงาดำทึบขนาดเล็ก เพื่อให้การ์ดดูลอยจากพื้นหลังอย่างเป็นธรรมชาติ
3. **Harmonious Rounded Corners**: มุมมนขนาด `16px` (`rounded-2xl`) ช่วยลดความรู้สึกแข็งกระด้างขององค์ประกอบสี่เหลี่ยมแบบเดิม ให้ความรู้สึกเป็นมิตรและเป็นสากล

---

## 2. ข้อกำหนด Design Tokens & Geometry Specs

### 2.1 Corner Radius (ความมน)

| Level | Value | Pixel | Tailwind Class | การนำไปใช้งาน |
| :--- | :--- | :--- | :--- | :--- |
| **Standard Card** | `1rem` | **`16px`** | `rounded-2xl` | **(Default)** การ์ดเนื้อหามาตรฐาน การ์ดข้อมูลหลัก |
| **Sub-Card / Compact** | `0.75rem` | **`12px`** | `rounded-xl` | การ์ดย่อยย่อส่วน การ์ดซ้อนข้างในการ์ดหลัก |
| **Hero / Featured Card** | `1.5rem` | **`24px`** | `rounded-3xl` | การ์ดเน้นพิเศษในหน้า Dashboard / Hero banner |

---

### 2.2 Border & Line Weights (เส้นขอบ)

| Theme State | Border Width | Color Code | Tailwind Class | คำอธิบาย |
| :--- | :--- | :--- | :--- | :--- |
| **Light Mode (Default)** | `1px` | `#F1F5F9` | `border border-slate-100` | เส้นขอบสี Slate แบบสว่าง บางเบา |
| **Light Mode (Hover)** | `1px` | `#E2E8F0` | `hover:border-slate-200` | เข้มขึ้นเล็กน้อยเมื่อ Hover |
| **Dark Mode** | `1px` | `#334155` | `dark:border-slate-700` | เส้นขอบสี Slate สำหรับพื้นหลังเข้ม |
| **Active / Focused** | `2px` | `#0F1059` | `border-2 border-[#0F1059]` | แถบเส้นขอบเลือกอยู่ |

---

### 2.3 Box Shadow & Elevation System (ระบบเงาและมิติ)

#### A. Base Shadow (สภาวะปกติ)
```css
box-shadow: 0 8px 30px rgba(0, 0, 0, 0.04);
```
*Tailwind:* `shadow-[0_8px_30px_rgb(0,0,0,0.04)]`

#### B. Hover Elevation (สภาวะวางเมาส์)
```css
box-shadow: 0 12px 32px rgba(15, 16, 89, 0.08), 0 4px 6px -2px rgba(15, 16, 89, 0.04);
transform: translateY(-2px);
```
*Tailwind:* `hover:shadow-[0_12px_32px_rgb(15,16,89,0.08)] hover:-translate-y-0.5`

#### C. Glassmorphism Elevation (การ์ดโปร่งแสง)
```css
background: rgba(255, 255, 255, 0.85);
backdrop-filter: blur(16px);
box-shadow: 0 8px 32px 0 rgba(15, 16, 89, 0.06);
```

---

### 2.4 Surface & Background Colors (สีพื้นหลัง)

- **Light Mode Surface:** `#FFFFFF` (`bg-white`)
- **Dark Mode Surface:** `#1E293B` (`dark:bg-slate-800`)
- **Subtle Gray Surface (Optional):** `#FAFAFA` (`bg-slate-50/50`)

---

### 2.5 Typography Hierarchy (ระบบลำดับตัวอักษร)

| Element | Font Size | Font Weight | Line Height | Color Code (Light) | Tailwind Class |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Category / Meta** | `12px` (`0.75rem`) | `600` (SemiBold) | `1.2` | `#64748B` (Slate-500) | `text-xs font-semibold text-slate-500 uppercase tracking-wider` |
| **Card Title** | `18px` (`1.125rem`)| `600` (SemiBold) | `1.35` | `#1E293B` (Slate-800) | `text-lg font-semibold text-slate-800` |
| **Card Body** | `14px` (`0.875rem`)| `400` (Regular) | `1.625` | `#334155` (Slate-700) | `text-sm text-slate-700 leading-relaxed` |
| **Footer Text** | `12px` (`0.75rem`) | `400` (Regular) | `1.4` | `#94A3B8` (Slate-400) | `text-xs text-slate-400` |

---

### 2.6 Padding & Spacing Matrix (ระยะห่างภายใน)

- **Desktop (Standard):** `24px` (`1.5rem`) -> `p-6`
- **Tablet / Medium:** `20px` (`1.25rem`) -> `p-5`
- **Mobile / Compact:** `16px` (`1rem`) -> `p-4`

---

## 3. โครงสร้างและองค์ประกอบ Card Anatomy

```
┌─────────────────────────────────────────────────────────┐
│ [Accent Line (Optional)]                                │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ HEADER SECTION                                      │ │
│ │ Subtitle / Category Tag       [Status Badge]        │ │
│ │ Card Main Title                                     │ │
│ ├─────────────────────────────────────────────────────┤ │
│ │ BODY SECTION                                        │ │
│ │ Paragraph text content, detailed description,       │ │
│ │ key-value lists, or stat indicators.                │ │
│ ├─────────────────────────────────────────────────────┤ │
│ │ FOOTER SECTION (Optional)                           │ │
│ │ Meta Info / Timestamp           [Action Link / CTA] │ │
│ └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

---

## 4. โค้ดสมบูรณ์สำหรับนำไปใช้ในระบบอื่น (Code Implementations)

### Stack A: Pure HTML5 + Vanilla CSS3 (Custom Variables & Dark Mode)

ไฟล์ CSS ที่รวม variables, hover transitions, และ dark mode ไว้ในตัว สามารถนำไปใช้กับ PHP, ASP.NET, Java Spring, Static HTML ได้ทันที

#### 📄 `text-card.css`
```css
/* Custom Properties / Design Tokens */
:root {
  --tc-bg: #ffffff;
  --tc-border: #f1f5f9;
  --tc-border-hover: #e2e8f0;
  --tc-radius: 1rem; /* 16px */
  --tc-padding: 1.5rem; /* 24px */
  --tc-shadow: 0 8px 30px rgba(0, 0, 0, 0.04);
  --tc-shadow-hover: 0 12px 32px rgba(15, 16, 89, 0.08);
  
  --tc-title-color: #1e293b;
  --tc-body-color: #334155;
  --tc-meta-color: #64748b;
  --tc-primary: #0f1059;
}

/* Dark Mode Tokens */
@media (prefers-color-scheme: dark) {
  :root {
    --tc-bg: #1e293b;
    --tc-border: #334155;
    --tc-border-hover: #475569;
    --tc-shadow: 0 8px 30px rgba(0, 0, 0, 0.25);
    --tc-shadow-hover: 0 12px 32px rgba(0, 0, 0, 0.35);
    --tc-title-color: #f8fafc;
    --tc-body-color: #cbd5e1;
    --tc-meta-color: #94a3b8;
    --tc-primary: #38bdf8;
  }
}

/* Core Card Container */
.standard-text-card {
  position: relative;
  background-color: var(--tc-bg);
  border: 1px solid var(--tc-border);
  border-radius: var(--tc-radius);
  box-shadow: var(--tc-shadow);
  padding: var(--tc-padding);
  display: flex;
  flex-direction: column;
  gap: 1rem;
  overflow: hidden;
  transition: transform 200ms cubic-bezier(0.4, 0, 0.2, 1),
              box-shadow 200ms cubic-bezier(0.4, 0, 0.2, 1),
              border-color 200ms ease;
}

/* Interactive Hover Class */
.standard-text-card-hover:hover {
  transform: translateY(-2px);
  box-shadow: var(--tc-shadow-hover);
  border-color: var(--tc-border-hover);
  cursor: pointer;
}

/* Left Accent Line Variant */
.standard-text-card-accent::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 5px;
  background: linear-gradient(180deg, #0f1059 0%, #1d6a8a 100%);
}

/* Card Header */
.tc-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

.tc-category {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--tc-meta-color);
  margin-bottom: 0.25rem;
}

.tc-title {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 600;
  line-height: 1.35;
  color: var(--tc-title-color);
}

/* Badge */
.tc-badge {
  display: inline-flex;
  align-items: center;
  padding: 0.25rem 0.625rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 500;
  white-space: nowrap;
  background-color: #ecfdf5;
  color: #047857;
  border: 1px solid #a7f3d0;
}

/* Card Body */
.tc-body {
  font-size: 0.875rem;
  line-height: 1.625;
  color: var(--tc-body-color);
}

.tc-body p {
  margin: 0 0 0.5rem 0;
}
.tc-body p:last-child {
  margin-bottom: 0;
}

/* Card Footer */
.tc-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 0.75rem;
  border-top: 1px solid var(--tc-border);
  font-size: 0.75rem;
  color: var(--tc-meta-color);
}

.tc-action-link {
  color: var(--tc-primary);
  font-weight: 600;
  text-decoration: none;
}
.tc-action-link:hover {
  text-decoration: underline;
}
```

#### 📄 `example.html`
```html
<article class="standard-text-card standard-text-card-hover standard-text-card-accent">
  <header class="tc-header">
    <div>
      <div class="tc-category">Quality Announcement</div>
      <h3 class="tc-title">ISO 9001:2015 Annual Surveillance Audit Schedule</h3>
    </div>
    <span class="tc-badge">Approved</span>
  </header>

  <div class="tc-body">
    <p>The annual surveillance audit is scheduled for Q3. Please review the updated document templates and ensure all DAR requests are signed off.</p>
  </div>

  <footer class="tc-footer">
    <span>Updated: 2026-07-21</span>
    <a href="#" class="tc-action-link">View Audit Plan &rarr;</a>
  </footer>
</article>
```

---

### Stack B: Tailwind CSS v3 & v4 (Utility Classes & Variants)

รูปแบบ Utility Classes แบบก๊อปวางได้ทันทีใน Tailwind projects

#### 1. Standard Text Card (การ์ดข้อความพื้นฐาน)
```html
<div class="rounded-2xl border border-slate-100 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] text-slate-900 dark:border-slate-800 dark:bg-slate-900">
  <h3 class="text-lg font-semibold text-slate-800 dark:text-slate-100">Standard Card Title</h3>
  <p class="mt-2 text-sm text-slate-600 leading-relaxed dark:text-slate-300">
    Standard text card with 16px rounded corners, subtle slate-100 border, and soft ambient drop shadow.
  </p>
</div>
```

#### 2. Interactive Clickable Card (การ์ดยกลอยเมื่อวางเมาส์)
```html
<div class="group rounded-2xl border border-slate-100 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all duration-200 ease-in-out hover:-translate-y-0.5 hover:border-slate-200 hover:shadow-[0_12px_32px_rgb(15,16,89,0.08)] cursor-pointer dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700">
  <div class="flex items-center justify-between">
    <span class="text-xs font-semibold uppercase tracking-wider text-slate-400">Document Control</span>
    <span class="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 border border-emerald-200">Active</span>
  </div>
  <h3 class="mt-3 text-lg font-semibold text-slate-800 group-hover:text-[#0F1059] transition-colors dark:text-slate-100 dark:group-hover:text-sky-400">
    Quality Manual Revision v4.2
  </h3>
  <p class="mt-2 text-sm text-slate-600 leading-relaxed dark:text-slate-300">
    Click to inspect the modified sections and approval workflow logs.
  </p>
  <div class="mt-4 pt-3 border-t border-slate-50 flex items-center justify-between text-xs text-slate-400 dark:border-slate-800">
    <span>Effective: Aug 2026</span>
    <span class="font-semibold text-[#0F1059] group-hover:underline dark:text-sky-400">Open File &rarr;</span>
  </div>
</div>
```

#### 3. Left Accent-Bar Notice Card (การ์ดข้อความพร้อมแถบสีเน้น)
```html
<div class="relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:border-slate-800 dark:bg-slate-900">
  <!-- Left Accent Line -->
  <div class="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-[#0F1059] to-[#1D6A8A]"></div>
  <div class="pl-2">
    <span class="text-xs font-semibold uppercase tracking-wider text-slate-400">Important System Notice</span>
    <h3 class="mt-1 text-lg font-semibold text-slate-800 dark:text-slate-100">Scheduled Maintenance Outage</h3>
    <p class="mt-2 text-sm text-slate-600 leading-relaxed dark:text-slate-300">
      The QMS database sync service will undergo routine maintenance this Saturday from 02:00 AM to 04:00 AM UTC.
    </p>
  </div>
</div>
```

#### 4. Metric / Stat Text Card (การ์ดแสดงสถิติและข้อความสรุป)
```html
<div class="rounded-2xl border border-slate-100 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col justify-between dark:border-slate-800 dark:bg-slate-900">
  <div class="flex items-center justify-between">
    <span class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pending Approvals</span>
    <div class="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
      <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
    </div>
  </div>
  <div class="mt-4">
    <div class="text-3xl font-bold text-slate-900 dark:text-white">14 <span class="text-sm font-normal text-slate-500">items</span></div>
    <p class="mt-1 text-xs text-emerald-600 font-medium">&darr; 18% less than last week</p>
  </div>
</div>
```

---

### Stack C: React / Next.js Component (TypeScript + Tailwind)

Component ไฟล์เดียว (`StandardTextCard.tsx`) นำไปวางใน `components/ui/` ได้เลย

```tsx
import React from "react";

export interface StandardTextCardProps {
  title: string;
  subtitle?: string;
  badgeText?: string;
  badgeTone?: "success" | "warning" | "error" | "info" | "neutral";
  children: React.ReactNode;
  footerLeft?: React.ReactNode;
  footerRight?: React.ReactNode;
  accentBar?: boolean;
  hoverable?: boolean;
  className?: string;
  onClick?: () => void;
}

const toneStyles: Record<string, string> = {
  success: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800",
  warning: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800",
  error: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800",
  info: "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800",
  neutral: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
};

export const StandardTextCard: React.FC<StandardTextCardProps> = ({
  title,
  subtitle,
  badgeText,
  badgeTone = "info",
  children,
  footerLeft,
  footerRight,
  accentBar = false,
  hoverable = false,
  className = "",
  onClick,
}) => {
  return (
    <article
      onClick={onClick}
      className={`
        relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-6
        shadow-[0_8px_30px_rgb(0,0,0,0.04)] text-slate-900
        transition-all duration-200 ease-in-out
        dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100
        ${hoverable ? "hover:-translate-y-0.5 hover:border-slate-200 hover:shadow-[0_12px_32px_rgb(15,16,89,0.08)] cursor-pointer dark:hover:border-slate-700" : ""}
        ${className}
      `}
    >
      {/* Optional Left Accent Gradient */}
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
          <h3 className="text-lg font-semibold text-slate-800 leading-tight dark:text-slate-100">
            {title}
          </h3>
        </div>
        {badgeText && (
          <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${toneStyles[badgeTone]}`}>
            {badgeText}
          </span>
        )}
      </div>

      {/* Body Content */}
      <div className={`mt-3 text-sm text-slate-600 leading-relaxed dark:text-slate-300 ${accentBar ? "pl-2" : ""}`}>
        {children}
      </div>

      {/* Footer */}
      {(footerLeft || footerRight) && (
        <div className={`mt-4 pt-3 border-t border-slate-50 flex items-center justify-between text-xs text-slate-400 dark:border-slate-800 ${accentBar ? "pl-2" : ""}`}>
          <div>{footerLeft}</div>
          <div>{footerRight}</div>
        </div>
      )}
    </article>
  );
};
```

---

### Stack D: Vue 3 Component (Composition API SFC)

วางใน `components/StandardTextCard.vue`

```vue
<template>
  <article
    :class="[
      'relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all duration-200 ease-in-out dark:border-slate-800 dark:bg-slate-900',
      hoverable ? 'hover:-translate-y-0.5 hover:border-slate-200 hover:shadow-[0_12px_32px_rgb(15,16,89,0.08)] cursor-pointer dark:hover:border-slate-700' : ''
    ]"
    @click="$emit('click')"
  >
    <div v-if="accentBar" class="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-[#0F1059] to-[#1D6A8A]" />

    <header :class="['flex items-start justify-between gap-4', accentBar ? 'pl-2' : '']">
      <div>
        <span v-if="subtitle" class="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
          {{ subtitle }}
        </span>
        <h3 class="text-lg font-semibold text-slate-800 leading-tight dark:text-slate-100">
          {{ title }}
        </h3>
      </div>
      <slot name="badge" />
    </header>

    <div :class="['mt-3 text-sm text-slate-600 leading-relaxed dark:text-slate-300', accentBar ? 'pl-2' : '']">
      <slot />
    </div>

    <footer v-if="$slots.footer" :class="['mt-4 pt-3 border-t border-slate-50 text-xs text-slate-400 dark:border-slate-800', accentBar ? 'pl-2' : '']">
      <slot name="footer" />
    </footer>
  </article>
</template>

<script setup lang="ts">
defineProps<{
  title: string
  subtitle?: string
  accentBar?: boolean
  hoverable?: boolean
}>()

defineEmits<{
  (e: 'click'): void
}>()
</script>
```

---

### Stack E: Angular Standalone Component (TS + SCSS)

#### 📄 `text-card.component.ts`
```typescript
import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-text-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './text-card.component.html',
  styleUrls: ['./text-card.component.scss']
})
export class TextCardComponent {
  @Input() title: string = '';
  @Input() subtitle?: string;
  @Input() badgeText?: string;
  @Input() hoverable: boolean = false;
  @Input() accentBar: boolean = false;
}
```

#### 📄 `text-card.component.html`
```html
<article [class.hoverable]="hoverable" [class.accent]="accentBar" class="text-card">
  <header class="card-header">
    <div>
      <span *ngIf="subtitle" class="subtitle">{{ subtitle }}</span>
      <h3 class="title">{{ title }}</h3>
    </div>
    <span *ngIf="badgeText" class="badge">{{ badgeText }}</span>
  </header>
  <div class="card-body">
    <ng-content></ng-content>
  </div>
  <footer class="card-footer">
    <ng-content select="[card-footer]"></ng-content>
  </footer>
</article>
```

#### 📄 `text-card.component.scss`
```scss
.text-card {
  position: relative;
  background: #ffffff;
  border: 1px solid #f1f5f9;
  border-radius: 1rem;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.04);
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  transition: all 0.2s ease-in-out;

  &.hoverable:hover {
    transform: translateY(-2px);
    box-shadow: 0 12px 32px rgba(15, 16, 89, 0.08);
    border-color: #e2e8f0;
    cursor: pointer;
  }

  &.accent::before {
    content: '';
    position: absolute;
    left: 0; top: 0; bottom: 0;
    width: 5px;
    background: linear-gradient(180deg, #0f1059, #1d6a8a);
  }

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    .subtitle { font-size: 0.75rem; text-transform: uppercase; color: #64748b; font-weight: 600; display: block; }
    .title { font-size: 1.125rem; font-weight: 600; color: #1e293b; margin: 0; }
    .badge { font-size: 0.75rem; padding: 0.25rem 0.5rem; border-radius: 99px; background: #ecfdf5; color: #047857; }
  }

  .card-body { font-size: 0.875rem; color: #334155; line-height: 1.6; }
  .card-footer { border-top: 1px solid #f8fafc; padding-top: 0.5rem; font-size: 0.75rem; color: #94a3b8; }
}
```

---

### Stack F: Framework-Agnostic Web Component (Shadow DOM)

สามารถโหลดใช้ในระบบเก่า ระบบ Micro-frontend หรือใช้ข้ามไรเบอรีได้โดยไม่ต้องอาศัย Framework ใดๆ

```javascript
class StandardTextCardElement extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    const title = this.getAttribute('title') || '';
    const subtitle = this.getAttribute('subtitle') || '';
    const hoverable = this.hasAttribute('hoverable');

    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; }
        .card {
          background: #ffffff;
          border: 1px solid #f1f5f9;
          border-radius: 16px;
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.04);
          padding: 24px;
          font-family: system-ui, -apple-system, sans-serif;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .card.hoverable:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 32px rgba(15, 16, 89, 0.08);
          border-color: #e2e8f0;
          cursor: pointer;
        }
        .subtitle { font-size: 12px; font-weight: 600; text-transform: uppercase; color: #64748b; margin-bottom: 4px; }
        .title { font-size: 18px; font-weight: 600; color: #1e293b; margin: 0 0 12px 0; }
        .body { font-size: 14px; color: #334155; line-height: 1.6; }
      </style>
      <article class="card ${hoverable ? 'hoverable' : ''}">
        ${subtitle ? `<div class="subtitle">${subtitle}</div>` : ''}
        <h3 class="title">${title}</h3>
        <div class="body"><slot></slot></div>
      </article>
    `;
  }
}

customElements.define('standard-text-card', StandardTextCardElement);
```

#### การนำไปใช้งาน:
```html
<script src="path/to/standard-text-card.js"></script>

<standard-text-card title="System Update" subtitle="Notice" hoverable>
  This web component works everywhere without React or Vue!
</standard-text-card>
```

---

## 5. ข้อกำหนดสำหรับ UX/UI Designer (Figma Design Tokens)

เมื่อสร้างชิ้นงานใน **Figma** ให้กำหนดค่า Auto-Layout และ Styles ดังนี้:

- **Frame Auto-Layout:**
  - Direction: Vertical (`↓`)
  - Padding Left/Right/Top/Bottom: `24px`
  - Item Spacing: `12px`
- **Corner Radius:** `16px` (หรือ `12px` สำหรับ Sub-cards)
- **Stroke (Border):**
  - Type: Inside
  - Weight: `1px`
  - Color: `#F1F5F9` (Solid)
- **Effects (Drop Shadow):**
  - **Effect 1 (Ambient):** X: `0`, Y: `8`, Blur: `30`, Spread: `0`, Color: `#000000` (Opacity `4%`)
  - **Hover Effect:** X: `0`, Y: `12`, Blur: `32`, Spread: `0`, Color: `#0F1059` (Opacity `8%`)

---

## 6. การรองรับ Responsive & Accessibility (a11y)

1. **Color Contrast Ratio (WCAG AAA/AA):**
   - Text Title (`#1E293B`) บน `#FFFFFF` = Contrast ratio **13.8:1** (ผ่านระดับ AAA)
   - Body Text (`#334155`) บน `#FFFFFF` = Contrast ratio **9.8:1** (ผ่านระดับ AAA)
   - Meta Text (`#64748B`) บน `#FFFFFF` = Contrast ratio **4.7:1** (ผ่านระดับ AA)
2. **Focus Outline (Keyboard Navigation):**
   - เมื่อการ์ดถูกเลือกด้วยปุ่ม `Tab` ต้องแสดง Focus Ring ชัดเจน:
     `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F1059] focus-visible:ring-offset-2`
3. **Screen Reader Semantic HTML:**
   - ใช้ `<article>` สำหรับการ์ดข้อมูลเอกเทศ และ `<header>` / `<h3>` สำหรับลำดับหัวข้อ เพื่อให้ Screen Reader อ่านข้อมูลได้อย่างถูกต้อง
