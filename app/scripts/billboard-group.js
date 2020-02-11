define([
  'libs/Cesium/Cesium',
  'util'
], function(Cesium, Util) {
  var defaultBillboard = {
    iconUrl: './assets/dragIcon.png',
    shiftX: 0,
    shiftY: 0
  };

  //Helper class for cesium's billboard collection
  function BillboardGroup(drawHelper, billboardOptions) {
    this._drawHelper = drawHelper;
    this._viewer = drawHelper._viewer;
    this._scene = drawHelper._scene;
    this._camera = drawHelper._camera;

    if (billboardOptions != undefined)
      this._options = Util.copyOptions(billboardOptions, defaultBillboard);
    else
      this._options = defaultBillboard;

    // create one common billboard collection for all billboards
    var b = new Cesium.BillboardCollection();
    this._scene.primitives.add(b);
    this._billboards = b;
    // keep an ordered list of billboards
    this._orderedBillboards = [];
  };

  BillboardGroup.prototype.createBillboard = function(position, callbacks) {
    var billboard = this._billboards.add({
      show: true,
      isFirst: false,
      position: position,
      pixelOffset: new Cesium.Cartesian2(this._options.shiftX,
        this._options.shiftY),
      eyeOffset: new Cesium.Cartesian3(0.0, 0.0, 0.0),
      disableDepthTestDistance: this._options.disableDepthTestDistance,
      horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
      verticalOrigin: Cesium.VerticalOrigin.CENTER,
      scale: 0.9,
      image: this._options.iconUrl,
      color: new Cesium.Color(1.0, 1.0, 1.0, 1.0),
    });

    //if editable
    if (callbacks) {
      var _self = this;
      var screenSpaceCameraController = this._scene.screenSpaceCameraController;

      if (callbacks.dragHandlers) {
        var _self = this;
        _self.setListener(billboard, Util.event.LEFT_DOWN, function(position) {
          function onDrag(position) {
            // Disable depth test otherwise pickPosition gives inaccurate results
            billboard.disableDepthTestDistance = 0;
            billboard.position = position;
            // Call onDrag callback to update the drawing as well
            callbacks.dragHandlers.onDrag && callbacks.dragHandlers.onDrag(_self.getIndex(billboard), position);
          }

          function onDragEnd() {
            billboard.disableDepthTestDistance = Number.POSITIVE_INFINITY;
            _self._viewer.screenSpaceEventHandler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_UP);
            handler.destroy();
            callbacks.dragHandlers.onDragEnd && callbacks.dragHandlers.onDragEnd();
          }

          var handler = new Cesium.ScreenSpaceEventHandler(_self._scene.canvas);
          // Update positions as mouse moves while left click is pressed
          handler.setInputAction(function(movement) {
            var cartesian = _self._scene.pickPosition(movement.endPosition);
            if (cartesian) {
              onDrag(cartesian);
            } else {
              onDragEnd(cartesian);
            }
          }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

          // broken in cesium 1.63; use same ScreenSpaceEventHandler
          // for left down and up otherwise you will have to click twice
          // handler.setInputAction(function(movement) {
          //   onDragEnd(_self._scene.pickPosition(movement.position));
          // }, Cesium.ScreenSpaceEventType.LEFT_UP);

          // Finish drag when left click is released
          _self._viewer.screenSpaceEventHandler.setInputAction(function(e) {
            onDragEnd();
          }, Cesium.ScreenSpaceEventType.LEFT_UP);

        });
      }
      if (callbacks.onDoubleClick) {
        _self.setListener(billboard, Util.event.LEFT_DOUBLE_CLICK, function(position) {
          callbacks.onDoubleClick(_self.getIndex(billboard));
        });
      }
      if (callbacks.onLeftClick) {
        _self.setListener(billboard, Util.event.LEFT_CLICK, function(position) {
          callbacks.onLeftClick(_self.getIndex(billboard));
        });
      }
      if (callbacks.onRightClick) {
        _self.setListener(billboard, Util.event.RIGHT_CLICK, function(position) {
          callbacks.onRightClick(position, _self.getIndex(billboard));
        });
      }
      if (callbacks.tooltip) {
        _self.setListener(billboard, Util.event.MOUSE_MOVE, function(position) {
          //show tooltip i.e. drag to change position
        });
        _self.setListener(billboard, Util.event.MOUSE_OUT, function(position) {
          //hide tooltip
        });
      }
    }
    return billboard;
  };

  BillboardGroup.prototype.insertBillboard = function(
    index, position, callbacks) {
    this._orderedBillboards.splice(index, 0,
      this.createBillboard(position, callbacks));
  };

  BillboardGroup.prototype.addBillboard = function(
    position, callbacks) {
    this._orderedBillboards.push(this.createBillboard(position, callbacks));
  };

  BillboardGroup.prototype.addBillboards = function(
    positions, callbacks) {
    var index = 0;
    for (; index < positions.length; index++) {
      this.addBillboard(positions[index], callbacks);
    }
  };

  BillboardGroup.prototype.updateBillboardsPositions = function(positions) {
    var index = 0;
    for (; index < positions.length; index++) {
      this.getBillboard(index).position = positions[index];
    }
  };

  BillboardGroup.prototype.countBillboards = function() {
    return this._orderedBillboards.length;
  };

  BillboardGroup.prototype.getBillboard = function(index) {
    return this._orderedBillboards[index];
  };

  BillboardGroup.prototype.getIndex = function(billboard) {
    // find index
    for (var i = 0, I = this._orderedBillboards.length; i < I && this._orderedBillboards[i] != billboard; ++i);
    return i;
  }

  BillboardGroup.prototype.removeBillboard = function(index) {
    this._billboards.remove(this.getBillboard(index));
    this._orderedBillboards.splice(index, 1);
  };

  BillboardGroup.prototype.remove = function() {
    this._billboards = this._billboards && this._billboards.removeAll() &&
      this._billboards.destroy();
  };

  BillboardGroup.prototype.setOnTop = function() {
    this._scene.primitives.raiseToTop(this._billboards);
  };

  BillboardGroup.prototype.setListener = function(billboard, type, callback) {
    billboard[type] = callback;
  }

  return BillboardGroup;
});
