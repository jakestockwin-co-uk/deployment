var keystone = require('keystone');
var Deployment = keystone.list('Deployment');
var Server = keystone.list('Server');
var Site = keystone.list('Site');

exports = module.exports = function (req, res) {

	var view = new keystone.View(req, res);
	var locals = res.locals;

	// locals.section is used to set the currently selected
	// item in the header navigation.
	locals.section = 'home';

	locals.appServers = [];
	locals.sites = [];
	locals.deployments = [];

	// Load the deployments
	view.on('init', function (next) {
		Deployment.model.find().exec(function (err, results) {
			if (err) {
				next(err);
			} else {
				locals.deployments = results;
				next();
			}
		});
	});

	// Load the app servers
	view.on('init', function (next) {
		Server.model.find().exec(function (err, results) {
			if (err) {
				next(err);
			} else {
				locals.appServers = results;
				next();
			}
		});
	});

	// Load the sites
	view.on('init', function (next) {
		Site.model.find().exec(function (err, results) {
			if (err) {
				next(err);
			} else {
				locals.sites = results;
				next();
			}
		});
	});

	// Render the view
	view.render('index');

};
