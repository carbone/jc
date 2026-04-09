# Handoff: 91 Whittemore Rd Property Setback Map

## What This Is

Mobile-first web app that overlays real GIS data with computed regulatory buffers for 91 Whittemore Rd, Pembroke NH 03275. Think custom LandID with all zoning/environmental setbacks pre-configured. Built for on-site use — walk the property with your phone and see exactly which regulatory zones you're standing in.

**Long-term vision:** Phase 1 = site planning tool. Phase 2+ = guest navigation, multi-user, time-series tracking.

## Current State

**Branch:** `claude/property-setback-map-gIcHT`
**Commit:** `ecd1b27` — Phase 0 scaffold only

### What exists now (4 files)

| File | Purpose | Status |
|------|---------|--------|
| `app.js` | `SetbackApp` namespace skeleton — empty module stubs | Skeleton only |
| `index.html` | Leaflet map shell, loads CDN libs + app.js | Minimal shell |
| `test.html` | Browser test runner, loads Turf.js + app.js + test.js | Working |
| `test.js` | Micro test harness (~80 lines) + 3 canary tests | Working, 3/3 pass |

### What needs to be built (Phases 1-15)

Everything. The scaffold is in place but none of the actual logic or UI is implemented yet.

## Architecture

### Design Principle
All logic lives in `app.js` as pure functions on a global `window.SetbackApp` namespace. Only `init()` touches the DOM. This makes everything testable — `test.html` loads `app.js` and exercises all functions without needing a map or browser APIs.

### Module Map

```
SetbackApp.geo        — Buffer computation, distance calc, point-in-zone, R1 setbacks
SetbackApp.api        — ArcGIS REST URL construction + response parsing
SetbackApp.elevation  — Flood gap math (ground elev vs BFE 203.4 ft)
SetbackApp.layers     — Layer toggle state management, LAYER_DEFINITIONS
SetbackApp.gps        — Unit conversions (m↔ft), coordinate formatting (DD/DMS)
SetbackApp.query      — Tap-to-query orchestration (combines geo + elevation + zones)
SetbackApp.poi        — POI CRUD (create/update/delete points of interest)
SetbackApp.photos     — Photo processing, thumbnails, attachment to POIs
SetbackApp.footprints — Building footprint creation + setback compliance checking
SetbackApp.storage    — JSON serialization for EC2 API, GPS track management
SetbackApp.init()     — Wires everything to Leaflet map + DOM (NOT unit tested)
```

### Test Harness

`test.js` includes a zero-dependency micro framework:
- `T.run(name, fn)` — run a test, catch errors
- `T.assert(cond, msg)`, `T.assertEqual(a, b)`, `T.assertClose(a, b, tol)`, `T.assertDeepEqual(a, b)`
- `T.group(name)` — visual grouping in test runner
- `T.report()` — summary output
- Open `test.html` in any browser to run tests. No build step, no Node.js needed.

### CDN Dependencies (no install needed)
- **Leaflet 1.9.4** — map rendering
- **Turf.js 6.5.0** — buffer computation, distance, point-in-polygon
- Both loaded from CDN in `index.html` and `test.html`

## Implementation Plan (TDD, ~92 tests)

### Phase 1: GPS / Unit Conversions (7 tests)
Implement `SetbackApp.gps`: `metersToFeet()`, `feetToMeters()`, `formatCoordinates(lat, lng, 'dd'|'dms')`, `formatElevation(meters)`

### Phase 2: Elevation / Flood Gap (5 tests)
Implement `SetbackApp.elevation`: `computeFloodGap(groundFt, bfeFt)`, `formatElevation(ft)`
- BFE reference: 203.4–204.0 ft NAVD88

### Phase 3: API URL Construction (5 tests)
Implement `SetbackApp.api`: `buildFemaFloodZoneUrl(bbox)`, `buildUsgsNhdUrl(bbox)`, `buildNwiWetlandsUrl(bbox)`, `buildParcelUrl(bbox)`
- Extract shared `buildArcGisQueryUrl(base, bbox, outFields)` helper
- Bounding box for parcel: `[-71.498, 43.155, -71.488, 43.166]`

