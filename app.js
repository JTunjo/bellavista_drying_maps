// ══════════════════════════════════════════════════════════════════════════
//  CONFIG
// ══════════════════════════════════════════════════════════════════════════
const DB_PATH     = 'datos_sensores.db';
const CONFIG_PATH = 'config.json';                 // editable layout, same folder
const MODULE_ID   = 'mod-sec-belvis-marq';         // "marquesina"
const SQLJS_BASE  = 'https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.3/';

// Data source: 'proxy' calls your Cloudflare Worker (which logs in and fetches all sensors
// server-side, returns them with CORS) — refreshes on demand via the Reload button.
// 'snapshot' reads a static JSON from a GitHub Action; 'api' calls the dashboard directly; 'db' = SQLite.
const DATA_SOURCE = 'proxy';
const PROXY_URL   = 'https://tunjo-marquesina-proxy.jchacon-013.workers.dev';   // <-- set after deploying the Worker
const SNAPSHOT_PATH = 'data/marquesina.json';       // used only when DATA_SOURCE==='snapshot'
const API_BASE    = 'https://dashboard.tunjosolutions.co/api/chart/data';
const API_HOURS   = 1;                              // pull the last clock hour (now-1h .. now)
const API_CONCURRENCY = 6;                          // parallel requests
const LOGO_URL    = 'https://raw.githubusercontent.com/JTunjo/asset_hosting/refs/heads/main/Tunjo_h.png';

// Timezone: measure_date is stored as Colombia local wall-clock (UTC-05:00) with no
// zone marker. We parse it with that offset and always render in the same zone, so the
// displayed time matches the stored value on any browser, regardless of the viewer's TZ.
const TZ_OFFSET   = '-05:00';
const DISPLAY_TZ  = 'America/Bogota';
const TZ_OFFSET_H = -5;   // Colombia has no DST — fixed UTC-5 all year

// ── Sun-path calibration ─────────────────────────────────────────────────
// These are the two real-world GPS points you gave us (Frente / Atrás of the
// building). They're only used to work out which compass direction the
// building's "hacia ATRÁS" axis (world +Z) points at — everything else (sun
// position at any moment) comes from the lat/lon + SunCalc.
// Replace with more precise coordinates any time; the orientation below
// recalculates automatically. To force a specific bearing instead, set
// SUN_NORTH_OFFSET_OVERRIDE_DEG to a number (0=N, 90=E, 180=S, 270=O).
// Per-area sun orientation: set by setActiveArea() from the active area's geo.front/back.
// To force a specific bearing instead, set SUN_NORTH_OFFSET_OVERRIDE_DEG (0=N,90=E,180=S,270=O).
let SUN_FRENTE = null;
let SUN_ATRAS  = null;
let SUN_LAT = 0;
let SUN_LON = 0;
const SUN_NORTH_OFFSET_OVERRIDE_DEG = null;

// Cleaning bounds + metric metadata
const BOUNDS      = { temp:[10,45], hum:[5,100] };
const METRIC_UNIT = { temp:'°C', hum:'%' };
const METRIC_NAME = { temp:'temperatura', hum:'humedad' };

// Coordinate convention (from config.json), all in CENTIMETRES, origin = bottom-left-front:
//   x = width  (left→right)      y = depth (front→back)      z = height (floor→ceiling)
// Rendered in three-space as: worldX = x, worldY = z (up), worldZ = y  (metres = cm/100)
const cm = v => v/100;
const toWorld = p => ({ x: cm(p.x), y: cm(p.z), z: cm(p.y) });

