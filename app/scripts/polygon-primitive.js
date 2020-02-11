define([
  'libs/Cesium/Cesium',
  'changeable-primitive',
  'util'
], function(Cesium, ChangeablePrimitive, Util) {
  var material = Cesium.Material.fromType(Cesium.Material.ColorType);
  var materialHighlight = Cesium.Material.fromType(Cesium.Material.ColorType);
  material.uniforms.color = new Cesium.Color(1.0, 1.0, 0.0, 1);
  materialHighlight.uniforms.color = new Cesium.Color(1.0, 0.64453125, 0.0, 1);

  var defaultSurfaceOptions = {
    ellipsoid: Cesium.Ellipsoid.WGS84,
    textureRotationAngle: 0.0,
    height: 0.0,
    asynchronous: true,
    show: true,
    debugShowBoundingVolume: false,
    appearance: new Cesium.EllipsoidSurfaceAppearance({
      material: material,
    }),
    perPositionHeight: true,
    granularity: Math.PI / 180.0
  }

  //Extends -> ChangeablePrimitive
  //This class defines helper functions for PolygonGeometry
  function PolygonPrimitive(drawHelpr, options) {
    if (options != undefined)
      options = Util.copyOptions(options, defaultSurfaceOptions);
    else
      options = defaultSurfaceOptions;
    this.initialiseOptions(drawHelpr, options);
    this.isPolygon = true;
  }

  PolygonPrimitive.prototype = new ChangeablePrimitive();

  PolygonPrimitive.prototype.setPositions = function(positions) {
    this.setAttribute('positions', positions);
  };

  PolygonPrimitive.prototype.getPositions = function() {
    return this.getAttribute('positions');
  };

  PolygonPrimitive.prototype.getSegments = function() {
    var positions = this.getPositions()
    var segments = [];
    var addSegment = function(segments, pointA, pointB) {
      var scratchCartesian3 = new Cesium.Cartesian3();
      scratchCartesian3.x = pointB.x - pointA.x;
      scratchCartesian3.y = pointB.y - pointA.y;
      scratchCartesian3.z = pointB.z - pointA.z;
      var distance = Cesium.Cartesian3.magnitude(scratchCartesian3); //in meters
      segments.push({
        'index': segments.length + 1,
        'distance': distance,
        'positions': [pointA, pointB] //cartesian points
      })
    }

    for (var i = 1; i < positions.length; i++) {
      var pointA = positions[i],
        pointB = positions[i - 1];
      addSegment(segments, pointA, pointB);
    }

    //add implicit last segment; from first point to last point
    var pointA = positions[0],
      pointB = positions[positions.length - 1];
    addSegment(segments, pointA, pointB);

    return segments;
  }

  PolygonPrimitive.prototype.getGeometry = function() {

    if (!Cesium.defined(this.positions) || this.positions.length < 3) {
      return;
    }

    return Cesium.PolygonGeometry.fromPositions({
      positions: this.positions,
      height: this.height,
      vertexFormat: Cesium.EllipsoidSurfaceAppearance.VERTEX_FORMAT,
      stRotation: this.textureRotationAngle,
      perPositionHeight: this.perPositionHeight,
      ellipsoid: this.ellipsoid,
      granularity: this.granularity
    });
  };

  PolygonPrimitive.prototype.getOutlineGeometry = function() {
    return Cesium.PolygonOutlineGeometry.fromPositions({
      positions: this.getPositions()
    });
  }

  PolygonPrimitive.prototype.setHighlighted = function(highlighted) {
    var appearance;
    // disable if already in edit mode
    if (this._editMode === true) {
      return;
    }
    if (highlighted) {
      this._drawHelper.setHighlighted(this);
      appearance = new Cesium.EllipsoidSurfaceAppearance({
        material: materialHighlight,
      });
    } else {
      appearance = new Cesium.EllipsoidSurfaceAppearance({
        material: material,
      });
    }
    this.setAttribute('appearance', appearance);
  }

  PolygonPrimitive.prototype.setEditable = function() {
      var polygon = this;
      polygon.asynchronous = false;
      var scene = this._drawHelper._scene;
      // enhanceWithListeners(polygon);
      polygon.setEditableListeners(polygon);
      polygon.setEditMode(false);
  }

  return PolygonPrimitive;
});
