const mongoose = require('mongoose');

const Schema = mongoose.Schema;

// for ANSYN: get the polygon from the latLonBoundingBox field in the data using the turf.bboxPolygon(bbox) function
const footprint = {
	type: {
		type: String,
		enum: ['Feature'],
		required: true
	},
	geometry: {
		type: {
			type: String,
			enum: ['Polygon'],
			required: true
		},
		coordinates: {
			type: [[[Number]]], // Array of arrays of arrays of numbers
			required: true
		}
	},
	properties: {}
};

const geoData = {
	centerPoint: [Number, Number],
	bbox: [Number, Number, Number, Number] | [Number, Number, Number, Number, Number, Number],				// [ minx, miny, maxx, maxy ]
	footprint
};

// LAYER: from GeoServer - Layer page
const layer = {
	name: String,
	defaultStyle: {
		name: String,
		href: String                                // href to the style page
	},
	resource: {
		class: String,                             // @class field
		name: String,                              // the worldLayer Id ( worldname: layername )
		href: String                               // href to the details (RASTER/VECTOR) page
	},
	attribution: {
		logoWidth: Number,
		logoHeight: Number
	}
};

// STORE: from GeoServer - Store page (coveragestores(RASTER) / datastores(VECTOR))
const store = {
	storeId: String,                              // get from the details page (RASTER/VECTOR) store's name field
	name: String,
	enabled: Boolean,
	_default: Boolean,
	workspace: {
		name: String,                              	// the name of the world
		href: String                               	// href to the workspace page
	},
	connectionParameters: {                    		 // was translated from a map
		namespace: String,
		url: String                               	 // VECTOR only
	},
	url: String,                                   // RASTER only
	href: String                                   // get from the "coverages"  in RASTERS or "featureTypes" in VECTORS
};

// LAYER DETAILS: from GeoServer - RASTER (coverage object) / VECTOR (featureType object) page
const data = {
	name: String,
	nativeName: String,
	namespace: {
		name: String,
		href: String                                 // href to the namespace page
	},
	title: String,
	keywords: {
		string: [String]
	},
	nativeCRS: String,                              // was translated from a map
	srs: String,
	nativeBoundingBox: {
		minx: Number,
		maxx: Number,
		miny: Number,
		maxy: Number,
		crs: String                                 // was translated from a map
	},
	latLonBoundingBox: {
		minx: Number,
		maxx: Number,
		miny: Number,
		maxy: Number,
		crs: String
	},
	projectionPolicy: String,
	enabled: Boolean,
	metadata: {                                     // was translated from a map
		dirName: String,                           // RASTERS
		recalculateBounds: String                   // VECTROS
	},
	store: {
		class: String,                              // @class field ('coverage' or 'datastore')
		name: String,                               // the store id ( worldname: storename )
		href: String                                // href to the store page
	},
	// VECTORS only
	maxFeatures: Number,
	numDecimals: Number,
	overridingServiceSRS: Boolean,
	skipNumberMatched: Boolean,
	circularArcPresent: Boolean,
	attributes: {
		attribute: [
			{
				name: String,
				minOccurs: Number,
				maxOccurs: Number,
				nillable: Boolean,
				binding: String
			}
		]
	},
	// RASTER only
	nativeFormat: String,
	grid: {
		dimension: Number,                          // @dimension field
		range: {
			low: String,
			high: String
		},
		transform: {
			scaleX: Number,
			scaleY: Number,
			shearX: Number,
			shearY: Number,
			transletX: Number,
			transletY: Number
		},
		crs: String
	},
	supportedFormats: {
		string: [String]
	},
	interpolationMethods: {
		string: [String]
	},
	defaultInterpolationMethod: String,
	dimension: {
		coverageDimension: [
			{
				name: String,
				description: String,
				range: {
					min: Number || String,
					max: Number || String
				},
				nullValues: {
					double: [Number]
				},
				unit: String,
				dimensionType: {
					name: String
				}
			}
		]
	},
	requestSRS: {
		string: [String]
	},
	responseSRS: {
		string: [String]
	},
	parameters: {
		entry: [
			{
				string: [String]
			}
		]
	}
};