// Fallback layout used only if config.json can't be fetched (e.g. file://).
const FALLBACK_CONFIG = {
  "_readme": [
    "Multi-area. Cada objeto en 'areas' es un recinto independiente con sus medidas, geo, features y sensores.",
    "El selector del encabezado elige el area activa; orden por min(sensor_id).",
    "Coordenadas en CENTIMETROS desde la esquina INFERIOR-IZQUIERDA-FRONTAL (0,0,0).",
    "x=ancho(izq->der) | y=profundidad(frente->fondo) | z=altura(piso->techo).",
    "area.geo.front = GPS en y=0 (FRENTE); area.geo.back = GPS en y=max (ATRAS). Orientan el sol (solo se usa el rumbo).",
    "sensor_id unico en TODAS las areas. apiName = nombre exacto que espera la API.",
    "external:true: sensor fuera, no afecta campo/escala/estadisticas. replaceBefore/replaceWith: sustitucion visual."
  ],
  "areas": [
    {
      "id": "marquesina",
      "name": "Marquesina",
      "area": {
        "x": 440,
        "y": 1700,
        "z": 230
      },
      "geo": {
        "front": {
          "lat": 5.078066,
          "lon": -75.585393
        },
        "back": {
          "lat": 5.078166,
          "lon": -75.585503
        }
      },
      "features": [
        {
          "name": "Puerta",
          "type": "door",
          "x": 0,
          "y": 20,
          "z": 50
        },
        {
          "name": "Ventana E",
          "type": "window",
          "x": 440,
          "y": 410,
          "z": 220
        },
        {
          "name": "Ventana O",
          "type": "window",
          "x": 440,
          "y": 1220,
          "z": 220
        }
      ],
      "sensors": [
        {
          "sensor_id": 302,
          "metric": "temp",
          "label": "Marquesina T1",
          "line": 1,
          "pos": 1,
          "x": 70,
          "y": 280,
          "z": 113,
          "apiName": "Temperatura 1-1-302"
        },
        {
          "sensor_id": 301,
          "metric": "hum",
          "label": "Marquesina H1",
          "line": 1,
          "pos": 1,
          "x": 70,
          "y": 280,
          "z": 113,
          "apiName": "Humedad 1-1-301"
        },
        {
          "sensor_id": 304,
          "metric": "temp",
          "label": "Marquesina T2",
          "line": 1,
          "pos": 2,
          "x": 204,
          "y": 280,
          "z": 178,
          "apiName": "Temperatura 1-2-304"
        },
        {
          "sensor_id": 303,
          "metric": "hum",
          "label": "Marquesina H2",
          "line": 1,
          "pos": 2,
          "x": 204,
          "y": 280,
          "z": 178,
          "apiName": "Humedad 1-2-303"
        },
        {
          "sensor_id": 306,
          "metric": "temp",
          "label": "Marquesina T3",
          "line": 1,
          "pos": 3,
          "x": 355,
          "y": 280,
          "z": 118,
          "apiName": "Temperatura 1-3-306"
        },
        {
          "sensor_id": 305,
          "metric": "hum",
          "label": "Marquesina H3",
          "line": 1,
          "pos": 3,
          "x": 355,
          "y": 280,
          "z": 118,
          "apiName": "Humedad 1-3-305"
        },
        {
          "sensor_id": 308,
          "metric": "temp",
          "label": "Marquesina T4",
          "line": 2,
          "pos": 1,
          "x": 70,
          "y": 540,
          "z": 215,
          "apiName": "Temperatura 2-1-308"
        },
        {
          "sensor_id": 307,
          "metric": "hum",
          "label": "Marquesina H4",
          "line": 2,
          "pos": 1,
          "x": 70,
          "y": 540,
          "z": 215,
          "apiName": "Humedad 2-1-307"
        },
        {
          "sensor_id": 310,
          "metric": "temp",
          "label": "Marquesina T5",
          "line": 2,
          "pos": 2,
          "x": 204,
          "y": 540,
          "z": 124,
          "apiName": "Temperatura 2-2-310"
        },
        {
          "sensor_id": 309,
          "metric": "hum",
          "label": "Marquesina H5",
          "line": 2,
          "pos": 2,
          "x": 204,
          "y": 540,
          "z": 124,
          "apiName": "Humedad 2-2-309"
        },
        {
          "sensor_id": 312,
          "metric": "temp",
          "label": "Marquesina T6",
          "line": 2,
          "pos": 3,
          "x": 355,
          "y": 540,
          "z": 183,
          "apiName": "Temperatura 2-3-312"
        },
        {
          "sensor_id": 311,
          "metric": "hum",
          "label": "Marquesina H6",
          "line": 2,
          "pos": 3,
          "x": 355,
          "y": 540,
          "z": 183,
          "replaceBefore": "2026-08-23T12:00:00-05:00",
          "replaceWith": "mean",
          "apiName": "Humedad 2-3-311"
        },
        {
          "sensor_id": 314,
          "metric": "temp",
          "label": "Marquesina T7",
          "line": 3,
          "pos": 1,
          "x": 70,
          "y": 800,
          "z": 118,
          "apiName": "Temperatura 3-1-314"
        },
        {
          "sensor_id": 313,
          "metric": "hum",
          "label": "Marquesina H7",
          "line": 3,
          "pos": 1,
          "x": 70,
          "y": 800,
          "z": 118,
          "apiName": "Humedad 3-1-313"
        },
        {
          "sensor_id": 316,
          "metric": "temp",
          "label": "Marquesina T8",
          "line": 3,
          "pos": 2,
          "x": 204,
          "y": 800,
          "z": 177,
          "apiName": "Temperatura 3-2-316"
        },
        {
          "sensor_id": 315,
          "metric": "hum",
          "label": "Marquesina H8",
          "line": 3,
          "pos": 2,
          "x": 204,
          "y": 800,
          "z": 177,
          "apiName": "Humedad 3-2-315"
        },
        {
          "sensor_id": 318,
          "metric": "temp",
          "label": "Marquesina T9",
          "line": 3,
          "pos": 3,
          "x": 355,
          "y": 800,
          "z": 126,
          "apiName": "Temperatura 3-3-318"
        },
        {
          "sensor_id": 317,
          "metric": "hum",
          "label": "Marquesina H9",
          "line": 3,
          "pos": 3,
          "x": 355,
          "y": 800,
          "z": 126,
          "apiName": "Humedad 3-3-317"
        },
        {
          "sensor_id": 320,
          "metric": "temp",
          "label": "Marquesina T10",
          "line": 4,
          "pos": 1,
          "x": 70,
          "y": 1100,
          "z": 195,
          "apiName": "Temperatura 4-1-320"
        },
        {
          "sensor_id": 319,
          "metric": "hum",
          "label": "Marquesina H10",
          "line": 4,
          "pos": 1,
          "x": 70,
          "y": 1100,
          "z": 195,
          "apiName": "Humedad 4-1-319"
        },
        {
          "sensor_id": 322,
          "metric": "temp",
          "label": "Marquesina T11",
          "line": 4,
          "pos": 2,
          "x": 204,
          "y": 1100,
          "z": 117,
          "apiName": "Temperatura 4-2-322"
        },
        {
          "sensor_id": 321,
          "metric": "hum",
          "label": "Marquesina H11",
          "line": 4,
          "pos": 2,
          "x": 204,
          "y": 1100,
          "z": 117,
          "apiName": "Humedad 4-2-321"
        },
        {
          "sensor_id": 324,
          "metric": "temp",
          "label": "Marquesina T12",
          "line": 4,
          "pos": 3,
          "x": 355,
          "y": 1100,
          "z": 177,
          "apiName": "Temperatura 4-3-324"
        },
        {
          "sensor_id": 323,
          "metric": "hum",
          "label": "Marquesina H12",
          "line": 4,
          "pos": 3,
          "x": 355,
          "y": 1100,
          "z": 177,
          "apiName": "Humedad 4-3-323"
        },
        {
          "sensor_id": 326,
          "metric": "temp",
          "label": "Marquesina T13",
          "line": 5,
          "pos": 1,
          "x": 70,
          "y": 1340,
          "z": 119,
          "apiName": "Temperatura  5-1-326"
        },
        {
          "sensor_id": 325,
          "metric": "hum",
          "label": "Marquesina H13",
          "line": 5,
          "pos": 1,
          "x": 70,
          "y": 1340,
          "z": 119,
          "apiName": "Humedad 5-1-325"
        },
        {
          "sensor_id": 328,
          "metric": "temp",
          "label": "Marquesina T14",
          "line": 5,
          "pos": 2,
          "x": 204,
          "y": 1340,
          "z": 197,
          "apiName": "Temperatura 5-2-328"
        },
        {
          "sensor_id": 327,
          "metric": "hum",
          "label": "Marquesina H14",
          "line": 5,
          "pos": 2,
          "x": 204,
          "y": 1340,
          "z": 197,
          "apiName": "Humedad  5-2-327"
        },
        {
          "sensor_id": 330,
          "metric": "temp",
          "label": "Marquesina T15",
          "line": 5,
          "pos": 3,
          "x": 355,
          "y": 1340,
          "z": 145,
          "apiName": "Temperatura 5-3-330"
        },
        {
          "sensor_id": 329,
          "metric": "hum",
          "label": "Marquesina H15",
          "line": 5,
          "pos": 3,
          "x": 355,
          "y": 1340,
          "z": 145,
          "apiName": "Humedad 5-3-329"
        },
        {
          "sensor_id": 331,
          "metric": "hum",
          "label": "Marquesina H16",
          "line": 6,
          "pos": 1,
          "external": true,
          "x": -100,
          "y": 280,
          "z": 260,
          "apiName": "Humedad 6-1-331"
        },
        {
          "sensor_id": 332,
          "metric": "temp",
          "label": "Marquesina T16",
          "line": 6,
          "pos": 1,
          "external": true,
          "x": -100,
          "y": 280,
          "z": 260,
          "apiName": "Temperatura 6-1-332"
        },
        {
          "sensor_id": 333,
          "metric": "hum",
          "label": "Marquesina H17",
          "line": 6,
          "pos": 2,
          "external": true,
          "x": -100,
          "y": 800,
          "z": 260,
          "apiName": "Humedad 6-2-333"
        },
        {
          "sensor_id": 334,
          "metric": "temp",
          "label": "Marquesina T17",
          "line": 6,
          "pos": 2,
          "external": true,
          "x": -100,
          "y": 800,
          "z": 260,
          "apiName": "Temperatura 6-2-334"
        },
        {
          "sensor_id": 335,
          "metric": "hum",
          "label": "Marquesina H18",
          "line": 6,
          "pos": 3,
          "external": true,
          "x": -100,
          "y": 1340,
          "z": 210,
          "apiName": "Humedad 6-3-335"
        },
        {
          "sensor_id": 336,
          "metric": "temp",
          "label": "Marquesina T18",
          "line": 6,
          "pos": 3,
          "external": true,
          "x": -100,
          "y": 1340,
          "z": 210,
          "apiName": "Temperatura 6-3-336"
        }
      ]
    },
    {
      "id": "bodega",
      "name": "Bodega",
      "area": {
        "x": 378,
        "y": 980,
        "z": 212
      },
      "geo": {
        "front": {
          "lat": 5.07805,
          "lon": -75.585389
        },
        "back": {
          "lat": 5.078109,
          "lon": -75.585454
        }
      },
      "features": [
        {
          "name": "Puerta",
          "type": "door",
          "x": 378,
          "y": 30,
          "z": 120
        },
        {
          "name": "Ventana",
          "type": "window",
          "x": 378,
          "y": 640,
          "z": 160
        }
      ],
      "sensors": [
        {
          "sensor_id": 339,
          "metric": "hum",
          "label": "Bodega H1",
          "line": 1,
          "pos": 1,
          "x": 186,
          "y": 781,
          "z": 126,
          "apiName": "Humedad 1"
        },
        {
          "sensor_id": 340,
          "metric": "temp",
          "label": "Bodega T1",
          "line": 1,
          "pos": 1,
          "x": 186,
          "y": 781,
          "z": 126,
          "apiName": "Temperatura 1"
        },
        {
          "sensor_id": 341,
          "metric": "hum",
          "label": "Bodega H2",
          "line": 1,
          "pos": 2,
          "x": 186,
          "y": 781,
          "z": 66,
          "apiName": "Humedad 2"
        },
        {
          "sensor_id": 342,
          "metric": "temp",
          "label": "Bodega T2",
          "line": 1,
          "pos": 2,
          "x": 186,
          "y": 781,
          "z": 66,
          "apiName": "Temperatura 2"
        },
        {
          "sensor_id": 343,
          "metric": "hum",
          "label": "Bodega H3",
          "line": 1,
          "pos": 3,
          "x": 378,
          "y": 591,
          "z": 196,
          "apiName": "Humedad 3"
        },
        {
          "sensor_id": 344,
          "metric": "temp",
          "label": "Bodega T3",
          "line": 1,
          "pos": 3,
          "x": 378,
          "y": 591,
          "z": 196,
          "apiName": "Temperatura 3"
        },
        {
          "sensor_id": 345,
          "metric": "hum",
          "label": "Bodega H4",
          "line": 1,
          "pos": 4,
          "x": 140,
          "y": 436,
          "z": 212,
          "apiName": "Humedad 4"
        },
        {
          "sensor_id": 346,
          "metric": "temp",
          "label": "Bodega T4",
          "line": 1,
          "pos": 4,
          "x": 140,
          "y": 436,
          "z": 212,
          "apiName": "Temperatura 4"
        },
        {
          "sensor_id": 347,
          "metric": "hum",
          "label": "Bodega H5",
          "line": 1,
          "pos": 5,
          "x": 83,
          "y": 260,
          "z": 212,
          "apiName": "Humedad 5"
        },
        {
          "sensor_id": 348,
          "metric": "temp",
          "label": "Bodega T5",
          "line": 1,
          "pos": 5,
          "x": 83,
          "y": 260,
          "z": 212,
          "apiName": "Temperatura 5"
        },
        {
          "sensor_id": 349,
          "metric": "hum",
          "label": "Bodega H6",
          "line": 1,
          "pos": 6,
          "x": 0,
          "y": 466,
          "z": 197,
          "apiName": "Humedad 6"
        },
        {
          "sensor_id": 350,
          "metric": "temp",
          "label": "Bodega T6",
          "line": 1,
          "pos": 6,
          "x": 0,
          "y": 466,
          "z": 197,
          "apiName": "Temperatura 6"
        }
      ]
    }
  ]
};

// ── Logo wiring ────────────────────────────────────────────────────────────
(function(){ const img=document.getElementById('logo'), ph=document.getElementById('logo-ph');
  img.onerror=()=>{ img.style.display='none'; ph.style.display='flex'; }; img.src=LOGO_URL; })();

