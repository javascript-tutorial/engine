/**
 * Not to add entities.json into markdown-it build
 * resolve.alias in webpack:
 * 'entities/maps/entities.json': 'engine/markit/emptyEntities',
 * so it includes this empty file instead of the big one with entities
 **/
module.exports = {};
