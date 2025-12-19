package com.qwqer.demo.controller;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;

@RestController
@RequestMapping("/api/routes")
@CrossOrigin(origins = "*")
public class RouteController {

    private static final Logger log = LoggerFactory.getLogger(RouteController.class);

    @Value("${ors.api.key}")
    private String orsApiKey;

    // ✅ Simple in-memory cache (safe for demo/small usage)
    private final Map<String, String> routeCache = new ConcurrentHashMap<>();

    @GetMapping("/driving")
    public ResponseEntity<?> getDrivingRoute(
            @RequestParam double startLat,
            @RequestParam double startLng,
            @RequestParam double endLat,
            @RequestParam double endLng) {

        String cacheKey = startLat + "," + startLng + "->" + endLat + "," + endLng;

        // 🧠 Step 1: Serve from cache if available
        if (routeCache.containsKey(cacheKey)) {
            log.info("✅ Using cached route for {}", cacheKey);
            return ResponseEntity.ok(routeCache.get(cacheKey));
        }

        try {
            if (orsApiKey == null || orsApiKey.isBlank()) {
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                        .body(Map.of("error", "Missing ors.api.key in configuration"));
            }

            log.info("Fetching ORS route: start=({}, {}), end=({}, {})", startLat, startLng, endLat, endLng);

            String url = String.format(
                    "https://api.openrouteservice.org/v2/directions/driving-car?api_key=%s&start=%f,%f&end=%f,%f",
                    orsApiKey, startLng, startLat, endLng, endLat);

            RestTemplate restTemplate = new RestTemplate();
            ResponseEntity<String> orsResponse = restTemplate.exchange(url, HttpMethod.GET, null, String.class);

            // 🧩 Step 2: Cache successful response
            routeCache.put(cacheKey, orsResponse.getBody());
            log.info("💾 Cached new route for {}", cacheKey);

            return ResponseEntity.ok(orsResponse.getBody());

        } catch (HttpClientErrorException ex) {
            if (ex.getStatusCode() == HttpStatus.TOO_MANY_REQUESTS) {
                log.warn("⚠️ ORS rate limit hit, falling back to straight line route for {}", cacheKey);

                // 🪄 Step 3: Generate fallback route
                String fallback = getFallbackStraightLine(startLat, startLng, endLat, endLng);
                routeCache.put(cacheKey, fallback);
                return ResponseEntity.ok(fallback);
            }

            log.error("ORS error: {} {}", ex.getStatusCode(), ex.getResponseBodyAsString());
            return ResponseEntity.status(ex.getStatusCode())
                    .body(Map.of("error", "ORS: " + ex.getResponseBodyAsString()));

        } catch (Exception e) {
            log.error("Route fetch failed", e);
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", e.getMessage()));
        }
    }

    // 🔄 fallback route = simple straight line geometry
    private String getFallbackStraightLine(double startLat, double startLng, double endLat, double endLng) {
        double distanceKm = calculateDistance(startLat, startLng, endLat, endLng);
        return String.format("""
                {
                  "type": "FeatureCollection",
                  "features": [
                    {
                      "type": "Feature",
                      "geometry": {
                        "type": "LineString",
                        "coordinates": [
                          [%f, %f],
                          [%f, %f]
                        ]
                      },
                      "properties": {
                        "summary": { "distance": %f, "duration": %f }
                      }
                    }
                  ]
                }
                """, startLng, startLat, endLng, endLat,
                distanceKm * 1000, distanceKm / 0.25 * 60.0); // assume 15km/h speed
    }

    private double calculateDistance(double lat1, double lon1, double lat2, double lon2) {
        double R = 6371;
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                        * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    @GetMapping("/optimized")
    public ResponseEntity<?> getOptimizedRoute(@RequestParam String coords) {
        try {
            // Example input: "76.9,15.14;76.93,15.14;76.95,15.15"
            String[] pairs = coords.split(";");
            StringBuilder jsonCoords = new StringBuilder("[");
            for (int i = 0; i < pairs.length; i++) {
                String[] parts = pairs[i].split(",");
                if (parts.length != 2)
                    continue;
                if (i > 0)
                    jsonCoords.append(",");
                jsonCoords.append("[").append(parts[0]).append(",").append(parts[1]).append("]");
            }
            jsonCoords.append("]");

            String url = "https://api.openrouteservice.org/v2/directions/driving-car/geojson";

            RestTemplate restTemplate = new RestTemplate();
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("Authorization", orsApiKey);

            String body = "{ \"coordinates\": " + jsonCoords.toString() + " }";
            HttpEntity<String> entity = new HttpEntity<>(body, headers);

            ResponseEntity<String> response = restTemplate.postForEntity(url, entity, String.class);

            return ResponseEntity.ok(response.getBody());
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "ORS call failed", "details", e.getMessage()));
        }
    }

}
