var keystone = require('keystone');
var middleware = require('./middleware');
var importRoutes = keystone.importer(__dirname);
var babelify = require('babelify');
var browserify = require('browserify-middleware');

var clientConfig = {
	commonPackages: [
		'react',
		'react-dom',
	],
};

// Common Middleware
keystone.pre('routes', middleware.initLocals);
keystone.pre('render', middleware.flashMessages);

// Import Route Controllers
var routes = {
	views: importRoutes('./views'),
	api: importRoutes('./api'),
};

// Setup Route Bindings
exports = module.exports = function (app) {

	// Bundle common packages
	app.get('/js/packages.js', browserify(clientConfig.commonPackages, {
		cache: true,
		precompile: true,
	}));

	// Serve script bundles
	app.use('/js', browserify('./client/scripts', {
		external: clientConfig.commonPackages,
		transform: [babelify.configure({
			presets: [require('babel-preset-es2015'), require('babel-preset-react')],
		})],
	}));

	// Views
	app.get('/', middleware.requireUser, routes.views.index);
	app.post('/deploy', routes.views.deploy);
	app.post('/env', routes.views.updateEnv);

	// API
	app.get('/api/sites/list', middleware.requireUser, keystone.middleware.api, routes.api.sites.list);
	app.all('/api/sites/create', middleware.requireUser, keystone.middleware.api, routes.api.sites.create);
	app.get('/api/sites/:id', middleware.requireUser, keystone.middleware.api, routes.api.sites.get);
	app.all('/api/sites/:id/update', middleware.requireUser, keystone.middleware.api, routes.api.sites.update);
	app.get('/api/sites/:id/remove', keystone.middleware.api, routes.api.sites.remove);

	app.get('/api/servers/list', middleware.requireUser, keystone.middleware.api, routes.api.servers.list);
	app.all('/api/servers/create', middleware.requireUser, keystone.middleware.api, routes.api.servers.create);
	app.get('/api/servers/:id', middleware.requireUser, keystone.middleware.api, routes.api.servers.get);
	app.all('/api/servers/:id/update', middleware.requireUser, keystone.middleware.api, routes.api.servers.update);
	app.get('/api/servers/:id/remove', middleware.requireUser, keystone.middleware.api, routes.api.servers.remove);
};
