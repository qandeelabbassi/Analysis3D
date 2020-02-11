define([
  'libs/Cesium/Cesium',
  'libs/menufy',
  'changeable-primitive',
  'billboard-group',
  'polyline-primitive',
  'util'
], function(Cesium, menufy, ChangeablePrimitive, BillboardGroup, PolylinePrimitive, Util) {
  /************Private Static Variables*************/
  var ellipsoid = Cesium.Ellipsoid.WGS84;

  /************CONSTRUCTOR*************/
  function DrawHelper(cesiumWidget) {
    this._viewer = cesiumWidget;
    this._camera = cesiumWidget.camera;
    this._scene = cesiumWidget.scene;
    this._contextMenu = new Menufy([]); // Create empty menu
    this.initialiseHandlers();
  }

  /************Editing Functions*************/

  // Set handlers for mouse events on cesium canvas
  // and trigger relevant callbacks in primitive.
  DrawHelper.prototype.initialiseHandlers = function() {
    var scene = this._scene;
    var _self = this;
    var mouseOutObject;
    /*
    If the event 'position' intercepts with some primitive
    then this funciton invokes the callback stored witin the primitive
    as 'callbackName' property
    */
    var callPrimitiveCallback = function(callbackName, position) {
      if (_self._handlersMuted == true) return;
      console.log(callbackName);
      var pickedObject = scene.pick(position);
      if (pickedObject && pickedObject.primitive && pickedObject.primitive[callbackName]) {
        pickedObject.primitive[callbackName](position);
      } else {
        // hide edit footer if click didn't intercept any primitive or
        // the callback didn't exist in primitive
        _self._contextMenu.destroy();
      }
    }

    /*
    These are scene events (i.e LEFT_CLICK, LEFT_DOUBLE_CLICK etc.)
    which call callPrimitiveCallback function with name of relavant callback to invoke
    and the position of the mouse
    */
    var handler = new Cesium.ScreenSpaceEventHandler(scene.canvas);
    handler.setInputAction(
      function(movement) {
        callPrimitiveCallback(Util.event.LEFT_CLICK, movement.position);
      }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
    handler.setInputAction(
      function(movement) {
        callPrimitiveCallback(Util.event.RIGHT_CLICK, movement.position);
      }, Cesium.ScreenSpaceEventType.RIGHT_CLICK);
    handler.setInputAction(
      function(movement) {
        callPrimitiveCallback(Util.event.LEFT_DOUBLE_CLICK, movement.position);
      }, Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK);
    handler.setInputAction(
      function(movement) {
        callPrimitiveCallback(Util.event.LEFT_UP, movement.position);
      }, Cesium.ScreenSpaceEventType.LEFT_UP);
    handler.setInputAction(
      function(movement) {
        callPrimitiveCallback(Util.event.LEFT_DOWN, movement.position);
      }, Cesium.ScreenSpaceEventType.LEFT_DOWN);
    handler.setInputAction(
      function(movement) {
        if (_self._handlersMuted == true) return;
        var pickedObject = scene.pick(movement.endPosition);

        if (mouseOutObject && (!pickedObject || mouseOutObject != pickedObject.primitive)) {
          !(mouseOutObject.isDestroyed && mouseOutObject.isDestroyed()) && mouseOutObject[Util.event.MOUSE_OUT](movement.endPosition);
          mouseOutObject = null;
        }

        if (pickedObject && pickedObject.primitive && !(pickedObject.primitive instanceof Cesium.Cesium3DTileset)) {
          pickedObject = pickedObject.primitive;
          if (pickedObject[Util.event.MOUSE_OUT]) {
            mouseOutObject = pickedObject;
          }
          if (pickedObject[Util.event.MOUSE_MOVE]) {
            pickedObject[Util.event.MOUSE_MOVE](movement.endPosition);
          }
        }
      }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);
  }

  // Call this to disable mouse handler inside initialiseHandlers
  DrawHelper.prototype.muteHandlers = function(muted) {
    this._handlersMuted = muted;
  }

  // Make sure only one shape is highlighted at a time
  DrawHelper.prototype.disableAllHighlights = function() {
    this.setHighlighted(undefined);
  }

  // Stores current highlighted surface to disable highlight later
  DrawHelper.prototype.setHighlighted = function(surface) {
    if (this._highlightedSurface && !this._highlightedSurface.isDestroyed() && this._highlightedSurface != surface) {
      this._highlightedSurface.setHighlighted(false);
    }
    this._highlightedSurface = surface;
  }

  // Make sure only one shape is in edit mode
  DrawHelper.prototype.disableAllEditMode = function() {
    this.setEdited(undefined);
  }

  // Keep track of surface currently in edited mode
  DrawHelper.prototype.setEdited = function(surface) {
    if (this._editedSurface && !this._editedSurface.isDestroyed()) {
      this._editedSurface.setEditMode(false);
    }
    this._editedSurface = surface;
  }

  /************Drawing Functions*************/

  // Draw polyline and polygon
  DrawHelper.prototype.startDrawing = function(options) {
    var cleanUp = function() {
      primitives.remove(poly);
      markers.remove();
      mouseHandler.destroy();
    }
    // check for cleanUp first; cleanUp previous operations before new drawing
    if (this.editCleanUp)
      this.editCleanUp();
    this.editCleanUp = cleanUp;
    // undo any current edit of shapes
    this.disableAllEditMode();
    this.muteHandlers(true);

    var _self = this;
    var scene = this._scene;
    var camera = this._camera;
    var primitives = scene.primitives;
    var minPoints = 2;
    var minPolygonPoints = 3;

    var markers = new BillboardGroup(this);
    var poly = new PolylinePrimitive(this, options);
    poly.asynchronous = false;
    primitives.add(poly);
    markers.setOnTop();

    var positions = [];
    var mouseMovement;
    var mouseHandler = new Cesium.ScreenSpaceEventHandler(scene.canvas);

    // On LEFT_CLICK: Add new position to polyline and add a new marker
    mouseHandler.setInputAction(function(movement) {
      if (movement.position != null) {
        var cartesian = scene.pickPosition(movement.position);
        //don't call drillPick before pickPosition otherwise wrong cartesian returned; cesium bug
        var pickedObjects = scene.drillPick(movement.position);
        var firstMarkerClicked = false;

        //check if picked objects array has first marker
        for (var i = 0; i < pickedObjects.length; i++) {
          var po = pickedObjects[i];
          if (po.primitive && po.primitive instanceof Cesium.Billboard && po.primitive.isFirst)
            firstMarkerClicked = true;
        }

        // Finish editing and create polygon as first marker was clicked.
        if (firstMarkerClicked && positions.length >= minPolygonPoints) {
          finishDrawing(movement, true);
        } else if (cartesian) {
          if (positions.length === 0) {
            // First click
            positions.push(cartesian.clone());
            markers.addBillboard(positions[0]);
            markers.getBillboard(0).isFirst = true;
          }
          if (positions.length >= minPoints) {
            poly.setPositions(positions);
          }
          // Disable depthTest for recently added billboard to keep it above model
          markers.getBillboard(positions.length - 1).disableDepthTestDistance = Number.POSITIVE_INFINITY;
          // Add new point to polyline. This one will move with the mouse
          positions.push(cartesian);
          // Add marker at the new point. This one will move with mouse
          markers.addBillboard(cartesian);
        }
      }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

    // On MOUSE_MOVE: Make polyline and marker follow the mouse
    mouseHandler.setInputAction(function(movement) {
      mouseMovement = movement;
      var position = movement.endPosition;
      if (position != null && positions.length > 0) {
        var cartesian;
        var po = scene.pick(position);
        if (po && po.primitive && po.primitive instanceof Cesium.Billboard && po.primitive.isFirst) {
          // The cursor is on first marker. Snap the current position to first position
          // Helps creating polygon
          cartesian = positions[0];
        } else {
          cartesian = scene.pickPosition(position);
        }
        if (cartesian) {
          // remove old position and add new one because cursor position changed
          positions.pop();
          positions.push(cartesian);
          if (positions.length >= minPoints) {
            poly.setPositions(positions);
          }
          // Update last marker on mouse move. This marker moves with mouse
          markers.getBillboard(positions.length - 1).position = cartesian;
        }
      }
    }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

    var finishDrawing = function(movement, createPolygon) {
      document.onkeydown = null;
      var position = movement.position;
      if (position != null) {
        if (positions.length < minPoints + 1) {
          // Not enough points to create polyline
          return;
        } else {
          var cartesian = scene.pickPosition(movement.position);
          if (cartesian) {
            if (typeof options.callback === 'function') {
              // Remove last point moving with mouse
              var index = positions.length - 1;
              markers.removeBillboard(index);
              positions.pop();
              poly.setPositions(positions);
              // Stop drawing and return results through callback
              _self.stopDrawing();
              options.callback(positions, createPolygon);
            }
          }
        }
      }
    }
    // On RIGHT_CLICK: Finish editing and return points
    mouseHandler.setInputAction(finishDrawing, Cesium.ScreenSpaceEventType.RIGHT_CLICK);
    // Finish drawing on enter key press
    document.onkeydown = function(evt) {
      evt = evt || window.event;
      if (evt.key === "Enter") {
        mouseMovement.position = mouseMovement.endPosition;
        finishDrawing(mouseMovement);
      }
    };
  };

  DrawHelper.prototype.stopDrawing = function() {
    // check for cleanUp first
    if (this.editCleanUp) {
      this.editCleanUp();
      this.editCleanUp = null;
    }
    this.muteHandlers(false);
  };

  // If you want to setup something for polyline drawing then
  // use this function instead of calling startDrawing directly
  DrawHelper.prototype.startDrawingPolyline = function(options) {
    this.startDrawing(options);
  }

  // If you want to setup something for polygon drawing then
  // use this function instead of calling startDrawing directly
  DrawHelper.prototype.startDrawingPolygon = function(options) {
    this.startDrawing(options);
  }


  return DrawHelper;
});
