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

Deployment.schema.index({ site: 1, server: 1 }, { unique: true });

/**
 * Registration
 */
Deployment.defaultColumns = 'site, server, commit, deployed';
Deployment.register();