// ══════════════════════════════════════════════════════════════════════════
//  Minimal OrbitControls
// ══════════════════════════════════════════════════════════════════════════
THREE.OrbitControls = function(camera, domEl){
  this.camera=camera; this.domEl=domEl; this.target=new THREE.Vector3();
  this.enableDamping=true; this.dampingFactor=0.08; this.rotateSpeed=1; this.zoomSpeed=1; this.panSpeed=0.8; this.minDistance=1; this.maxDistance=600;
  var _this=this, STATE={NONE:-1,ROTATE:0,ZOOM:1,PAN:2}, state=STATE.NONE;
  var spherical=new THREE.Spherical(), sphericalDelta=new THREE.Spherical(), scale=1, panOffset=new THREE.Vector3();
  var rotateStart=new THREE.Vector2(),rotateEnd=new THREE.Vector2(),rotateDelta=new THREE.Vector2();
  var panStart=new THREE.Vector2(),panEnd=new THREE.Vector2(),panDelta=new THREE.Vector2();
  function zs(){return Math.pow(0.95,_this.zoomSpeed);} function rl(a){sphericalDelta.theta-=a;} function ru(a){sphericalDelta.phi-=a;}
  var pL=new THREE.Vector3(),pU=new THREE.Vector3();
  function panLeft(d,m){pL.setFromMatrixColumn(m,0);pL.multiplyScalar(-d);panOffset.add(pL);}
  function panUp(d,m){pU.setFromMatrixColumn(m,1);pU.multiplyScalar(d);panOffset.add(pU);}
  function pan(dx,dy){var el=_this.domEl,fov=_this.camera.fov*Math.PI/180,tD=_this.camera.position.distanceTo(_this.target),h=2*Math.tan(fov/2)*tD;
    panLeft(dx*h/el.clientHeight*_this.panSpeed,_this.camera.matrix); panUp(dy*h/el.clientHeight*_this.panSpeed,_this.camera.matrix);}
  this.update=function(){var o=new THREE.Vector3(),q=new THREE.Quaternion().setFromUnitVectors(camera.up,new THREE.Vector3(0,1,0)),qi=q.clone().invert();
    o.copy(this.camera.position).sub(this.target);o.applyQuaternion(q);spherical.setFromVector3(o);
    spherical.theta+=sphericalDelta.theta;spherical.phi+=sphericalDelta.phi;spherical.phi=Math.max(0.01,Math.min(Math.PI-0.01,spherical.phi));
    spherical.radius*=scale;spherical.radius=Math.max(this.minDistance,Math.min(this.maxDistance,spherical.radius));
    this.target.add(panOffset);o.setFromSpherical(spherical);o.applyQuaternion(qi);this.camera.position.copy(this.target).add(o);this.camera.lookAt(this.target);
    if(this.enableDamping){sphericalDelta.theta*=(1-this.dampingFactor);sphericalDelta.phi*=(1-this.dampingFactor);panOffset.multiplyScalar(1-this.dampingFactor);}
    else{sphericalDelta.set(0,0,0);panOffset.set(0,0,0);} scale=1;};
  domEl.addEventListener('contextmenu',e=>e.preventDefault());
  domEl.addEventListener('mousedown',function(e){e.preventDefault();
    if(e.button===0){state=STATE.ROTATE;rotateStart.set(e.clientX,e.clientY);} if(e.button===2){state=STATE.PAN;panStart.set(e.clientX,e.clientY);}});
  document.addEventListener('mousemove',function(e){
    if(state===STATE.ROTATE){rotateEnd.set(e.clientX,e.clientY);rotateDelta.subVectors(rotateEnd,rotateStart);var el=_this.domEl;
      rl(2*Math.PI*rotateDelta.x/el.clientHeight*_this.rotateSpeed);ru(2*Math.PI*rotateDelta.y/el.clientHeight*_this.rotateSpeed);rotateStart.copy(rotateEnd);_this.update();}
    else if(state===STATE.PAN){panEnd.set(e.clientX,e.clientY);panDelta.subVectors(panEnd,panStart);pan(panDelta.x,-panDelta.y);panStart.copy(panEnd);_this.update();}});
  document.addEventListener('mouseup',function(){state=STATE.NONE;});
  domEl.addEventListener('wheel',function(e){e.preventDefault(); if(e.deltaY<0)scale/=zs();else scale*=zs();_this.update();},{passive:false});
  // ── touch: 1 finger = rotate, 2 fingers = pinch-zoom + pan ──
  var tPrev={dist:0,x:0,y:0};
  function tmid(e){return {x:(e.touches[0].pageX+e.touches[1].pageX)/2, y:(e.touches[0].pageY+e.touches[1].pageY)/2};}
  function tdist(e){var dx=e.touches[0].pageX-e.touches[1].pageX, dy=e.touches[0].pageY-e.touches[1].pageY; return Math.hypot(dx,dy);}
  domEl.addEventListener('touchstart',function(e){ e.preventDefault();
    if(e.touches.length===1){ state=STATE.ROTATE; rotateStart.set(e.touches[0].pageX,e.touches[0].pageY); }
    else if(e.touches.length>=2){ state=STATE.PAN; tPrev.dist=tdist(e); var m=tmid(e); tPrev.x=m.x; tPrev.y=m.y; }
  },{passive:false});
  domEl.addEventListener('touchmove',function(e){ e.preventDefault();
    if(state===STATE.ROTATE && e.touches.length===1){
      rotateEnd.set(e.touches[0].pageX,e.touches[0].pageY); rotateDelta.subVectors(rotateEnd,rotateStart); var el=_this.domEl;
      rl(2*Math.PI*rotateDelta.x/el.clientHeight*_this.rotateSpeed); ru(2*Math.PI*rotateDelta.y/el.clientHeight*_this.rotateSpeed);
      rotateStart.copy(rotateEnd); _this.update();
    } else if(e.touches.length>=2){
      var dist=tdist(e), m=tmid(e);
      if(tPrev.dist>0){ if(dist>tPrev.dist) scale/=(dist/tPrev.dist); else if(dist<tPrev.dist) scale*=(tPrev.dist/dist); }
      pan(m.x-tPrev.x, -(m.y-tPrev.y));
      tPrev.dist=dist; tPrev.x=m.x; tPrev.y=m.y; _this.update();
    }
  },{passive:false});
  domEl.addEventListener('touchend',function(e){ if(e.touches.length===0){ state=STATE.NONE; tPrev.dist=0; }
    else if(e.touches.length===1){ state=STATE.ROTATE; rotateStart.set(e.touches[0].pageX,e.touches[0].pageY); } });
};

// ══════════════════════════════════════════════════════════════════════════
//  DATA CLEANING  (data_value is sometimes corrupted on write)
// ══════════════════════════════════════════════════════════════════════════
function cleanValue(raw, metric){
  let v;
  if(typeof raw==='number' && isFinite(raw)) v=raw;
  else{ const s=String(raw).replace(/[\x00-\x1f]/g,''); const m=s.match(/-?\d+(?:\.\d+)?/);
        if(!m) return {valid:false,value:null}; v=parseFloat(m[0]); if(!isFinite(v)) return {valid:false,value:null}; }
  const [lo,hi]=BOUNDS[metric]; return {valid:v>=lo&&v<=hi, value:v};
}

// ══════════════════════════════════════════════════════════════════════════
//  MODEL
// ══════════════════════════════════════════════════════════════════════════
let CONFIG=null;
let AREA=null;                          // active area object
let AREAS=[];                           // all areas, ordered by min(sensor_id)
let LAST_READINGS=null;                 // last fetched readingsBySensor (all areas) — reused when switching area
let CONFIG_SOURCE='fallback';           // 'primary' = external config.json, 'fallback' = embedded copy
let SENSORS=[];                         // [{sensor_id,metric,label,cm:{x,y,z},w:{x,y,z},series[]}]
let META={rows:0,corrupted:0,mapped:0,source:'demo'};
let currentMetric='temp';
let spine=[];            // shared 5-min timespine (bucket-start ms), ASC — same axis for both metrics
let timeIndex=0;         // index into spine

// ── 5-minute aggregation ────────────────────────────────────────────────────
// Raw readings are irregular and temp/humidity are written in separate rounds,
// so at any exact timestamp some sensors have no point. We group every reading
// into a fixed 5-min window and take the MEDIAN per sensor per window (after
// cleaning). The slider then steps window-by-window and every sensor is read at
// the same instant. Windows a sensor never reported in fall back to its last
// window (carry-forward) so the field stays whole.
const BUCKET_MS = 5*60*1000;
function median(a){ if(!a.length) return null; const s=[...a].sort((x,y)=>x-y); const m=s.length>>1;
  return s.length%2 ? s[m] : (s[m-1]+s[m])/2; }
function bucketize(readings){
  const g=new Map();
  for(const r of (readings||[])){ const b=Math.floor(r.t/BUCKET_MS)*BUCKET_MS;
    (g.get(b) || g.set(b,[]).get(b)).push(r.v); }
  const out=[]; for(const [b,vals] of g) out.push({t:b, v:median(vals), n:vals.length});
  out.sort((x,y)=>y.t-x.t);   // DESC (for as-of lookup)
  return out;
}

function buildModel(cfg, readingsBySensor, metricFromDb){
  SENSORS=[]; const spineSet=new Set();
  (cfg.sensors||[]).forEach(cs=>{
    const metric = cs.metric || metricFromDb[cs.sensor_id];
    if(metric!=='temp' && metric!=='hum') return;
    const p={x:+cs.x,y:+cs.y,z:+cs.z};
    const series=bucketize(readingsBySensor[cs.sensor_id]);       // 5-min medians, DESC
    series.forEach(r=>spineSet.add(r.t));
    SENSORS.push({ sensor_id:cs.sensor_id, metric, label:cs.label||('S'+cs.sensor_id),
                   line:cs.line, pos:cs.pos, external:!!cs.external, cm:p, w:toWorld(p), series,
                   replaceBeforeMs: cs.replaceBefore!=null ? Date.parse(cs.replaceBefore) : null,
                   replaceWith: cs.replaceWith||'mean' });
  });
  spine=[...spineSet].sort((a,b)=>a-b);
  timeIndex=Math.max(0,spine.length-1);                          // default: latest window
  META.mapped=SENSORS.length; META.windows=spine.length;
}

function valueAsOf(series, T){
  for(let i=0;i<series.length;i++) if(series[i].t<=T) return series[i].v;   // DESC
  return series.length ? series[series.length-1].v : null;
}
function activeSensors(){ return SENSORS.filter(s=>s.metric===currentMetric); }
function currentTargetMs(){ return spine.length ? spine[Math.min(timeIndex,spine.length-1)] : Infinity; }

// ══════════════════════════════════════════════════════════════════════════
//  RBF (thin-plate) + color
// ══════════════════════════════════════════════════════════════════════════
const COLOR_STOPS=[[0,[26,111,255]],[.25,[0,212,255]],[.5,[0,255,136]],[.75,[255,204,0]],[.875,[255,107,53]],[1,[255,45,45]]];
function valToRgb(t,vMin,vMax){const u=vMax>vMin?Math.max(0,Math.min(1,(t-vMin)/(vMax-vMin))):0.5;
  for(let i=0;i<COLOR_STOPS.length-1;i++){const[t0,c0]=COLOR_STOPS[i],[t1,c1]=COLOR_STOPS[i+1];if(u<=t1){const f=(u-t0)/(t1-t0);return c0.map((v,j)=>Math.round(v+f*(c1[j]-v)));}}return COLOR_STOPS[5][1];}
const cssRgb=r=>`rgb(${r[0]},${r[1]},${r[2]})`; const threeRgb=r=>new THREE.Color(r[0]/255,r[1]/255,r[2]/255);

