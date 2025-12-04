var startDate = '2021-01-01';
var endDate = '2023-01-31';

var colecao = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
  .filterDate(startDate, endDate)
  .filterBounds(Sigef)
  .filterMetadata('CLOUDY_PIXEL_PERCENTAGE', 'less_than', 20);

// Calcular NDVI
var calcular_NDVI = function(imagem) {
  var ndvi = imagem.normalizedDifference(['B8', 'B4']).rename('NDVI');
  return imagem.addBands(ndvi);
};

// Aplica a função à coleção
var colecaoNDVI = colecao.map(calcular_NDVI);

// Reduzir para média mensal
var meses = ee.List.sequence(0, ee.Date(endDate).difference(ee.Date(startDate), 'month').subtract(1));

var listaFeatures = meses.iterate(function(m, acc) {
  var ini = ee.Date(startDate).advance(m, 'month');
  var fim = ini.advance(1, 'month');
  var img = colecaoNDVI.filterDate(ini, fim).median();
  var hasBand = img.bandNames().size().gt(0);
  var feats = Sigef.toList(Sigef.size()).map(function(fazenda) {
    fazenda = ee.Feature(fazenda);
    var stats = ee.Algorithms.If(
      hasBand,
      img.select('NDVI').reduceRegion({
        reducer: ee.Reducer.mean(),
        geometry: fazenda.geometry(),
        scale: 10,
        maxPixels: 1e9
      }),
      null
    );
    return ee.Feature(null, {
      'area_id': fazenda.get('id'),
      'data': ini.format('YYYY-MM-dd'),
      'ndvi': ee.Algorithms.If(stats, ee.Dictionary(stats).get('NDVI'), null)
    });
  });
  return ee.List(acc).cat(feats);
}, ee.List([]));

var ndviMensal = ee.FeatureCollection(ee.List(listaFeatures));

// Exportar para o Google Drive
Export.table.toDrive({
  collection: ndviMensal,
  description: 'ndvi_Sigef_sigef_2021_2023',
  fileFormat: 'GeoJSON',
  selectors: ['area_id', 'data', 'ndvi']
});

print(ndviMensal);
print('NDVI mensal das Sigef preparado para exportação');