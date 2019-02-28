const layers = require('./layers');
const layer = require('./layer/index');
const layersId = require('./layers/id');
const imageFileData = require('./image-data/image-file-data');
const geoserver = require('./geoserver/geoserver');

module.exports = {
	'/layers': layers,
	'/layers/{id}': layersId,
	'/layer': layer,
	'/image-data': imageFileData,
	'/geoserver/wmts/getCapabilities/{workspace}/{layer}': geoserver
};
