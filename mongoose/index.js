/**
 * This file must be required at least ONCE.
 * After it's done, one can use require('mongoose')
 *
 * In web-app: this is done at init phase
 * In tests: in mocha.opts
 * In gulpfile: in beginning
 */

let mongoose = require('mongoose');
mongoose.Promise = Promise;

let path = require('path');
let fs = require('fs');
let log = require('engine/log')();
let autoIncrement = require('mongoose-auto-increment');
let ValidationError = require('mongoose/lib/error').ValidationError;
let ValidatorError = require('mongoose/lib/error').ValidatorError;

let config = require('config');
let _ = require('lodash');


if (process.env.MONGOOSE_DEBUG) {
  mongoose.set('debug', true);
  log.debug(config.mongoose.uri, config.mongoose.options);
}


mongoose.connect(config.mongoose.uri, config.mongoose.options);

if (process.env.MONGOOSE_DEBUG) {
  mongoose.connection.emit = function(event) {
    console.log("Mongoose connection: ", event);
    return require('events').EventEmitter.prototype.emit.apply(this, arguments);
  };
}

autoIncrement.initialize(mongoose.connection);

// bind context now for thunkify without bind
_.bindAll(mongoose.connection);
_.bindAll(mongoose.connection.db);

mongoose.plugin(function(schema) {
  schema.statics.resort = async function(field = 'weight') {
    let models = await this.find({}).sort({[field]: 1});

    let i = 1;
    for(let model of models) {

      model[field] = i;
      // console.log(model.title, model.weight);
      await model.persist();
      i++;
    }
  }
});

// plugin from https://github.com/LearnBoost/mongoose/issues/1859
// yield.. .persist() or .destroy() for generators instead of save/remove
// mongoose 3.10 will not need that (!)
mongoose.plugin(function(schema) {

  schema.methods.persist = function(body) {
    let model = this;

    return new Promise((resolve, reject) => {

      log.trace("mongoose persist", body);

      if (body) model.set(body);

      model.save(function(err, changed) {

        log.trace("mongoose persist save", err, changed);

        if (!err) {
          return resolve(changed);
        }
        if (err && err.code != 11000) {
          return reject(err);
        }

        log.trace("uniqueness error", err);
        log.trace("will look for indexName in message", err.message);

        // E11000 duplicate key error index: js_test.users.$email_1 dup key: { : "0.6253784220560401@gmail.com" }
        // old mongo E11000 duplicate key error collection: js_en.articles index: slug_1 dup key: { : "hello-world" }
        let indexName = err.message.match(/\$(\w+)/);

        indexName = indexName && indexName[1];
        if (!indexName) {
          indexName = err.message.match(/index: (\w+)/);
          indexName = indexName[1];
        }

        model.collection.getIndexes(function(err2, indexes) {
          if (err2) return reject(err);

          // e.g. indexes = {idxName:  [ [displayName, 1], [email, 1] ] }

          // e.g indexInfo = [ [displayName, 1], [email, 1] ]
          let indexInfo = indexes[indexName];

          if (!indexInfo) {
            throw new Error("Uniqueness error: bad indexes " + JSON.stringify(indexes) + "\n" + err.message);
          }

          // convert to indexFields = { displayName: 1, email: 1 }
          let indexFields = {};


          indexInfo.forEach(function toObject(item) {
            indexFields[item[0]] = item[1];
          });

          let schemaIndexes = schema.indexes();

          //console.log("idxes:", schemaIndexes, "idxf", indexFields, schemaIndexes.find);
          let schemaIndex = null;

          for (let i = 0; i < schemaIndexes.length; i++) {
            if (_.isEqual(schemaIndexes[i][0], indexFields)) {
              schemaIndex = schemaIndexes[i];
              break;
            }
          }

          log.trace("Schema index which failed:", schemaIndex);

          let errorMessage;
          if (!schemaIndex) {
            // index exists in DB, but not in schema
            // strange
            // that's usually the case for _id_
            if (indexName == '_id_') {
              errorMessage = 'Id is not unique';
            } else {
              // non-standard index in DB, but not in schema? fix it!
              return reject(new Error("index " + indexName + " in DB, but not in schema"));
            }
          } else {
            // schema index object, e.g
            // { unique: 1, sparse: 1 ... }
            let schemaIndexInfo = schemaIndex[1];

            errorMessage = typeof schemaIndexInfo.unique == 'string' ? schemaIndexInfo.unique : ("Index error: " + indexName);
          }

          let valError = new ValidationError(err);

          let field = indexInfo[0][0]; // if many fields in uniq index - we take the 1st one for error

          log.trace("Generating error for field", field, ':', errorMessage);

          // example:
          // err = { path="email", message="Email is not unique", type="notunique", value=model.email }
          valError.errors[field] = new ValidatorError({
            path: field,
            message: errorMessage,
            type: 'notunique',
            value: model[field]
          });

          valError.code = err.code; // if (err.code == 11000) in the outer code will still work

          // console.log(valError.errors, model.toObject());
          return reject(valError);
        });

      });
    });
  };

});

mongoose.waitConnect = async function() {
  if (mongoose.connection.readyState === 1) {
    return;
  }

  return new Promise((resolve, reject) => {
    // we wait either for an error
    // OR
    // for a successful connection
    //console.log("MONGOOSE", mongoose, "CONNECTION", mongoose.connection, "ON", mongoose.connection.on);
    mongoose.connection.on("connected", onConnected);
    mongoose.connection.on("error", onError);


    function onConnected() {
      log.debug("Mongoose has just connected");
      cleanUp();
      resolve();
    }

    function onError(err) {
      log.debug('Failed to connect to DB', err);
      cleanUp();
      reject(err);
    }

    function cleanUp() {
      mongoose.connection.removeListener("connected", onConnected);
      mongoose.connection.removeListener("error", onError);
    }

  });
};

module.exports = mongoose;
