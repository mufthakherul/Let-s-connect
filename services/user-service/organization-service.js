/**
 * Organization and Team Management Service
 * Multi-tenant architecture with workspace management
 */

const { DataTypes, Op } = require('sequelize');

/**
 * Initialize organization models
 */
function initializeOrganizationModels(sequelize) {
  // Organization Model
  const Organization = sequelize.define('Organization', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING(200),
      allowNull: false
    },
    slug: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: 'URL-friendly identifier'
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    logo: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    website: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    industry: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    size: {
      type: DataTypes.ENUM('1-10', '11-50', '51-200', '201-500', '501-1000', '1000+'),
      allowNull: true
    },
    ownerId: {
      type: DataTypes.UUID,
      allowNull: false,
      comment: 'Primary owner of the organization'
    },
    parentId: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: 'Parent organization for hierarchy'
    },
    settings: {
      type: DataTypes.JSONB,
      defaultValue: {},
      comment: 'Organization-specific settings'
    },
    features: {
      type: DataTypes.JSONB,
      defaultValue: {},
      comment: 'Enabled features for this organization'
    },
    limits: {
      type: DataTypes.JSONB,
      defaultValue: {
        maxUsers: 100,
        maxTeams: 10,
        maxWorkspaces: 20,
        maxStorage: 10737418240 // 10 GB
      },
      comment: 'Resource limits'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    plan: {
      type: DataTypes.ENUM('free', 'starter', 'professional', 'enterprise'),
      defaultValue: 'free'
    },
    billingEmail: {
      type: DataTypes.STRING(255),
      allowNull: true
    }
  });

  // Team Model
  const Team = sequelize.define('Team', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    organizationId: {
      type: DataTypes.UUID,
      allowNull: false
    },
    name: {
      type: DataTypes.STRING(200),
      allowNull: false
    },
    slug: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: 'URL-friendly identifier (unique within org)'
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    icon: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    parentTeamId: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: 'Parent team for hierarchy'
    },
    managerId: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: 'Team manager/lead'
    },
    settings: {
      type: DataTypes.JSONB,
      defaultValue: {},
      comment: 'Team-specific settings'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  });

  // Organization Member Model
  const OrganizationMember = sequelize.define('OrganizationMember', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    organizationId: {
      type: DataTypes.UUID,
      allowNull: false
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false
    },
    role: {
      type: DataTypes.ENUM('owner', 'admin', 'member', 'guest'),
      defaultValue: 'member'
    },
    customRoleId: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: 'Custom role if not using default roles'
    },
    joinedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    invitedBy: {
      type: DataTypes.UUID,
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('active', 'pending', 'suspended'),
      defaultValue: 'active'
    }
  });

  // Team Member Model
  const TeamMember = sequelize.define('TeamMember', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    teamId: {
      type: DataTypes.UUID,
      allowNull: false
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false
    },
    role: {
      type: DataTypes.ENUM('lead', 'member', 'viewer'),
      defaultValue: 'member'
    },
    joinedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  });

  // Workspace Model
  const Workspace = sequelize.define('Workspace', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    organizationId: {
      type: DataTypes.UUID,
      allowNull: false
    },
    name: {
      type: DataTypes.STRING(200),
      allowNull: false
    },
    slug: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: 'URL-friendly identifier'
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    icon: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    ownerId: {
      type: DataTypes.UUID,
      allowNull: false
    },
    visibility: {
      type: DataTypes.ENUM('private', 'team', 'organization', 'public'),
      defaultValue: 'team'
    },
    settings: {
      type: DataTypes.JSONB,
      defaultValue: {},
      comment: 'Workspace-specific settings'
    },
    templateId: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: 'Template used to create this workspace'
    },
    isArchived: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    archivedAt: {
      type: DataTypes.DATE,
      allowNull: true
    }
  });

  // Workspace Member Model
  const WorkspaceMember = sequelize.define('WorkspaceMember', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    workspaceId: {
      type: DataTypes.UUID,
      allowNull: false
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: 'Individual user'
    },
    teamId: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: 'Entire team'
    },
    role: {
      type: DataTypes.ENUM('admin', 'editor', 'viewer'),
      defaultValue: 'viewer'
    },
    joinedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  });

  // Workspace Template Model
  const WorkspaceTemplate = sequelize.define('WorkspaceTemplate', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING(200),
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    icon: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    category: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'e.g., Project Management, Engineering, Marketing'
    },
    config: {
      type: DataTypes.JSONB,
      defaultValue: {},
      comment: 'Template configuration'
    },
    isPublic: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: true
    },
    usageCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    }
  });

  // Custom Role Model
  const CustomRole = sequelize.define('CustomRole', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    organizationId: {
      type: DataTypes.UUID,
      allowNull: false
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    permissions: {
      type: DataTypes.JSONB,
      defaultValue: [],
      comment: 'Array of permission strings'
    },
    inheritsFrom: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: 'Parent role for inheritance'
    },
    priority: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Role priority for conflict resolution'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  });

  // Set up associations
  Organization.hasMany(Team, { foreignKey: 'organizationId', as: 'teams' });
  Team.belongsTo(Organization, { foreignKey: 'organizationId' });

  Organization.hasMany(OrganizationMember, { foreignKey: 'organizationId', as: 'members' });
  OrganizationMember.belongsTo(Organization, { foreignKey: 'organizationId' });

  Team.hasMany(TeamMember, { foreignKey: 'teamId', as: 'members' });
  TeamMember.belongsTo(Team, { foreignKey: 'teamId' });

  Organization.hasMany(Workspace, { foreignKey: 'organizationId', as: 'workspaces' });
  Workspace.belongsTo(Organization, { foreignKey: 'organizationId' });

  Workspace.hasMany(WorkspaceMember, { foreignKey: 'workspaceId', as: 'members' });
  WorkspaceMember.belongsTo(Workspace, { foreignKey: 'workspaceId' });

  Organization.hasMany(CustomRole, { foreignKey: 'organizationId', as: 'customRoles' });
  CustomRole.belongsTo(Organization, { foreignKey: 'organizationId' });

  return {
    Organization,
    Team,
    OrganizationMember,
    TeamMember,
    Workspace,
    WorkspaceMember,
    WorkspaceTemplate,
    CustomRole
  };
}

