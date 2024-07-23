import { timeSince } from '../utils/utils.js';
import { permissions } from '../utils/permissions.js';
import { duration } from '../utils/cooldown.js';

export default {
  name: 'ping',
  description: 'pong',
  aliases: ['pong'],
  access: permissions.default,
  cooldown: duration.veryShort,
  async execute(msg, response) {
    const messages = [
      `🏓 PONG`,
      `bot uptime: ${timeSince(bot.uptime)}`,
      `channels: ${bot.channels.size}`
    ];

    return msg.sendAction(messages.join(` • `));
  }
};