# Design System: Bluamp Plant OS

This design system defines the visual guidelines, typography, colors, and component styles of the **Bluamp Plant OS**. Use this specification as a blueprint to replicate the exact look and feel of Bluamp in your new application.

---

## 1. Visual Theme & Atmosphere
- **Atmosphere:** Industrial, Clean, Utilitarian, and Professional. 
- **Philosophy:** High density of information combined with clear visual hierarchy, utilizing structured grid layouts, crisp borders, and smooth color transitions. It is designed to feel like a high-end enterprise control dashboard.

---

## 2. Color Palette & Roles

The system uses a curated, harmonic palette designed to balance active control elements, success indicators, and secondary focus areas.

| Descriptive Color Name | Hex Code | Semantic Role & Usage |
| :--- | :--- | :--- |
| **Deep Teal** | `#205f64` | Primary brand background, layout headers, modals, text titles, and high-emphasis elements. |
| **Sage Green** | `#498e72` | Primary interactive elements, active navigation borders, default button states, and highlight tabs. |
| **Vibrant Light Green** | `#75c081` | Interactive hover states, success badges, and subtle green accents. |
| **Vibrant Deep Blue** | `#1a639c` | Focused states, input rings, and highlight borders. |
| **Ocean Cyan** | `#2ca4c2` | Muted division lines, card borders, and secondary accents. |
| **Soft Off-White** | `#F9FAFB` | Application canvas body background. |
| **Slate Gray** | `#404040` | Default body text color. |

### Logo Gradient & Branding
The plain-text **Bluamp** logo is styled with a horizontal color gradient running from **Vibrant Light Green** to **Ocean Cyan**:
```css
/* Custom CSS */
.bluamp-logo-text {
  background: linear-gradient(to right, #75c081, #2ca4c2);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}
```

---

## 3. Typography Rules

The typography utilizes two distinct Google Fonts to balance clean display text with readable numbers and table lines.

- **Primary Body Font:** `Inter` (sans-serif)
  - *Usage:* Data values, labels, body copy, numbers, and inputs.
  - *Settings:* `font-family: 'Inter', sans-serif; color: #404040;`
- **Heading & Brand Font:** `Lexend` (sans-serif)
  - *Usage:* Logo, page headers, modal titles, section cards, and table headers.
  - *Settings:* `font-family: 'Lexend', sans-serif; color: #205f64;`

---

## 4. Component Stylings

### A. Navigation & Action Buttons
* **Top Navigation Bar Buttons:**
  - *Active:* Bottom border (4px) in Sage Green (`#498e72`), text in Sage Green, background with micro-opacity (`bg-white/5`).
  - *Inactive:* Transparent bottom border, text in slate gray/slate-400 (`text-slate-400`), transitioning on hover to white text and a white bottom border.
* **Secondary Navigation (Sub-Tabs) Buttons:**
  - *Active:* Solid Sage Green (`#498e72`) background, Deep Teal (`#205f64`) text, slight shadow, and a micro-scale transition (`scale-105`).
  - *Inactive:* White background, Slate Gray (`#404040`) text, subtle border of Ocean Cyan (`border-[#2ca4c2]/30`). On hover, border changes to Sage Green (`#498e72`) and text to Vibrant Light Green (`#75c081`).
* **Primary Action Buttons:**
  - *Normal:* Sage Green background (`#498e72`), Deep Teal text (`#205f64`), bold tracking-widest text.
  - *Hover:* Vibrant Light Green background (`#75c081`), white text.
  - *Transitions:* Active transform scale down (`active:scale-95`), transition all with ease-in-out.
  - *Example CSS / Tailwind:*
    ```html
    <button class="bg-[#498e72] text-[#205f64] hover:bg-[#75c081] hover:text-white transition-all transform active:scale-95 px-6 py-2.5 rounded-xl font-black uppercase tracking-widest text-sm shadow-md">
      Confirm
    </button>
    ```

### B. Cards & Containers
* **Standard Data Cards:** White background (`bg-white`), generously rounded corners (`rounded-2xl` or `rounded-xl`), whisper-soft diffused shadows (`shadow-sm` or `shadow-md`), and a subtle bounding border using Ocean Cyan opacity (`border border-[#2ca4c2]/20`).
* **Modals & Overlays:** Flex container centered in viewport, backing blur backdrop (`backdrop-blur-sm` with `bg-[#205f64]/50`), white modal card with thick drop shadow (`shadow-2xl`), and a header band in slate gray (`bg-slate-50 border-b`).

### C. Inputs & Forms
* **Form Inputs:** White background, borders using light slate (`border-slate-200`), rounded corners (`rounded-xl`).
* **Focused Inputs:** A 2px focus ring using Sage Green (`focus:ring-[#498e72] focus:border-[#498e72]`) with a smooth transition.

---

## 5. Layout Principles
- **Grid Alignment:** Use grid structures (e.g., `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3` or `md:grid-cols-12`) with standard spacing (`gap-4` or `gap-6`) to group related inputs and tables.
- **Table Formatting:** Shared industrial table styling:
  - Header: Background of `bg-slate-50`, text of Deep Teal (`#205f64`), uppercase tracking-wider, Lexend font.
  - Rows: Alternating rows or pure white rows separated by thin borders (`divide-y divide-slate-100`), highlighting on hover (`hover:bg-slate-50`).

---

## 6. Replication Guide (Tailwind Config Extension)

To integrate this styling system into your new Tailwind CSS project, add the colors and font configurations to your `tailwind.config.js`:

```javascript
module.exports = {
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#498e72',    // Sage Green
          secondary: '#75c081',  // Vibrant Light Green
          dark: '#205f64',       // Deep Teal
          accent: '#2ca4c2',     // Ocean Cyan
          focus: '#1a639c',      // Vibrant Deep Blue
        }
      },
      fontFamily: {
        brand: ['Lexend', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
      }
    },
  },
}
```

Then, you can use semantic styles in your React components easily:
- Brand text header: `text-brand-dark font-brand`
- Primary CTA: `bg-brand-primary text-brand-dark hover:bg-brand-secondary hover:text-white transition-all`
- Input borders: `focus:ring-brand-primary focus:border-brand-primary`
