exports.BasicParser = require('./basicParser');
exports.ServerParser = require('./serverParser');

exports.Token = require('markdown-it/lib/token');
exports.tokenUtils = require('./utils/token');

exports.stripTitle = require('./stripTitle');
exports.stripYamlMetadata = require('./stripYamlMetadata');

exports.escape = markdown => markdown.replace(/[<>\[\]\\]/g, '\\$&');
exports.unescape = markdown => markdown.replace(/\\(.)/g, '$1');