import { describe, it, expect } from 'vitest';
import { findCampusRoute } from '@/lib/navigation/campus-navigation';

describe('Campus Navigation & Wayfinding Engine', () => {
  it('calculates the direct route between adjacent landmarks', () => {
    // node-main-gate -> node-admin (160 meters)
    const route = findCampusRoute('node-main-gate', 'node-admin');
    expect(route).not.toBeNull();
    expect(route?.pathNodes).toHaveLength(2);
    expect(route?.pathNodes[0].id).toBe('node-main-gate');
    expect(route?.pathNodes[1].id).toBe('node-admin');
    expect(route?.totalDistanceMeters).toBe(160);
    expect(route?.estimatedMinutes).toBeGreaterThanOrEqual(1);
    expect(route?.steps).toHaveLength(1);
    expect(route?.steps[0].instruction).toContain('Palm Boulevard');
  });

  it('calculates optimal multi-hop shortest path using Dijkstra algorithm', () => {
    // node-main-gate -> node-turing
    // Possible paths:
    // 1. main-gate (160) -> admin (170) -> library (220) -> turing = 550m
    // 2. main-gate (180) -> auditorium (190) -> library (220) -> turing = 590m
    const route = findCampusRoute('node-main-gate', 'node-turing');
    expect(route).not.toBeNull();
    expect(route?.totalDistanceMeters).toBe(550);
    expect(route?.pathNodes.map(n => n.id)).toEqual([
      'node-main-gate',
      'node-admin',
      'node-library',
      'node-turing',
    ]);
    expect(route?.steps.length).toBe(3);
    expect(route?.estimatedMinutes).toBe(Math.round(550 / 75));
  });

  it('handles navigation when origin and destination are identical', () => {
    const route = findCampusRoute('node-turing', 'node-turing');
    expect(route).not.toBeNull();
    expect(route?.pathNodes).toHaveLength(1);
    expect(route?.totalDistanceMeters).toBe(0);
    expect(route?.estimatedMinutes).toBe(0);
    expect(route?.steps[0].instruction).toContain('already at');
  });

  it('returns null safely when either start or end node is invalid or missing', () => {
    expect(findCampusRoute('invalid-node-id', 'node-turing')).toBeNull();
    expect(findCampusRoute('node-turing', 'non-existent-id')).toBeNull();
    expect(findCampusRoute('', 'node-turing')).toBeNull();
    // @ts-expect-error test invalid types
    expect(findCampusRoute(null, undefined)).toBeNull();
  });
});
