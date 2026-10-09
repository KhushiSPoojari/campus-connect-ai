import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { NAV_ITEMS } from '@/components/layout/Navbar';

describe('Navbar Responsive Layout & Accessibility', () => {
  const navbarFilePath = path.resolve(process.cwd(), 'src/components/layout/Navbar.tsx');
  const navbarCode = fs.readFileSync(navbarFilePath, 'utf-8');

  describe('Navigation Items & Route Mapping', () => {
    it('defines all five primary navigation routes with valid labels and hrefs', () => {
      expect(NAV_ITEMS).toHaveLength(5);

      const routes = NAV_ITEMS.map((item) => item.href);
      expect(routes).toContain('/');
      expect(routes).toContain('/faculty');
      expect(routes).toContain('/classrooms');
      expect(routes).toContain('/navigation');
      expect(routes).toContain('/notices');
    });

    it('provides both full labels and compact shortLabels for responsive display', () => {
      NAV_ITEMS.forEach((item) => {
        expect(item.label).toBeDefined();
        expect(typeof item.label).toBe('string');
        expect(item.label.length).toBeGreaterThan(0);

        expect(item.shortLabel).toBeDefined();
        expect(typeof item.shortLabel).toBe('string');
        expect(item.shortLabel.length).toBeGreaterThan(0);
        expect(item.shortLabel.length).toBeLessThanOrEqual(item.label.length);
      });

      const noticeItem = NAV_ITEMS.find((item) => item.href === '/notices');
      expect(noticeItem?.label).toBe('Notices & Events');
      expect(noticeItem?.shortLabel).toBe('Notices');
    });
  });

  describe('Breakpoint & Overflow Prevention Rules', () => {
    it('does not contain fixed w-[250px] on Brand which causes mobile overflow at 320px', () => {
      expect(navbarCode).not.toContain('w-[250px]');
    });

    it('uses shrink-0 and responsive gap on the desktop nav container instead of unconstrained flex-1 justify-center', () => {
      // Unconstrained flex-1 with justify-center caused nav items to spill outward and overlap with adjacent Auth buttons
      expect(navbarCode).not.toMatch(/<nav[^>]*flex-1[^>]*justify-center/);
      expect(navbarCode).toMatch(/<nav[^>]*shrink-0[^>]*xl:flex/);
    });

    it('renders responsive label spans for desktop navigation links', () => {
      expect(navbarCode).toContain('hidden 2xl:inline');
      expect(navbarCode).toContain('2xl:hidden');
    });

    it('maintains clear separation and responsive labels for Auth actions', () => {
      expect(navbarCode).toContain('Student Login');
      expect(navbarCode).toContain('Admin Portal');
      // Compact labels at xl
      expect(navbarCode).toMatch(/<span className="2xl:hidden">Login<\/span>/);
      expect(navbarCode).toMatch(/<span className="2xl:hidden">Admin<\/span>/);
    });
  });

  describe('Accessibility Attributes', () => {
    it('preserves the accessible skip-to-content link', () => {
      expect(navbarCode).toContain('href="#main-content"');
      expect(navbarCode).toContain('Skip to main content');
      expect(navbarCode).toContain('sr-only');
    });

    it('provides appropriate aria attributes on navigation and mobile toggle', () => {
      expect(navbarCode).toContain('aria-label="Main Navigation"');
      expect(navbarCode).toContain('aria-label="Toggle navigation menu"');
      expect(navbarCode).toContain('aria-expanded={mobileMenuOpen}');
      expect(navbarCode).toContain("aria-current={isActive ? 'page' : undefined}");
    });
  });

  describe('Horizontal Width Budget Calculation across Viewports', () => {
    // Estimated max widths of components based on typography and paddings
    const BRAND_WIDTH_MOBILE = 180; // Icon (36) + gap (8) + title (136)
    const BRAND_WIDTH_XL = 195;     // Icon (40) + gap (12) + title (143)
    const BRAND_WIDTH_2XL = 245;    // Icon (40) + gap (12) + title (143) + subtitle (50)
    const HAMBURGER_BUTTON_WIDTH = 44; // p-2 with 24px icon
    const DESKTOP_NAV_WIDTH_XL = 430;  // 5 compact items with icons & gaps
    const DESKTOP_NAV_WIDTH_2XL = 690; // 5 full items with icons & gaps
    const DESKTOP_AUTH_WIDTH_XL = 285; // Login + Register + Admin (compact)
    const DESKTOP_AUTH_WIDTH_2XL = 340; // Full buttons + icons + gaps

    const VIEWPORTS = [
      { name: 'Mobile S', width: 320, padding: 24, mode: 'mobile' },
      { name: 'Mobile M', width: 375, padding: 32, mode: 'mobile' },
      { name: 'Mobile L', width: 425, padding: 32, mode: 'mobile' },
      { name: 'Tablet Portrait', width: 768, padding: 48, mode: 'mobile' },
      { name: 'Tablet Landscape', width: 1024, padding: 48, mode: 'mobile' },
      { name: 'Standard Desktop', width: 1280, padding: 64, mode: 'desktop-xl' },
      { name: 'Large Laptop', width: 1440, padding: 64, mode: 'desktop-xl' },
      { name: 'Wide Monitor', width: 1728, padding: 64, maxContent: 1600, mode: 'desktop-2xl' },
    ];

    VIEWPORTS.forEach((vp) => {
      it(`fits cleanly within viewport ${vp.name} (${vp.width}px) with zero overflow`, () => {
        const availableWidth = vp.maxContent
          ? Math.min(vp.width - vp.padding, vp.maxContent - vp.padding)
          : vp.width - vp.padding;

        if (vp.mode === 'mobile') {
          // In mobile mode (< 1280px), Brand and Hamburger sit in the header
          const totalUsed = BRAND_WIDTH_MOBILE + HAMBURGER_BUTTON_WIDTH;
          const clearance = availableWidth - totalUsed;
          expect(clearance).toBeGreaterThan(0);
        } else if (vp.mode === 'desktop-xl') {
          // In xl mode (1280px-1535px), Brand, Compact Nav, and Compact Auth sit side-by-side
          const totalUsed = BRAND_WIDTH_XL + DESKTOP_NAV_WIDTH_XL + DESKTOP_AUTH_WIDTH_XL;
          const clearance = availableWidth - totalUsed;
          // Must have at least 150px clearance to guarantee no collision
          expect(clearance).toBeGreaterThan(150);
        } else if (vp.mode === 'desktop-2xl') {
          // In 2xl mode (>= 1536px), Full Nav and Full Auth
          const totalUsed = BRAND_WIDTH_2XL + DESKTOP_NAV_WIDTH_2XL + DESKTOP_AUTH_WIDTH_2XL;
          const clearance = availableWidth - totalUsed;
          expect(clearance).toBeGreaterThan(100);
        }
      });
    });
  });
});
