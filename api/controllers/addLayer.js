const sensorTypes = require('../swagger/config/paths/layer/sensorTypes');
const droneImagery = require('./addLayer/droneImagery');
const config = require('../../config/config');
const saveLayerOnDB = require('./utils/db/saveToDB');
const uploadToGeoServer = require('./utils/geoserver/uploadToGeoServer');
const uuid = require('uuid');
const turf = require('@turf/turf');

const _buildThumbnailUrl = (overlay) => {
	const { bbox } = overlay.tag;
	const BBOX = `${bbox.minx},${bbox.miny},${bbox.maxx},${bbox.maxy}`;
	return `${overlay.imageUrl}?SERVICE=WMS&VERSION=1.1.1&REQUEST=GetMap&FORMAT=image%2Fjpeg&TRANSPARENT=true&tiled=true&LAYERS=${overlay.tag.geoserver.layer.resource.name}&exceptions=application%2Fvnd.ogc.se_inimage&tilesOrigin=-57.710227986794244%2C-31.98336391045549&WIDTH=256&HEIGHT=256&SRS=${overlay.tag.projection}&STYLES=&BBOX=${BBOX}`
};

const addLayer = (req, res) => {
	const _id = uuid();

	const fields = {};
	Object.entries(req.swagger.params).forEach(([key, value]) => {
		fields[key] = value.value;
	});
	console.log('fields: ', fields);
	const { file } = fields;
	let overlay = {
		name: file.originalname,
		sensorType: fields.sensorType,
		sensorName: fields.sensorName,
		creditName: fields.creditName,
	};
	console.log('overlay' , overlay);
	if(fields.date && !isNaN(fields.date)){
		overlay['date'] = new Date(+fields.date);
	}else{
		overlay['date'] = new Date();
	}
	console.log('overlay date' , overlay.date);
	overlay['photoTime'] = overlay.date.toISOString();
	overlay.id = _id;

	let promiseResp;

	console.log(`Upload ${fields.sensorType}`);

	switch (fields.sensorType) {
		case sensorTypes.DroneImagery:
			promiseResp = droneImagery(_id, fields.file, fields.sharing);
			break;
		case sensorTypes.Mobile:
			promiseResp = Promise.resolve({ type: 'mobile' }); //TODO: implement Mobile upload
			break;

		case sensorTypes.DroneMap:
			promiseResp = uploadToGeoServer('public', fields.file.buffer, `${_id}.tiff`);
			break;

		case sensorTypes.Satellite:
			promiseResp = Promise.resolve({ type: 'satellite' }); //TODO: implement Satellite upload
			break;
	}

	promiseResp.then(overlayResp => {
		Object.assign(overlay, overlayResp);
		overlay.imageUrl = `${config.geoserver.url}/${fields.sharing}/wms`;
		overlay.thumbnailUrl = _buildThumbnailUrl(overlay);
		if (!overlay.footprint) {
			const { minx, miny, maxx, maxy } = overlay.tag.bbox;
			const bboxPolygon = turf.bboxPolygon([minx, miny, maxx, maxy]);
			overlay.footprint = turf.geometry('MultiPolygon', [bboxPolygon.geometry.coordinates]);
		}
		console.log('final overlay: ' , overlay);
		saveLayerOnDB({ _id, overlay }, fields.sharing).then(() => {
			console.log('finish upload layer');
			res.json(overlay);
		});
	})
		.catch(err => res.status(500).send(err.message));
};

module.exports = {
	addLayer
};
