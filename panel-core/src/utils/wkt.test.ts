import { parseWkt } from './wkt';

describe('parseWkt', () => {
  it.each([
    ['POINT (10 20)', { type: 'Point', coordinates: [10, 20] }],
    ['LINESTRING (10 20, 30 40)', { type: 'LineString', coordinates: [[10, 20], [30, 40]] }],
    [
      'POLYGON ((10 20, 30 40, 10 20))',
      { type: 'Polygon', coordinates: [[[10, 20], [30, 40], [10, 20]]] },
    ],
    ['MULTIPOINT ((10 20), (30 40))', { type: 'MultiPoint', coordinates: [[10, 20], [30, 40]] }],
  ])('parses %s', (wkt, expected) => {
    expect(parseWkt(wkt)).toEqual(expected);
  });

  it('accepts an SRID prefix and rejects malformed input', () => {
    expect(parseWkt('SRID=4326;POINT (10 20)')).toEqual({ type: 'Point', coordinates: [10, 20] });
    expect(parseWkt('not geometry')).toBeUndefined();
    expect(parseWkt('POLYGON EMPTY')).toBeUndefined();
  });
});