// FILE DATA: data from the upload file
const fileData = {
	name: String,														// the original name
	size: Number,                           // MB or KB
	fileCreatedDate: Date | String,					// the file created date
	fileUploadDate: Date | String,				  // the upload file date
	fileExtension: String,
	fileType: String,												// 'raster' or 'vector'
	filePath: String,
	encodeFileName: String,									// the encoded file name (differ when there is special charecters in the name)
	zipPath: String									 				// the zip path of the upload vector (for removing it later)
};

// IMAGE DATA: metadata of the upload JPG image
const imageData = {
	ImageDescription: String,
	Make: String,														// sensor maker
	Model: String,													// sensor model
	ModifyDate: Number,											// modified date
	DateTimeOriginal: Number,								// original date
	CreatedDate: Number,										// created date
	JPGModifiedDate: Date | String,
	JPGOriginalDate: Date | String,
	GPSLatitudeRef: String,									// x-point orientation (latitude)
	GPSLatitude: Number,										// x-point (latitude)
	GPSLongitudeRef: String,								// y-point orientation (longitude)
	GPSLongitude: Number,										// y-point (longitude)
	GPSAltitude: Number, 										// relative altitude
	ExifImageWidth: Number,								  // the picture size in pixels
	ExifImageHeight: Number,						 	  // the picture size in pixels
	// SerialNumber: String,
	// InteropIndex: String,
	// Software: String,
	// Orientation: Number,
	// XResolution: Number,										// resolution
	// YResolution: Number,										// resolution
	// ResolutionUnit: Number,								// resolution
	// YCbCrPosition: Number,
	// GPSVersionId: [Number, Number, Number, Number],
	// ExposureTime: Number,
	// ExposureProgram: Number,
	// ExposureCompensation: Number,
	// ExposureIndex: String,
	// ExposureMode: Number,
	// FNumber: Number,
	// ISO: Number,
	// CompressedBitPerPixel: Number,
	// ShutterSpeedValue: Number,
	// ApertureValue: Number,
	// MaxApertureValue: Number,
	// SubjectDistance: Number,
	// SubjectDistanceRange: Number,
	// MeteringMode: Number,
	// LightSource: Number,
	// Flash: Number,
	// FocalLength: Number,
	// FocalLengthIn35mmFormat: Number,
	// ColorSpace: Number,
	// CustumRendered: Number,
	// WhiteBalance: Number,
	// DigitalZoomRatio: String,
	// SceneCaptureType: Number,
	// GainControl: Number,
	// Contrast: Number,
	// Saturation: Number,
	// Sharpness: Number
};

// INPUT DATA: data from the user
const inputData = {
	name: String,
	sensor: {
		name: String,
		type: { type: String },
		maker: String,
		bands: [String]
	},
	tb: {
		affiliation: { type: String, uppercase: true, enum: ['INPUT', 'OUTPUT', 'UNKNOWN'] },  // 'INPUT' or 'OUTPUT'
		GSD: Number,
		flightAltitude: Number,
		cloudCoveragePercentage: Number
	},
	ol: {
		zoom: Number,
		opacity: { type: Number, min: 0, max: 1 }
	},
	ansyn: {
		title: String
	}
};

// field for GeoServer layers
const geoserver = {
	layer,
	store,
	data
};

// create the World-Layer Schema
const LayerSchema = new Schema({
	_id: { type: String },         				   		 	 // get the id from uuid function
	name: String,                                  // from GeoServer
	fileName: String,
	filePath: String,
	createdDate: Number,													 // the file created date in number
	displayUrl: String,														 // url to display the layer: JPG = the image Url, Geotiff = the wmts request Url
	fileType: { type: String, lowercase: true, enum: ['raster', 'vector', 'image'] },
	format: { type: String, uppercase: true, enum: ['GEOTIFF', 'SHAPEFILE', 'JPEG'] },
	fileData,
	imageData,
	geoData,
	inputData,
	geoserver
});

// create the layer MODEL
const layerModel = mongoose.model('Layer', LayerSchema);

module.exports = layerModel;
