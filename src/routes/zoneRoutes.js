// =============================================================================
// ZONE ROUTES
// File path: src/routes/zoneRoutes.js
// =============================================================================

import express from 'express';
import Zone from '../models/zone.js';
import ZoneLog from '../models/zoneLog.js';

const router = express.Router();

// GET /api/zones - Get all zones and logs
router.get('/zones', async (req, res) => {
  try {
    const [zones, logs] = await Promise.all([
      Zone.find().sort({ createdAt: -1 }),
      ZoneLog.find().sort({ createdAt: -1 })
    ]);

    // Transform data to match frontend format
    const transformedZones = zones.map(zone => ({
      id: zone.id,
      name: zone.name,
      description: zone.description,
      coordinates: zone.coordinates,
      severity: zone.severity,
      createdAt: zone.createdAt.toISOString(),
      createdBy: zone.createdBy,
      isActive: zone.isActive
    }));

    const transformedLogs = logs.map(log => ({
      id: log.id,
      action: log.action,
      zoneName: log.zoneName,
      timestamp: log.createdAt.toISOString(),
      officer: log.officer,
      details: log.details
    }));

    res.status(200).json({
      zones: transformedZones,
      logs: transformedLogs
    });

  } catch (error) {
    console.error('Get zones error:', error);
    res.status(500).json({
      message: 'Server error while fetching zones',
      error: error.message
    });
  }
});

// POST /api/zones - Create or update zones and logs
router.post('/zones', async (req, res) => {
  try {
    const { zones, logs } = req.body;

    if (!zones || !logs) {
      return res.status(400).json({
        message: 'Zones and logs data are required'
      });
    }

    // Clear existing data and insert new data
    await Zone.deleteMany({});
    await ZoneLog.deleteMany({});

    // Insert zones
    if (zones.length > 0) {
      const zoneDocuments = zones.map(zone => ({
        id: zone.id,
        name: zone.name,
        description: zone.description,
        coordinates: zone.coordinates,
        severity: zone.severity,
        createdBy: zone.createdBy,
        isActive: zone.isActive,
        createdAt: new Date(zone.createdAt),
        updatedAt: new Date(zone.createdAt)
      }));

      await Zone.insertMany(zoneDocuments);
    }

    // Insert logs
    if (logs.length > 0) {
      const logDocuments = logs.map(log => ({
        id: log.id,
        action: log.action,
        zoneName: log.zoneName,
        officer: log.officer,
        details: log.details,
        createdAt: new Date(log.timestamp),
        updatedAt: new Date(log.timestamp)
      }));

      await ZoneLog.insertMany(logDocuments);
    }

    res.status(200).json({
      message: 'Zones data saved successfully',
      zonesCount: zones.length,
      logsCount: logs.length
    });

  } catch (error) {
    console.error('Save zones error:', error);
    res.status(500).json({
      message: 'Server error while saving zones',
      error: error.message
    });
  }
});

export default router;