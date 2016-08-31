import React from 'react';
import ReactDom from 'react-dom';

const App = React.createClass({
	getInitialState: function () {
		return {
			sites: [{name: 'loading sites...'}],
			servers: [{name: 'loading servers...'}],
			deployments: [],
		};
	},

	componentWillMount: function () {
		this.updateData();
	},
	
	componentDidMount: function () {
		// The following should keep the page updated, every 10 seconds. 	
		setInterval(function () {
			this.updateData()
		}.bind(this), 1000);
	},
	
	updateData: function () {
		setTimeout(function () {
			this.sitesRequest = $.get('/api/sites/list', function (result) {
				this.setState({
					sites: result.Sites,
					sitesLoaded: true
				});
			}.bind(this));
		}.bind(this), 3000);
		
		setTimeout(function () {
			this.serversRequest = $.get('/api/servers/list', function (result) {
				this.setState({
					servers: result.Servers,
					serversLoaded: true
				});
			}.bind(this));
		}.bind(this), 5000);
	},

	componentWillUnmount: function () {
		this.sitesRequest.abort();
		this.serversRequest.abort();
	},
	
	render: function () {
		return(
			<div className="row">
				<div className="col-xs-4">
					<Sites sites={this.state.sites}/>
				</div>
				<div className="col-xs-4 col-xs-offset-4">
					<Servers servers={this.state.servers}/>
				</div>
			</div>
		);
	}
});

const Sites = React.createClass({
	render: function () {
		var siteNodes = [];
		if (this.props.sites) {
			siteNodes = this.props.sites.map(function(site) {
				return (
					<SiteNode data={site} key={site._id || 1} />
				);
			});
		}
		return (
			<div className="sites">
				{siteNodes}
			</div>
		)
	}
});

const SiteNode = React.createClass({
	shouldComponentUpdate: function (nextProps, nextState) {
		return this.props.data.updatedAt !== nextProps.data.updatedAt;
	},
	render: function () {
		var status;
		if (this.props.data.allServersRunning) {
			status = 'green';
		} else if (this.props.data.allServersRunning === false) {
			status = 'red';
		} else {
			status = 'disabled';
		}
		return(
			<div className={"node node-" + status + " siteNode"}>
				<p>{this.props.data.name}</p>
			</div>
		);
	}
});

const Servers = React.createClass({
	render: function () {
		var serverNodes = [];
		if (this.props.servers) {
			serverNodes = this.props.servers.map(function(server) {
				return (
					<ServerNode data={server} key={server._id || 1} />
				);
			});
		}
		return (
			<div>
				<div className="servers">
					{serverNodes}
				</div>
			</div>
		)
	}
});

const ServerNode = React.createClass({
	shouldComponentUpdate: function (nextProps, nextState) {
		return this.props.data.updatedAt !== nextProps.data.updatedAt;
	},
	render: function () {
		return(
			<div className="node serverNode">
				<p>{this.props.data.name}</p>
			</div>
		);
	}
});

ReactDom.render(<App />, document.getElementById('app'));
