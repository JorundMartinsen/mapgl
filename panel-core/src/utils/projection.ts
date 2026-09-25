import type { Geometry, Position } from 'geojson';

export type SupportedSrid = 4326 | 25832 | 25833 | 3857;

const SUPPORTED_SRIDS = new Set<number>([4326, 25832, 25833, 3857]);

export function projectGeometry(geometry: Geometry, sourceSrid: SupportedSrid): Geometry | undefined {
  if (!SUPPORTED_SRIDS.has(sourceSrid)) {
    return undefined;
  }
  if (sourceSrid === 4326) {
    return geometry;
  }
  if (geometry.type === 'GeometryCollection') {
    const geometries = geometry.geometries
      .map((item) => projectGeometry(item, sourceSrid))
      .filter((item): item is Geometry => Boolean(item));
    return { ...geometry, geometries };
  }
  return {
    ...geometry,
    coordinates: projectCoordinates(geometry.coordinates, sourceSrid),
  } as Geometry;
}

function projectCoordinates(coordinates: unknown, sourceSrid: SupportedSrid): unknown {
  if (!Array.isArray(coordinates)) {
    return coordinates;
  }
  if (coordinates.length >= 2 && typeof coordinates[0] === 'number' && typeof coordinates[1] === 'number') {
    const [longitude, latitude] = projectPosition(coordinates[0], coordinates[1], sourceSrid);
    return [longitude, latitude, ...coordinates.slice(2)] as Position;
  }
  return coordinates.map((item) => projectCoordinates(item, sourceSrid));
}

function projectPosition(x: number, y: number, sourceSrid: SupportedSrid): [number, number] {
  if (sourceSrid === 3857) {
    const radius = 6378137;
    return [(x / radius) * (180 / Math.PI), (2 * Math.atan(Math.exp(y / radius)) - Math.PI / 2) * (180 / Math.PI)];
  }
  return utmToWgs84(x, y, sourceSrid === 25832 ? 32 : 33);
}

function utmToWgs84(easting: number, northing: number, zone: 32 | 33): [number, number] {
  const semiMajorAxis = 6378137;
  const flattening = 1 / 298.257222101;
  const scale = 0.9996;
  const eccentricitySquared = flattening * (2 - flattening);
  const secondEccentricitySquared = eccentricitySquared / (1 - eccentricitySquared);
  const x = easting - 500000;
  const meridionalArc = northing / scale;
  const mu =
    meridionalArc /
    (semiMajorAxis *
      (1 - eccentricitySquared / 4 - (3 * eccentricitySquared ** 2) / 64 - (5 * eccentricitySquared ** 3) / 256));
  const e1 = (1 - Math.sqrt(1 - eccentricitySquared)) / (1 + Math.sqrt(1 - eccentricitySquared));
  const footprintLatitude =
    mu +
    ((3 * e1) / 2 - (27 * e1 ** 3) / 32) * Math.sin(2 * mu) +
    ((21 * e1 ** 2) / 16 - (55 * e1 ** 4) / 32) * Math.sin(4 * mu) +
    ((151 * e1 ** 3) / 96) * Math.sin(6 * mu) +
    ((1097 * e1 ** 4) / 512) * Math.sin(8 * mu);
  const sinLatitude = Math.sin(footprintLatitude);
  const cosLatitude = Math.cos(footprintLatitude);
  const tangentSquared = Math.tan(footprintLatitude) ** 2;
  const c = secondEccentricitySquared * cosLatitude ** 2;
  const radiusPrimeVertical = semiMajorAxis / Math.sqrt(1 - eccentricitySquared * sinLatitude ** 2);
  const radiusMeridian =
    (semiMajorAxis * (1 - eccentricitySquared)) / (1 - eccentricitySquared * sinLatitude ** 2) ** 1.5;
  const d = x / (radiusPrimeVertical * scale);
  const latitude =
    footprintLatitude -
    ((radiusPrimeVertical * Math.tan(footprintLatitude)) / radiusMeridian) *
      (d ** 2 / 2 -
        ((5 + 3 * tangentSquared + 10 * c - 4 * c ** 2 - 9 * secondEccentricitySquared) * d ** 4) / 24 +
        ((61 +
          90 * tangentSquared +
          298 * c +
          45 * tangentSquared ** 2 -
          252 * secondEccentricitySquared -
          3 * c ** 2) *
          d ** 6) /
          720);
  const centralMeridian = ((zone * 6 - 183) * Math.PI) / 180;
  const longitude =
    centralMeridian +
    (d -
      ((1 + 2 * tangentSquared + c) * d ** 3) / 6 +
      ((5 - 2 * c + 28 * tangentSquared - 3 * c ** 2 + 8 * secondEccentricitySquared + 24 * tangentSquared ** 2) *
        d ** 5) /
        120) /
      cosLatitude;
  return [(longitude * 180) / Math.PI, (latitude * 180) / Math.PI];
}
