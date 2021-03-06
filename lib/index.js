var checker = require('license-checker');
var request = require('superagent');
var args = require('yargs').argv;

/* Fail build for listed licenses */
var exitOn = ['GPLv3', 'GPLv2', 'GPLv1', 'GPL-3.0', 'GPL-2.0', 'GPL-1.0'];

/* Environment constants */
const ORG_NAME    = process.env.TRAVIS_REPO_SLUG.split('/')[0];
const REPO_NAME   = process.env.TRAVIS_REPO_SLUG.split('/')[1];
const COMMIT_SHA  = process.env.TRAVIS_COMMIT;
const BUILD_ID    = process.env.TRAVIS_BUILD_ID;
const AUTH_TOKEN  = process.env[args['token'] || 'GITHUB_PERSONAL_TOKEN'];
const BUILD_DIR   = args['dir'] || process.env.TRAVIS_BUILD_DIR;

/* Github build status constants */
const BUILD_FAIL    = { state: 'failure', message: 'Prohibitive licensing found' };
const BUILD_PASS    = { state: 'success', message: 'No license issues found' };
const BUILD_PENDING = { state: 'pending', message: 'Checking licenses' };
const BUILD_ERROR   = { state: 'error',   message: 'An error occured during license check' };

var setStatus = function(buildData) {
  request
    .post(`https://api.github.com/repos/${ORG_NAME}/${REPO_NAME}/statuses/${COMMIT_SHA}`)
    .set('Authorization', `token ${AUTH_TOKEN}`)
    .send({
      state: buildData.state,
      target_url: `https://travis-ci.com/${ORG_NAME}/${REPO_NAME}/builds/${BUILD_ID}`,
      description: buildData.message,
      context: 'practo/audit-license'
    })
    .end(function(err, res) {
      if(err) {
        console.log(err);
        process.exit(1);
      }

      console.log(res.body)
    })
}

setStatus(BUILD_PENDING);

checker.init({
  start: `${BUILD_DIR}`
}, function(err, json) {
  if(err) {
    setStatus(BUILD_ERROR);
    console.log(err);
  }
  else {
    let keys = Object.keys(json)
    let failBuild = false;
    for(let i = 0; i<keys.length-1; i++) {
      if(exitOn.indexOf(json[keys[i]].licenses) > -1) {
        console.log(`
          Found prohibitive license
          |- ${json[keys[i]].licenses}
          |-- ${keys[i]}\n`);
        failBuild = true;
      }
    }
    if(failBuild) {
      setStatus(BUILD_FAIL);
    }
    else {
      setStatus(BUILD_PASS);
    }
  }
})

