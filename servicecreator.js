function createSessionsStrategyServiceMixin (execlib) {
  'use strict';

  var lib = execlib.lib,
    q = lib.q,
    execSuite = execlib.execSuite,
    taskRegistry = execSuite.taskRegistry,
    qlib = lib.qlib;

  function SessionsStrategyServiceMixin (prophash) {
    if (!lib.isFunction(this.findRemote)) {
      throw new lib.Error('REMOTESERVICELISTNER_MIXIN_NOT_IMPLEMENTED', this.constructor.name+' has to implement execSuite.RemoteServiceListenerServiceMixin');
    }
    this.sessionsSinkName = prophash.sessionsDB;
    if (this.sessionsSinkName) {
      this.findRemote(this.sessionsSinkName, null, 'sessions');
    }
  }

  SessionsStrategyServiceMixin.prototype.destroy = function () {
    this.sessionsSinkName = null;
  };

  SessionsStrategyServiceMixin.prototype.produceAuthSession = function(authenticatedobj){
    var session = lib.uid(),
      identityobj = {userhash:authenticatedobj,session:session};
    if (this.sessionsSinkName) {
      return this.produceAuthSessionOnSessionsSink(authenticatedobj, session).then(
        qlib.returner(identityobj)
      );
    } else {
      return q(identityobj);
    }
  };
  SessionsStrategyServiceMixin.prototype.deleteAuthSession = function (session, userhash) {
    if (this.sessionsSinkName) {
      return this.deleteAuthSessionOnSessionsSink(session).then(
        qlib.returner(userhash)
      );
    } else {
      return q(userhash);
    }
  };

  SessionsStrategyServiceMixin.prototype.produceAuthSessionOnSessionsSink = execSuite.dependentServiceMethod([], ['sessions'], function (sessionssink, authenticatedobj, session, defer) {
    qlib.promise2defer(sessionssink.call('create', {session:session, username: authenticatedobj.name}), defer);
  });
  SessionsStrategyServiceMixin.prototype.deleteAuthSessionOnSessionsSink = execSuite.dependentServiceMethod([], ['sessions'], function (sessionssink, session, defer) {
    qlib.promise2defer(sessionssink.call('delete', {op: 'eq', field: 'session', value: session}), defer);
  });

  SessionsStrategyServiceMixin.addMethods = function (klass) {
    lib.inheritMethods(klass, SessionsStrategyServiceMixin
      ,'produceAuthSession'
      ,'deleteAuthSession'
      ,'produceAuthSessionOnSessionsSink'
      ,'deleteAuthSessionOnSessionsSink'
    );
  };
  SessionsStrategyServiceMixin.makeupPropertyHash = function (prophash) {
    if (prophash.sessionsDB) {
      prophash.strategies.sessions = {
        sinkname: prophash.sessionsDB,
        identity: {role: 'user', name: 'user'}
      };
    }
  };

  return SessionsStrategyServiceMixin;
}

module.exports = createSessionsStrategyServiceMixin;
