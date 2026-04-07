const { syncAndSeed } = require('./setup');
const userDao = require('../src/dao/UserDao');

beforeEach(async () => {
  await syncAndSeed();
});

describe('UserDao', () => {

  describe('createUser', () => {
    it('создает пользователя с корректными данными', async () => {
      const user = await userDao.createUser('newuser', 'securepass123');

      expect(user.userId).toBeDefined();
      expect(user.login).toBe('newuser');
      expect(user.password).toBe('securepass123');
      expect(user.role).toBe('user');
      expect(user.isBlocked).toBe(false);
      expect(user.registeredAt).toBeDefined();
    });

    test('создает модератора при указании роли', async () => {
      const user = await userDao.createUser('mod', 'modpass', 'moderator');

      expect(user.role).toBe('moderator');
      expect(user.login).toBe('mod');
    });

    test('дубликат логина — ошибка', async () => {
      await expect(
        userDao.createUser('root', 'otherpass')
      ).rejects.toThrow();
    });

    test('выбрасывает ошибку при невалидной роли', async () => {
      await expect(
        userDao.createUser('hacker', 'pass', 'admin')
      ).rejects.toThrow();
    });
  });

  describe('findByLogin', () => {
    it('возвращает пользователя по логину', async () => {
      const user = await userDao.findByLogin('alice');

      expect(user).not.toBeNull();
      expect(user.userId).toBe(2);
      expect(user.login).toBe('alice');
      expect(user.password).toBe('hashed+salt_alice_pass');
      expect(user.role).toBe('user');
      expect(user.isBlocked).toBe(false);
    });

    it('null если логин не найден', async () => {
      const user = await userDao.findByLogin('nonexistent');
      expect(user).toBeNull();
    });
  });

  describe('findById', () => {
    it('возвращает пользователя по id', async () => {
      const user = await userDao.findById(1);

      expect(user).not.toBeNull();
      expect(user.userId).toBe(1);
      expect(user.login).toBe('root');
      expect(user.role).toBe('moderator');
    });

    it('null если id не существует', async () => {
      const user = await userDao.findById(999);
      expect(user).toBeNull();
    });
  });

  describe('findAll', () => {
    test('возвращает всех пользователей', async () => {
      const users = await userDao.findAll();

      expect(users).toHaveLength(4);
      expect(users[0].login).toBe('root');
      expect(users[3].login).toBe('eve');
    });

    test('фильтр по роли', async () => {
      const moderators = await userDao.findAll({ role: 'moderator' });

      expect(moderators).toHaveLength(2);
      expect(moderators[0].login).toBe('root');
      expect(moderators[1].login).toBe('eve');
    });

    test('фильтр по блокировке', async () => {
      await userDao.setBlocked(3, true);

      const blocked = await userDao.findAll({ isBlocked: true });
      expect(blocked).toHaveLength(1);
      expect(blocked[0].login).toBe('bob');

      const active = await userDao.findAll({ isBlocked: false });
      expect(active).toHaveLength(3);
    });
  });

  describe('updateRole', () => {
    test('меняет роль user -> moderator', async () => {
      const user = await userDao.updateRole(2, 'moderator');

      expect(user).not.toBeNull();
      expect(user.userId).toBe(2);
      expect(user.role).toBe('moderator');

      const fromDb = await userDao.findById(2);
      expect(fromDb.role).toBe('moderator');
    });

    test('меняет роль moderator -> user', async () => {
      const user = await userDao.updateRole(1, 'user');

      expect(user.role).toBe('user');
    });

    test('null если пользователя нет', async () => {
      const result = await userDao.updateRole(999, 'moderator');
      expect(result).toBeNull();
    });

    test('выбрасывает ошибку при невалидной роли', async () => {
      await expect(
        userDao.updateRole(2, 'superadmin')
      ).rejects.toThrow();
    });
  });

  describe('setBlocked', () => {
    test('блокирует пользователя', async () => {
      const user = await userDao.setBlocked(2, true);

      expect(user.isBlocked).toBe(true);

      const fromDb = await userDao.findById(2);
      expect(fromDb.isBlocked).toBe(true);
    });

    it('разблокировка', async () => {
      await userDao.setBlocked(2, true);
      const user = await userDao.setBlocked(2, false);

      expect(user.isBlocked).toBe(false);
    });

    test('null если пользователь не найден', async () => {
      const result = await userDao.setBlocked(999, true);
      expect(result).toBeNull();
    });
  });

  describe('updatePassword', () => {
    it('обновляет пароль', async () => {
      const user = await userDao.updatePassword(2, 'new_secure_password');

      expect(user.password).toBe('new_secure_password');

      const fromDb = await userDao.findById(2);
      expect(fromDb.password).toBe('new_secure_password');
    });

    test('null если id не существует', async () => {
      const result = await userDao.updatePassword(999, 'pass');
      expect(result).toBeNull();
    });
  });

  describe('getUserStats', () => {
    it('возвращает статистику пользователя', async () => {
      // alice: 1 тема, 2 сообщения
      const stats = await userDao.getUserStats(2);

      expect(stats).not.toBeNull();
      expect(stats.userId).toBe(2);
      expect(stats.login).toBe('alice');
      expect(stats.messageCount).toBe(2);
      expect(stats.topicCount).toBe(1);
    });

    it('нулевая статистика для нового пользователя', async () => {
      await userDao.createUser('lurker', 'pass');
      const newUser = await userDao.findByLogin('lurker');
      const stats = await userDao.getUserStats(newUser.userId);

      expect(stats.messageCount).toBe(0);
      expect(stats.topicCount).toBe(0);
    });

    test('возвращает null для несуществующего пользователя', async () => {
      const stats = await userDao.getUserStats(999);
      expect(stats).toBeNull();
    });
  });

});
