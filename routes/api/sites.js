var	keystone = require('keystone');

var Site = keystone.list('Site');

/**
 * List Sites
 */
exports.list = function (req, res) {
	Site.model.find(function (err, items) {

		if (err) return res.apiError('database error', err);

		res.apiResponse({
			Sites: items,
		});

	});
};

/**
 * Get Site by ID
 */
exports.get = function (req, res) {
	Site.model.findById(req.params.id).exec(function (err, item) {

		if (err) return res.apiError('database error', err);
		if (!item) return res.apiError('not found');

		res.apiResponse({
			Site: item,
		});

	});
};


/**
 * Create a Site
 */
exports.create = function (req, res) {

	var item = new Site.model();
	var	data = (req.method === 'Site') ? req.body : req.query;

	item.getUpdateHandler(req).process(data, function (err) {

		if (err) return res.apiError('error', err);

		res.apiResponse({
			Site: item,
		});

	});
};

/**
 * Get Site by ID
 */
exports.update = function (req, res) {
	Site.model.findById(req.params.id).exec(function (err, item) {

		if (err) return res.apiError('database error', err);
		if (!item) return res.apiError('not found');

		var data = (req.method === 'Site') ? req.body : req.query;

		item.getUpdateHandler(req).process(data, function (err) {

			if (err) return res.apiError('create error', err);

			res.apiResponse({
				Site: item,
			});

		});

	});
};

/**
 * Delete Site by ID
 */
exports.remove = function (req, res) {
	Site.model.findById(req.params.id).exec(function (err, item) {

		if (err) return res.apiError('database error', err);
		if (!item) return res.apiError('not found');

		item.remove(function (err) {
			if (err) return res.apiError('database error', err);

			return res.apiResponse({
				success: true,
			});
		});

	});
};
