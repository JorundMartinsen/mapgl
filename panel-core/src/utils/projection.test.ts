import type { Polygon } from 'geojson';
import { projectGeometry } from './projection';

describe('projectGeometry', () => {
  it('projects an ETRS89 / UTM zone 32N polygon to WGS 84', () => {
    const polygon: Polygon = {
      type: 'Polygon',
      coordinates: [
        [
          [590000, 6550000],
          [591000, 6550000],
          [591000, 6551000],
          [590000, 6550000],
        ],
      ],
    };

    const projected = projectGeometry(polygon, 25832) as Polygon;

    expect(projected.coordinates[0][0][0]).toBeCloseTo(10.5702456, 5);
    expect(projected.coordinates[0][0][1]).toBeCloseTo(59.0798364, 5);
    expect(projected.coordinates[0][0]).toEqual(projected.coordinates[0].at(-1));
  });

  it('projects ETRS89 / UTM zone 33N and Web Mercator points', () => {
    expect(projectGeometry({ type: 'Point', coordinates: [500000, 6600000] }, 25833)).toEqual({
      type: 'Point',
      coordinates: [expect.closeTo(15, 8), expect.closeTo(59.5383491, 5)],
    });
    expect(projectGeometry({ type: 'Point', coordinates: [1113194.9079, 1118889.9749] }, 3857)).toEqual({
      type: 'Point',
      coordinates: [expect.closeTo(10, 5), expect.closeTo(10, 5)],
    });
  });

  it('leaves WGS 84 unchanged and rejects unsupported SRIDs', () => {
    const point = { type: 'Point' as const, coordinates: [10, 20] };
    expect(projectGeometry(point, 4326)).toBe(point);
    expect(projectGeometry(point, 9999 as 4326)).toBeUndefined();
  });
});
