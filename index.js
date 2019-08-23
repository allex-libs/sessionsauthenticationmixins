function createLib (execlib) {
  'use strict';

  return execlib.loadDependencies('client', ['allex_sessionsauthenticationstrategylib'], finalizer.bind(null, execlib));
}

function finalizer (execlib) {
  'use strict';
  return {
    service: require('./servicecreator')(execlib)
  };
}

module.exports = createLib;
