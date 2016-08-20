var keystone = require('keystone');
var Promise = require('bluebird');
var spawn_child = require('../lib/spawn_child');
var Types = keystone.Field.Types;

/**
 * Deployment Model
 * ==========
 */
var Deployment = new keystone.List('Deployment', {
	track: true,
});

Deployment.add({
	site: {
		type: Types.Relationship,
		ref: 'Site',
		initial: true,
		noedit: true,
	},
	server: {
		type: Types.Relationship,
		ref: 'Server',
		initial: true,
		noedit: true,
	},
	commit: { type: String, noedit: true },
	initialised: { type: Types.Boolean, default: false, hidden: false },
	upToDate: { type: Types.Boolean, default: false, hidden: false },
	running: { type: Types.Boolean, default: false, hidden: false },
});

Deployment.schema.index({ site: 1, server: 1 }, { unique: true });

Deployment.schema.methods.loadSiteAndServer = function () {
	return new Promise((resolve, reject) => {
		this.populate('site server', function (error, deploy) {
			if (error) {
				reject(error);
			} else {
				resolve(deploy);
			}
		});
	});
};

Deployment.schema.methods.updateSite = function (commit, outStream) {
	return this.loadSiteAndServer().then(() => {
		var command = './run-remote';
		var args = [this.server.hostname, 'deploy-app-update.sh', this.site.name, commit];
		return spawn_child(command, args, outStream);
	});
};

Deployment.schema.methods.initSiteOnServer = function (outStream) {
	return this.loadSiteAndServer().then(() => {
		var command = './run-remote';
		var args = [this.server.hostname, 'deploy-new-app.sh', this.site.name, this.site.githubRepository];
		return spawn_child(command, args, outStream);
	});
};

Deployment.schema.methods.writeEnv = function (outStream) {
	return this.loadSiteAndServer().then(() => {
		return this.site.loadEnvVariables();
	}).then(() => {
		var command = './write-remote-file';
		var args = [this.server.hostname, this.site.name + '/.env'];
		var fileContents = this.site.environmentVariables
			.map((varObject) => varObject.key + '=' + varObject.value)
			.concat('PORT=' + this.site.port.toString())
			.reduce((last, current) => last + '\n' + current);
		return spawn_child(command, args, outStream, fileContents);
	});
};

/**
 * Registration
 */
Deployment.defaultColumns = 'site, server, commit, deployed';
Deployment.register();
