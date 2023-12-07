function createSessionsStrategyServiceMixin (execlib) {
  'use strict';

  var lib = execlib.lib,
    q = lib.q,
    execSuite = execlib.execSuite,
    taskRegistry = execSuite.taskRegistry,
    qlib = lib.qlib;

  function isOkAdditionalField (fld) {
    if (!fld) {
      console.log('There is no Session Additional Field');
      return false;
    }
    if (!(lib.isString(fld.profileproperty) && fld.profileproperty)) {
      console.log('Session Additional Field', fld, 'has no "profileproperty"');
      return false;
    }
    if (!(lib.isString(fld.sessionproperty) && fld.sessionproperty)) {
      console.log('Session Additional Field', fld, 'has no "sessionproperty"');
      return false;
    }
    return true;
  }
  
  function areOkAdditionalFields (flds) {
    if (!lib.isArray(flds)) {
      return [];
    }
    if (!flds.every(isOkAdditionalField)) {
      return [];
    }
    return flds;
  }

  function SessionsStrategyServiceMixin (prophash) {
    var hassessionsstrategy;
    if (!lib.isFunction(this.findRemote)) {
      throw new lib.Error('REMOTESERVICELISTNER_MIXIN_NOT_IMPLEMENTED', this.constructor.name+' has to implement execSuite.RemoteServiceListenerServiceMixin');
    }
    hassessionsstrategy = prophash && prophash.strategies && prophash.strategies.sessions;
    this.sessionsSinkName = prophash.sessionsDB || 
      (hassessionsstrategy ? prophash.strategies.sessions.sinkname : null);
    if (this.sessionsSinkName) {
      this.findRemote(this.sessionsSinkName, null, 'sessions');
    }
    this.profileFields = areOkAdditionalFields(hassessionsstrategy ? prophash.strategies.sessions.profile_fields : null);
  }

  SessionsStrategyServiceMixin.prototype.destroy = function () {
    this.profileFields = null;
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

  function fielder (obj, res, fld) {
    if (obj.profile) {
      res[fld.sessionproperty] = obj.profile[fld.profileproperty];
    }
    return res;
  }
  SessionsStrategyServiceMixin.prototype.produceAuthSessionOnSessionsSink = execSuite.dependentServiceMethod([], ['sessions'], function (sessionssink, authenticatedobj, session, defer) {
    if (!lib.isArray(this.profileFields)) {
      return q.reject(new lib.Error('ALREADY_DESTROYED', 'This instance of '+this.constructor.name+' is already destroyed'));
    }
    var cobj = this.profileFields.reduce(fielder.bind(null, authenticatedobj), {});
    cobj.session = session;
    cobj.username = authenticatedobj.name;
    authenticatedobj = null;
    qlib.promise2defer(sessionssink.call('create', cobj), defer);
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
      prophash.strategies = prophash.strategies || {};
      prophash.strategies.sessions = prophash.strategies.sessions || {};
      prophash.strategies.sessions.sinkname = prophash.sessionsDB;
      prophash.strategies.sessions.identity = {role: 'user', name: 'user'};
    }
  };

  return SessionsStrategyServiceMixin;
}

module.exports = createSessionsStrategyServiceMixin;
