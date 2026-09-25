import { toDataFrame } from '@grafana/data';
import { getGeometryField } from './location';
import { getLocationMatchers } from './locationMatchers';

describe('MSSQL WKT location projection', () => {
  it('uses a configured SRID field per row and falls back to the fixed SRID', async () => {
    const frame = toDataFrame({
      fields: [
        { name: 'geotext', values: ['POINT (590000 6550000)', 'POINT (500000 6600000)'] },
        { name: 'srid', values: [25832, null] },
      ],
    });
    const matchers = await getLocationMatchers({
      mode: 'wkt',
      wkt: 'geotext',
      sridField: 'srid',
      sourceSrid: 25833,
    });

    const result = getGeometryField(frame, matchers);

    expect(result.warning).toBeUndefined();
    expect(result.field?.values[0]).toEqual({
      type: 'Point',
      coordinates: [expect.closeTo(10.5702456, 5), expect.closeTo(59.0798364, 5)],
    });
    expect(result.field?.values[1]).toEqual({
      type: 'Point',
      coordinates: [expect.closeTo(15, 8), expect.closeTo(59.5383491, 5)],
    });
  });
});
