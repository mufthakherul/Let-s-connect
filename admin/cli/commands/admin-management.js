/**
 * Enhanced CLI Admin Commands
 * Phase 8: CLI Admin Panel Improvements
 *
 * New commands:
 * - admin:list - List all admins with table
 * - admin:create - Interactive admin creation
 * - admin:disable - Disable admin account
 * - admin:enable - Enable admin account
 * - admin:logs - View admin activity logs
 * - admin:verify - Verify admin status
 */

const Table = require('cli-table3');
const chalk = require('chalk');
const inquirer = require('inquirer');
const ora = require('ora');

/**
 * List all admin users
 */
async function listAdmins(adminService) {
  const spinner = ora('Fetching admin users...').start();

  try {
    const admins = await adminService.getAllAdmins();
    spinner.succeed('Admin users fetched');

    if (admins.length === 0) {
      console.log(chalk.yellow('\nNo admin users found.'));
      return;
    }

    const table = new Table({
      head: [
        chalk.cyan('ID'),
        chalk.cyan('Username'),
        chalk.cyan('Email'),
        chalk.cyan('Role'),
        chalk.cyan('Status'),
        chalk.cyan('Last Login'),
        chalk.cyan('Created')
      ],
      colWidths: [38, 20, 30, 12, 10, 20, 20]
    });

    admins.forEach(admin => {
      const status = admin.isActive
        ? chalk.green('Active')
        : chalk.red('Disabled');

      const lastLogin = admin.lastLoginAt
        ? new Date(admin.lastLoginAt).toLocaleString()
        : chalk.gray('Never');

      const created = new Date(admin.createdAt).toLocaleDateString();

      table.push([
        admin.id.slice(0, 8) + '...',
        admin.username,
        admin.email || chalk.gray('N/A'),
        getRoleColor(admin.role),
        status,
        lastLogin,
        created
      ]);
    });

    console.log('\n' + table.toString());
    console.log(chalk.gray(`\nTotal: ${admins.length} admin(s)\n`));

  } catch (error) {
    spinner.fail('Failed to fetch admins');
    console.error(chalk.red('Error:'), error.message);
  }
}

/**
 * Create new admin interactively
 */
async function createAdmin(adminService) {
  console.log(chalk.bold.cyan('\n=== Create New Admin ===\n'));

  try {
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'username',
        message: 'Username:',
        validate: input => input.trim().length >= 3 || 'Username must be at least 3 characters'
      },
      {
        type: 'input',
        name: 'email',
        message: 'Email:',
        validate: input => {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          return emailRegex.test(input) || 'Invalid email format';
        }
      },
      {
        type: 'password',
        name: 'password',
        message: 'Password:',
        validate: input => input.length >= 8 || 'Password must be at least 8 characters'
      },
      {
        type: 'list',
        name: 'role',
        message: 'Role:',
        choices: [
          { name: chalk.red('Master (Full access)'), value: 'master' },
          { name: chalk.yellow('Admin (Standard access)'), value: 'admin' },
          { name: chalk.blue('Viewer (Read-only)'), value: 'viewer' }
        ]
      },
      {
        type: 'confirm',
        name: 'confirm',
        message: 'Create this admin?',
        default: false
      }
    ]);

    if (!answers.confirm) {
      console.log(chalk.yellow('\nAdmin creation cancelled.\n'));
      return;
    }

    const spinner = ora('Creating admin...').start();

    const newAdmin = await adminService.createAdmin({
      username: answers.username,
      email: answers.email,
      password: answers.password,
      role: answers.role
    });

    spinner.succeed('Admin created successfully');

    console.log(chalk.green('\n✓ Admin created:'));
    console.log(chalk.gray('  ID:'), newAdmin.id);
    console.log(chalk.gray('  Username:'), newAdmin.username);
    console.log(chalk.gray('  Email:'), newAdmin.email);
    console.log(chalk.gray('  Role:'), getRoleColor(newAdmin.role));
    console.log();

  } catch (error) {
    console.error(chalk.red('\n✗ Failed to create admin:'), error.message);
  }
}

/**
 * Disable admin account
 */
