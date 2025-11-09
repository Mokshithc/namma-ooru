const pool = require('../config/database'); // Your PostgreSQL connection


const { reverseGeocode} = require('../services/geocodingService');
const path = require('path');
/**
 * Create new report with image and validation
 */
const createReport = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Extract form data
    const {
      category,
      description,
      address,
      created_at,

      captured_latitude,
      captured_longitude,
      captured_accuracy,
      
      user_latitude,
      user_longitude,
      location_distance_m
    } = req.body;

    // Validate required fields
    if (!req.file) {
      return res.status(400).json({ error: 'Image file is required' });
    }



    // Get user ID
    const userId = req.user.id;

    // Determine final location to use (prefer user-corrected if available)
    const finalLatitude = user_latitude || captured_latitude;
    const finalLongitude = user_longitude || captured_longitude;

    // PROXIMITY VALIDATION: Ensure user-corrected is within 200m of captured
    if (user_latitude && user_longitude) {
      const distance = parseFloat(location_distance_m);
      const maxdist =150;
      if (distance > maxdist) {
        await client.query('ROLLBACK');
        return res.status(400).json({ 
          error: 'Location correction too far from captured GPS',
          details: `User location is ${Math.round(distance)}m away from captured GPS. Maximum allowed: ${maxdist}m.`,
          captured: { lat: captured_latitude, lng: captured_longitude },
          corrected: { lat: user_latitude, lng: user_longitude }
        });
      }
    }

    // Reverse geocode using final location
    const { reverseGeocode } = require('../services/geocodingService');
    const geocodedAddress = await reverseGeocode(
      parseFloat(finalLatitude), 
      parseFloat(finalLongitude)
    );

    // Validate address match


    // Store in database
   const insertQuery = `
INSERT INTO reports (
  user_id, category, description, image_url,
  latitude, longitude,
  address,
  created_at, verification_status,
  priority
) VALUES (
  $1, $2, $3, $4,
  $5, $6,
  $7, $8, $9,
  $10
) RETURNING *
`;


    const imagePath = `/uploads/reports/${req.file.filename}`;

    const result = await client.query(insertQuery, [
  userId,
  category,
  description,
  imagePath,
  finalLatitude, // Final location
  finalLongitude,
  address || geocodedAddress.formattedAddress,
  created_at || new Date(),
  'pending',
  'low'  // ← ADD THIS (new priority default)
]);


    await client.query('COMMIT');

    console.log('✅ Report created with dual location tracking:');
    console.log(`   Captured: ${captured_latitude}, ${captured_longitude} (±${captured_accuracy}m)`);
    if (user_latitude) {
      console.log(`   User-corrected: ${user_latitude}, ${user_longitude}`);
      console.log(`   Distance: ${location_distance_m}m`);
    }


    res.status(201).json({
      success: true,
      message: 'Report created successfully',
      report: result.rows[0]
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating report:', error);
    res.status(500).json({ 
      error: 'Failed to create report',
      details: error.message 
    });
  } finally {
    client.release();
  }
};





/**
 * Get all reports for logged-in user
 */
// ✅ KEEP THIS ONE (around line 370)
const getUserReports = async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await pool.query(
      `SELECT 
        r.*,
        u.name as user_name,
        u.email as user_email
       FROM reports r
       JOIN users u ON r.user_id = u.id
       WHERE r.user_id = $1
       ORDER BY 
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
         r.created_at DESC`,
      [userId]
    );
    
    res.json({
      success: true,
      count: result.rows.length,
      reports: result.rows
    });
  } catch (error) {
    console.error('Error fetching user reports:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch reports'
    });
  }
};


/**
 * Get single report by ID (with permission check)
 */


const getReportById = async (req, res) => {
  try {
    const reportId = req.params.id;
    const userId = req.user.id;

    const result = await pool.query(
      `SELECT 
        r.*,
        u.name as user_name,
        u.email as user_email,
        u.points as user_points,
        u.badges as user_badges
       FROM reports r
       JOIN users u ON r.user_id = u.id
       WHERE r.id = $1 AND r.user_id = $2`,
      [reportId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Report not found or access denied'
      });
    }

    res.json({
      success: true,
      report: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching report:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch report'
    });
  }
};

