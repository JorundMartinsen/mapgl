import { Field, FieldType, PanelOptionsEditorBuilder, DataFrame } from '@grafana/data';
import { t } from '../../utils/i18n';
import { ExtendFrameGeometrySource, ExtendFrameGeometrySourceMode } from '../../extension';
import { GazetteerPathEditor } from '../../grafana_core/app/features/geo/editor/GazetteerPathEditor';
import { LocationModeEditor } from './locationModeEditor';

export function addLocationFields<TOptions>(
  title: string,
  prefix: string,
  builder: PanelOptionsEditorBuilder<TOptions>, // ??? Perhaps pass in the filtered data?
  isLogic,
  source?: ExtendFrameGeometrySource,
  data?: DataFrame[]
) {
  builder.addCustomEditor({
    id: 'modeEditor',
    path: `${prefix}mode`,
    name: t('geo.location-editor.name-location-mode', 'Location Mode'),
    editor: LocationModeEditor,
    settings: { data, source, isLogic },
    showIf: (opts) => !isLogic,
  });

  // TODO apply data filter to field pickers
  switch (source?.mode) {
    case ExtendFrameGeometrySourceMode.Coords:
      builder
        .addFieldNamePicker({
          path: `${prefix}longitude`,
          name: t('geo.location-editor.name-longitude-field', 'Longitude field'),
          settings: {
            filter: (f: Field) => f.type === FieldType.number,
            noFieldsMessage: t('geo.location-editor.longitude-field.no-fields-message', 'No numeric fields found'),
          },
        })
        .addFieldNamePicker({
          path: `${prefix}latitude`,
          name: t('geo.location-editor.name-latitude-field', 'Latitude field'),
          settings: {
            filter: (f: Field) => f.type === FieldType.number,
            noFieldsMessage: t('geo.location-editor.latitude-field.no-fields-message', 'No numeric fields found'),
          },
        });
      break;

    case ExtendFrameGeometrySourceMode.Geojson:
      builder.addFieldNamePicker({
        path: 'location.geojson',
        name: 'GeoJson field',
        settings: {
          filter: (f: Field) => f.type === FieldType.other,
          noFieldsMessage: 'No GeoJson Points geometry fields found',
        },
      });
      break;

    case ExtendFrameGeometrySourceMode.Geohash:
      builder.addFieldNamePicker({
        path: `${prefix}geohash`,
        name: t('geo.location-editor.name-geohash-field', 'Geohash field'),
        settings: {
          filter: (f: Field) => f.type === FieldType.string,
          noFieldsMessage: t('geo.location-editor.geohash-field.no-fields-message', 'No strings fields found'),
        },
      });
      break;

    case ExtendFrameGeometrySourceMode.Wkt:
      builder
        .addFieldNamePicker({
          path: `${prefix}wkt`,
          name: 'MSSQL geometry field',
          settings: {
            filter: (f: Field) => f.type === FieldType.string,
            noFieldsMessage: 'No WKT string fields found',
          },
        })
        .addSelect({
          path: `${prefix}sourceSrid`,
          name: 'Source coordinate system',
          description: 'Used when no SRID field is selected or its row is empty',
          settings: {
            options: [
              { value: 4326, label: 'WGS 84 (EPSG:4326)' },
              { value: 25832, label: 'ETRS89 / UTM zone 32N (EPSG:25832)' },
              { value: 25833, label: 'ETRS89 / UTM zone 33N (EPSG:25833)' },
              { value: 3857, label: 'Web Mercator (EPSG:3857)' },
            ],
          },
          defaultValue: 4326,
        })
        .addFieldNamePicker({
          path: `${prefix}sridField`,
          name: 'SRID field (optional)',
          description:
            'A numeric query field such as geometry.STSrid; overrides the fixed source coordinate system per row',
          settings: {
            filter: (f: Field) => f.type === FieldType.number,
            noFieldsMessage: 'No numeric SRID fields found',
          },
        });
      break;

    case ExtendFrameGeometrySourceMode.Lookup:
      builder
        .addFieldNamePicker({
          path: `${prefix}lookup`,
          name: t('geo.location-editor.name-lookup-field', 'Lookup field'),
          settings: {
            filter: (f: Field) => f.type === FieldType.string,
            noFieldsMessage: t('geo.location-editor.lookup-field.no-fields-message', 'No strings fields found'),
          },
        })
        .addCustomEditor({
          id: 'gazetteer',
          path: `${prefix}gazetteer`,
          name: t('geo.location-editor.name-gazetteer', 'Gazetteer'),
          editor: GazetteerPathEditor,
        });
  }
}
