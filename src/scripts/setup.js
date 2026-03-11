import { connectDB } from '../config/database.js';
import { User } from '../models/User.js';
import { Wallet } from '../models/Wallet.js';
import bcrypt from 'bcryptjs';

// Create default admin user
export const createDefaultAdmin = async () => {
  try {
    await connectDB();
    
    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: 'admin@hostel.com' });
    if (existingAdmin) {
      console.log('Default admin user already exists');
      return;
    }

    // Create default admin
    const admin = new User({
      name: 'System Administrator',
      email: 'admin@hostel.com',
      phone: '+8801000000000',
      password_hash: 'admin123',
      role: 'admin',
      room_number: 'Office'
    });

    await admin.save();

    // Create wallet for admin
    await Wallet.create({ user_id: admin.id, balance: 0 });

    console.log('✅ Default admin user created successfully');
    console.log('📧 Email: admin@hostel.com');
    console.log('🔑 Password: admin123');
    console.log('⚠️  Please change the default password after first login');

  } catch (error) {
    console.error('Error creating default admin:', error);
  } finally {
    process.exit(0);
  }
};

// Create sample users for testing
export const createSampleUsers = async () => {
  try {
    await connectDB();
    
    const sampleUsers = [
      {
        name: 'John Doe',
        email: 'john@hostel.com',
        phone: '+8801000000001',
        password_hash: 'user123',
        role: 'user',
        room_number: 'A101'
      },
      {
        name: 'Jane Smith',
        email: 'jane@hostel.com',
        phone: '+8801000000002',
        password_hash: 'user123',
        role: 'user',
        room_number: 'A102'
      },
      {
        name: 'Mike Johnson',
        email: 'mike@hostel.com',
        phone: '+8801000000003',
        password_hash: 'manager123',
        role: 'manager',
        room_number: 'Office'
      },
      {
        name: 'Sarah Wilson',
        email: 'sarah@hostel.com',
        phone: '+8801000000004',
        password_hash: 'meal123',
        role: 'meal_manager',
        room_number: 'Kitchen'
      }
    ];

    for (const userData of sampleUsers) {
      const existingUser = await User.findOne({ email: userData.email });
      if (!existingUser) {
        const user = new User(userData);
        await user.save();
        
        // Create wallet for user
        await Wallet.create({ user_id: user.id, balance: 1000 });
        
        console.log(`✅ Created user: ${userData.name} (${userData.email})`);
      } else {
        console.log(`⚠️  User already exists: ${userData.email}`);
      }
    }

    console.log('🎉 Sample users created successfully');

  } catch (error) {
    console.error('Error creating sample users:', error);
  } finally {
    process.exit(0);
  }
};

// Clear all data (for development)
export const clearAllData = async () => {
  try {
    await connectDB();
    
    console.log('⚠️  This will delete all data from the database');
    console.log('Type "DELETE" to confirm:');
    
    process.stdin.resume();
    process.stdin.setEncoding('utf8');
    
    process.stdin.on('data', async (data) => {
      if (data.trim() === 'DELETE') {
        try {
          await User.deleteMany({});
          await Wallet.deleteMany({});
          // Add other models here as needed
          
          console.log('🗑️  All data deleted successfully');
        } catch (error) {
          console.error('Error deleting data:', error);
        }
      } else {
        console.log('❌ Operation cancelled');
      }
      process.exit(0);
    });

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

// Command line interface
const command = process.argv[2];

switch (command) {
  case 'create-admin':
    createDefaultAdmin();
    break;
  case 'create-sample-users':
    createSampleUsers();
    break;
  case 'clear-data':
    clearAllData();
    break;
  default:
    console.log('Available commands:');
    console.log('  node scripts/setup.js create-admin      - Create default admin user');
    console.log('  node scripts/setup.js create-sample-users - Create sample users for testing');
    console.log('  node scripts/setup.js clear-data         - Clear all data (development only)');
    process.exit(0);
}
