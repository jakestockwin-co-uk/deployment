var	keystone = require('keystone');

var Server = keystone.list('Server');

/**
 * List Servers
 */
exports.list = function (req, res) {
	Server.model.find(function (err, items) {

		if (err) return res.apiError('database error', err);

		res.apiResponse({
			Servers: items,
		});

	});
};

/**
 * Get Server by ID
 */
exports.get = function (req, res) {
	Server.model.findById(req.params.id).exec(function (err, item) {

		if (err) return res.apiError('database error', err);
		if (!item) return res.apiError('not found');

		res.apiResponse({
			Server: item,
		});

	});
};


/**
 * Create a Server
 */
exports.create = function (req, res) {

	var item = new Server.model();
	var	data = (req.method === 'Server') ? req.body : req.query;

	item.getUpdateHandler(req).process(data, function (err) {

		if (err) return res.apiError('error', err);

		res.apiResponse({
			Server: item,
		});

	});
};

/**
 * Get Server by ID
 */
exports.update = function (req, res) {
	Server.model.findById(req.params.id).exec(function (err, item) {

		if (err) return res.apiError('database error', err);
		if (!item) return res.apiError('not found');

		var data = (req.method === 'Server') ? req.body : req.query;

		item.getUpdateHandler(req).process(data, function (err) {

			if (err) return res.apiError('create error', err);

			res.apiResponse({
				Server: item,
			});

		});

	});
};

/**
 * Delete Server by ID
 */
exports.remove = function (req, res) {
	Server.model.findById(req.params.id).exec(function (err, item) {

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
