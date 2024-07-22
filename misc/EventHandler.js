import config from '../config.js';
import { sendMessage } from '../utils/api/helix.js';
import { bot } from './Bot.js';
import { getUserPermission, permissions } from '../utils/permissions.js';
import { db, redis } from './Database.js';
import * as cooldown from '../utils/cooldown.js';

export class EventHandler {
  static channelChatMessage = async (event) => {
    const channelDb = await db.queryOne(
      'SELECT prefix FROM channels WHERE user_id=?',
      [event.broadcaster_user_id]
    );

    const prefix = channelDb.prefix || config.bot.prefix;

    if (!event.message.text.startsWith(prefix)) return;
    if (event.chatter_user_id === config.bot.userId) return;

    const filteredText = event.message.text.replace(/\s+/g, ' ').replace(/[^ -~]+/g, '').trim();
    const args = filteredText.slice(prefix.length).trim().split(' ');
    const commandName = args.shift().toLowerCase();

    const command = bot.commands[commandName];
    if (!command) return;

    const msg = {
      id: event.message_id,
      text: filteredText,
      prefix: prefix,
      args: args,
      command: {
        name: command.name,
        trigger: commandName
      },
      channel: {
        id: event.broadcaster_user_id,
        login: event.broadcaster_user_login,
        name: event.broadcaster_user_name
      },
      user: {
        id: event.chatter_user_id,
        login: event.chatter_user_login,
        name: event.chatter_user_name,
        perms: await getUserPermission(event.chatter_user_id, event.badges)
      },

      async send(message, reply = true) {
        const parent = reply ? event.message_id : '';
        await sendMessage(event.broadcaster_user_id, message, parent);
      }
    };

    const cooldownKey = `${redis.nc}:commands:${command.name}-${msg.user.id}`;
    const hasCooldown = cooldown.has(cooldownKey);
    if (hasCooldown && msg.user.perms < permissions.admin) return;

    if (bot.ignoredUsers.has(msg.user.id)) {
      return msg.send(`you're on the ignore-list`, true);
    }

    const access = command.access ?? 0;
    if (access > msg.user.perms) {
      return msg.send(`you don't have the required permission to execute this command`, true);
    }

    if (command.cooldown) {
      cooldown.set(cooldownKey, command.cooldown);
    }

    try {
      const responseFunction = (text, { reply = true, error = false } = {}) => ({ text, reply, error });
      const response = await command.execute(msg, responseFunction);

      if (response?.error) {
        cooldown.remove(cooldownKey);
      }

      if (response?.text) {
        const parent = response?.reply ? event.message_id : '';

        await sendMessage(event.broadcaster_user_id, response.text, parent);
      }
    } catch (e) {
      const parent = event.message_id;
      await sendMessage(event.broadcaster_user_id, `FeelsDankMan ${e}`, parent);
    }
  };
}