// ══════════════════════════════════════════════════════════════════════════
//  THREE.JS SETUP
// ══════════════════════════════════════════════════════════════════════════
const canvas=document.getElementById('three-canvas'), wrap=document.getElementById('canvas-wrap');
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true});
renderer.setPixelRatio(Math.min(window.devicePixelRatio,2)); renderer.setClearColor(0x000000,0);
const scene=new THREE.Scene(); const camera=new THREE.PerspectiveCamera(45,1,0.1,2000);
const controls=new THREE.OrbitControls(camera,canvas);
scene.add(new THREE.AmbientLight(0xffffff,0.8));
const dl=new THREE.DirectionalLight(0xffffff,0.5); dl.position.set(20,40,20); scene.add(dl);
const gBox=new THREE.Group(),gAxis=new THREE.Group(),gFeat=new THREE.Group(),gVol=new THREE.Group(),gPts=new THREE.Group(),gLabels=new THREE.Group(),gSun=new THREE.Group();
const gSunCompass=new THREE.Group(); gSun.add(gSunCompass);
scene.add(gBox,gAxis,gFeat,gVol,gPts,gLabels,gSun);
let volOpacity=0.40, ptsSizeFactor=1.0, fieldFn=null, snapVals=[], overriddenIds=new Set();

function BOX(){ const a=AREA.area; return { W:cm(a.x), H:cm(a.z), D:cm(a.y) }; } // W=width(X) H=height(Y) D=depth(Z)

// ── Areas: normalize config, order, and activate ────────────────────────────
function normalizeAreas(cfg){
  if(cfg && Array.isArray(cfg.areas) && cfg.areas.length) return cfg.areas.slice();
  // back-compat: a single-area config (area/sensors at top) -> wrap as one area
  if(cfg && cfg.sensors) return [{id:'area',name:cfg.name||'Área',area:cfg.area,geo:cfg.geo,features:cfg.features,sensors:cfg.sensors}];
  return [];
}
function areaMinId(a){ return Math.min.apply(null,(a.sensors||[]).map(s=>s.sensor_id).concat([Infinity])); }
function setActiveArea(area){
  AREA=area;
  const g=area&&area.geo||{}; SUN_FRENTE=g.front||null; SUN_ATRAS=g.back||null;
  if(SUN_FRENTE&&SUN_ATRAS){
    SUN_LAT=(SUN_FRENTE.lat+SUN_ATRAS.lat)/2; SUN_LON=(SUN_FRENTE.lon+SUN_ATRAS.lon)/2;
    SUN_NORTH_OFFSET_DEG = SUN_NORTH_OFFSET_OVERRIDE_DEG!=null ? SUN_NORTH_OFFSET_OVERRIDE_DEG
      : bearingDeg(SUN_FRENTE.lat,SUN_FRENTE.lon,SUN_ATRAS.lat,SUN_ATRAS.lon);
  } else { SUN_LAT=0; SUN_LON=0; }
}

function frameCamera(){ const {W,H,D}=BOX(); const cx=W/2,cy=H/2,cz=D/2; const maxd=Math.max(W,H,D);
  controls.target.set(cx,cy,cz); camera.position.set(cx+W*0.6+maxd*0.15, H+maxd*0.28, -(maxd*0.55)); camera.lookAt(cx,cy,cz); controls.update(); }
function resetView(){ const {W,H,D}=BOX(); const cx=W/2,cy=H/2,cz=D/2; controls.target.set(cx,cy,cz);
  camera.position.set(cx, cy+0.4, -(Math.max(W,H,D)*1.35+D*0.3)); camera.lookAt(cx,cy,cz); controls.update(); }

