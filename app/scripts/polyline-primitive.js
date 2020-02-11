define([
  'libs/Cesium/Cesium',
  'changeable-primitive',
  'util'
], function(Cesium, ChangeablePrimitive, Util) {
  var material = Cesium.Material.fromType(Cesium.Material.ColorType);
  var materialHighlight = Cesium.Material.fromType(Cesium.Material.ColorType);
  material.uniforms.color = new Cesium.Color(1.0, 1.0, 0.0, 1);
  materialHighlight.uniforms.color = new Cesium.Color(1.0, 0.64453125, 0.0, 1);

  var defaultPolylineOptions = {
    ellipsoid: Cesium.Ellipsoid.WGS84,
    textureRotationAngle: 0.0,
    height: 0.0,
    asynchronous: true,
    show: true,
    debugShowBoundingVolume: false,
    width: 3,
    geodesic: true,
    granularity: 10000,
    appearance: new Cesium.PolylineMaterialAppearance({
      material: material
    })
  }

  //Extends -> ChangeablePrimitive
  //This class defines helper functions for PolylineGeometry
  function PolylinePrimitive(drawHelpr, options) {
    if (options != undefined)
      options = Util.copyOptions(options, defaultPolylineOptions);
    else
      options = defaultPolylineOptions;
    this.initialiseOptions(drawHelpr, options);
  }

  PolylinePrimitive.prototype = new ChangeablePrimitive();

  PolylinePrimitive.prototype.setPositions = function(positions) {
    this.setAttribute('positions', positions);
  };

  PolylinePrimitive.prototype.setWidth = function(width) {
    this.setAttribute('width', width);
  };

  PolylinePrimitive.prototype.setGeodesic = function(geodesic) {
    this.setAttribute('geodesic', geodesic);
  };

  PolylinePrimitive.prototype.getPositions = function() {
    return this.getAttribute('positions');
  };

  PolylinePrimitive.prototype.getSegments = function() {
    var positions = this.getPositions()
    var segments = [];
    for (var i = 1; i < positions.length; i++) {
      var scratchCartesian3 = new Cesium.Cartesian3();
      var pointA = positions[i],
        pointB = positions[i - 1];
      scratchCartesian3.x = pointB.x - pointA.x;
      scratchCartesian3.y = pointB.y - pointA.y;
      scratchCartesian3.z = pointB.z - pointA.z;
      var distance = Cesium.Cartesian3.magnitude(scratchCartesian3); //in meters
      segments.push({
        'index': i,
        'distance': distance,
        'positions': [pointA, pointB] //cartesian points
      })
    }
    return segments;
  }

  PolylinePrimitive.prototype.getWidth = function() {
    return this.getAttribute('width');
  };

  PolylinePrimitive.prototype.getGeodesic = function() {
    return this.getAttribute('geodesic');
  };

  PolylinePrimitive.prototype.getGeometry = function() {

    if (!Cesium.defined(this.positions) || this.positions.length < 2) {
      return;
    }

    return new Cesium.PolylineGeometry({
      positions: this.positions,
      width: this.width < 1 ? 1 : this.width,
      vertexFormat: Cesium.EllipsoidSurfaceAppearance.VERTEX_FORMAT,
      ellipsoid: this.ellipsoid
    });
  };

  PolylinePrimitive.prototype.setHighlighted = function(highlighted) {
    var appearance;
    // disable if already in edit mode
    if (this._editMode === true) {
      return;
    }
    if (highlighted) {
      this._drawHelper.setHighlighted(this);
      this.setWidth(this.originalWidth * 2);
      appearance = new Cesium.PolylineMaterialAppearance({
        material: materialHighlight,
      });
    } else {
      this.setWidth(this.originalWidth);
      appearance = new Cesium.PolylineMaterialAppearance({
        material: material,
      });
    }
    this.setAttribute('appearance', appearance);
  }

  PolylinePrimitive.prototype.setEditable = function() {
    var polyline = this;
    polyline.isPolygon = false;
    polyline.asynchronous = false;
    polyline.originalWidth = this.width;
    // enhanceWithListeners(polyline);
    polyline.setEditableListeners(polyline);
    polyline.setEditMode(false);
  }

  return PolylinePrimitive;
});
