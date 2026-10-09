import type { CampusNavigationGraph, NavNode, NavigationRouteResult, PathStep } from '@/types/navigation';
import { CAMPUS_MAP_GRAPH } from '@/data';

const WALKING_SPEED_METERS_PER_MINUTE = 75; // average comfortable campus walking pace

interface AdjacencyEdge {
  toNodeId: string;
  distanceMeters: number;
  description: string;
}

/**
 * Builds an undirected adjacency list from graph nodes and edges.
 */
function buildAdjacencyList(graph: CampusNavigationGraph): Map<string, AdjacencyEdge[]> {
  const adj = new Map<string, AdjacencyEdge[]>();

  for (const node of graph.nodes) {
    adj.set(node.id, []);
  }

  for (const edge of graph.edges) {
    if (adj.has(edge.from) && adj.has(edge.to)) {
      adj.get(edge.from)!.push({
        toNodeId: edge.to,
        distanceMeters: edge.distanceMeters,
        description: edge.description,
      });
      // Walkways are bidirectional
      adj.get(edge.to)!.push({
        toNodeId: edge.from,
        distanceMeters: edge.distanceMeters,
        description: edge.description,
      });
    }
  }

  return adj;
}

/**
 * Finds shortest route between two campus landmarks/buildings using Dijkstra's algorithm.
 * Returns null if either node is invalid or unreachable.
 */
export function findCampusRoute(
  fromNodeId: string,
  toNodeId: string,
  graph: CampusNavigationGraph = CAMPUS_MAP_GRAPH
): NavigationRouteResult | null {
  if (!fromNodeId || !toNodeId || typeof fromNodeId !== 'string' || typeof toNodeId !== 'string') {
    return null;
  }

  const nodeMap = new Map<string, NavNode>(graph.nodes.map(n => [n.id, n]));
  const startNode = nodeMap.get(fromNodeId);
  const endNode = nodeMap.get(toNodeId);

  if (!startNode || !endNode) {
    return null;
  }

  // Same node
  if (fromNodeId === toNodeId) {
    return {
      pathNodes: [startNode],
      totalDistanceMeters: 0,
      estimatedMinutes: 0,
      steps: [
        {
          fromNode: startNode,
          toNode: startNode,
          instruction: `You are already at ${startNode.name}.`,
          distanceMeters: 0,
        },
      ],
    };
  }

  const adj = buildAdjacencyList(graph);
  const distances = new Map<string, number>();
  const previous = new Map<string, { nodeId: string; edge: AdjacencyEdge } | null>();
  const unvisited = new Set<string>();

  for (const node of graph.nodes) {
    distances.set(node.id, Infinity);
    previous.set(node.id, null);
    unvisited.add(node.id);
  }

  distances.set(fromNodeId, 0);

  while (unvisited.size > 0) {
    // Pick unvisited node with smallest distance
    let currentId: string | null = null;
    let minDistance = Infinity;

    for (const id of unvisited) {
      const dist = distances.get(id)!;
      if (dist < minDistance) {
        minDistance = dist;
        currentId = id;
      }
    }

    if (currentId === null || minDistance === Infinity) {
      break; // Remaining nodes are unreachable
    }

    if (currentId === toNodeId) {
      break; // Reached target
    }

    unvisited.delete(currentId);

    const neighbors = adj.get(currentId) || [];
    for (const edge of neighbors) {
      if (unvisited.has(edge.toNodeId)) {
        const alt = distances.get(currentId)! + edge.distanceMeters;
        if (alt < distances.get(edge.toNodeId)!) {
          distances.set(edge.toNodeId, alt);
          previous.set(edge.toNodeId, { nodeId: currentId, edge });
        }
      }
    }
  }

  // Check if target was reached
  if (distances.get(toNodeId) === Infinity) {
    return null; // No path exists
  }

  // Reconstruct path
  const pathNodeIds: string[] = [];
  const edgeList: AdjacencyEdge[] = [];
  let curr: string | null = toNodeId;

  while (curr && curr !== fromNodeId) {
    pathNodeIds.unshift(curr);
    const prevEntry = previous.get(curr);
    if (!prevEntry) break;
    edgeList.unshift(prevEntry.edge);
    curr = prevEntry.nodeId;
  }
  pathNodeIds.unshift(fromNodeId);

  const pathNodes = pathNodeIds.map(id => nodeMap.get(id)!);
  const totalDistanceMeters = distances.get(toNodeId)!;
  const estimatedMinutes = Math.max(1, Math.round(totalDistanceMeters / WALKING_SPEED_METERS_PER_MINUTE));

  // Build step-by-step instructions
  const steps: PathStep[] = [];
  for (let i = 0; i < pathNodes.length - 1; i++) {
    const from = pathNodes[i];
    const to = pathNodes[i + 1];
    const edge = edgeList[i];
    steps.push({
      fromNode: from,
      toNode: to,
      instruction: edge ? edge.description : `Walk from ${from.name} to ${to.name}.`,
      distanceMeters: edge ? edge.distanceMeters : 0,
    });
  }

  return {
    pathNodes,
    totalDistanceMeters,
    estimatedMinutes,
    steps,
  };
}
