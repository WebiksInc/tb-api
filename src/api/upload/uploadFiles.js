const AdmZip = require('adm-zip');
const uuid = require('uuid');
const fs = require('fs-extra');
const { upload } = require('../../../config/config');
const imageHandler = require('./imageHandler');
const geoserverHandle = require('./geoserverHandler');
const { getFileTypeData } = require('../fs/fileMethods');

const uploadPath = `${__dirname.replace(/\\/g, '/')}/public/uploads/`;

const uploadFiles = (req, res) => {
	console.log('start upload utils to: ', uploadPath);

	// Define the request Files
	// 1. convert it to JSON and back to an Object
	let reqFiles = req.files.uploads;
	const jsonFiles = JSON.stringify(reqFiles);
	reqFiles = JSON.parse(jsonFiles);
	console.log(`req Files: ${jsonFiles}`);
	console.log('req length: ', reqFiles.length);

	// 2. find the worldId and the file type and source
	let worldId;
	let sensorType;
	let name;
	let path;
	let file;
	let fields;

	if (!reqFiles.length) {
		file = reqFiles;
		fields = req.fields ? req.fields : null;
	} else {
		file = reqFiles[0];
		fields = req.fields[0] ? req.fields[0] : null;
	}

	if (req.params.worldId) {
		worldId = req.params.worldId;
	} else {
		if (fields) {
			worldId = fields.sharing ? fields.sharing.toLowerCase() : upload.defaultWorldId;
			sensorType = fields.sensorType ? fields.sensorType : null;
		} else {
			worldId = upload.defaultWorldId;
		}
	}
	console.log(`req Fields: ${JSON.stringify(fields, null, 4)}`);
	console.log('worldId: ', worldId);
	// get the file type data (type,source,format)
	const typeData = getFileTypeData(file.type, sensorType);

	// 3. check if need to make a ZIP file
	if (!reqFiles.length) {
		// set a single file before upload
		file = setBeforeUpload(file, typeData, uploadPath, fields);
		name = file.encodeFileName;
		path = uploadPath + name;
		console.log('uploadUtils SINGLE req file(after): ', JSON.stringify(file, null, 4));

		// send to the right upload handler according to the type
		uploadHandler(res, worldId, file, name, path, typeData.sourceType);

	} else {
		// creating a ZIP file
		console.log('upload multi files...');
		// set the ZIP name according to the first file name
		const splitName = (encodeURIComponent(file.name)).split('.');
		name = `${splitName[0]}.zip`;
		path = uploadPath + name;
		console.log('zip path: ', path);

		// creating archives
		let zip = new AdmZip();

		// define the names of the files to be zipped (in Sync operation)
		const zipFiles = reqFiles.map(file => {
			const newFile = setBeforeUpload(file, typeData, uploadPath, fields);
			// add the local file to the zip file
			zip.addLocalFile(newFile.filePath);

			return newFile;
		});

		Promise.all(zipFiles)
			.then(files => {
				// write the zip to the disk
				console.log(`write zip file: ${path}`);
				zip.writeZip(path);

				// send to the right upload handler according to the type
				uploadHandler(res, worldId, files, name, path, typeData.sourceType);
			})
			.catch(err => {
				console.log(err);
				res.status(422).send({ errors: [{ title: 'Image Upload Error', detail: err.message }] });
			});
	}

};

// ========================================= private  F U N C T I O N S ============================================
// send to the right upload handler according to the type
function uploadHandler(res, worldId, reqFiles, name, path, sourceType) {
	if (reqFiles.fileType === 'image') {
		// get all the image data and save it in mongo Database
		imageHandler.getImageData(worldId, reqFiles, name, path, sourceType)
			.then(files => res.send(returnFiles(files, path)));
	} else {
		// upload the file to GeoServer and save all the data in mongo Database
		geoserverHandle.getGeoserverData(worldId, reqFiles, name, path).then(
			files => res.send(returnFiles(files, path)));
	}
}

// prepare the file before uploading it
function setBeforeUpload(file, typeData, uploadPath, fields) {
	console.log('setBeforeUpload File: ', JSON.stringify(file, null, 4));
	const name = file.name;
	let inputData;
	// set the user's input fields
	if (fields) {
		inputData = {
			name,
			flightAltitude: 0,
			cloudCoveragePercentage: 0.1,
			sensor: {
				type: fields.sensorType ? fields.sensorType : null,
				name: fields.sensorName ? fields.sensorName : null
			},
			ansyn: {
				description: fields.description ? fields.description : null,
				creditName: fields.creditName ? fields.creditName : null
			},
			tb: {
				affiliation: 'UNKNOWN',
				GSD: 0
			}
		};
	}

	// replace '/' to '_' in the file name
	if (name.indexOf('/') !== -1) {
		name.replace('/\//g', '_');
	}

	const encodeFileName = encodeURIComponent(name);
	const filePath = uploadPath + encodeFileName;
	const fileExtension = name.substring(name.lastIndexOf('.'));

	console.log(`setBeforeUpload filePath: ${filePath}`);

	const newFile = {
		_id: uuid.v4(),
		name,													// file name (include the extension)
		size: file.size,
		fileUploadDate: new Date(file.mtime).toISOString(),
		fileType: typeData.fileType,
		format: typeData.format,
		fileExtension,
		filePath,
		encodeFileName,
		inputData
	};

	// renaming the file full path (according to the encoded name)
	fs.renameSync(file.path, newFile.filePath);

	return newFile;
}

function returnFiles(files, path) {
	console.log('upload files returnFiles path: ', path);
	files = files.length ? files : [files];
	// remove the file/zip file from the temporary uploads directory
	fs.removeSync(path);
	// if ZIP files: remove only the zip directory
	const zipPath = path.split('.');
	if (zipPath[1] === 'zip') {
		files.map(file => {
			if (file.fileType === 'vector') {
				file.zipPath = zipPath[0].trim();
			} else {
				file.zipPath = null;
				// remove the zip directory
				fs.removeSync(zipPath[0]);
			}
		});
	} else {
		console.log('this file is not a ZIP!');
		files = files.length ? files : [files];
		files[0].zipPath = null;
		console.log('zipPath: ', files[0].zipPath);
	}
	console.log('function returnFiles: ', JSON.stringify(files, null, 4));
	return files;
}

module.exports = {
	uploadFiles,
	uploadPath
};