function sprite(text,colorStr,scaleX,scaleY,fs){ const c=document.createElement('canvas'); c.width=128; c.height=44; const ctx=c.getContext('2d');
  ctx.fillStyle='rgba(8,12,16,0.88)';ctx.beginPath();ctx.roundRect(0,0,128,44,7);ctx.fill();
  ctx.strokeStyle=colorStr;ctx.lineWidth=1.5;ctx.beginPath();ctx.roundRect(0,0,128,44,7);ctx.stroke();
  ctx.fillStyle='#fff';ctx.font=`bold ${fs||16}px Montserrat, sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,64,22);
  const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(c),transparent:true,depthTest:false}));sp.scale.set(scaleX||1.7,scaleY||0.58,1);return sp;}
function tag(text,x,y,z,color,group){ const c=document.createElement('canvas');c.width=128;c.height=40;const ctx=c.getContext('2d');
  ctx.fillStyle=color;ctx.font='bold 22px Montserrat, sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,64,20);
  const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(c),transparent:true,depthTest:false}));sp.position.set(x,y,z);sp.scale.set(2.4,0.75,1);(group||gAxis).add(sp);}

function buildStatic(){
  gBox.clear();gAxis.clear();gFeat.clear();
  const {W,H,D}=BOX(); const mat=new THREE.LineBasicMaterial({color:0x24455a});
  const v=[[0,0,0],[W,0,0],[W,H,0],[0,H,0],[0,0,D],[W,0,D],[W,H,D],[0,H,D]];
  [[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]].forEach(([a,b])=>{
    gBox.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(...v[a]),new THREE.Vector3(...v[b])]),mat));});
  const grid=new THREE.GridHelper(Math.max(W,D),Math.round(Math.max(W,D)),0x14202a,0x14202a); grid.position.set(W/2,0,D/2); gBox.add(grid);
  tag('FRENTE',W/2,0.25,0,'#7fd6ef'); tag('ATRÁS',W/2,0.25,D,'#7a96a3');
  tag('DER.',0,0.25,D/2,'#7a96a3');   tag('IZQ.',W,0.25,D/2,'#7a96a3');
  (AREA.features||[]).forEach(f=>{
    const w=toWorld(f); const isDoor=(f.type==='door'); const col=isDoor?0xc1663a:0x3fa7c9;
    const three=new THREE.Color(col);
    const dot=new THREE.Mesh(new THREE.SphereGeometry(0.18,16,16),
      new THREE.MeshPhongMaterial({color:three,emissive:three,emissiveIntensity:0.4}));
    dot.position.set(w.x,w.y,w.z); gFeat.add(dot);
    const ring=new THREE.Mesh(new THREE.RingGeometry(0.24,0.34,24),
      new THREE.MeshBasicMaterial({color:three,side:THREE.DoubleSide,transparent:true,opacity:0.5,depthWrite:false}));
    ring.position.set(w.x,w.y,w.z); ring.userData={isRing:true}; gFeat.add(ring);
    const lp=sprite(f.name, isDoor?'#e0975f':'#7fd0e6',1.9,0.6,15); lp.position.set(w.x,w.y+0.42,w.z); gFeat.add(lp);
  });
  buildSunCompass();
}

// ══════════════════════════════════════════════════════════════════════════
//  SUN PATH — position derived from the two GPS points + real timestamp
// ══════════════════════════════════════════════════════════════════════════
// Great-circle bearing (deg, compass: 0=N,90=E,180=S,270=O) from point 1 to point 2.
function bearingDeg(lat1,lon1,lat2,lon2){
  const rad=Math.PI/180, phi1=lat1*rad, phi2=lat2*rad, dLon=(lon2-lon1)*rad;
  const y=Math.sin(dLon)*Math.cos(phi2);
  const x=Math.cos(phi1)*Math.sin(phi2)-Math.sin(phi1)*Math.cos(phi2)*Math.cos(dLon);
  return (Math.atan2(y,x)*180/Math.PI+360)%360;
}
// Compass bearing that world +Z ("hacia ATRÁS") points at — set per active area.
let SUN_NORTH_OFFSET_DEG = 0;

// Horizontal unit direction (world XZ) for a given compass bearing, using the offset above.
function sunWorldDir(bearing){
  const d=(bearing-SUN_NORTH_OFFSET_DEG)*Math.PI/180;
  return { x:-Math.sin(d), z:Math.cos(d) };
}
// Vertical squash for the sun dome: 1.0 = full hemisphere (zenith flies off-screen),
// lower = flatter "parábola achatada" that keeps the noon sun in frame. Horizontal reach is unchanged.
const SUN_FLATTEN = 0.42;
const SUN_SPRITE_M = 1.56;  // sun icon size in metres (65% del tamaño anterior de 2.4)

// Gold Muisca sun icon (simplified) drawn to a canvas, used as the sun sprite texture.
function makeSunTexture(){
  const c=document.createElement('canvas'); c.width=c.height=256; const x=c.getContext('2d'); const cx=128,cy=128;
  x.clearRect(0,0,256,256);
  x.fillStyle='#C6892B';
  for(let i=0;i<8;i++){ x.save(); x.translate(cx,cy); x.rotate(i*Math.PI/4);
    x.beginPath(); x.moveTo(0,-124); x.lineTo(13,-90); x.lineTo(-13,-90); x.closePath(); x.fill(); x.restore(); }
  function ring(r,fill,stroke,sw){ x.beginPath(); x.arc(cx,cy,r,0,Math.PI*2); x.fillStyle=fill; x.fill(); if(stroke){ x.lineWidth=sw; x.strokeStyle=stroke; x.stroke(); } }
  ring(88,'#D9982F','#5E3E12',5);
  ring(64,'#C6892B','#F2C558',5);
  ring(34,'#E0A93E','#7A4E14',4);
  const tex=new THREE.CanvasTexture(c); tex.needsUpdate=true; return tex;
}

// Sun altitude/azimuth (SunCalc, radians, azimuth measured south->west) -> world position
// on a flattened dome of given radius centred at `center` (ground-level, building centre).
function sunToWorld(ms, radius, center){
  const p=SunCalc.getPosition(new Date(ms), SUN_LAT, SUN_LON);
  const azCompass=(p.azimuth*180/Math.PI+180+360)%360, altDeg=p.altitude*180/Math.PI;
  const dir=sunWorldDir(azCompass), horiz=radius*Math.cos(p.altitude);
  return { x:center.x+dir.x*horiz, y:center.y+radius*SUN_FLATTEN*Math.sin(p.altitude), z:center.z+dir.z*horiz, azCompass, altDeg };
}
// Colombia has no DST, so Bogotá midnight for a given UTC instant is a fixed -5h shift.
function bogotaMidnightMs(ms){ const d=new Date(ms+TZ_OFFSET_H*3600000); d.setUTCHours(0,0,0,0); return d.getTime()-TZ_OFFSET_H*3600000; }
function sunPathForDay(dayStartMs, radius, center){
  const pts=[];
  for(let m=0;m<=24*60;m+=6){
    const t=dayStartMs+m*60000, p=SunCalc.getPosition(new Date(t), SUN_LAT, SUN_LON);
    if(p.altitude<-0.02) continue;                       // keep only (near-)daylight part of the arc
    const az=(p.azimuth*180/Math.PI+180+360)%360, dir=sunWorldDir(az), horiz=radius*Math.cos(p.altitude);
    pts.push(new THREE.Vector3(center.x+dir.x*horiz, center.y+radius*SUN_FLATTEN*Math.sin(p.altitude), center.z+dir.z*horiz));
  }
  return pts;
}
function sunRadius(){ const {W,H,D}=BOX(); return Math.max(W,D)*0.85+H*0.6; }
function sunCenter(){ const {W,D}=BOX(); return { x:W/2, y:0, z:D/2 }; }
function buildSunCompass(){
  gSunCompass.clear();
  const r=sunRadius()*1.05, c=sunCenter();
  [['N',0,'#7fd0e6'],['E',90,'#7a96a3'],['S',180,'#7a96a3'],['O',270,'#7a96a3']].forEach(([lbl,brg,col])=>{
    const dir=sunWorldDir(brg); tag(lbl, c.x+dir.x*r, 0.25, c.z+dir.z*r, col, gSunCompass);
  });
}
let sunMesh=null, sunPathLine=null, sunPathDayKey=null;
function compassLabel(deg){
  const dirs=['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSO','SO','OSO','O','ONO','NO','NNO'];
  return dirs[Math.round(((deg%360)+360)%360/22.5)%16];
}

// ── Sky gradient (top of the canvas, anchored to the sun's altitude) ─────────
// Top SKY_TOP_FRAC of the canvas is sky (varies with the hour); below is black,
// with a few-px blend so there's no hard line. Morning vs afternoon use different
// palettes (amanecer rojizo vs atardecer/ocaso violáceo) even at equal altitude.
const SKY_TOP_FRAC = 0.10;
const SKY_FADE_PX  = 10;
const SKY_BLACK    = '#05080c';
const SKY_MORNING = [
  {alt:-14, top:'#0a1230', mid:'#0b1836', hor:'#0d1f3d'},   // noche
  {alt:-3,  top:'#14284f', mid:'#6a5a90', hor:'#f0a35e'},   // amanecer · violeta y rojizo
  {alt:4,   top:'#2f66a8', mid:'#7fa9cf', hor:'#f7e39c'},   // mañana temprana · amarillo y azul claro
  {alt:20,  top:'#2d7fc4', mid:'#67aede', hor:'#bfe0f2'},   // mañana · azul claro
  {alt:70,  top:'#1466b8', mid:'#2f88d4', hor:'#79b8e6'},   // mediodía · azul intenso
];
const SKY_AFTERNOON = [
  {alt:-14, top:'#0a1230', mid:'#0b1836', hor:'#0d1f3d'},   // noche
  {alt:-3,  top:'#0c1636', mid:'#6a3f74', hor:'#c0475a'},   // ocaso · rojo-violeta-azul
  {alt:4,   top:'#182a54', mid:'#5b4a86', hor:'#e08a5a'},   // atardecer · violáceo y naranja
  {alt:25,  top:'#1b4f8f', mid:'#4a6fa5', hor:'#9c8fb0'},   // tarde · azul apagándose
  {alt:70,  top:'#1466b8', mid:'#2f88d4', hor:'#79b8e6'},   // mediodía · azul intenso
];
function hexLerp(a,b,f){
  const pa=parseInt(a.slice(1),16), pb=parseInt(b.slice(1),16);
  const r=Math.round((pa>>16)+(((pb>>16))-(pa>>16))*f);
  const g=Math.round(((pa>>8)&255)+((((pb>>8)&255))-((pa>>8)&255))*f);
  const bl=Math.round((pa&255)+(((pb&255))-(pa&255))*f);
  return '#'+((1<<24)+(r<<16)+(g<<8)+bl).toString(16).slice(1);
}
function skyPalette(alt, morning){
  const ks = morning?SKY_MORNING:SKY_AFTERNOON;
  if(alt<=ks[0].alt) return ks[0];
  if(alt>=ks[ks.length-1].alt) return ks[ks.length-1];
  for(let i=0;i<ks.length-1;i++){
    if(alt>=ks[i].alt && alt<=ks[i+1].alt){ const f=(alt-ks[i].alt)/(ks[i+1].alt-ks[i].alt);
      return { top:hexLerp(ks[i].top,ks[i+1].top,f), mid:hexLerp(ks[i].mid,ks[i+1].mid,f), hor:hexLerp(ks[i].hor,ks[i+1].hor,f) }; }
  }
  return ks[ks.length-1];
}
function updateSky(T){
  if(typeof SunCalc==='undefined' || !SUN_FRENTE) return;
  const t = isFinite(T)?T:Date.now();
  const alt = SunCalc.getPosition(new Date(t), SUN_LAT, SUN_LON).altitude*180/Math.PI;
  let morning=true;
  try{ const noon=SunCalc.getTimes(new Date(t), SUN_LAT, SUN_LON).solarNoon; if(noon && t>noon.getTime()) morning=false; }catch(e){}
  const pal = skyPalette(alt, morning);
  const H = Math.max(1, wrap.clientHeight), sky=Math.round(H*SKY_TOP_FRAC), mid=Math.round(H*SKY_TOP_FRAC*0.5), h=Math.round(SKY_FADE_PX/2);
  wrap.style.background =
    `linear-gradient(to bottom, ${pal.top} 0px, ${pal.mid} ${mid}px, ${pal.hor} ${sky-h}px, ${SKY_BLACK} ${sky+h}px, ${SKY_BLACK} 100%)`;
}
function updateSun(T){
  if(!gSun.visible || !isFinite(T) || typeof SunCalc==='undefined' || !SUN_FRENTE) return;
  const radius=sunRadius(), center=sunCenter();
  const dayKey=bogotaMidnightMs(T);
  if(dayKey!==sunPathDayKey){
    sunPathDayKey=dayKey;
    if(sunPathLine){ gSun.remove(sunPathLine); sunPathLine.geometry.dispose(); sunPathLine=null; }
    const pts=sunPathForDay(dayKey,radius,center);
    if(pts.length>1){
      sunPathLine=new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),
        new THREE.LineBasicMaterial({color:0xffb648,transparent:true,opacity:0.55}));
      gSun.add(sunPathLine);
    }
  }
  const p=sunToWorld(T,radius,center);
  if(!sunMesh){
    sunMesh=new THREE.Sprite(new THREE.SpriteMaterial({map:makeSunTexture(),transparent:true,depthTest:false,depthWrite:false}));
    sunMesh.scale.set(SUN_SPRITE_M,SUN_SPRITE_M,1);
    sunMesh.add(new THREE.PointLight(0xffe9b0,0.7,radius*2.2));
    gSun.add(sunMesh);
  }
  sunMesh.position.set(p.x,p.y,p.z);
  const up=p.altDeg>-0.5;
  sunMesh.visible=up;
  dl.position.set(p.x,Math.max(p.y,0.5),p.z); dl.intensity=up?0.55:0.15;   // building light follows the sun
  writeSunHud(T,p,up);
}
function writeSunHud(T,p,up){
  const hud=$('hud'); if(!hud) return;
  let times={}; try{ times=SunCalc.getTimes(new Date(T),SUN_LAT,SUN_LON); }catch(e){}
  let el=document.getElementById('hud-sun');
  if(!el){ el=document.createElement('div'); el.id='hud-sun';
    el.style.marginTop='6px'; el.style.paddingTop='6px'; el.style.borderTop='1px solid rgba(127,208,230,0.25)';
    hud.appendChild(el); }
  el.innerHTML = (up
      ? `☀ alt <b>${p.altDeg.toFixed(0)}°</b> · az <b>${p.azCompass.toFixed(0)}° ${compassLabel(p.azCompass)}</b>`
      : `☾ <span class="hud-sub">sol bajo el horizonte</span>`)
    + `<br><span class="hud-sub">amanece <b>${fmtHM(times.sunrise&&times.sunrise.getTime())}</b> · anochece <b>${fmtHM(times.sunset&&times.sunset.getTime())}</b></span>`;
}

function applyState(){
  const act=activeSensors(); const T=currentTargetMs();
  snapVals=act.map(s=>valueAsOf(s.series,T));
  // Display-only override: for a sensor flagged replaceBefore, in windows earlier than that
  // instant show the mean of the other interior sensors of the same metric (its own readings
  // are untrustworthy pre-recalibration). Uses a snapshot so peers aren't affected.
  overriddenIds=new Set(); const orig=snapVals.slice();
  act.forEach((s,i)=>{
    if(s.replaceBeforeMs!=null && isFinite(T) && T < s.replaceBeforeMs){
      const peers=[]; act.forEach((o,j)=>{ if(j!==i && !o.external && orig[j]!=null) peers.push(orig[j]); });
      if(peers.length){ snapVals[i]=peers.reduce((a,b)=>a+b,0)/peers.length; overriddenIds.add(s.sensor_id); }
    }
  });
  // Interior sensors drive the field, the colour scale, and the aggregate stats.
  // External (contrast) sensors are still drawn + listed, but excluded from all of that.
  const valid=[]; act.forEach((s,i)=>{ if(!s.external && snapVals[i]!=null) valid.push({s,v:snapVals[i]}); });
  let vMin=0,vMax=1;
  if(valid.length){ vMin=Math.min(...valid.map(o=>o.v)); vMax=Math.max(...valid.map(o=>o.v)); if(vMin===vMax){vMin-=1;vMax+=1;} }
  fieldFn = valid.length>=2 ? buildIDW(valid.map(o=>[o.s.w.x,o.s.w.y,o.s.w.z]), valid.map(o=>o.v)) : null;
  buildField(vMin,vMax); buildPoints(act,vMin,vMax); buildLabels(act,vMin,vMax); updateUI(act,valid,vMin,vMax,T);
  updateSun(T);
  updateSky(T);
}

// Inverse-distance weighting: the estimate is a weighted average of the sensors, so it
// ALWAYS stays within [min,max] — no extrapolation past the scale, no red floor. It also
// reports the distance to the nearest sensor so the field can fade where there's no data.
function buildIDW(pts, vals){
  const n=pts.length, P=3;                     // power: higher = more local
  return (qx,qy,qz)=>{
    let num=0, den=0, dmin=Infinity;
    for(let i=0;i<n;i++){
      const dx=qx-pts[i][0], dy=qy-pts[i][1], dz=qz-pts[i][2];
      const d2=dx*dx+dy*dy+dz*dz; if(d2<dmin) dmin=d2;
      if(d2<1e-6) return {v:vals[i], dmin:0};
      const w=1/Math.pow(d2, P/2);
      num+=w*vals[i]; den+=w;
    }
    return {v:num/den, dmin:Math.sqrt(dmin)};
  };
}

function buildField(vMin,vMax){
  gVol.clear(); if(!fieldFn) return;
  const {W,H,D}=BOX(); const nx=12,ny=9,nz=Math.max(12,Math.round(D*2.2));
  const FADE=2.2;                              // metres: cull field points farther than this from any sensor
  const pos=[],col=[];
  for(let ix=0;ix<nx;ix++)for(let iy=0;iy<ny;iy++)for(let iz=0;iz<nz;iz++){
    const x=ix*W/(nx-1),y=iy*H/(ny-1),z=iz*D/(nz-1);
    const r=fieldFn(x,y,z); if(r.dmin>FADE) continue;    // no sensor nearby -> don't imply data
    const rgb=valToRgb(r.v,vMin,vMax);
    pos.push(x,y,z);col.push(rgb[0]/255,rgb[1]/255,rgb[2]/255);}
  const geo=new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3)); geo.setAttribute('color',new THREE.Float32BufferAttribute(col,3));
  gVol.add(new THREE.Points(geo,new THREE.PointsMaterial({size:0.45,vertexColors:true,transparent:true,opacity:volOpacity,sizeAttenuation:true,depthWrite:false})));
}
function buildPoints(act,vMin,vMax){
  gPts.clear();
  act.forEach((s,i)=>{ const val=snapVals[i],has=val!=null; const rgb=has?valToRgb(val,vMin,vMax):[130,150,160]; const color=threeRgb(rgb);
    const geo=s.external ? new THREE.OctahedronGeometry(0.22) : new THREE.SphereGeometry(0.16,14,14);
    const mesh=new THREE.Mesh(geo,new THREE.MeshPhongMaterial({color,emissive:color,emissiveIntensity:has?0.35:0.05,transparent:!has,opacity:has?1:0.5}));
    mesh.position.set(s.w.x,s.w.y,s.w.z); mesh.userData={idx:i,val,has,s}; mesh.scale.setScalar(ptsSizeFactor); gPts.add(mesh);
    const ring=new THREE.Mesh(new THREE.RingGeometry(0.21,0.30,22),new THREE.MeshBasicMaterial({color,side:THREE.DoubleSide,transparent:true,opacity:s.external?0.9:0.45,depthWrite:false}));
    ring.position.set(s.w.x,s.w.y,s.w.z); ring.userData={isRing:true}; gPts.add(ring);});
}
function buildLabels(act,vMin,vMax){
  gLabels.clear(); const unit=METRIC_UNIT[currentMetric];
  act.forEach((s,i)=>{ const val=snapVals[i],has=val!=null; const rgb=has?valToRgb(val,vMin,vMax):[130,150,160];
    const pfx=overriddenIds.has(s.sensor_id)?'≈':'';
    const sp=sprite(has?`${pfx}${val.toFixed(1)}${unit}`:'s/d',cssRgb(rgb),1.5,0.5,16); sp.position.set(s.w.x,s.w.y+0.4,s.w.z); gLabels.add(sp);});
}

// ══════════════════════════════════════════════════════════════════════════
//  UI
// ══════════════════════════════════════════════════════════════════════════
const $=id=>document.getElementById(id);
function fmtDate(ms){ if(ms==null||!isFinite(ms)) return '—';
  return new Date(ms).toLocaleString('es-CO',{timeZone:DISPLAY_TZ,day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}); }
function fmtHM(ms){ if(ms==null||!isFinite(ms)) return '—';
  return new Date(ms).toLocaleTimeString('es-CO',{timeZone:DISPLAY_TZ,hour:'2-digit',minute:'2-digit'}); }

function updateUI(act,valid,vMin,vMax,T){
  const unit=METRIC_UNIT[currentMetric]; const vals=valid.map(o=>o.v);
  const avg=vals.length?vals.reduce((a,b)=>a+b,0)/vals.length:0;
  const std=vals.length?Math.sqrt(vals.reduce((a,b)=>a+(b-avg)**2,0)/vals.length):0;

  $('scale-title').textContent='Escala de '+METRIC_NAME[currentMetric]; $('scale-unit').textContent=unit;
  $('t-min').textContent=vals.length?vMin.toFixed(1):'—'; $('t-max').textContent=vals.length?vMax.toFixed(1):'—';
  $('s-min').innerHTML=`${vals.length?vMin.toFixed(1):'—'}<sup>${unit}</sup>`;
  $('s-max').innerHTML=`${vals.length?vMax.toFixed(1):'—'}<sup>${unit}</sup>`;
  $('s-avg').innerHTML=`${vals.length?avg.toFixed(1):'—'}<sup>${unit}</sup>`;
  $('s-std').innerHTML=`${vals.length?std.toFixed(2):'—'}<sup>${unit}</sup>`;

  const {W,H,D}=BOX();
  $('hdr-dims').innerHTML=`<strong>${W.toFixed(2)}</strong>×<strong>${D.toFixed(2)}</strong>×<strong>${H.toFixed(2)}</strong> m`;
  $('hdr-count').textContent=act.length;
  const src=$('hdr-source');
  if(META.source==='proxy'){ src.className='badge live'; src.textContent='API (PROXY)'; }
  else if(META.source==='snapshot'){ src.className='badge live'; src.textContent='SNAPSHOT'; }
  else if(META.source==='api'){ src.className='badge live'; src.textContent='API EN VIVO'; }
  else if(META.source==='db'){ src.className='badge live'; src.textContent='DB (SNAPSHOT)'; }
  else { src.className='badge demo'; src.textContent='DEMO (SIN DATOS)'; }
  const snapMs = spine.length ? T : null;
  const winTxt = snapMs!=null ? `${fmtHM(snapMs)}–${fmtHM(snapMs+BUCKET_MS)}` : '—';
  $('hdr-snapshot').textContent=`Ventana: ${fmtDate(snapMs)} (5 min)`;
  $('time-readout').textContent=snapMs!=null ? `${fmtDate(snapMs)}` : '—';

  const sl=$('sl-time');
  sl.max=Math.max(0,spine.length-1); sl.value=Math.min(timeIndex,Math.max(0,spine.length-1));
  $('time-sub').textContent=spine.length?`Ventana ${winTxt} · ${spine.length} bloques de 5 min · mediana`:'Sin histórico';

  const nExt = act.filter(s=>s.external).length;
  const extTxt = nExt ? ` <span class="hud-sub">(+${nExt} ext.)</span>` : '';
  // on-map heads-up: which window + aggregated readings at this instant
  $('hud').innerHTML = snapMs==null ? '<span class="hud-win">Sin datos</span>' :
    `<div class="hud-win">${fmtDate(snapMs)}</div>`+
    `<div class="hud-range">ventana ${winTxt} (mediana 5 min)</div>`+
    `<div class="hud-metric">${METRIC_NAME[currentMetric]} · ${vals.length} sensores${extTxt}</div>`+
    `<div class="hud-big">${vals.length?avg.toFixed(1):'—'}<sup>${unit}</sup> <span class="hud-sub">prom.</span></div>`+
    `<div class="hud-sub">mín <b>${vals.length?vMin.toFixed(1):'—'}${unit}</b> · máx <b>${vals.length?vMax.toFixed(1):'—'}${unit}</b> · σ <b>${vals.length?std.toFixed(2):'—'}</b></div>`;

  const list=$('sensor-list'); list.innerHTML='';
  act.forEach((s,i)=>{ const val=snapVals[i],has=val!=null; const rgb=has?valToRgb(val,vMin,vMax):[130,150,160];
    const row=document.createElement('div'); row.className='sensor-row'+(has?'':' stale'); row.dataset.idx=i;
    const ovr=overriddenIds.has(s.sensor_id);
    row.innerHTML=`<span class="sensor-dot" style="background:${cssRgb(rgb)}"></span>
      <span class="sensor-id">${s.label.replace((AREA&&AREA.name?AREA.name+' ':''),'')}</span>
      <span class="sensor-pos">${s.external?'EXT':('L'+(s.line||'?')+'·'+(s.pos||'?'))}</span>
      <span class="sensor-val">${has?(ovr?'≈':'')+val.toFixed(1)+unit:'s/d'}</span>`;
    row.addEventListener('click',()=>{document.querySelectorAll('.sensor-row').forEach(r=>r.classList.remove('active'));row.classList.add('active');
      controls.target.set(s.w.x,s.w.y,s.w.z); camera.position.set(s.w.x+4,s.w.y+3,s.w.z-4); controls.update();
      if(window.matchMedia('(max-width: 860px)').matches) toggleDrawer(false);});
    list.appendChild(row);});
}

function writeStatus(demoReason){
  const el=$('status-line');
  // config-source badge + label
  const primary = CONFIG_SOURCE==='primary';
  const cb=$('hdr-config'); cb.className='badge '+(primary?'live':'demo'); cb.textContent=primary?'CONFIG: EXTERNA':'CONFIG: FALLBACK';
  const cfgLine = primary
    ? `Layout: <span class="ok">config.json</span> (externa)`
    : `Layout: <span class="bad">incrustada</span> (fallback en HTML)`;
  if(META.source==='snapshot' || META.source==='proxy'){
    const gm=META.generatedAt?new Date(META.generatedAt).getTime():null;
    const ageMin=gm?Math.max(0,Math.round((Date.now()-gm)/60000)):null;
    const orig=META.source==='proxy'?'proxy (Cloudflare Worker)':'snapshot (GitHub Action)';
    const when=META.source==='proxy'?'Consultado':'Generado';
    el.innerHTML=`Origen: <b>${orig}</b><br>${cfgLine}<br>
      ${when}: <b>${gm?fmtDate(gm):'—'}</b>${ageMin!=null?` <span class="${ageMin>20?'bad':'ok'}">(hace ${ageMin} min)</span>`:''}<br>
      Sensores OK: <span class="ok">${META.apiOk||0}</span>${META.apiFail?` · fallidos: <span class="bad">${META.apiFail}</span>`:''}<br>
      Puntos: <b>${(META.rows||0).toLocaleString('es-CO')}</b> · Ventanas 5 min: <b>${META.windows||0}</b>`;
  } else if(META.source==='api'){
    el.innerHTML=`Origen: <b>API</b> (${DATA_SOURCE})<br>${cfgLine}<br>Rango: <b>${META.range||'—'}</b><br>
      Sensores OK: <span class="ok">${META.apiOk||0}</span>${META.apiFail?` · fallidos: <span class="bad">${META.apiFail}</span>`:''}<br>
      Puntos: <b>${(META.rows||0).toLocaleString('es-CO')}</b> · Ventanas 5 min: <b>${META.windows||0}</b> (mediana)`;
  } else if(META.source==='db'){ const pct=META.rows?(100*META.corrupted/META.rows).toFixed(1):'0';
    el.innerHTML=`Origen: <b>${DB_PATH}</b> + <b>${CONFIG_PATH}</b><br>${cfgLine}<br>Lecturas: <b>${META.rows.toLocaleString('es-CO')}</b><br>
      Corruptas depuradas: <span class="bad">${META.corrupted}</span> (${pct}%)<br>Sensores ubicados: <span class="ok">${META.mapped}</span><br>Ventanas 5 min: <b>${META.windows||0}</b> (mediana)`;
  } else {
    el.innerHTML=`<span class="bad">Datos no cargados.</span><br>${cfgLine}<br>${demoReason?('<span style="color:#7a96a3">'+demoReason+'</span><br>'):''}
      Mostrando <b>layout demo</b>.`;
  }
}

// ══════════════════════════════════════════════════════════════════════════
//  LOADING
// ══════════════════════════════════════════════════════════════════════════
function showOverlay(msg,sub,isErr){const o=$('overlay');o.style.display='flex';o.classList.toggle('err',!!isErr);$('overlay-msg').textContent=msg;$('overlay-sub').innerHTML=sub||'';}
function hideOverlay(){$('overlay').style.display='none';}

async function fetchConfig(){
  try{ const r=await fetch(CONFIG_PATH,{cache:'no-store'}); if(!r.ok) throw new Error('HTTP '+r.status);
       const j=await r.json(); CONFIG_SOURCE='primary'; return j; }
  catch(e){ console.warn('config.json fallback:',e); CONFIG_SOURCE='fallback'; return FALLBACK_CONFIG; }
}

let _metricFromDb={};
async function loadAll(){
  showOverlay('Cargando…','',false);
  CONFIG=await fetchConfig();
  AREAS=normalizeAreas(CONFIG).sort((a,b)=>areaMinId(a)-areaMinId(b));
  if(!AREAS.length) throw new Error('config.json no define áreas.');
  populateAreaSelect();
  const want=(new URLSearchParams(location.search)).get('area');
  setActiveArea(AREAS.find(a=>a.id===want)||AREAS[0]);
  let readingsBySensor, metricFromDb={};
  if(DATA_SOURCE==='proxy'){ readingsBySensor=await loadFromProxy(AREA.id); }
  else if(DATA_SOURCE==='snapshot'){ readingsBySensor=await loadFromSnapshot(); }
  else if(DATA_SOURCE==='api'){ readingsBySensor=await loadFromAPI(); }
  else { const r=await loadFromDB(); readingsBySensor=r.readingsBySensor; metricFromDb=r.metricFromDb; }
  LAST_READINGS=readingsBySensor; _metricFromDb=metricFromDb;
  const totalMapped=AREAS.reduce((n,a)=>n+(a.sensors||[]).filter(s=>readingsBySensor[s.sensor_id]&&readingsBySensor[s.sensor_id].length).length,0);
  if(totalMapped===0 && DATA_SOURCE!=='demo') { /* keep going: render empty rather than error */ }
  renderActiveArea(); hideOverlay();
}
// Rebuild the scene for the active area from the already-fetched data (no refetch on switch).
function renderActiveArea(reason){
  buildModel(AREA, LAST_READINGS||{}, _metricFromDb||{});
  setMetricButtons(); buildStatic(); frameCamera(); applyState(); writeStatus(reason); syncAreaSelect();
}
function populateAreaSelect(){ const sel=$('area-select'); if(!sel) return;
  sel.innerHTML=AREAS.map(a=>`<option value="${a.id}">${(a.name||a.id)}</option>`).join(''); sel.style.display=AREAS.length>1?'':'none'; }
function syncAreaSelect(){ const sel=$('area-select'); if(sel&&AREA) sel.value=AREA.id; }
async function selectArea(id){ const a=AREAS.find(x=>x.id===id); if(!a||a===AREA) return;
  setActiveArea(a);
  try{ const u=new URL(location.href); u.searchParams.set('area',id); history.replaceState(null,'',u); }catch(e){}
  if(window.matchMedia&&window.matchMedia('(max-width: 860px)').matches) toggleDrawer(false);
  try{
    if(DATA_SOURCE==='proxy'){ LAST_READINGS=await loadFromProxy(a.id); }   // fresh data for this area
    // snapshot/api/db already hold every area in LAST_READINGS → no refetch needed
    renderActiveArea(); hideOverlay();
  }catch(e){ hideOverlay(); showOverlay('No se pudo cargar el área','Detalle: '+e.message,true); console.error('selectArea load failed:',e); syncAreaSelect(); }
}

// ── Combined-JSON sources (snapshot file OR Cloudflare proxy — identical shape) ──
function ingestCombined(j, source){
  const readingsBySensor={}; let total=0;
  for(const [sid,arr] of Object.entries(j.sensors||{})){
    const a=(arr||[]).map(p=>({t:+p.t,v:+p.v})).filter(p=>isFinite(p.t)&&isFinite(p.v));
    a.sort((x,y)=>y.t-x.t); readingsBySensor[sid]=a; total+=a.length;
  }
  META={rows:total,corrupted:0,mapped:0,source,generatedAt:j.generatedAt,
        apiOk:j.meta&&j.meta.ok,apiFail:j.meta&&j.meta.fail,range:(j.window?(j.window.start+' → '+j.window.end):'')};
  return readingsBySensor;
}
async function loadFromSnapshot(){
  showOverlay('Cargando snapshot…','',false);
  const r=await fetch(SNAPSHOT_PATH,{cache:'no-store'}); if(!r.ok) throw new Error(`No se pudo leer ${SNAPSHOT_PATH} (HTTP ${r.status})`);
  return ingestCombined(await r.json(),'snapshot');
}
async function loadFromProxy(areaId){
  showOverlay('Consultando sensores…','vía proxy seguro',false);
  if(!/^https?:\/\//.test(PROXY_URL) || PROXY_URL.includes('REPLACE-WITH-YOUR-WORKER')) throw new Error('PROXY_URL no configurado');
  // Plain GET with no custom headers and no cache option => "simple" request => no CORS preflight.
  // Cache-bust with a timestamp query param; request only the active area's sensors.
  let url = PROXY_URL + (PROXY_URL.includes('?')?'&':'?') + '_=' + Date.now();
  if(areaId) url += '&area=' + encodeURIComponent(areaId);
  const r=await fetch(url); if(!r.ok) throw new Error(`Proxy HTTP ${r.status}`);
  const j=await r.json(); if(j&&j.error) throw new Error('Proxy: '+j.error);
  return ingestCombined(j,'proxy');
}

// ── API source ──────────────────────────────────────────────────────────────
function fmtApiDate(ms){ return new Date(ms).toLocaleString('sv-SE',
  {timeZone:DISPLAY_TZ,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}).replace(' ','T').slice(0,16); }
function parseApiLabel(lbl, yr, startMs){                       // "DD/MM HH:MM" (hora local -05:00)
  const m=String(lbl).match(/^(\d{1,2})\/(\d{1,2})\s+(\d{1,2}):(\d{2})/); if(!m) return NaN;
  const mk=y=>Date.parse(`${y}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}T${m[3].padStart(2,'0')}:${m[4]}:00${TZ_OFFSET}`);
  let t=mk(yr); if(!isNaN(t)&&t<startMs-86400000) t=mk(yr+1);   // year rollover (Dec->Jan)
  return t;
}
function parseApiSeries(j, metric, yr, startMs){               // -> [{t,v}] DESC
  if(!Array.isArray(j)||j.length<2||!Array.isArray(j[0])||!Array.isArray(j[1])) return [];
  const labels=j[0], vals=j[1]; const [lo,hi]=BOUNDS[metric]||[-1e9,1e9]; const out=[];
  const n=Math.min(labels.length, vals.length);
  for(let i=0;i<n;i++){ const v=Number(vals[i]); if(!isFinite(v)||v<lo||v>hi) continue;
    const t=parseApiLabel(labels[i], yr, startMs); if(isNaN(t)) continue; out.push({t,v}); }
  out.sort((a,b)=>b.t-a.t); return out;
}
async function loadFromAPI(){
  const end=Math.floor(Date.now()/60000)*60000;    // round down to the complete minute
  const start=end-API_HOURS*3600e3;                // last clock hour
  const startStr=fmtApiDate(start), endStr=fmtApiDate(end), yr=parseInt(startStr.slice(0,4),10);
  const list=(AREA.sensors||[]); const readingsBySensor={};
  let done=0, ok=0, fail=0, total=0, idx=0, firstErr='';
  const setP=()=>{ $('overlay-msg').textContent='Consultando API…'; $('overlay-sub').textContent=`${done}/${list.length} sensores`; };
  setP();
  async function worker(){
    while(idx<list.length){ const s=list[idx++]; const name=s.apiName||apiNameFor(s);
      try{
        const url=`${API_BASE}?sensorName=${encodeURIComponent(name)}&startDate=${encodeURIComponent(startStr)}&endDate=${encodeURIComponent(endStr)}`;
        const r=await fetch(url,{cache:'no-store'}); if(!r.ok) throw new Error('HTTP '+r.status);
        const recs=parseApiSeries(await r.json(), s.metric, yr, start);
        readingsBySensor[s.sensor_id]=recs; total+=recs.length; ok++;
      }catch(e){ fail++; if(!firstErr) firstErr=String(e.message||e); console.warn('API fail',name,e); }
      done++; setP();
    }
  }
  await Promise.all(Array.from({length:Math.min(API_CONCURRENCY,list.length||1)}, worker));
  if(ok===0) throw new Error('API sin datos'+(firstErr?(' ('+firstErr+')'):'')+' — ¿CORS o red?');
  META={rows:total,corrupted:0,mapped:0,source:'api',apiOk:ok,apiFail:fail,range:startStr+' → '+endStr};
  return readingsBySensor;
}
function apiNameFor(s){ return `${s.metric==='hum'?'Humedad':'Temperatura'} ${s.line}-${s.pos}-${s.sensor_id}`; }

// ── DB source (sql.js) ──────────────────────────────────────────────────────
async function loadFromDB(){
  const SQL=await initSqlJs({locateFile:f=>SQLJS_BASE+f});
  const resp=await fetch(DB_PATH,{cache:'no-store'}); if(!resp.ok) throw new Error(`No se pudo leer ${DB_PATH} (HTTP ${resp.status})`);
  const db=new SQL.Database(new Uint8Array(await resp.arrayBuffer()));
  const meta=db.exec(`SELECT sensor_id,type FROM sensor WHERE module_id='${MODULE_ID}' AND is_active=1`);
  const metricFromDb={}; const typeRe=/^(humedad|temperatura)/i;
  if(meta.length) for(const r of meta[0].values){ const m=String(r[1]||'').trim().match(typeRe); if(m) metricFromDb[r[0]]=m[1].toLowerCase().startsWith('t')?'temp':'hum'; }
  const ids=(AREA.sensors||[]).map(s=>s.sensor_id);
  const metricById={}; (AREA.sensors||[]).forEach(s=>metricById[s.sensor_id]=s.metric||metricFromDb[s.sensor_id]);
  const readingsBySensor={}; let total=0,corrupt=0;
  if(ids.length){
    const data=db.exec(`SELECT sensor_id,measure_date,data_value FROM sensor_data WHERE sensor_id IN (${ids.join(',')})`);
    if(data.length) for(const r of data[0].values){ total++; const sid=r[0],ds=r[1],raw=r[2]; const metric=metricById[sid]; if(!metric) continue;
      const c=cleanValue(raw,metric); if((typeof raw!=='number')||!c.valid) corrupt++; if(!c.valid) continue;
      const t=Date.parse(String(ds).replace(' ','T')+TZ_OFFSET); if(isNaN(t)) continue;
      (readingsBySensor[sid]=readingsBySensor[sid]||[]).push({t,v:c.value}); }
  }
  Object.values(readingsBySensor).forEach(a=>a.sort((x,y)=>y.t-x.t)); db.close();
  META={rows:total,corrupted:corrupt,mapped:0,source:'db'};
  return {readingsBySensor, metricFromDb};
}

function loadDemo(reason){
  CONFIG=CONFIG||FALLBACK_CONFIG;
  if(!AREAS.length){ AREAS=normalizeAreas(CONFIG).sort((a,b)=>areaMinId(a)-areaMinId(b)); populateAreaSelect(); }
  if(!AREA) setActiveArea(AREAS[0]);
  const now=Date.now(); const readingsBySensor={}; const metricFromDb={};
  AREAS.forEach(ar=>(ar.sensors||[]).forEach(s=>{ metricFromDb[s.sensor_id]=s.metric;
    const base=s.metric==='temp'?27:56; const jitter=(s.sensor_id%7)-3;
    readingsBySensor[s.sensor_id]=[{t:now,v:base+jitter}]; }));
  LAST_READINGS=readingsBySensor; _metricFromDb=metricFromDb;
  META={rows:Object.keys(readingsBySensor).length,corrupted:0,mapped:0,source:'demo'};
  renderActiveArea(reason);
}

async function boot(){ try{ await loadAll(); }
  catch(e){ console.warn('load failed:',e); const onFile=location.protocol==='file:';
    const reason = onFile ? 'Abierto como archivo local (file://): el navegador bloquea las peticiones.'
                 : (DATA_SOURCE==='proxy' ? 'No se pudo consultar el proxy (¿PROXY_URL configurado y Worker desplegado?). Detalle: '+e.message
                 : DATA_SOURCE==='snapshot' ? 'No se pudo leer data/marquesina.json (¿la GitHub Action ya generó el snapshot?). Detalle: '+e.message
                 : DATA_SOURCE==='api' ? 'No se pudo consultar la API (posible CORS o red). Detalle: '+e.message
                                        : 'Detalle: '+e.message);
    loadDemo(reason); } }

// ══════════════════════════════════════════════════════════════════════════
//  CONTROLS
// ══════════════════════════════════════════════════════════════════════════
function setMetricButtons(){ $('m-temp').classList.toggle('on',currentMetric==='temp'); $('m-hum').classList.toggle('on',currentMetric==='hum'); }
$('m-temp').addEventListener('click',()=>{ if(currentMetric!=='temp'){currentMetric='temp';setMetricButtons();applyState();}});
$('m-hum').addEventListener('click', ()=>{ if(currentMetric!=='hum'){ currentMetric='hum'; setMetricButtons();applyState();}});
$('sl-time').addEventListener('input',function(){ timeIndex=+this.value; applyState(); });
$('sl-opacity').addEventListener('input',function(){ volOpacity=this.value/100; $('sl-opacity-val').textContent=this.value+'%';
  gVol.children.forEach(c=>{if(c.material)c.material.opacity=volOpacity;}); });
$('sl-size').addEventListener('input',function(){ ptsSizeFactor=this.value/12; $('sl-size-val').textContent=this.value;
  gPts.children.forEach(c=>{if(c.userData.idx!==undefined)c.scale.setScalar(ptsSizeFactor);}); });
[['tog-vol',gVol],['tog-pts',gPts],['tog-box',gBox],['tog-feat',gFeat],['tog-labels',gLabels],['tog-sun',gSun]].forEach(([id,grp])=>{
  const el=$(id); grp.visible=el.classList.contains('on');
  el.addEventListener('click',function(){this.classList.toggle('on');grp.visible=this.classList.contains('on');if(id==='tog-box')gAxis.visible=grp.visible;
    if(id==='tog-sun'){ const hs=document.getElementById('hud-sun'); if(hs) hs.style.display=grp.visible?'':'none'; if(grp.visible) updateSun(currentTargetMs()); }});});
$('btn-reload').addEventListener('click',boot);
{ const _as=$('area-select'); if(_as) _as.addEventListener('change',function(){ selectArea(this.value); }); }

// ── mobile drawer ────────────────────────────────────────────────────────────
const _aside=document.querySelector('aside'), _backdrop=$('backdrop'), _menuBtn=$('menu-btn');
function toggleDrawer(open){ _aside.classList.toggle('open',open); _backdrop.classList.toggle('show',open); }
_menuBtn.addEventListener('click',()=>toggleDrawer(!_aside.classList.contains('open')));
_backdrop.addEventListener('click',()=>toggleDrawer(false));
window.addEventListener('orientationchange',()=>setTimeout(resize,250));

const raycaster=new THREE.Raycaster(); raycaster.params.Points={threshold:0.3}; const mouse=new THREE.Vector2(), tooltip=$('tooltip');
canvas.addEventListener('mousemove',e=>{ const rect=canvas.getBoundingClientRect();
  mouse.x=2*(e.clientX-rect.left)/rect.width-1; mouse.y=-2*(e.clientY-rect.top)/rect.height+1; raycaster.setFromCamera(mouse,camera);
  const meshes=gPts.children.filter(c=>c.userData.idx!==undefined); const hits=raycaster.intersectObjects(meshes);
  if(hits.length){ const ud=hits[0].object.userData,s=ud.s,unit=METRIC_UNIT[currentMetric];
    const valid=snapVals.filter(v=>v!=null); const vMin=valid.length?Math.min(...valid):0,vMax=valid.length?Math.max(...valid):1;
    const rgb=ud.has?valToRgb(ud.val,vMin,vMax):[150,170,180];
    tooltip.style.display='block'; tooltip.style.left=(e.clientX-rect.left+14)+'px'; tooltip.style.top=(e.clientY-rect.top-10)+'px';
    tooltip.innerHTML=`<span style="color:${cssRgb(rgb)};font-weight:700">${s.label} · #${s.sensor_id}${s.external?' · EXT':''}</span><br>`+
      `${METRIC_NAME[currentMetric][0].toUpperCase()+METRIC_NAME[currentMetric].slice(1)}: <strong style="color:#fff">${ud.has?ud.val.toFixed(1)+' '+unit:'sin dato'}</strong><br>`+
      (overriddenIds.has(s.sensor_id)?`<span style="color:#e0b34a">≈ media de pares (pre-recambio)</span><br>`:'')+
      `x:${s.cm.x} y:${s.cm.y} z:${s.cm.z} cm`;
    canvas.style.cursor='crosshair';
  } else { tooltip.style.display='none'; canvas.style.cursor='grab'; }});

function resize(){const w=wrap.clientWidth,h=wrap.clientHeight;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix(); if(SUN_FRENTE) updateSky(currentTargetMs());}
window.addEventListener('resize',resize); resize();
(function animate(){requestAnimationFrame(animate);controls.update();
  gPts.children.forEach(c=>{if(c.userData.isRing)c.lookAt(camera.position);});
  gFeat.children.forEach(c=>{if(c.userData.isRing)c.lookAt(camera.position);});
  renderer.render(scene,camera);})();
document.addEventListener('keydown',e=>{ if(e.key==='0'||e.code==='Digit0'||e.code==='Numpad0') resetView(); });

boot();
