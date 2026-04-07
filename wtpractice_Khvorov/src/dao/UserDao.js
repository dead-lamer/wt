const { User, Topic, Message } = require('../models');

class UserDao {
  async createUser(login, password, role = 'user') {
    return User.create({ login, password, role });
  }

  async findByLogin(login) {
    return User.findOne({ where: { login } });
  }

  async findById(id) {
    return User.findByPk(id);
  }

  // фильтрация: role, isBlocked
  async findAll(filters = {}) {
    const where = {};
    if (filters.role) where.role = filters.role;
    if (filters.isBlocked !== undefined) where.isBlocked = filters.isBlocked;
    return User.findAll({ where, order: [['registeredAt', 'ASC']] });
  }

  async updateRole(userId, newRole) {
    const user = await User.findByPk(userId);
    if (!user) return null;
    user.role = newRole;
    await user.save();
    return user;
  }

  async setBlocked(userId, isBlocked) {
    const user = await User.findByPk(userId);
    if (!user) return null;
    user.isBlocked = isBlocked;
    await user.save();
    return user;
  }

  async updatePassword(userId, newPassword) {
    const user = await User.findByPk(userId);
    if (!user) return null;
    user.password = newPassword;
    await user.save();
    return user;
  }

  // todo: потом можно вынести в отдельный StatsDao
  async getUserStats(userId) {
    const user = await User.findByPk(userId);
    if (!user) return null;

    const [messageCount, topicCount] = await Promise.all([
      Message.count({ where: { userId } }),
      Topic.count({ where: { userId } })
    ]);

    return {
      userId: user.userId,
      login: user.login,
      messageCount,
      topicCount
    };
  }
}

module.exports = new UserDao();
