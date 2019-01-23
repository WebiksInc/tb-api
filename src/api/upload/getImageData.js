const exif = require('exif-parser');
const exiftool = require('exiftool');
const moment = require('moment');
const fs = require('fs-extra');
const { ansyn } = require('../../../config/config');
const uploadToS3 = require('../s3/uploadToS3');
const { saveDataToDB, setFileData, setWorldLayer } = require('./uploadUtils');
const getGeoDataFromPoint = require('../ansyn/getGeoData');
const getDroneGeoData = require('../ansyn/getDroneGeoData');

const getImageData = (worldId, reqFiles, name, path, sourceType) => {
	let files = reqFiles.length ? reqFiles : [reqFiles];

	if (files.length !== 0) {
		const images = files.map(file => {
			// 1. set the file Data from the upload file
			const fileData = setFileData(file);
			console.log('1. set FileData: ' + JSON.stringify(fileData, null, 4));

			// 2. set the world-layer data
			const worldLayer = setWorldLayer(file, fileData);
			console.log('2. worldLayer include Filedata: ', JSON.stringify(worldLayer, null, 4));

			// get 2 promised simultaneously:
			// A. get the image data
			const buffer = fs.readFileSync(file.filePath);
			// 3. get ALL the metadata of the image file (including the drone-cesium service)
			const imageData = getMetadata(worldLayer, file.filePath, buffer)
				.then(metadata => {
					console.log(`3. include Metadata: ${JSON.stringify(metadata, null, 4)}`);
					// update the sourceType if it's empty
					if (!sourceType) {
						const sensorType = file.inputData.sensor.type;
						if (sensorType.toLowerCase().includes('drone')) {
							sourceType = 'drone';
						} else {
							sourceType = 'mobile';
						}
					}
					// 4. set the geoData of the image file
					const geoData = setGeoData({ ...metadata });
					console.log(`4. include Geodata: ${JSON.stringify(geoData, null, 4)}`);

					// 5. set the inputData of the image file
					const inputData = setInputData({ ...geoData });
					const newFile = { ...inputData };
					console.log(`5. include Inputdata: ${JSON.stringify(newFile, null, 4)}`);

					// 6. get the real footprint of the Drone's image from cesium (for Drone's images only)
					if (sourceType === 'drone') {
						return getDroneGeoData(newFile);
					} else {
						return Promise.resolve(newFile);
					}
				})
				.catch(error => {
					console.log(error);
					return null;
				});

			// B. upload the file and its thumbnail to S3
			const s3Upload = uploadToS3(file, buffer, sourceType, null);

			// save ALL the image data to mongo DataBase
			return Promise.all([imageData, s3Upload])
				.then(file => {
					const filePath = file[1].filePath ? file[1].filePath : null;
					const thumbnailUrl = file[1].thumbnailUrl ? file[1].thumbnailUrl : null;
					file[0].fileData.filePath = filePath ? filePath : file[0].fileData.filePath;

					file = {
						...file[0],
						displayUrl: filePath,
						thumbnailUrl
					};
					console.log(`save to mongoDB(file): ${JSON.stringify(file, null, 4)}`);
					return saveDataToDB(file, worldId);
				})
				.catch(err => {
					console.log(err);
					return null;
				});
		});

		return Promise.all(images);

	} else {
		console.log('there ara no files to upload!');
		return [];
	}
	// ============================================= Private Functions =================================================
	// get the metadata of the image file
	function getMetadata(file, filePath, buffer) {
		let imageData;
		const parser = exif.create(buffer);

		// get the image's MetaData from the exif-parser
		const result = parser.parse();
		const {
			Make, Model,
			GPSLatitudeRef, GPSLatitude, GPSLongitudeRef, GPSLongitude, GPSAltitude,
			ExifImageWidth, ExifImageHeight
		} = result.tags;

		// 2. get the image's MetaData from the exif-tool
		return new Promise((resolve, reject) => {
			exiftool.metadata(buffer, function (err, results) {
				if (err) {
					console.log(`ERROR exiftool: ${err}`);
					reject(err);
				}

				// convert the results to an object
				let metadata = {};
				Object.entries(results).forEach((entry) => {
					const key = entry[0];
					const value = entry[1];
					metadata[key] = value;
				});
				console.log('metadata object:', JSON.stringify(metadata, null, 4));

				// format the dates
				const exifDateFormat = 'YYYY:MM:DD hh:mm:ss';
				const {
					modifyDate,
					['date/timeOriginal']: dateTimeOriginal, createDate
				} = metadata;

				imageData = {
					...imageData,
					Make, Model,
					GPSLatitudeRef, GPSLatitude, GPSLongitudeRef, GPSLongitude, GPSAltitude,
					ExifImageWidth, ExifImageHeight,
					modifyDate: moment(modifyDate, exifDateFormat).toString(),
					dateTimeOriginal: moment(dateTimeOriginal, exifDateFormat).toString(),
					createDate: moment(createDate, exifDateFormat).toString()
				};

				// convert the 'fieldOfView' to a number
				if (metadata.fieldOfView) {
					metadata.fieldOfView = parseFloat(metadata.fieldOfView.split(' ')[0]);
				}

				if (metadata.pitch && metadata.yaw && metadata.roll) {
					const {
						relativeAltitude, fieldOfView,
						pitch, yaw, roll,
						cameraPitch, cameraYaw, cameraRoll,
						gimbalRollDegree, gimbalYawDegree, gimbalPitchDegree,
						flightRollDegree, flightYawDegree, flightPitchDegree,
						camReverse, gimbalReverse
					} = metadata;

					imageData = {
						...imageData,
						relativeAltitude, fieldOfView,
						pitch, yaw, roll,
						cameraPitch, cameraYaw, cameraRoll,
						gimbalRollDegree, gimbalYawDegree, gimbalPitchDegree,
						flightRollDegree, flightYawDegree, flightPitchDegree,
						camReverse, gimbalReverse
					};
					// update the sensorType if it's empty
					if (!file.inputData.sensor.type) {
						file.inputData.sensor.type = 'Drone Imagery(JPG)';
					}
				} else {
					if (!file.inputData.sensor.type) {
						file.inputData.sensor.type = 'Mobile Imagery(JPG)';
					}
				}
				// set the Date's fields in the layer's model
				file.fileData.fileCreatedDate = imageData.createDate;
				file.createdDate = Date.parse((file.fileData.fileCreatedDate));

				resolve({ ...file, imageData });
			});
		});
	}

	// set the geoData from the image GPS
	function setGeoData(layer) {
		// set the center point and the droneCenter (the same point, for now)
		const centerPoint = [layer.imageData.GPSLongitude || 0, layer.imageData.GPSLatitude || 0];
		// set the geoData
		let footPrintPixelSize;
		if (sourceType === 'mobile') {
			footPrintPixelSize = ansyn.mobileFootPrintPixelSize;
		} else {
			footPrintPixelSize = ansyn.droneFootPrintPixelSize;
		}
		let geoData = getGeoDataFromPoint(centerPoint, footPrintPixelSize);
		geoData.isGeoRegistered = false;
		geoData = { ...geoData, centerPoint };
		console.log('setGeoData: ', JSON.stringify(geoData));
		return { ...layer, geoData };
	}

	function setInputData(layer) {
		layer.inputData.flightAltitude = layer.imageData.GPSAltitude ? layer.imageData.GPSAltitude : 0;
		layer.inputData.sensor.model = layer.imageData.Model ? layer.imageData.Model.trim().toUpperCase() : null;
		layer.inputData.sensor.maker = layer.imageData.Make ? layer.imageData.Make.trim().toUpperCase() : null;
		if (!layer.inputData.sensor.name) {
			if (layer.inputData.sensor.maker && layer.inputData.sensor.model) {
				layer.inputData.sensor.name = `${layer.inputData.sensor.maker}_${layer.inputData.sensor.model}`;
			}
		}
		return { ...layer };
	}
};

module.exports = getImageData;