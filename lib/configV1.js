const config = [{
	"CLASS_IDS": [1,2,3,4,5],
	"TOKEN_COUNTS": [61,31,21,10,7],
	"BOXES": [
		{
			"NUM_CARDS": 4,
			"CLASS_IDS": [1,2,3,4,5],
			"CLASS_PROBABILITIES": [4900,2900,1500,550,150],
			"GUARANTEED_CLASS_IDS": []
		},
		{
			"NUM_CARDS": 6,
			"CLASS_IDS": [1,2,3,4,5],
			"CLASS_PROBABILITIES": [4300,2600,1800,1000,300],
			"GUARANTEED_CLASS_IDS": []
		},
		{ // TESTING
			'NUM_CARDS' : 16,
			'CLASS_PROBABILITIES' : [4700, 2800, 1500, 800, 200],
			'CLASS_IDS' : [1,2,3,4,5],
			'GUARANTEED_CLASS_IDS' : []
		}
	],
	"WRAPPER_PACK_ID" : 1,
	"WRAPPER_NUM_PACKS" : 3
}];

module.exports = {
	'CLASS_IDS' : config[0].CLASS_IDS,
	'TOKEN_COUNTS' : config[0].TOKEN_COUNTS,
	'BOXES' : config[0].BOXES,
	"WRAPPER_PACK_ID" : config[0].WRAPPER_PACK_ID,
	"WRAPPER_NUM_PACKS" : config[0].WRAPPER_NUM_PACKS,
	'CARD_API' : 'https://cryptotendies-metadata-api.herokuapp.com/api/card/{id}',
	'BOX_API' : 'https://cryptotendies-metadata-api.herokuapp.com/api/box/{id}'
};
