import type { Geometry, Position } from 'geojson';

type Coordinates = Position | Position[] | Position[][] | Position[][][];

/** Parses the OGC WKT emitted by SQL Server geometry.STAsText(). */
export function parseWkt(value: string): Geometry | undefined {
  const match = value.trim().match(/^(?:SRID=\d+;)?\s*(POINT|LINESTRING|POLYGON|MULTIPOINT|MULTILINESTRING|MULTIPOLYGON)\s*(.*)$/i);
  if (!match || /^EMPTY$/i.test(match[2].trim())) {
    return undefined;
  }

  try {
    const type = canonicalType(match[1]);
    const coordinates = normalizeCoordinates(type, parseGroup(match[2].trim()));
    return { type, coordinates } as Geometry;
  } catch {
    return undefined;
  }
}

function normalizeCoordinates(type: Geometry['type'], coordinates: Coordinates): Coordinates {
  if (type === 'Polygon') {
    return (coordinates as Position[][]).map(closeRing);
  }
  if (type === 'MultiPolygon') {
    return (coordinates as Position[][][]).map((polygon) => polygon.map(closeRing));
  }
  return coordinates;
}

function closeRing(ring: Position[]): Position[] {
  if (ring.length === 0) {
    return ring;
  }
  const first = ring[0];
  const last = ring[ring.length - 1];
  const isClosed = first.length === last.length && first.every((coordinate, index) => coordinate === last[index]);
  return isClosed ? ring : [...ring, [...first]];
}

function canonicalType(type: string): Geometry['type'] {
  const names: Record<string, Geometry['type']> = {
    POINT: 'Point',
    LINESTRING: 'LineString',
    POLYGON: 'Polygon',
    MULTIPOINT: 'MultiPoint',
    MULTILINESTRING: 'MultiLineString',
    MULTIPOLYGON: 'MultiPolygon',
  };
  return names[type.toUpperCase()];
}

function parseGroup(text: string): Coordinates {
  if (!text.startsWith('(') || !text.endsWith(')')) {
    throw new Error('Invalid WKT group');
  }

  const content = text.slice(1, -1).trim();
  const parts = splitTopLevel(content);
  if (parts.some((part) => part.startsWith('('))) {
    return parts.map(parseGroup) as Coordinates;
  }
  if (parts.length === 1) {
    return parsePosition(parts[0]);
  }
  return parts.map(parsePosition);
}

function splitTopLevel(value: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < value.length; i++) {
    if (value[i] === '(') {
      depth++;
    } else if (value[i] === ')') {
      depth--;
      if (depth < 0) {
        throw new Error('Unbalanced WKT');
      }
    } else if (value[i] === ',' && depth === 0) {
      parts.push(value.slice(start, i).trim());
      start = i + 1;
    }
  }
  if (depth !== 0) {
    throw new Error('Unbalanced WKT');
  }
  parts.push(value.slice(start).trim());
  return parts;
}

function parsePosition(value: string): Position {
  const position = value
    .trim()
    .replace(/^\(|\)$/g, '')
    .split(/\s+/)
    .map(Number);
  if (position.length < 2 || position.some((coordinate) => !Number.isFinite(coordinate))) {
    throw new Error('Invalid WKT position');
  }
  return position;
}
