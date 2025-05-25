export class Ivr {
  async fetch(endpoint) {
    return await bot.api.fetch(`https://api.ivr.fi/v2/twitch/${endpoint}`);
  }

  async getUser(user) {
    const encodedUser = encodeURIComponent(user);

    const response =
      (await this.getUserById(encodedUser)) || (await this.getUserByLogin(encodedUser));
    if (response?.id) return response;

    return null;
  }

  async getUserById(userId) {
    if (isNaN(Number(userId))) return null;

    const data = await this.fetch(`user?id=${userId}`);
    if (!data?.[0]?.id) return null;

    return data[0];
  }

  async getUserByLogin(user) {
    const data = await this.fetch(`user?login=${user}`);
    if (!data?.[0]?.id) return null;

    return data[0];
  }

  async getUsername(userId) {
    const user = await this.getUser(userId);
    return user?.login || null;
  }

  async getUserId(username) {
    const cachedName = (await bot.db.queryOne('SELECT userId FROM users WHERE username = ?', [username.toLowerCase()]))?.userId || null;
    if (cachedName) {
      return cachedName;
    }

    const user = await this.getUser(username);
    const userId = user?.id || null;

    if (userId) {
      bot.db.query('INSERT INTO users (userId, username) VALUES (?, ?) ON DUPLICATE KEY UPDATE username = VALUES(username)', [userId, username.toLowerCase()]);
    }

    return userId;
  }
}
