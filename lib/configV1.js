const config = [{
	"CLASS_IDS": [1,2,3,4,5],
	"TOKEN_COUNTS": [50,27,13,7,7],
	"BOXES": [
		{
			"NUM_CARDS": 4,
			"CLASS_IDS": [1,2,3,4,5],
			"CLASS_PROBABILITIES": [4700,2800,1500,800,200],
			"GUARANTEED_CLASS_IDS": []
		},
		{
			"NUM_CARDS": 6,
			"CLASS_IDS": [1,2,3,4,5],
			"CLASS_PROBABILITIES": [3400,3100,2000,1100,400],
			"GUARANTEED_CLASS_IDS": []
		},
		{ // TESTING
			'NUM_CARDS' : 16,
			'CLASS_PROBABILITIES' : [4700, 2800, 1500, 800, 200],
			'CLASS_IDS' : [1,2,3,4,5],
			'GUARANTEED_CLASS_IDS' : []
		}
	]
}];

module.exports = {
  'CLASS_IDS' : config[0].CLASS_IDS,
  'TOKEN_COUNTS' : config[0].TOKEN_COUNTS,
  'BOXES' : config[0].BOXES,
};
