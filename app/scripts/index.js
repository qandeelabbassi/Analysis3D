requirejs.config({
  baseUrl: 'scripts',
  paths: {
    jquery: './libs/jquery-3.4.1.min',
    node_modules: '../../node_modules'
  }
});
requirejs([
    'jquery',
    'libs/Cesium/Cesium',
    'draw-helper',
    'polyline-primitive',
    'polygon-primitive',
    'util'
  ],
  function($, Cesium, DrawHelper, PolylinePrimitive, PolygonPrimitive, Util) {
    Cesium.Ion.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJiN2U2ZmM2OS1jMDg0LTRhZjctOTEyNS02Nzc4NDQxZjMzZjAiLCJpZCI6NDY0LCJpYXQiOjE1MjUyNDc4ODR9.V-919Z1UtidDqdvKvjoIbx4nTMFrCyFOmzEfqu1URAo';
    // Assign this to terrainProvider to enable 3d terrain
    var worldTerrain = Cesium.createWorldTerrain({
      requestWaterMask: true,
      requestVertexNormals: true
    });

    // Initialize Cesium Container
    var viewer = new Cesium.Viewer('cesiumContainer', {
      terrainProvider: new Cesium.EllipsoidTerrainProvider({}),
      timeline: false,
      animation: false,
    });

    var camera = viewer.camera;
    var scene = viewer.scene;
    scene.globe.depthTestAgainstTerrain = false;

    // Add tileset
    var tileset = new Cesium.Cesium3DTileset({
      url: './assets/tileset/tileset.json',
      maximumScreenSpaceError: Util.isMobile() ? 8 : 1, // Temporary workaround for low memory mobile devices - Increase maximum error to 8.
      maximumNumberOfLoadedTiles: Util.isMobile() ? 10 : 1000 // Temporary workaround for low memory mobile devices - Decrease (disable) tile cache.
    });

    // Wait for tileset to load
    tileset.readyPromise.then(function() {
      viewer.scene.primitives.add(tileset);
      viewer.zoomTo(tileset, new Cesium.HeadingPitchRange(0, -2.0, Math.max(100.0 - tileset.boundingSphere.radius, 0.0)));
      // Create DrawHelper object
      drawHelper = new DrawHelper(viewer);
      // Automatically start polyline drawing
      drawHelper.startDrawing({
        callback: function(positions, createPolygon) {
          if (createPolygon) {
            var polygon = new PolygonPrimitive(drawHelper, {
              positions: positions,
              asynchronous: false
            });
            polygon.setEditable();
            scene.primitives.add(polygon);
            var segments = polygon.getSegments();
            //get updated segments everytime the polygon is edited
            polygon.setListener("onEdited", function(){
              segments = polygon.getSegments();
            });
          } else {
            var polyline = new PolylinePrimitive(drawHelper, {
              positions: positions,
              width: 5,
              geodesic: true,
              asynchronous: false
            });
            polyline.setEditable();
            scene.primitives.add(polyline);
            var segments = polyline.getSegments();
            //get updated segments everytime the polyline is edited
            polyline.setListener("onEdited", function(){
              segments = polyline.getSegments();
            });
          }
        }
      });
    });
  });
