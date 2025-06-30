module.exports = (bot, options) => {
    const log = bot.sendLog;
    const GROUP_NAME_MEMBER = 'Member';
    const GROUP_NAME_ADMIN = 'Admin';
    const PLUGIN_OWNER_ID = 'plugin:clan-role-manager';
    const checkedUsersInClanChat = new Set();

    if (bot.clanRoleManagerListeners) {
        bot.events.removeListener('clan:player_joined', bot.clanRoleManagerListeners.onPlayerJoined);
        bot.events.removeListener('clan:player_left', bot.clanRoleManagerListeners.onPlayerLeft);
        bot.events.removeListener('clan:player_kicked', bot.clanRoleManagerListeners.onPlayerLeft);
        bot.events.removeListener('chat:message', bot.clanRoleManagerListeners.onChatMessage);
        log('[ClanRoleManager] Старые обработчики событий удалены для перезагрузки.');
    }

    async function setupRolesAndPermissions() {
        try {
            log('[ClanRoleManager] Регистрация прав и групп...');
            const memberPermissions = [
                { name: 'member.*', description: 'Все права участника клана', owner: PLUGIN_OWNER_ID },
                { name: 'member.say', description: 'Право использовать базовые команды', owner: PLUGIN_OWNER_ID }
            ];
            
            await bot.api.registerPermissions(memberPermissions);
            
            await bot.api.registerGroup({
                name: GROUP_NAME_MEMBER,
                owner: PLUGIN_OWNER_ID,
                permissions: ['member.say']
            });

            await bot.api.addPermissionsToGroup(GROUP_NAME_ADMIN, ["member.*"]);

            log('[ClanRoleManager] Права и группы успешно настроены.');

        } catch (error) {
            log(`[ClanRoleManager] Критическая ошибка при регистрации прав: ${error.message}`);
        }
    }

    setupRolesAndPermissions();


    async function grantMemberRole(username) {
        try {
            const user = await bot.api.getUser(username);
            if (user.hasGroup(GROUP_NAME_ADMIN)) {
                log(`[ClanRoleManager] Пользователь ${username} является админом, роль Member не выдается.`);
                return;
            }
            if (user.hasGroup(GROUP_NAME_MEMBER)) return;
            await user.addGroup(GROUP_NAME_MEMBER);
            log(`[ClanRoleManager] Пользователю ${username} выдана роль ${GROUP_NAME_MEMBER}.`);
        } catch (error) {
            log(`[ClanRoleManager] Ошибка при выдаче роли ${username}: ${error.message}`);
        }
    }

    async function revokeMemberRole(username) {
        try {
            const user = await bot.api.getUser(username);
            if (!user.hasGroup(GROUP_NAME_MEMBER)) return;
            await user.removeGroup(GROUP_NAME_MEMBER);
            log(`[ClanRoleManager] У пользователя ${username} отозвана роль ${GROUP_NAME_MEMBER}.`);
        } catch (error) {
            log(`[ClanRoleManager] Ошибка при отзыве роли у ${username}: ${error.message}`);
        }
    }
    
    bot.clanRoleManagerListeners = {
        onPlayerJoined: (data) => data.username && grantMemberRole(data.username),
        onPlayerLeft: (data) => data.username && revokeMemberRole(data.username),
        onChatMessage: async (data) => {
            if (data.type !== 'clan') return;
            
            const { username } = data;
            if (!username || checkedUsersInClanChat.has(username.toLowerCase())) return;

            try {
                await grantMemberRole(username);
                checkedUsersInClanChat.add(username.toLowerCase());
            } catch (error) {
                log(`[ClanRoleManager] Ошибка при проверке/выдаче роли в клан-чате для ${username}: ${error.message}`);
            }
        }
    };

    bot.events.on('clan:player_joined', bot.clanRoleManagerListeners.onPlayerJoined);
    bot.events.on('clan:player_left', bot.clanRoleManagerListeners.onPlayerLeft);
    bot.events.on('clan:player_kicked', bot.clanRoleManagerListeners.onPlayerLeft);
    bot.events.on('chat:message', bot.clanRoleManagerListeners.onChatMessage);

    bot.once('end', () => {
        if (bot.clanRoleManagerListeners) {
            bot.events.removeListener('clan:player_joined', bot.clanRoleManagerListeners.onPlayerJoined);
            bot.events.removeListener('clan:player_left', bot.clanRoleManagerListeners.onPlayerLeft);
            bot.events.removeListener('clan:player_kicked', bot.clanRoleManagerListeners.onPlayerLeft);
            bot.events.removeListener('chat:message', bot.clanRoleManagerListeners.onChatMessage);
            delete bot.clanRoleManagerListeners;
            log('[ClanRoleManager] Плагин выгружен, слушатели событий отключены.');
        }
    });

    log('[ClanRoleManager] Плагин управления ролями клана загружен и готов к работе.');
};
