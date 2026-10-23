export interface BubbleSeed {
  id: string;
  weight: number;
}

export interface PackedBubble {
  id: string;
  x: number;
  y: number;
  diameter: number;
}

export function packBubbles(
  seeds: BubbleSeed[],
  width: number,
  height: number,
): PackedBubble[] {
  if (!seeds.length || width < 1 || height < 1) return [];
  if (seeds.length > 36) {
    const columns = Math.ceil(Math.sqrt((seeds.length * width) / height));
    const rows = Math.ceil(seeds.length / columns);
    const cellWidth = width / columns;
    const cellHeight = height / rows;
    const weights = seeds.map((seed) => Math.sqrt(Math.max(1, seed.weight)));
    const highest = Math.max(...weights);
    return seeds.map((seed, index) => {
      const diameter = Math.max(4, Math.min(cellWidth, cellHeight) * (0.58 + (weights[index] / highest) * 0.32) - 4);
      return {
        id: seed.id,
        x: (index % columns) * cellWidth + (cellWidth - diameter) / 2,
        y: Math.floor(index / columns) * cellHeight + (cellHeight - diameter) / 2,
        diameter,
      };
    });
  }
  const padding = 8;
  const available = Math.max(1, (width - padding * 2) * (height - padding * 2));
  const weights = seeds.map((seed) => Math.sqrt(Math.max(1, seed.weight)));
  const weightArea = weights.reduce((sum, weight) => sum + weight * weight, 0);
  const minimumRadius = Math.max(24, Math.min(38, Math.min(width, height) / 9));
  const maximumRadius = Math.max(minimumRadius, Math.min(width, height) * 0.255);
  const nodes = seeds.map((seed, index) => ({
    id: seed.id,
    radius: Math.min(
      maximumRadius,
      Math.max(minimumRadius, Math.sqrt((available * 0.64 * weights[index] ** 2) / (Math.PI * weightArea))),
    ),
    x: width / 2 + Math.cos(index * 2.39996) * Math.sqrt(index) * minimumRadius,
    y: height / 2 + Math.sin(index * 2.39996) * Math.sqrt(index) * minimumRadius,
  }));

  for (let iteration = 0; iteration < 220; iteration += 1) {
    for (let left = 0; left < nodes.length; left += 1) {
      for (let right = left + 1; right < nodes.length; right += 1) {
        const a = nodes[left];
        const b = nodes[right];
        let dx = b.x - a.x;
        let dy = b.y - a.y;
        let distance = Math.hypot(dx, dy);
        const required = a.radius + b.radius + 4;
        if (distance >= required) continue;
        if (distance < 0.001) {
          dx = Math.cos(right * 2.39996);
          dy = Math.sin(right * 2.39996);
          distance = 1;
        }
        const shift = (required - distance) * 0.51;
        const nx = dx / distance;
        const ny = dy / distance;
        a.x -= nx * shift;
        a.y -= ny * shift;
        b.x += nx * shift;
        b.y += ny * shift;
      }
    }
    for (const node of nodes) {
      node.x += (width / 2 - node.x) * 0.006;
      node.y += (height / 2 - node.y) * 0.006;
      node.x = Math.min(width - padding - node.radius, Math.max(padding + node.radius, node.x));
      node.y = Math.min(height - padding - node.radius, Math.max(padding + node.radius, node.y));
    }
  }

  // The force pass settles the circles visually; a final shared contraction
  // guarantees clear edges even when the viewport is unusually crowded.
  let safeScale = 1;
  for (let left = 0; left < nodes.length; left += 1) {
    for (let right = left + 1; right < nodes.length; right += 1) {
      const a = nodes[left];
      const b = nodes[right];
      const distance = Math.hypot(a.x - b.x, a.y - b.y);
      safeScale = Math.min(safeScale, (distance - 8) / (a.radius + b.radius));
    }
  }
  safeScale = Math.max(0.05, Math.min(1, safeScale));

  return nodes.map((node) => ({
    id: node.id,
    x: node.x - node.radius * safeScale,
    y: node.y - node.radius * safeScale,
    diameter: node.radius * safeScale * 2,
  }));
}
