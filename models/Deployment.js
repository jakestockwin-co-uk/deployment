var keystone = require('keystone');
var Promise = require('bluebird');
var spawn_child = require('../lib/spawn_child');
var asyncawait = require('asyncawait');
var async = asyncawait.async;
var await = asyncawait.await;
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
	initialised: { type: Types.Boolean, default: false, hidden: false },
	running: { type: Types.Boolean, default: false, hidden: false },
});

Deployment.schema.index({ site: 1, server: 1 }, { unique: true });

Deployment.schema.methods.loadSiteAndServer = function () {
	if (this.populated('site') && this.populated('server')) {
		return Promise.resolve(this);
	}

	return this.populateAsync('site server');
};

Deployment.schema.methods.initDeploy = async(function (outStream) {
	await(this.loadSiteAndServer());
	var command = './run-remote';
	var args = [this.server.hostname, 'deploy-new-app.sh', this.site.name, this.site.githubRepository];
	return spawn_child(command, args, outStream);
});

Deployment.schema.methods.writeEnv = async(function (outStream) {
	await(this.loadSiteAndServer());
	await(this.site.loadEnvVariables());
	var command = './write-remote-file';
	var args = [this.server.hostname, this.site.name + '/.env'];
	var fileContents = this.site.environmentVariables
		.map((varObject) => varObject.key + '=' + varObject.value)
		.concat('PORT=' + this.site.port.toString())
		.reduce((last, current) => last + '\n' + current);
	return spawn_child(command, args, outStream, fileContents);
});

Deployment.schema.methods.updateToCommit = async(function (commit, outStream) {
	await(this.loadSiteAndServer());
	let command = './run-remote';
	let args = [this.server.hostname, 'deploy-app-update.sh', this.site.name, commit];
	let status = await(spawn_child(command, args, outStream));

	let err = '';
	switch (status) {
		case 0:
			this.running = true;
			break;
		case 1:
			this.running = false;
			err = 'Failed to start updated server';
			break;
		case 2:
			this.running = false;
			err = 'Failed to checkout changes';
			break;
	}

	await(this.save());

	if (err) {
		throw {status: status, message: err};
	}
	return 0;
});

/**
 * Registration
 */
Deployment.defaultColumns = 'site, server, commit, deployed';
Deployment.register();
