package com.qwqer.demo.service;

import com.qwqer.demo.entity.DeliveryAgent;
import com.qwqer.demo.repository.DeliveryAgentRepository;

import jakarta.annotation.PostConstruct;
import com.qwqer.demo.dto.DriverPositiondTO;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

/**
 * This service:
 *  - loads drivers from DB,
 *  - keeps an in-memory current position map (so we don't persist each move),
 *  - simulates small movement every 2s,
 *  - broadcasts positions to /topic/driver-updates.
 *
 * In production you'd accept live location updates from driver apps (via POST/WebSocket),
 * and/or store positions in Redis GEO for geo queries.
 */
@Service
public class DriverLocationService {

    @Autowired
    private DeliveryAgentRepository agentRepository;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    // keep live positions in memory: agentId -> [lat, lon]
    private final Map<Long, double[]> livePositions = new ConcurrentHashMap<>();
    private final Random rnd = new Random();

    @PostConstruct
    public void init() {
        // load initial positions from DB into memory
        List<DeliveryAgent> agents = agentRepository.findAll();
        for (DeliveryAgent a : agents) {
            if (a.getLatitude() != null && a.getLongitude() != null) {
                livePositions.put(a.getId(), new double[] { a.getLatitude(), a.getLongitude() });
            } else {
                // fallback: center India if no location
                livePositions.put(a.getId(), new double[] { 20.5937, 78.9629 });
            }
        }
        // initial broadcast
        broadcastPositions();
    }

    // simulate and broadcast every 2 seconds
    @Scheduled(fixedRate = 2000)
    public void tickAndBroadcast() {
        // simulate small movement for each live driver
        for (Map.Entry<Long, double[]> e : livePositions.entrySet()) {
            double[] pos = e.getValue();
            // small jitter: +/- up to ~0.0008 deg (~ < 100m)
            double jitterLat = (rnd.nextDouble() - 0.5) * 0.0016;
            double jitterLon = (rnd.nextDouble() - 0.5) * 0.0016;
            pos[0] = pos[0] + jitterLat;
            pos[1] = pos[1] + jitterLon;
        }
        broadcastPositions();
    }

    private void broadcastPositions() {
        // Read agents from DB to get name/phone/vehicleCapacity/status
        List<DeliveryAgent> agents = agentRepository.findAll();

        List<DriverPositiondTO> payload = new ArrayList<>();
        for (DeliveryAgent a : agents) {
            DriverPositiondTO dto = new DriverPositiondTO();
            dto.setId(a.getId());
            dto.setName(a.getName());
            dto.setPhone(a.getPhone());
            dto.setVehicleCapacity(a.getVehicleCapacity() != null ? a.getVehicleCapacity().name() : null);
            dto.setStatus(a.getStatus() != null ? a.getStatus().name() : null);

            double[] pos = livePositions.get(a.getId());
            if (pos != null) {
                dto.setLatitude(pos[0]);
                dto.setLongitude(pos[1]);
            } else if (a.getLatitude() != null && a.getLongitude() != null) {
                dto.setLatitude(a.getLatitude());
                dto.setLongitude(a.getLongitude());
            } else {
                dto.setLatitude(20.5937);
                dto.setLongitude(78.9629);
            }
            payload.add(dto);
        }

        // send to subscribed clients
        messagingTemplate.convertAndSend("/topic/driver-updates", payload);
    }
}