### Phase 4: ArcGIS Response Parsing (7 tests)
Implement `SetbackApp.api`: `parseArcGisResponse(response)`, `arcGisToGeoJson(arcGisGeometry)`
- Handle polygons (rings), polylines (paths), points (x/y), multipath
- Return `[]` on error/empty responses

### Phase 5: Buffer Computation (5 tests)
Implement `SetbackApp.geo`: `computeBuffer(feature, distanceFt)`, `computeRiverBuffers(riverLine, [50,125,150,250])`, `computeWetlandBuffer(wetlandPoly, 50)`
- Use `turf.buffer()` with feet→km conversion
- River buffers: 50ft (waterfront), 125ft (shoreland), 150ft (woodland), 250ft (state shoreland)
- Wetland buffer: 50ft no-disturb

### Phase 6: Distance Calculation (4 tests)
Implement `SetbackApp.geo`: `pointToLineDistanceFt(coords, lineFeature)`
- Wraps `turf.pointToLineDistance()` with feet units

### Phase 7: Point-in-Zone Checks (4 tests)
Implement `SetbackApp.geo`: `pointInZones(coords, zonePolygons)`
- Uses `turf.booleanPointInPolygon()` for each zone

### Phase 8: R1 Zoning Setbacks (7 tests)
Implement `SetbackApp.geo`: `classifyParcelEdges(parcelPoly, frontEdgeIndex)`, `computeNegativeBuffer(polygon, distanceFt)`, `computeR1Setbacks(parcelPoly, frontEdgeIndex, {front:30, side:15, rear:40})`
- Negative `turf.buffer()` for inward offsets
- Intersection of all inward offsets = buildable area

### Phase 9: Layer State Management (9 tests)
Implement `SetbackApp.layers`: `LAYER_DEFINITIONS`, `createDefaultState()`, `toggleLayer(state, id)`, `isLayerVisible(state, id)`, `getLayersByCategory(state, category)`
- Immutable state — toggle returns new object
- Default ON: waterfront 50ft, shoreland 125ft, wetland 50ft, flood zones, parcel
- Default OFF: woodland 150ft, state shoreland 250ft, vernal pool 100ft, contours

### Phase 10: Tap-to-Query (6 tests)
Implement `SetbackApp.query`: `identifyPoint(coords, buffers, river, wetlands, floodZones)`, `formatQueryResult(result)`
- Returns: distance to river, which buffer zones, flood zone status, BFE gap, distance to wetland

### Phase 11: POI CRUD (8 tests)
Implement `SetbackApp.poi`: `createPOI()`, `updatePOI()`, `deletePOI()`, `getAllPOIs()`, `exportPOIs()` (GeoJSON), `importPOIs()`
- IDs via `crypto.randomUUID()`

### Phase 12: Photo Processing (6 tests)
Implement `SetbackApp.photos`: `processPhoto(dataUrl)`, `createThumbnail(dataUrl, maxDim)`, `getPhotosByPOI()`, `estimateStorageUsage()`
- Testable core takes dataUrl strings; async FileReader wrapper only in init()

### Phase 13: Building Footprints (8 tests)
Implement `SetbackApp.footprints`: `createRectFootprint(center, widthFt, depthFt, rotDeg)`, `createCustomFootprint(coords)`, `computeFootprintArea()`, `checkSetbackCompliance(footprint, setbackPolygon)`, `checkBufferConflicts(footprint, bufferPolygons)`
- Uses `turf.transformRotate()`, `turf.area()`, `turf.booleanContains()`, `turf.booleanIntersects()`

### Phase 14: Storage / GPS Track (8 tests)
Implement `SetbackApp.storage`: `serializeSiteData()`, `deserializeSiteData()`, `createGPSTrackPoint()`, `mergeTrackPoints()`, `computeTrackStats()`

