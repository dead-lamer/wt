const bcrypt = require('bcryptjs');
const { syncAndSeed } = require('../setup');
const { sequelize } = require('../../src/models');
const userDao = require('../../src/dao/UserDao');

const PASSWORDS = {
  root:  'admin_pass',
  alice: 'alice_pass',
  bob:   'bob_pass',
  eve:   'eve_pass',
};

async function systemSeed() {
  await syncAndSeed();

  for (const [login, plaintext] of Object.entries(PASSWORDS)) {
    const hash = await bcrypt.hash(plaintext, 4);
    const user = await userDao.findByLogin(login);
    if (user) {
      await userDao.updatePassword(user.userId, hash);
    }
  }
}

async function closeDb() {
  await sequelize.close();
}

module.exports = { systemSeed, closeDb, PASSWORDS };