/**
 * Get user statistics
 */
const getUserStats = async (req, res) => {
  try {
    const userId = req.user.id;

     
    console.log('Getting stats for user ID:', userId); // Debug log
    // Get user info
    const userResult = await pool.query(
      'SELECT name, email, points, badges, created_at FROM users WHERE id = $1',
      [userId]
    );

   if (userResult.rows.length === 0) {
      console.log('User not found in database:', userId); // Debug log
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }



    // Get report counts by status
    const statsResult = await pool.query(
      `SELECT 
        COUNT(*) as total_reports,
        COUNT(*) FILTER (WHERE status = 'open') as open_reports,
        COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress_reports,
        COUNT(*) FILTER (WHERE status = 'resolved') as resolved_reports,
        COUNT(*) FILTER (WHERE verification_status = 'verified') as verified_reports
       FROM reports
       WHERE user_id = $1`,
      [userId]
    );

    // Get category breakdown
    const categoryResult = await pool.query(
      `SELECT 
        category,
        COUNT(*) as count
       FROM reports
       WHERE user_id = $1
       GROUP BY category
       ORDER BY count DESC`,
      [userId]
    );

    res.json({
      success: true,
      user: userResult.rows[0],
      stats: statsResult.rows[0],
      categories: categoryResult.rows
    });
  } catch (error) {
    console.error('Error fetching user stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch statistics'
    });
  }
};



// ============================================
// USER ACCEPTANCE WORKFLOW - NEW FUNCTIONS
// ============================================

/**
 * User accepts admin's resolution
 * POST /reports/:id/accept-resolution
 */
// const acceptResolution = async (req, res) => {
//   const client = await pool.connect();
  
//   try {
//     await client.query('BEGIN');
    
//     const { id } = req.params;
//     const userId = req.user.id; // From auth middleware
    
//     // Verify user owns this report and status is awaiting_user_confirmation
//     const checkQuery = `
//       SELECT id, status, user_id 
//       FROM reports 
//       WHERE id = $1 AND user_id = $2
//     `;
//     const checkResult = await client.query(checkQuery, [id, userId]);
    
//     if (checkResult.rows.length === 0) {
//       await client.query('ROLLBACK');
//       return res.status(404).json({ error: 'Report not found or unauthorized' });
//     }
    
//     const report = checkResult.rows[0];
    
//     if (report.status !== 'awaiting_user_confirmation') {
//       await client.query('ROLLBACK');
//       return res.status(400).json({ 
//         error: 'Report must be awaiting user confirmation to accept' 
//       });
//     }
    
//     // Update report to closed
//     const updateQuery = `
//       UPDATE reports 
//       SET 
//         status = 'closed',
//         user_confirmed = true,
//         resolved_at = NOW()
//       WHERE id = $1
//       RETURNING *
//     `;
//     const result = await client.query(updateQuery, [id]);
    
//     // Log activity
//     const activityQuery = `
//       INSERT INTO activity_log (user_id, report_id, action, details, created_at)
//       VALUES ($1, $2, $3, $4, NOW())
//     `;
//     await client.query(activityQuery, [
//       userId,
//       id,
//       'resolution_accepted',
//       JSON.stringify({ message: 'User accepted admin resolution' })
//     ]);
    
//     await client.query('COMMIT');
    
//     res.json({ 
//       message: 'Resolution accepted. Report closed successfully.',
//       report: result.rows[0]
//     });
    
//   } catch (error) {
//     await client.query('ROLLBACK');
//     console.error('Error accepting resolution:', error);
//     res.status(500).json({ error: 'Server error while accepting resolution' });
//   } finally {
//     client.release();
//   }
// };

/**
 * User rejects admin's resolution and re-raises with priority escalation
 * POST /reports/:id/reject-resolution
 */
// const rejectResolution = async (req, res) => {
//   const client = await pool.connect();
  
//   try {
//     await client.query('BEGIN');
    
//     const { id } = req.params;
//     const { reason } = req.body;
//     const userId = req.user.id;
    
