const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const authMiddleware = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');

// Protect ALL admin routes
router.use(authMiddleware.authenticate);
router.use(adminAuth);

// GET /api/admin/stats
router.get('/stats', async (req, res) => {
  try {
    const statsQuery = `
     SELECT
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'open' THEN 1 END) as open,
        COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress,
        COUNT(CASE WHEN status = 'resolved' THEN 1 END) as resolved,
        COUNT(CASE WHEN status = 'awaiting_user_confirmation' THEN 1 END) as awaiting_confirmation,
        COUNT(CASE WHEN status = 'reopened' THEN 1 END) as reopened,
        COUNT(CASE WHEN status = 'closed' THEN 1 END) as closed
      FROM reports
    `;
    const result = await pool.query(statsQuery);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

router.get('/reports', async (req, res) => {
  try {
    const { status, category } = req.query;
    
    let query = `
      SELECT
        r.*,
        u.name as user_name,
        u.email as user_email
      FROM reports r
      JOIN users u ON r.user_id = u.id
      WHERE 1=1
    `;
    
    const params = [];
    
    // Add status filter if provided
    if (status && status !== 'all') {
      params.push(status);
      query += ` AND r.status = $${params.length}`;
    }
    
    // Add category filter if provided
    if (category && category !== 'all') {
      params.push(category);
      query += ` AND r.category = $${params.length}`;
    }

query += ` ORDER BY 
  CASE 
    WHEN r.priority IS NULL THEN 99                          -- NULL priority (closed) at bottom
    WHEN r.reopen_count > 0 AND r.priority = 'high' THEN 1
    WHEN r.reopen_count > 0 AND r.priority = 'medium' THEN 2
    WHEN r.reopen_count > 0 AND r.priority = 'low' THEN 3
    WHEN r.priority = 'high' THEN 4
    WHEN r.priority = 'medium' THEN 5
    WHEN r.priority = 'low' THEN 6
    ELSE 7
  END ASC,
  r.created_at DESC`;

    
    const result = await pool.query(query, params);
    
    res.json({
      reports: result.rows,
      total: result.rowCount
    });
  } catch (error) {
    console.error('Error fetching all reports:', error);
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
});


// GET /api/admin/reports/:id
router.get('/reports/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const query = `
      SELECT r.*, u.name as user_name, u.email as user_email, u.phone as user_phone
      FROM reports r
      JOIN users u ON r.user_id = u.id
      WHERE r.id = $1
    `;
    const result = await pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Report not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching report:', error);
    res.status(500).json({ error: 'Failed to fetch report' });
  }
});



router.patch('/reports/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    console.log('Updating report:', id, 'to status:', status);

   
    const checkQuery = 'SELECT status FROM reports WHERE id = $1';
    const checkResult = await pool.query(checkQuery, [id]);
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Report not found' });
    }
    
    const currentStatus = checkResult.rows[0].status;
    

    if (currentStatus === 'awaiting_user_confirmation') {
      return res.status(403).json({ 
        error: 'Cannot update status while awaiting user confirmation',
        message: 'This report is waiting for the user to accept or reject the resolution.'
      });
    }

    // Validate status
    const validStatuses = [
      'open',
      'in_progress',
      'resolved',
      'awaiting_user_confirmation',
      'reopened',
      'closed'
    ];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    // Auto-transition: when admin sets 'resolved', change to 'awaiting_user_confirmation'
    let finalStatus = status;
    if (status === 'resolved') {
      finalStatus = 'awaiting_user_confirmation';
    }

    let query, params;

    if (finalStatus === 'closed') {
      query = `
        UPDATE reports
        SET 
          status = $1,
          priority = NULL
        WHERE id = $2
        RETURNING *
      `;
      params = [finalStatus, id];
    } else {
      // For all other statuses, keep priority as is
      query = `
        UPDATE reports
        SET 
          status = $1
        WHERE id = $2
        RETURNING *
      `;
      params = [finalStatus, id];
    }

    //console.log('Executing query with:', finalStatus, id);

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Report not found' });
    }

    //console.log('Successfully updated report:', result.rows[0]);

    res.json({
      message: finalStatus === 'awaiting_user_confirmation'
        ? 'Status set to awaiting user confirmation'
        : 'Status updated successfully',
      report: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating report status:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      error: 'Failed to update status',
      details: error.message
    });
  }
});





// Add this endpoint BEFORE the existing routes in adminRoutes.js

// GET /api/admin/reports/map - Get all reports with location data for map
router.get('/reports/map', async (req, res) => {
  try {
    const { status } = req.query; // Optional status filter

    let query = `
      SELECT 
        id, category, priority, status, 
        latitude, longitude, description, 
        created_at, address
      FROM reports 
      WHERE latitude IS NOT NULL 
        AND longitude IS NOT NULL
    `;

    const params = [];

    // Add status filter if provided
    if (status) {
      params.push(status);
      query += ` AND status = $1`;
    }

    query += ` ORDER BY created_at DESC`;

    const result = await pool.query(query, params);

    res.json({
      success: true,
      count: result.rows.length,
      reports: result.rows
    });

  } catch (error) {
    console.error('Error fetching map data:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch map data' 
    });
  }
});






// DELETE /api/admin/reports/:id
router.delete('/reports/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM reports WHERE id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Report not found' });
    }
    res.json({ message: 'Report deleted successfully' });
  } catch (error) {
    console.error('Error deleting report:', error);
    res.status(500).json({ error: 'Failed to delete report' });
  }
});

module.exports = router;
