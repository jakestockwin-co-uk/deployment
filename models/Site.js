var keystone = require('keystone');
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

Site.schema.methods.loadEnvVariables = function () {
	if (this.populated('environmentVariables')) {
		return Promise.resolve(this);
	}

	return this.populateAsync('environmentVariables');
};

/**
 * Registration
 */
Site.defaultColumns = 'name, commit, updatedAt, deployed';
Site.register();
