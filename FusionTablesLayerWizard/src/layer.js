/**
 * @fileoverview Code for Layer.
 *
 * Controls the Fusion Table Layer.
 *
 */

/**
 * Layer constructor.
 * @constructor
 * @param {string} tableId The id of the table.
 * @param {string} locationColumn The location column.
 * @param {string} where A filter for the layer.
 */
var Layer = function(tableId, locationColumn, where) {
  this.initialize(tableId, locationColumn, where);
};

/**
 * The FusionTablesLayer to add to the map.
 * @type {Object}
 */
Layer.prototype.layer = null;

/**
 * The table id for the Fusion Table Layer.
 * @type {string}
 */
Layer.prototype.tableId = null;

/**
 * The location column of the table in the layer.
 * @type {string}
 */
Layer.prototype.locationColumn = null;

/**
 * The a filter for the layer.
 * @type {string}
 */
Layer.prototype.where = null;

/**
 * Any searches added to the layer (text or select).
 * @type {Object}
 */
Layer.prototype.search = null;

/**
 * Initializes the layer.
 * @param {string} tableId The id of the table.
 * @param {string} locationColumn The location column.
 * @param {string} where A filter for the layer.
 */
Layer.prototype.initialize = function(tableId, locationColumn, where) {
  this.tableId = tableId;
  this.locationColumn = locationColumn;
  this.where = where;
  this.layer = new google.maps.FusionTablesLayer({
    query: {
      select: locationColumn,
      from: tableId,
      where: where
    }
  });
};

/**
 * Sets the map of the layer.
 * @param {google.maps.Map} map The map for the layer.
 */
Layer.prototype.setMap = function(map) {
  this.layer.setMap(map);
};

/**
 * Add a search to the layer.
 * @param {string} type The type of search, either text or select.
 * @param {string} label The label for the search.
 * @param {string} column The column to be searched.
 */
Layer.prototype.addSearch = function(type, label, column) {
  // TODO: allow for multiple search elements
  if (!this.search) {
    this.search = new Search(type, label, column);
  }
};

/**
 * Update the layer query.
 * @param {string} value The search value.
 */
Layer.prototype.query = function(value) {
  var comparator = ' = ';
  if (this.search.type == 'text') {
    comparator = ' CONTAINS IGNORING CASE ';
  }
  value = value.replace(/'/g, "\\'");

  var where = '';
  if (this.where) {
    where += this.where + ' AND ';
  }
  where += "'" + this.search.column + "'" + comparator + "'" + value + "'";
  this.layer.setOptions({
    query: {
      select: this.locationColumn,
      from: this.tableId,
      where: where
    }
  });
};

/**
 * Remove the search.
 */
Layer.prototype.removeSearch = function() {
  this.search = null;
  this.reset();
};

/**
 * Reset the layer query.
 */
Layer.prototype.reset = function() {
  this.layer.setOptions({
    query: {
      select: this.locationColumn,
      from: this.tableId,
      where: this.where
    }
  });
};
