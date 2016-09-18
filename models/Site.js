var keystone = require('keystone');
var Deployment = keystone.list('Deployment');
var crypto = require('crypto');
var stream = require('stream');
var asyncawait = require('asyncawait');
var async = asyncawait.async;
var await = asyncawait.await;
var Types = keystone.Field.Types;

/**
 * Site Model
 * ==========
 */
var Site = new keystone.List('Site', {
	track: true,
});

Site.add({
	name: { type: String, required: true, index: true },
	githubRepository: {
		type: String,
		required: true,
		initial: true,
		index: true,
		note: 'Enter the full respository name, including the user. For example, "jstockwin/deployment" and not just "deployment."',
	},
	port: { type: Types.Number, initial: true, required: true, unique: true, min: 3000, default: 3000 },
	cookieSecret: { type: String, default: () => crypto.randomBytes(64).toString('hex') },
	environmentVariables: {
		type: Types.Relationship,
		ref: 'EnvironmentVariable',
		many: true,
	},
	lastAttemptedCommit: { type: String, initial: true },
	lastSuccessfulCommit: { type: String, noedit: true },
	lastDeploySuccessful: { type: Types.Boolean, default: false, noedit: true },
	allServersRunning: { type: Types.Boolean, default: false, noedit: true },
});

Site.relationship({ path: 'deploys', ref: 'Deployment', refPath: 'site' });

// TODO: We should add some custom validation that checks that no two environment variables are setting the same key.
// TODO: Add a pre-save hook which should deploy the site.

Site.schema.pre('remove', async(function (next) {
	let deployments = await(Deployment.model.find().where('site', this).populate('site server').exec());
	for (let deployment of deployments) {
		await(deployment.remove());
	}
	next();
}));

Site.schema.pre('save', async(function (next) {
	if(this.isModified('port') || this.isModified('environmentVariables') || this.isModified('cookieSecret')) {
		console.log('updating .env');
		// We want to update our deployments' .env files
		let deployments = await(Deployment.model.find().where('site', this).populate('server').exec());
		for (let deployment of deployments) {
			deployment.site = this;
			console.log('writing file');
			await(deployment.writeEnv(process.stdout));
			console.log('restarting server');
			await(deployment.restart(process.stdout));
		}
	}
    next();
}));

Site.schema.methods.loadEnvVariables = function () {
	if (this.populated('environmentVariables')) {
		return Promise.resolve(this);
	}

	return this.populate('environmentVariables').execPopulate();
};

/**
 * Registration
 */
Site.defaultColumns = 'name, commit, updatedAt, deployed';
Site.register();
