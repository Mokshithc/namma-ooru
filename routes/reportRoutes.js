const express = require('express');
const router = express.Router();
const upload = require('../config/multerConfig');
const reportController = require('../controllers/reportController');
const { authenticate } = require('../middleware/auth');



// Test geocoding (public - no auth needed)
router.get('/test-geocode', async (req, res) => {
  try {
    const { lat, lng } = req.query;
    
    if (!lat || !lng) {
      return res.status(400).json({ error: 'lat and lng parameters required' });
    }

    const { reverseGeocode } = require('../services/geocodingService');
    const result = await reverseGeocode(parseFloat(lat), parseFloat(lng));
    
    res.json({
      success: true,
      coordinates: { lat: parseFloat(lat), lng: parseFloat(lng) },
      address: result
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Geocoding failed', 
      message: error.message 
    });
  }
});

// Protected routes below (require auth)

// Create report with image upload
router.post('/', authenticate, upload.single('image'), reportController.createReport);

// Get user stats
router.get('/stats', authenticate, reportController.getUserStats);

// Get all reports for authenticated user
router.get('/my-reports', authenticate, reportController.getUserReports);

// Get single report by ID
router.get('/:id', authenticate, reportController.getReportById);

// Update report status (admin use)
router.patch('/:id/status', authenticate, reportController.updateReportStatus);

// User accept/reject resolution routes
router.put('/:id/accept-resolution', authenticate, require('../controllers/reportController').acceptResolution);
router.put('/:id/reject-resolution', authenticate, require('../controllers/reportController').rejectResolution);

module.exports = router;

module.exports = router;
