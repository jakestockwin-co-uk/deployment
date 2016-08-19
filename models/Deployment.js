var keystone = require('keystone');
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

// TODO: Add a pre-save hook which should deploy the site to the set commit?

/**
 * Registration
 */
Deployment.defaultColumns = 'site, server, commit, deployed';
Deployment.register();
