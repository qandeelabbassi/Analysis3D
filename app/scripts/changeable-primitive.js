define([
  'libs/Cesium/Cesium',
  'billboard-group',
  'util'
], function(Cesium, BillboardGroup, Util) {
  var dragBillboard = {
    iconUrl: './assets/dragIcon.png',
    disableDepthTestDistance: Number.POSITIVE_INFINITY,
    shiftX: 0,
    shiftY: 0
  };

  // This class contains common functions for custom entities
  // i.e. PolygonPrimitive and PolylinePrimitive
  function ChangeablePrimitive() {}

  ChangeablePrimitive.prototype.initialiseOptions = function(drawHelper, options) {
    Util.fillOptions(this, options);
    this._drawHelper = drawHelper;
    this._ellipsoid = undefined;
    this._granularity = undefined;
    this._height = undefined;
    this._textureRotationAngle = undefined;
    this._id = undefined;

    // set the flags to initiate a first drawing
    this._createPrimitive = true;
    this._primitive = undefined;
    this._outlinePolygon = undefined;

  };

  ChangeablePrimitive.prototype.setAttribute = function(name, value) {
    this[name] = value;
    this._createPrimitive = true;
  };

  ChangeablePrimitive.prototype.getAttribute = function(name) {
    return this[name];
  };

  ChangeablePrimitive.prototype.isDestroyed = function() {
    return false;
  };

  ChangeablePrimitive.prototype.destroy = function() {
    this._primitive = this._primitive && this._primitive.destroy();
    return Cesium.destroyObject(this);
  };

  // Set listener as a property of this object
  ChangeablePrimitive.prototype.setListener = function(type, callback) {
    this[type] = callback;
  }

  // Call these listener like this primitive[Util.event.LEFT_CLICK](position);
  // initialiseHandlers function inside draw-helper.js uses these listeners
  ChangeablePrimitive.prototype.setEditableListeners = function() {
    // handlers for interactions
    // highlight primitive when mouse is entering
    this.setListener(Util.event.MOUSE_MOVE, function(position) {
      this.setHighlighted(true);
      if (!this._editMode) {
        // show tooltip i.e. click to edit this shape
      }
    });
    // hide the highlighting when mouse is leaving the polygon
    this.setListener(Util.event.MOUSE_OUT, function(position) {
      this.setHighlighted(false);
      // hide tooltip
    });
    this.setListener(Util.event.RIGHT_CLICK, function(position) {
      if (this._editMode) {
        return;
      }
      var self = this;
      var menu = [{
        label: 'EDIT',
        icon: 'menuEdit.png',
        action: () => {
          self._drawHelper._contextMenu.destroy();
          self.setEditMode(true);
        }
      }, {
        label: 'DELETE',
        icon: 'menuDelete.png',
        action: () => {
          self._drawHelper._contextMenu.destroy();
          self.destroy(true);
        }
      }];
      this._drawHelper.disableAllHighlights();
      this._drawHelper.disableAllEditMode();
      // Refresh and show menu
      this._drawHelper._contextMenu.buildDOM(menu);
      this._drawHelper._contextMenu.show(position.x, position.y);
    });
  }

  ChangeablePrimitive.prototype.setEditMode = function(editMode) {
    // if no change
    if (this._editMode == editMode) {
      return;
    }
    // make sure all other shapes are not in edit mode before starting the editing of this shape
    this._drawHelper.disableAllHighlights();
    // display markers
    if (editMode) {
      this._drawHelper.setEdited(this);
      var scene = this._drawHelper._scene;
      var _self = this;
      // create the markers and handlers for the editing
      if (this._markers == null) {
        var markers = new BillboardGroup(this._drawHelper, dragBillboard);

        var handleMarkerChanges = {
          dragHandlers: {
            onDrag: function(index, position) {
              _self.positions[index] = position;
              _self._createPrimitive = true;
            },
            onDragEnd: function() {
              _self._createPrimitive = true;
              if (_self["onEdited"])
                _self["onEdited"]();
            }
          },
          onRightClick: function(position, index) {
            console.log("right click")
            var menu = [{
              label: 'DELETE',
              action: () => {
                _self._drawHelper._contextMenu.destroy();
                if (_self.positions.length < 4) {
                  return;
                }
                // remove the point and the corresponding markers
                _self.positions.splice(index, 1);
                _self._createPrimitive = true;
                markers.removeBillboard(index);
              }
            }];
            // Refresh and show menu
            _self._drawHelper._contextMenu.buildDOM(menu);
            _self._drawHelper._contextMenu.show(position.x, position.y);
          },
          tooltip: function() {
            return "drag to change position"
          }
        };
        // add billboards and keep an ordered list of them for the polygon edges
        markers.addBillboards(_self.positions, handleMarkerChanges);
        this._markers = markers;

        // add key press listener to finish editing on ESC press
        document.onkeydown = function(evt) {
          evt = evt || window.event;
          if (evt.key === "Enter" && _self._editMode)
            _self.setEditMode(false);
        };

        // set on top of the polygon
        markers.setOnTop();
      }
      this._editMode = true;
    } else {
      if (this._markers != null) {
        this._markers.remove();
        this._markers = null;
        document.onkeydown = null;
      }
      this._editMode = false;
    }
  }

  /**
   * Do not call this function
   * This function is called automatically on scene render frequently
   */
  ChangeablePrimitive.prototype.update = function(context, frameState, commandList) {
    if (!Cesium.defined(this.ellipsoid)) {
      throw new Cesium.DeveloperError('this.ellipsoid must be defined.');
    }

    if (!Cesium.defined(this.appearance)) {
      throw new Cesium.DeveloperError('this.material must be defined.');
    }

    if (this.granularity < 0.0) {
      throw new Cesium.DeveloperError(
        'this.granularity and scene2D/scene3D overrides must be greater than zero.');
    }

    if (!this.show) {
      return;
    }

    if (!this._createPrimitive && (!Cesium.defined(this._primitive))) {
      // No positions/hierarchy to draw
      return;
    }

    if (this._createPrimitive ||
      (this._ellipsoid !== this.ellipsoid) ||
      (this._granularity !== this.granularity) ||
      (this._height !== this.height) ||
      (this._textureRotationAngle !== this.textureRotationAngle) ||
      (this._id !== this.id)) {

      var geometry = this.getGeometry();
      if (!geometry) {
        return;
      }

      this._createPrimitive = false;
      this._ellipsoid = this.ellipsoid;
      this._granularity = this.granularity;
      this._height = this.height;
      this._textureRotationAngle = this.textureRotationAngle;
      this._id = this.id;

      this._primitive = this._primitive && this._primitive.destroy();

      this._primitive = new Cesium.Primitive({
        geometryInstances: new Cesium.GeometryInstance({
          geometry: geometry,
          id: this.id,
          pickPrimitive: this
        }),
        appearance: this.appearance,
        depthFailAppearance: this.appearance,
        asynchronous: this.asynchronous
      });
    }

    var primitive = this._primitive;
    primitive.debugShowBoundingVolume = this.debugShowBoundingVolume;
    primitive.update(context, frameState, commandList);
  };

  return ChangeablePrimitive;
});
