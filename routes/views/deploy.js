var keystone = require('keystone');
var sleep = require('sleep');

//Replace with something actually useful, obviously...
//Probably an AppServer model?
appServers = [0, 1, 2, 3]

exports = module.exports = function (req, res) {
  //Probably use a Project model to keep track of these?
  console.log(req.body.project);
  console.log(req.body.commit);
  for(server in appServers) {
    //Might want to do some success/failure processing here 
    addResult(processItem(server, req.body), res);
  }
  
  finish(res);
};

//This needs to not be a noop dummy function, obviously...
function processItem(server, details) {
  sleep.sleep(5);
  return Math.random() > 0.5 ? "Successfully deployed version " + details.commit + " of " + details.project + " to app server " + server :
                                "Failed to deploy version " + details.commit + " of " + details.project + " to app server " + server;
}

function addResult(result, res) {
  res.write(result);
  res.write("\n");
}

function finish(res) {
  res.end();
}
