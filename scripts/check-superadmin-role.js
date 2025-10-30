/**
 * Script to check and assign superadmin role to Midport user
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'midport_query_platform.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Database connection error:', err);
    process.exit(1);
  }
  console.log('✅ Connected to database:', dbPath);
});

async function checkAndAssignSuperadminRole() {
  return new Promise((resolve, reject) => {
    // Step 1: Find the Midport user in MIDPORT_DEM tenant
    db.get(
      `SELECT id, username, tenant FROM users WHERE tenant = 'MIDPORT_DEM'`,
      [],
      (err, user) => {
        if (err) {
          console.error('❌ Error finding user:', err);
          reject(err);
          return;
        }

        if (!user) {
          console.error('❌ No user found in MIDPORT_DEM tenant');
          reject(new Error('User not found'));
          return;
        }

        console.log('✅ Found user:', user);

        // Step 2: Check if roles table exists and has superadmin role
        db.get(
          `SELECT id FROM roles WHERE name = 'superadmin'`,
          [],
          (err, role) => {
            if (err) {
              console.error('❌ Error finding superadmin role:', err);
              reject(err);
              return;
            }

            if (!role) {
              console.error('❌ Superadmin role not found in roles table');
              reject(new Error('Superadmin role not found'));
              return;
            }

            console.log('✅ Found superadmin role:', role);

            // Step 3: Check if user already has superadmin role
            db.get(
              `SELECT * FROM user_roles WHERE user_id = ? AND role_id = ?`,
              [user.id, role.id],
              (err, userRole) => {
                if (err) {
                  console.error('❌ Error checking user_roles:', err);
                  reject(err);
                  return;
                }

                if (userRole) {
                  console.log('✅ User already has superadmin role assigned');
                  resolve(true);
                  return;
                }

                // Step 4: Assign superadmin role to user
                db.run(
                  `INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)`,
                  [user.id, role.id],
                  (err) => {
                    if (err) {
                      console.error('❌ Error assigning superadmin role:', err);
                      reject(err);
                      return;
                    }

                    console.log('✅ Successfully assigned superadmin role to user');
                    
                    // Verify the assignment
                    db.all(
                      `SELECT r.name 
                       FROM roles r 
                       INNER JOIN user_roles ur ON r.id = ur.role_id 
                       WHERE ur.user_id = ?`,
                      [user.id],
                      (err, roles) => {
                        if (err) {
                          console.error('❌ Error verifying roles:', err);
                          reject(err);
                          return;
                        }

                        console.log('✅ User now has roles:', roles.map(r => r.name).join(', '));
                        resolve(true);
                      }
                    );
                  }
                );
              }
            );
          }
        );
      }
    );
  });
}

checkAndAssignSuperadminRole()
  .then(() => {
    console.log('\n✅ All done! Closing database...');
    db.close();
  })
  .catch((err) => {
    console.error('\n❌ Error:', err);
    db.close();
    process.exit(1);
  });