### Phase 15: UI Wiring (manual testing)
Implement `SetbackApp.init()` — connects all tested logic to Leaflet map:
- Esri satellite basemap, centered 43.1605, -71.4930 at zoom 17
- Fetch GIS data from public APIs, compute buffers, render as L.geoJSON layers
- Bottom sheet layer panel (draggable, grouped toggles with color swatches)
- Map click → `query.identifyPoint()` → popup with regulatory info
- GPS button → `watchPosition` → blue dot + elevation + zone display
- Key site markers: gravel flat, desired pad site, backup cabin site
- POI add/edit via long-press, photo capture via `<input capture>`
- Building footprint draw tool with compliance overlay
- Auto-save to EC2 API, GPS track batch-save every 30s
- Scale bar (imperial)

Also create `server.js`:
- Express static file server
- `GET /api/data` → returns `site-data.json`
- `POST /api/data` → saves `site-data.json`
- `POST /api/photos` → saves uploaded photo file
- `GET /api/photos/:id` → serves photo
- HTTPS via Let's Encrypt for GPS support
- Deploy on EC2 t3.nano (~$3/mo)

## GIS Data Sources (all free, no API keys)

| Data | Source | Endpoint |
|------|--------|----------|
| Satellite tiles | Esri World Imagery | `server.arcgisonline.com/.../tile/{z}/{y}/{x}` |
| Parcel boundary | NH GRANIT Parcel Mosaic | `nhgeodata.unh.edu` FeatureServer |
| Flood zones | FEMA NFHL | `hazards-fema.maps.arcgis.com/...` |
| Rivers | USGS NHD | `hydro.nationalmap.gov/arcgis/rest/services/nhd/MapServer` |
| Wetlands | USFWS NWI | `fwsprimary.wim.usgs.gov/.../Wetlands/MapServer` |
| Elevation | USGS 3DEP | `epqs.nationalmap.gov/v1/json?x={lng}&y={lat}` |
| Contours | USGS Contours | `carto.nationalmap.gov/.../contours/MapServer` |

All queries use bounding box `[-71.498, 43.155, -71.488, 43.166]` with `outSR=4326` and `f=geojson`.

## Property Reference

| Item | Value |
|------|-------|
| Address | 91 Whittemore Rd, Pembroke NH 03275 |
| Parcel center | 43.1605, -71.4930 |
| Acreage | 12.5 |
| River frontage | 2,600 ft (Soucook River, 3 sides) |
| Zoning | R1 (Medium Density Residential) |
| BFE (Zone AE) | 203.4–204.0 ft NAVD88 |
| FIRM panel | 33013C0561F, eff. 1/23/2026 |
| Road | Whittemore Rd (Class VI) |

## Buffer Distances

| Buffer | Distance | Regulation | Color | Default |
|--------|----------|-----------|-------|---------|
| Waterfront | 50 ft from river | RSA 483-B | Red | ON |
| Shoreland Protection | 125 ft from river | Pembroke §143-71 | Orange | ON |
| Woodland | 150 ft from river | RSA 483-B | Purple | OFF |
| State protected shoreland | 250 ft from river | RSA 483-B | Indigo | OFF |
| Wetland no-disturb | 50 ft from NWI wetlands | Pembroke §143-72(E)(2) | Green | ON |
| Vernal pool | 100 ft from vernal pools | Pembroke §143-72(E)(3) | Teal | OFF |

## R1 Zoning Setbacks
- Front: 30 ft (Whittemore Rd side)
- Side: 15 ft
- Rear: 40 ft

## How to Pick This Up

1. **Understand the test harness:** Open `test.html` in a browser — you'll see 3 green canary tests
2. **Follow TDD:** For each phase, write the tests in `test.js` first (they'll fail), then implement in `app.js` until they pass
3. **Work in order:** Phases build on each other (e.g., Phase 7 uses Phase 5 buffers)
4. **Phase 15 is the big one:** All the UI/map wiring. The tested pure functions make this straightforward — just call them from Leaflet event handlers
5. **Don't forget `server.js`:** Needed for HTTPS (GPS requires secure context) and data persistence

### Quick start for next session
```
cd /home/user/jc
git checkout claude/property-setback-map-gIcHT
# Open test.html in browser to verify 3/3 pass
# Start implementing Phase 1 tests in test.js, then Phase 1 code in app.js
```