//     // Verify user owns this report
//     const checkQuery = `
//       SELECT id, status, priority, reopen_count, user_id 
//       FROM reports 
//       WHERE id = $1 AND user_id = $2
//     `;
//     const checkResult = await client.query(checkQuery, [id, userId]);
    
//     if (checkResult.rows.length === 0) {
//       await client.query('ROLLBACK');
//       return res.status(404).json({ error: 'Report not found or unauthorized' });
//     }
    
//     const report = checkResult.rows[0];
    
//     if (report.status !== 'awaiting_user_confirmation') {
//       await client.query('ROLLBACK');
//       return res.status(400).json({ 
//         error: 'Report must be awaiting user confirmation to reject' 
//       });
//     }
    
//     // Escalate priority
//     const priorityMap = {
//       'low': 'medium',
//       'medium': 'high',
//       'high': 'urgent',
//       'urgent': 'urgent' // Max level
//     };
//     const newPriority = priorityMap[report.priority] || 'urgent';
    
//     // Update report
//     const updateQuery = `
//       UPDATE reports 
//       SET 
//         status = 'reopened',
//         priority = $1,
//         reopen_count = reopen_count + 1,
//         user_confirmed = false
//       WHERE id = $2
//       RETURNING *
//     `;
//     const result = await client.query(updateQuery, [newPriority, id]);
    
//     // Log activity with reason
//     const activityQuery = `
//       INSERT INTO activity_log (user_id, report_id, action, details, created_at)
//       VALUES ($1, $2, $3, $4, NOW())
//     `;
//     await client.query(activityQuery, [
//       userId,
//       id,
//       'resolution_rejected',
//       JSON.stringify({ 
//         reason: reason || 'No reason provided',
//         oldPriority: report.priority,
//         newPriority: newPriority,
//         reopenCount: result.rows[0].reopen_count
//       })
//     ]);
    
//     await client.query('COMMIT');
    
//     res.json({ 
//       message: 'Report re-raised with increased priority',
//       report: result.rows[0],
//       newPriority: newPriority,
//       reopenCount: result.rows[0].reopen_count
//     });
    
//   } catch (error) {
//     await client.query('ROLLBACK');
//     console.error('Error rejecting resolution:', error);
//     res.status(500).json({ error: 'Server error while rejecting resolution' });
//   } finally {
//     client.release();
//   }
// };

// ADD these to your existing module.exports at the BOTTOM of the file

  // ... your existing exports (createReport, etc.)
  
  
  
  // User accepts admin's resolution - mark report as closed
// const acceptResolution = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const userId = req.user.id;

//     // Verify report belongs to user and is awaiting confirmation
//     const checkResult = await pool.query(
//       'SELECT * FROM reports WHERE id = $1 AND user_id = $2 AND status = $3',
//       [id, userId, 'awaiting_user_confirmation']
//     );

//     if (checkResult.rows.length === 0) {
//       return res.status(404).json({ 
//         error: 'Report not found or not awaiting confirmation' 
//       });
//     }

//     // Update status to closed and set user_confirmed flag
//     const result = await pool.query(
//       `UPDATE reports 
//        SET status = 'closed', 
//            user_confirmed = true, 
//            resolved_at = NOW() 
//        WHERE id = $1 
//        RETURNING *`,
//       [id]
//     );

//     res.json({ 
//       success: true, 
//       message: 'Resolution accepted. Report is now closed.',
//       report: result.rows[0] 
//     });
//   } catch (error) {
//     console.error('Error accepting resolution:', error);
//     res.status(500).json({ error: 'Failed to accept resolution' });
//   }
// };

// User rejects admin's resolution - re-raise with higher priority
// const rejectResolution = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const { reason } = req.body;
//     const userId = req.user.id;

//     if (!reason || !reason.trim()) {
//       return res.status(400).json({ error: 'Rejection reason is required' });
//     }

//     // Verify report belongs to user and is awaiting confirmation
//     const checkResult = await pool.query(
//       'SELECT * FROM reports WHERE id = $1 AND user_id = $2 AND status = $3',
//       [id, userId, 'awaiting_user_confirmation']
//     );

