module.exports = {
	description: 'fetch by worldName, geometry and dates',
	type: 'object',
	required: [
		'worldName',
		'geometry',
		'dates'
	],
	properties: {
		worldName: {
			example: 'public',
			description: 'The id of world',
			type: 'string'
		},
		geometry: {
			description: 'Geometry object (\'Feature\'/\'CollectionFeature\'...)',
			type: 'object',
			example: {
				type: 'Polygon',
				coordinates: [
					[
						[0.0, -50.0],
						[150.0, -50.0],
						[150.0, 50.0],
						[0.0, 50.0],
						[0.0, -50.0]
					]
				]
			}
		},
		dates: {
			description: 'Start & end dates',
			type: 'object',
			required: [
				'start',
				'end'
			],
			properties: {
				start: {
					description: 'start date',
					type: 'string',
					format: 'date-time',
					example: '1970-01-01T00:00:00.000Z'
				},
				end: {
					description: 'end date',
					type: 'string',
					format: 'date-time',
					example: '2018-11-15T13:01:15.537Z'
				}
			}
		},
		queries: {
			description: 'additional optional selection query',
			type: 'array',
			items: {
				type: 'object',
				required: [
					'field',
					'values'
				],
				properties: {
					field: {
						description: 'the field name',
						type: 'string',
						example: 'inputData.sensor.type'
					},
					values: {
						description: 'the field\'s values',
						type: 'array',
						items: { type: 'string' },
						example: ['UAV']
					},
					isMatch: {
						description: 'is to match the query or not?',
						type: 'boolean',
						example: true
					}
				}
			}
		}
	}
};