/**
 * Organization Service Class
 */
class OrganizationService {
  constructor(models) {
    this.Organization = models.Organization;
    this.Team = models.Team;
    this.OrganizationMember = models.OrganizationMember;
    this.TeamMember = models.TeamMember;
    this.Workspace = models.Workspace;
    this.WorkspaceMember = models.WorkspaceMember;
    this.WorkspaceTemplate = models.WorkspaceTemplate;
    this.CustomRole = models.CustomRole;
  }

  /**
   * Create organization
   */
  async createOrganization(data, ownerId) {
    const organization = await this.Organization.create({
      ...data,
      ownerId
    });

    // Add owner as member
    await this.OrganizationMember.create({
      organizationId: organization.id,
      userId: ownerId,
      role: 'owner'
    });

    return organization;
  }

  /**
   * Get organization hierarchy
   */
  async getOrganizationHierarchy(organizationId) {
    const organization = await this.Organization.findByPk(organizationId);
    if (!organization) return null;

    // Get children organizations
    const children = await this.Organization.findAll({
      where: { parentId: organizationId }
    });

    // Recursively get hierarchy
    const childrenWithHierarchy = await Promise.all(
      children.map(child => this.getOrganizationHierarchy(child.id))
    );

    return {
      ...organization.toJSON(),
      children: childrenWithHierarchy
    };
  }

  /**
   * Check user permission in organization
   */
  async checkPermission(userId, organizationId, permission) {
    const member = await this.OrganizationMember.findOne({
      where: { userId, organizationId, status: 'active' }
    });

    if (!member) return false;

    // Owner and admin have all permissions
    if (member.role === 'owner' || member.role === 'admin') {
      return true;
    }

    // Check custom role permissions
    if (member.customRoleId) {
      const customRole = await this.CustomRole.findByPk(member.customRoleId);
      if (customRole && customRole.permissions.includes(permission)) {
        return true;
      }

      // Check inherited permissions
      if (customRole && customRole.inheritsFrom) {
        return this.checkInheritedPermission(customRole.inheritsFrom, permission);
      }
    }

    return false;
  }

  /**
   * Check inherited permissions
   */
  async checkInheritedPermission(roleId, permission) {
    const role = await this.CustomRole.findByPk(roleId);
    if (!role) return false;

    if (role.permissions.includes(permission)) {
      return true;
    }

    if (role.inheritsFrom) {
      return this.checkInheritedPermission(role.inheritsFrom, permission);
    }

    return false;
  }

  /**
   * Create workspace from template
   */
  async createWorkspaceFromTemplate(templateId, organizationId, ownerId, customData = {}) {
    const template = await this.WorkspaceTemplate.findByPk(templateId);
    if (!template) {
      throw new Error('Template not found');
    }

    // Increment usage count
    await template.increment('usageCount');

    // Create workspace with template config
    const workspace = await this.Workspace.create({
      organizationId,
      ownerId,
      name: customData.name || template.name,
      slug: customData.slug || this.generateSlug(customData.name || template.name),
      description: customData.description || template.description,
      icon: customData.icon || template.icon,
      templateId,
      settings: { ...template.config, ...customData.settings }
    });

    // Add owner as admin
    await this.WorkspaceMember.create({
      workspaceId: workspace.id,
      userId: ownerId,
      role: 'admin'
    });

    return workspace;
  }

  /**
   * Get workspace analytics
   */
  async getWorkspaceAnalytics(workspaceId) {
    const workspace = await this.Workspace.findByPk(workspaceId);
    if (!workspace) return null;

    const members = await this.WorkspaceMember.findAll({
      where: { workspaceId }
    });

    // Calculate analytics (simplified)
    return {
      workspaceId,
      name: workspace.name,
      memberCount: members.length,
      adminCount: members.filter(m => m.role === 'admin').length,
      editorCount: members.filter(m => m.role === 'editor').length,
      viewerCount: members.filter(m => m.role === 'viewer').length,
      createdAt: workspace.createdAt,
      lastActivity: new Date()
    };
  }

  /**
   * Cross-workspace search
   */
  async crossWorkspaceSearch(userId, query, options = {}) {
    // Get all workspaces accessible to user
    const userWorkspaces = await this.WorkspaceMember.findAll({
      where: { userId },
      include: [{
        model: this.Workspace,
        as: 'workspace',
        where: { isArchived: false }
      }]
    });

    const workspaceIds = userWorkspaces.map(w => w.workspaceId);

    // Search across workspaces
    const results = await this.Workspace.findAll({
      where: {
        id: { [Op.in]: workspaceIds },
        [Op.or]: [
          { name: { [Op.iLike]: `%${query}%` } },
          { description: { [Op.iLike]: `%${query}%` } }
        ]
      },
      limit: options.limit || 20
    });

    return results;
  }

  /**
   * Generate unique slug
   */
  generateSlug(name) {
    return name.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
}

module.exports = {
  initializeOrganizationModels,
  OrganizationService
};