//     if (checkResult.rows.length === 0) {
//       return res.status(404).json({ 
//         error: 'Report not found or not awaiting confirmation' 
//       });
//     }

//     const report = checkResult.rows[0];
//     const currentReopenCount = report.reopen_count || 0;

//     // Escalate priority
//     let newPriority = report.priority;
//     if (newPriority === 'low') newPriority = 'medium';
//     else if (newPriority === 'medium') newPriority = 'high';

//     // Update report status to reopened and increment reopen count
//     const result = await pool.query(
//       `UPDATE reports 
//        SET status = 'reopened', 
//            user_confirmed = false,
//            reopen_count = $1,
//            priority = $2,
//            rejection_reason = $3,
//            resolved_at = NULL
//        WHERE id = $4 
//        RETURNING *`,
//       [currentReopenCount + 1, newPriority, reason, id]
//     );

//     res.json({ 
//       success: true, 
//       message: 'Resolution rejected. Report has been re-raised with higher priority.',
//       report: result.rows[0] 
//     });
//   } catch (error) {
//     console.error('Error rejecting resolution:', error);
//     res.status(500).json({ error: 'Failed to reject resolution' });
//   }
// };






// User accepts admin's resolution - close report
const acceptResolution = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Verify report belongs to user and is awaiting confirmation
    const checkResult = await pool.query(
      'SELECT * FROM reports WHERE id = $1 AND user_id = $2 AND status = $3',
      [id, userId, 'awaiting_user_confirmation']
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ 
        error: 'Report not found or not awaiting confirmation' 
      });
    }

    // Update status to closed
    // const result = await pool.query(
    //   `UPDATE reports 
    //    SET status = 'closed'
    //    WHERE id = $1 
    //    RETURNING *`,
    //   [id]
    // );

   const result = await pool.query(
      `UPDATE reports
       SET 
         status = 'closed',
         priority = NULL,
         resolved_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id]
    );



    res.json({ 
      success: true, 
      message: 'Resolution accepted. Report is now closed.',
      report: result.rows[0] 
    });
  } catch (error) {
    console.error('Error accepting resolution:', error);
    res.status(500).json({ error: 'Failed to accept resolution' });
  }
};

// User rejects admin's resolution - re-raise with higher priority
const rejectResolution = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const userId = req.user.id;

    if (!reason || !reason.trim()) {
      return res.status(400).json({ error: 'Rejection reason is required' });
    }

    // Verify report belongs to user and is awaiting confirmation
    const checkResult = await pool.query(
      'SELECT * FROM reports WHERE id = $1 AND user_id = $2 AND status = $3',
      [id, userId, 'awaiting_user_confirmation']
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ 
        error: 'Report not found or not awaiting confirmation' 
      });
    }

    const report = checkResult.rows[0];
    const currentReopenCount = report.reopen_count || 0;

    // Escalate priority
    let newPriority = report.priority || 'low';
    if (newPriority === 'low') newPriority = 'medium';
    else if (newPriority === 'medium') newPriority = 'high';

    // Update report status to reopened
    const result = await pool.query(
      `UPDATE reports 
       SET status = 'reopened', 
           reopen_count = $1,
           priority = $2,
           rejection_reason = $3
       WHERE id = $4 
       RETURNING *`,
      [currentReopenCount + 1, newPriority, reason, id]
    );

    res.json({ 
      success: true, 
      message: 'Resolution rejected. Report has been re-raised with higher priority.',
      report: result.rows[0] 
    });
  } catch (error) {
    console.error('Error rejecting resolution:', error);
    res.status(500).json({ error: 'Failed to reject resolution' });
  }
};






// Update report status (for admin)
const updateReportStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const result = await pool.query(
      'UPDATE reports SET status = $1 WHERE id = $2 RETURNING *',
      [status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Report not found' });
    }

    res.json({
      success: true,
      message: 'Report status updated',
      report: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating report status:', error);
    res.status(500).json({ error: 'Failed to update report status' });
  }
};


  
  module.exports = {
    createReport,
    getUserReports,  // NEW
    getReportById,   // NEW
    getUserStats,     // NEW
    acceptResolution,
    rejectResolution,
    updateReportStatus
};
