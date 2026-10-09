export type NodeType = 'building' | 'gate' | 'landmark' | 'facility' | 'junction';

export interface NavNode {
  id: string;
  name: string;
  code: string;
  type: NodeType;
  x: number; // SVG coordinate (0 - 1000)
  y: number; // SVG coordinate (0 - 800)
  description: string;
  facilities: string[];
}

export interface NavEdge {
  from: string;
  to: string;
  distanceMeters: number;
  description: string;
}

export interface CampusNavigationGraph {
  nodes: NavNode[];
  edges: NavEdge[];
}

export interface PathStep {
  fromNode: NavNode;
  toNode: NavNode;
  instruction: string;
  distanceMeters: number;
}

export interface CampusLocation {
  id: string;
  name: string;
  building: string;
  floor: string;
  roomOrOffice?: string;
  landmark: string;
  nodeId: string; // references NavNode.id
  tags: string[];
}

export interface NavigationRouteResult {
  pathNodes: NavNode[];
  totalDistanceMeters: number;
  estimatedMinutes: number;
  steps: PathStep[];
}
