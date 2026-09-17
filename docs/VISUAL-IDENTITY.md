# VonWork Visual Identity

## Core idea

VonWork is an **AI Business Operating System**. The identity balances deep-navy trust, cobalt execution, and an aqua intelligence signal. The new V monogram is intentionally simple enough to work as a favicon, a sidebar mark, a mobile app icon, and a product badge.

| Element | Specification | Intended effect |
|---|---|---|
| **Monogram** | Abstract V with a forward motion / intelligence accent | Recognition at product-icon scale |
| **Deep navy** | `#0B1736` | Trust, depth, and premium enterprise positioning |
| **Cobalt** | `#246BFD` | Action, clarity, and product energy |
| **Aqua** | `#14D9C4` | AI intelligence, connection, and a memorable highlight |
| **Surface** | `#F5F7FA` / white cards | Keeps complex operations pages calm and legible |
| **Gradient** | Navy → cobalt, with a restrained aqua radial highlight | Distinguishes VonWork page headers from generic blue SaaS dashboards |

## Applied surfaces

The shared `BrandMark` component owns the public-site and dashboard wordmark treatment. It uses the same monogram asset in navigation, the authenticated sidebar, legacy dashboard shell, and browser favicon. `PageHeader`, `DashboardLayout`, and the global `.page-header` utility use the signature gradient to maintain consistency across operational pages.

## Usage rules

Use the monogram on a light surface with the navy wordmark, or use the white wordmark only on a navy surface. Do not place the mark on visually busy photography without a solid container. Reserve aqua for highlights and intelligence signals; cobalt remains the primary interactive color. Maintain readable dark foreground text on white surfaces and never use aqua as body-copy text.

## Accessibility

Buttons use navy/cobalt backgrounds with white labels. Body text remains deep navy or slate on light surfaces. Aqua is treated as an accent rather than the only state indicator, so information does not depend on color alone.