async function disableAdmin(adminService, adminId) {
  if (!adminId) {
    console.log(chalk.yellow('Usage: admin:disable <admin-id>'));
    return;
  }

  const spinner = ora(`Disabling admin ${adminId}...`).start();

  try {
    await adminService.updateAdmin(adminId, { isActive: false });
    spinner.succeed(`Admin ${adminId} disabled`);
  } catch (error) {
    spinner.fail('Failed to disable admin');
    console.error(chalk.red('Error:'), error.message);
  }
}

/**
 * Enable admin account
 */
async function enableAdmin(adminService, adminId) {
  if (!adminId) {
    console.log(chalk.yellow('Usage: admin:enable <admin-id>'));
    return;
  }

  const spinner = ora(`Enabling admin ${adminId}...`).start();

  try {
    await adminService.updateAdmin(adminId, { isActive: true });
    spinner.succeed(`Admin ${adminId} enabled`);
  } catch (error) {
    spinner.fail('Failed to enable admin');
    console.error(chalk.red('Error:'), error.message);
  }
}

/**
 * View admin activity logs
 */
async function viewAdminLogs(adminService, adminId) {
  if (!adminId) {
    console.log(chalk.yellow('Usage: admin:logs <admin-id>'));
    return;
  }

  const spinner = ora('Fetching logs...').start();

  try {
    const logs = await adminService.getAdminLogs(adminId);
    spinner.succeed('Logs fetched');

    if (logs.length === 0) {
      console.log(chalk.yellow('\nNo logs found for this admin.\n'));
      return;
    }

    const table = new Table({
      head: [
        chalk.cyan('Timestamp'),
        chalk.cyan('Action'),
        chalk.cyan('IP Address'),
        chalk.cyan('Status')
      ],
      colWidths: [25, 30, 20, 15]
    });

    logs.forEach(log => {
      const status = log.success
        ? chalk.green('Success')
        : chalk.red('Failed');

      table.push([
        new Date(log.timestamp).toLocaleString(),
        log.action,
        log.ip || chalk.gray('N/A'),
        status
      ]);
    });

    console.log('\n' + table.toString());
    console.log(chalk.gray(`\nTotal: ${logs.length} log(s)\n`));

  } catch (error) {
    spinner.fail('Failed to fetch logs');
    console.error(chalk.red('Error:'), error.message);
  }
}

/**
 * Verify admin status
 */
async function verifyAdmin(adminService, adminId) {
  if (!adminId) {
    console.log(chalk.yellow('Usage: admin:verify <admin-id>'));
    return;
  }

  const spinner = ora('Verifying admin...').start();

  try {
    const admin = await adminService.getAdmin(adminId);
    spinner.succeed('Admin verified');

    console.log(chalk.bold.cyan('\n=== Admin Details ===\n'));
    console.log(chalk.gray('ID:'), admin.id);
    console.log(chalk.gray('Username:'), admin.username);
    console.log(chalk.gray('Email:'), admin.email || chalk.gray('N/A'));
    console.log(chalk.gray('Role:'), getRoleColor(admin.role));
    console.log(chalk.gray('Status:'), admin.isActive ? chalk.green('Active') : chalk.red('Disabled'));
    console.log(chalk.gray('Last Login:'), admin.lastLoginAt ? new Date(admin.lastLoginAt).toLocaleString() : chalk.gray('Never'));
    console.log(chalk.gray('Created:'), new Date(admin.createdAt).toLocaleString());
    console.log(chalk.gray('Updated:'), new Date(admin.updatedAt).toLocaleString());

    if (admin.failedLoginAttempts > 0) {
      console.log(chalk.yellow('\n⚠ Failed Login Attempts:'), admin.failedLoginAttempts);
    }

    if (admin.lockedUntil && new Date(admin.lockedUntil) > new Date()) {
      console.log(chalk.red('\n🔒 Account Locked Until:'), new Date(admin.lockedUntil).toLocaleString());
    }

    console.log();

  } catch (error) {
    spinner.fail('Failed to verify admin');
    console.error(chalk.red('Error:'), error.message);
  }
}

/**
 * Helper: Get colored role text
 */
function getRoleColor(role) {
  switch (role) {
    case 'master':
      return chalk.red.bold('Master');
    case 'admin':
      return chalk.yellow('Admin');
    case 'viewer':
      return chalk.blue('Viewer');
    default:
      return role;
  }
}

module.exports = {
  listAdmins,
  createAdmin,
  disableAdmin,
  enableAdmin,
  viewAdminLogs,
  verifyAdmin
};
