var ERA5_TP = ee.ImageCollection('ECMWF/ERA5_LAND/MONTHLY_AGGR')
                  .select("total_precipitation_sum")
                  .filterDate('2021-01-01', '2023-01-31')
                  

// Multiplicar cada imagem da colection por 1000 para converter de metros para milimetros
var ERA5_TP_mm = ERA5_TP.map(function (image) {
  return image.multiply(1000).copyProperties(image, ['system:time_start'])
})

// Carregar dados de temperatura maxima e minima
var ERA5_T2M = ee.ImageCollection('ECMWF/ERA5_LAND/MONTHLY_AGGR')
                    .select('temperature_2m_max', 'temperature_2m_min')
                    .filterDate('2021-01-01', '2023-01-31')
                    
                    
// Converter temp para C°
var ERA5_T2M_CELSIUS = ERA5_T2M.map(function (image) {
  return image.subtract(273.15).copyProperties(image, ['system:time_start'])
})

// Criar grafico series temporais para precipitacao
var precipitacaoMensalChart = ui.Chart.image.series({
  imageCollection: ERA5_TP_mm,
  region: Sigef,
  reducer: ee.Reducer.mean(),
  scale: 1000,
  xProperty: 'system:time_start'
}).setOptions({
  title: 'Precipitação Mensal Média (2022 - 2023)',
  vAxis: {
    title: 'Precipitação (mm)',
    titleTextSize: {fontSize: 14, italic: false, bold: true},
    gridlines: {count: 6}
  },
  hAxis: {
    title: 'Ano-Mês',
    titleTextStyle: {fontSize: 14, italic: false, bold: true},
    format: 'yyyy-MM',
    gridlines: {count: 12},
    viewWindow: {
      min: new Date(2021, 01, 01).getTime(),
      max: new Date(2023, 01, 01).getTime()
    }
  },
  series: {
    0: {
      color: '#1f77b4',
      lineWidth: 2,
      pointSize: 4,
      dataOpacity: 1.0
    }
  },
  backgroundColor: {fill: 'transparent'},
  chartArea: {backgroundColor: 'transparent'},
  legend: {position: 'none'}
})

// Criar grafico de temperatura maxima e minima
var temperatureChart = ui.Chart.image.series({
  imageCollection: ERA5_T2M_CELSIUS,
  region: Sigef,
  reducer: ee.Reducer.mean(),
  scale: 1000,
  xProperty: 'system:time_start'
}).setOptions({
  series: {
    0: {color: '#ff7f0e', lineWidth: 2, pointSize: 4, dataOpacity: 1.0}, // temp maxima
    0: {color: '#2ca02c', lineWidth: 2, pointSize: 4, dataOpacity: 1.0}
  },
  title: 'Temperatura Máxima e Mínima (2022 - 2023)',
  vAxis: {
    title: 'Temperatura (C°)',
    titleTextStyle: {fontSize: 14, italic: false, bold: true},
    gridlines: {count: 6}
  },
  hAxis: {
    title: 'Ano-Mês',
    titleTextStyle: {fontSize: 14, italic: false, bold: true},
    format: 'yyyy-MM',
    gridlines: {count: 12},
    viewWindow: {
      min: new Date(2021, 01, 01).getTime(),
      max: new Date(2023, 01, 01).getTime()
    }
  },
  backgroundColor: {fill: 'transparent'},
  chartArea: {backgroundColor: 'transparent'},
  legend: {position: 'none'}
})

print(precipitacaoMensalChart)
print(temperatureChart)

// ========================================
// EXTRAÇÃO DE DADOS PARA TABELA CLIMA
// ========================================

// Carregar dados de umidade relativa
var ERA5_HUMIDITY = ee.ImageCollection('ECMWF/ERA5_LAND/MONTHLY_AGGR')
                        .select('dewpoint_temperature_2m')
                        .filterDate('2021-01-01', '2023-01-31');

// Converter dewpoint para Celsius e calcular umidade relativa aproximada
var ERA5_HUMIDITY_PROCESSED = ERA5_HUMIDITY.map(function(image) {
  var dewpoint = image.select('dewpoint_temperature_2m').subtract(273.15);
  return dewpoint.rename('umidade').copyProperties(image, ['system:time_start']);
});

// Combinar temperatura média e umidade
var climaData = ERA5_T2M_CELSIUS.map(function(tempImage) {
  var date = ee.Date(tempImage.get('system:time_start'));
  
  // Calcular temperatura média entre max e min
  var tempMedia = tempImage.select('temperature_2m_max')
                           .add(tempImage.select('temperature_2m_min'))
                           .divide(2)
                           .rename('temperatura');
  
  // Buscar umidade correspondente
  var umidadeImage = ERA5_HUMIDITY_PROCESSED
                        .filterDate(date, date.advance(1, 'month'))
                        .first();
  
  // Combinar temperatura e umidade
  return tempMedia.addBands(umidadeImage)
                  .set('system:time_start', date.millis())
                  .set('date', date.format('YYYY-MM-dd'));
});

// Extrair valores de cada fazenda de café
var extractClimaData = function(feature) {
  var areaId = feature.get('id'); // ID da fazenda
  
  // Extrair valores para esta fazenda
  var values = climaData.map(function(image) {
    var stats = image.reduceRegion({
      reducer: ee.Reducer.mean(),
      geometry: feature.geometry(),
      scale: 1000,
      maxPixels: 1e9
    });
    
    var date = ee.Date(image.get('system:time_start'));
    
    return ee.Feature(null, {
      'area_id': areaId,
      'data': date.format('YYYY-MM-dd'),
      'temperatura': stats.get('temperatura'),
      'umidade': stats.get('umidade')
    });
  });
  
  return values;
};

// Mapear a função de extração para cada fazenda
var climaFeatures = Sigef.map(extractClimaData).flatten();

// Exportar para Google Drive como GeoJSON
 Export.table.toDrive({
   collection: climaFeatures,
   description: 'clima_Sigef_Fazendas',
   fileFormat: 'GeoJSON',
   selectors: ['area_id', 'data', 'temperatura', 'umidade']
 });

print('Dados de clima preparados para exportação');
print('Total de registros:', climaFeatures.size());
print('Primeiros registros:', climaFeatures);

Map.addLayer(Sigef)