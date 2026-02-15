import db from './index.js';

// ============ CONFIG ============
/** Porcentaje por defecto al fondo del gremio (0-1). Variable FUND_PERCENTAGE_DEFAULT */
export function getDefaultFundPercentage() {
  const val = process.env.FUND_PERCENTAGE_DEFAULT;
  if (val == null || val === '') return 0.10;
  const num = parseFloat(val);
  if (isNaN(num)) return 0.10;
  return Math.max(0, Math.min(1, num > 1 ? num / 100 : num));
}

export function getGuildConfig(guildId) {
  let config = db.prepare('SELECT * FROM guild_config WHERE guild_id = ?').get(guildId);
  if (!config) {
    db.prepare(`
      INSERT INTO guild_config (guild_id) VALUES (?)
    `).run(guildId);
    config = db.prepare('SELECT * FROM guild_config WHERE guild_id = ?').get(guildId);
  }
  return config;
}

export function updateGuildConfig(guildId, updates) {
  const config = getGuildConfig(guildId);
  const fields = Object.keys(updates).filter(k => updates[k] !== undefined);
  if (fields.length === 0) return config;
  const setClause = fields.map(f => `${f} = ?`).join(', ');
  const values = [...fields.map(f => updates[f]), guildId];
  db.prepare(`UPDATE guild_config SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE guild_id = ?`).run(...values);
  return getGuildConfig(guildId);
}

// ============ USERS ============
export function getOrCreateUser(guildId, userId, discordUsername = null) {
  let user = db.prepare('SELECT * FROM users WHERE guild_id = ? AND user_id = ?').get(guildId, userId);
  if (!user) {
    db.prepare('INSERT INTO users (guild_id, user_id) VALUES (?, ?)').run(guildId, userId);
    user = db.prepare('SELECT * FROM users WHERE guild_id = ? AND user_id = ?').get(guildId, userId);
  }
  return user;
}

export function registerUser(guildId, userId, discordUsername) {
  const user = getOrCreateUser(guildId, userId);
  db.prepare(`
    UPDATE users SET discord_username = ?, registered_at = COALESCE(registered_at, CURRENT_TIMESTAMP), updated_at = CURRENT_TIMESTAMP
    WHERE guild_id = ? AND user_id = ?
  `).run(discordUsername || null, guildId, userId);
  return db.prepare('SELECT * FROM users WHERE guild_id = ? AND user_id = ?').get(guildId, userId);
}

export function getUserBalance(guildId, userId) {
  const user = getOrCreateUser(guildId, userId);
  return (user.balance ?? 0);
}

/** Cuentas corrientes con saldo > 0, ordenadas de mayor a menor */
export function getAllUserBalances(guildId) {
  return db.prepare(`
    SELECT user_id, balance FROM users
    WHERE guild_id = ? AND COALESCE(balance, 0) > 0
    ORDER BY balance DESC
  `).all(guildId);
}

export function addToBalance(guildId, userId, amount, type, reason, eventId = null, createdBy = null) {
  const user = getOrCreateUser(guildId, userId);
  const current = (user.balance ?? 0);
  const newBalance = current + amount;
  db.prepare('UPDATE users SET balance = ?, updated_at = CURRENT_TIMESTAMP WHERE guild_id = ? AND user_id = ?')
    .run(newBalance, guildId, userId);
  db.prepare(`
    INSERT INTO balance_transactions (guild_id, user_id, amount, balance_after, type, reason, event_id, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(guildId, userId, amount, newBalance, type, reason, eventId, createdBy);
  return newBalance;
}

export function deductFromBalance(guildId, userId, amount, reason, createdBy = null) {
  const user = getOrCreateUser(guildId, userId);
  const current = (user.balance ?? 0);
  const deduct = Math.min(amount, current);
  const newBalance = current - deduct;
  db.prepare('UPDATE users SET balance = ?, updated_at = CURRENT_TIMESTAMP WHERE guild_id = ? AND user_id = ?')
    .run(newBalance, guildId, userId);
  db.prepare(`
    INSERT INTO balance_transactions (guild_id, user_id, amount, balance_after, type, reason, created_by)
    VALUES (?, ?, ?, ?, 'descuento', ?, ?)
  `).run(guildId, userId, -deduct, newBalance, reason, createdBy);
  return { newBalance, deducted: deduct };
}

export function getBalanceHistory(guildId, userId, limit = 20) {
  return db.prepare(`
    SELECT * FROM balance_transactions WHERE guild_id = ? AND user_id = ?
    ORDER BY created_at DESC LIMIT ?
  `).all(guildId, userId, limit);
}

export function distributeLoot(eventId, totalLoot, attendedUserIds, guildFundPercentage = 0) {
  const event = getEvent(eventId);
  if (!event || event.guild_id == null) return null;
  const count = attendedUserIds.length;
  if (count === 0) return [];
  const guildCut = totalLoot * guildFundPercentage;
  const toDistribute = totalLoot - guildCut;
  const sharePerUser = toDistribute / count;
  const results = [];
  for (const uid of attendedUserIds) {
    const newBal = addToBalance(event.guild_id, uid, sharePerUser, 'loot', `Evento #${eventId} - ${event.activity_type}`, eventId, null);
    results.push({ userId: uid, share: sharePerUser, newBalance: newBal });
  }
  if (guildCut > 0) {
    addFundTransaction(event.guild_id, guildCut, 'ingreso', `Evento #${eventId} - parte del loot`, eventId);
  }
  db.prepare('UPDATE events SET total_profit = ? WHERE id = ?').run(totalLoot, eventId);
  return results;
}

export function addPoints(guildId, userId, points, reason, eventId = null) {
  const user = getOrCreateUser(guildId, userId);
  db.prepare('INSERT INTO point_transactions (guild_id, user_id, points, reason, event_id) VALUES (?, ?, ?, ?, ?)')
    .run(guildId, userId, points, reason, eventId);
  db.prepare(`
    UPDATE users SET total_points = total_points + ?, weekly_points = weekly_points + ?, last_activity = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
    WHERE guild_id = ? AND user_id = ?
  `).run(points, points, guildId, userId);
  return getOrCreateUser(guildId, userId);
}

export function subtractPoints(guildId, userId, points, reason) {
  const user = getOrCreateUser(guildId, userId);
  const newTotal = Math.max(0, user.total_points - points);
  const newWeekly = Math.max(0, user.weekly_points - points);
  db.prepare('INSERT INTO point_transactions (guild_id, user_id, points, reason) VALUES (?, ?, ?, ?)')
    .run(guildId, userId, -points, reason);
  db.prepare(`
    UPDATE users SET total_points = ?, weekly_points = ?, updated_at = CURRENT_TIMESTAMP
    WHERE guild_id = ? AND user_id = ?
  `).run(newTotal, newWeekly, guildId, userId);
  return getOrCreateUser(guildId, userId);
}

export function adjustPointsManual(guildId, userId, points, reason) {
  if (points >= 0) {
    return addPoints(guildId, userId, points, reason);
  } else {
    return subtractPoints(guildId, userId, Math.abs(points), reason);
  }
}

export function getPointHistory(guildId, userId, limit = 20) {
  return db.prepare(`
    SELECT * FROM point_transactions WHERE guild_id = ? AND user_id = ?
    ORDER BY created_at DESC LIMIT ?
  `).all(guildId, userId, limit);
}

export function getWeeklyRanking(guildId, limit = 10) {
  return db.prepare(`
    SELECT * FROM users WHERE guild_id = ? ORDER BY weekly_points DESC LIMIT ?
  `).all(guildId, limit);
}

export function getMonthlyRanking(guildId, limit = 10) {
  return db.prepare(`
    SELECT user_id, SUM(points) as month_points FROM point_transactions
    WHERE guild_id = ? AND created_at >= datetime('now', '-30 days') AND points > 0
    GROUP BY user_id ORDER BY month_points DESC LIMIT ?
  `).all(guildId, limit);
}

export function resetWeeklyPoints(guildId) {
  db.prepare('UPDATE users SET weekly_points = 0 WHERE guild_id = ?').run(guildId);
}

export function updateUserRank(guildId, userId, rank) {
  db.prepare('UPDATE users SET rank = ?, updated_at = CURRENT_TIMESTAMP WHERE guild_id = ? AND user_id = ?')
    .run(rank, guildId, userId);
}

// ============ EVENTS ============
const ACTIVITY_TYPES = ['Mazmorra', 'Avalonian', 'ZvZ', 'Hellgate', 'Recolección', 'Otro'];

export function getDefaultActivityPoints(guildId) {
  const config = getGuildConfig(guildId);
  const existing = db.prepare('SELECT * FROM activity_points WHERE guild_id = ?').all(guildId);
  const defaults = { Mazmorra: 5, Avalonian: 15, ZvZ: 10, Hellgate: 12, Recolección: 3, Otro: 5 };
  const result = {};
  for (const t of ACTIVITY_TYPES) {
    const row = existing.find(e => e.activity_type === t);
    result[t] = row ? row.base_points : defaults[t];
  }
  return result;
}

export function setActivityPoints(guildId, activityType, basePoints) {
  db.prepare(`
    INSERT INTO activity_points (guild_id, activity_type, base_points) VALUES (?, ?, ?)
    ON CONFLICT(guild_id, activity_type) DO UPDATE SET base_points = excluded.base_points
  `).run(guildId, activityType, basePoints);
}

export function findDuplicateEvent(guildId, activityType, scheduledAt) {
  const events = db.prepare(`
    SELECT id FROM events WHERE guild_id = ? AND activity_type = ? AND status = 'active'
    AND scheduled_at BETWEEN datetime(?, '-30 minutes') AND datetime(?, '+30 minutes')
  `).all(guildId, activityType, scheduledAt, scheduledAt);
  return events.length > 0 ? events[0] : null;
}

export function createEvent(guildId, creatorId, data) {
  const existing = findDuplicateEvent(guildId, data.activityType, data.scheduledAt);
  if (existing) return null;

  const affectsAccounting = data.affectsAccounting !== false ? 1 : 0;
  const result = db.prepare(`
    INSERT INTO events (guild_id, creator_id, activity_type, name, scheduled_at, max_participants, base_points, is_profitable, fund_percentage, leader_id, affects_accounting)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    guildId, creatorId, data.activityType, data.name || data.activityType,
    data.scheduledAt, data.maxParticipants || 8, data.basePoints,
    data.isProfitable ? 1 : 0, data.fundPercentage ?? getDefaultFundPercentage(),
    data.leaderId || null,
    affectsAccounting
  );
  return result.lastInsertRowid;
}

export function getActiveEvents(guildId) {
  return db.prepare(`
    SELECT * FROM events WHERE guild_id = ? AND status = 'active' AND scheduled_at > datetime('now')
    ORDER BY scheduled_at ASC
  `).all(guildId);
}

export function getClosableEvents(guildId) {
  return db.prepare(`
    SELECT * FROM events WHERE guild_id = ? AND status = 'active'
    ORDER BY scheduled_at DESC
  `).all(guildId);
}

/** Eventos recientes para replicar: activos + cerrados en los últimos 14 días */
export function getRecentEventsForReplicate(guildId) {
  return db.prepare(`
    SELECT * FROM events WHERE guild_id = ?
    AND (status = 'active' OR closed_at >= datetime('now', '-14 days'))
    ORDER BY scheduled_at DESC
    LIMIT 25
  `).all(guildId);
}

/** Crea un evento copiando otro (mismo tipo, cupos, puntos, participantes) con nueva fecha */
export function replicateEvent(guildId, creatorId, sourceEventId, newScheduledAt) {
  const source = getEvent(sourceEventId);
  if (!source || source.guild_id !== guildId) return null;

  const data = {
    activityType: source.activity_type,
    name: source.name,
    scheduledAt: newScheduledAt,
    maxParticipants: source.max_participants,
    basePoints: source.base_points,
    isProfitable: !!source.is_profitable,
    fundPercentage: source.fund_percentage ?? getDefaultFundPercentage(),
    leaderId: source.leader_id,
    affectsAccounting: source.affects_accounting !== 0
  };
  const eventId = createEvent(guildId, creatorId, data);
  if (!eventId) return null;

  const participants = getEventParticipants(sourceEventId);
  for (const p of participants) {
    db.prepare('INSERT INTO event_participants (event_id, user_id, is_leader) VALUES (?, ?, ?)')
      .run(eventId, p.user_id, p.is_leader || 0);
  }
  return eventId;
}

export function getEvent(eventId) {
  return db.prepare('SELECT * FROM events WHERE id = ?').get(eventId);
}

export function joinEvent(eventId, userId, guildId) {
  const event = getEvent(eventId);
  if (!event) return { ok: false, reason: 'Evento no encontrado.' };
  if (event.status !== 'active') return { ok: false, reason: 'El evento ya fue cerrado.' };
  if (guildId && event.guild_id !== guildId) return { ok: false, reason: 'Evento de otro servidor.' };
  const exists = db.prepare('SELECT 1 FROM event_participants WHERE event_id = ? AND user_id = ?').get(eventId, userId);
  if (exists) return { ok: false, reason: 'Ya estás inscrito en este evento.' };
  const count = db.prepare('SELECT COUNT(*) as c FROM event_participants WHERE event_id = ?').get(eventId).c;
  if (count >= event.max_participants) return { ok: false, reason: 'Cupos llenos.' };
  db.prepare('INSERT INTO event_participants (event_id, user_id) VALUES (?, ?)').run(eventId, userId);
  return { ok: true };
}

export function leaveEvent(eventId, userId) {
  const result = db.prepare('DELETE FROM event_participants WHERE event_id = ? AND user_id = ?').run(eventId, userId);
  return result.changes > 0;
}

export function getEventParticipants(eventId) {
  return db.prepare('SELECT * FROM event_participants WHERE event_id = ?').all(eventId);
}

export function setEventAnnouncement(eventId, channelId, messageId) {
  db.prepare(`
    INSERT OR REPLACE INTO event_announcements (event_id, channel_id, message_id) VALUES (?, ?, ?)
  `).run(eventId, channelId, messageId);
}

export function getEventAnnouncement(eventId) {
  return db.prepare('SELECT * FROM event_announcements WHERE event_id = ?').get(eventId);
}

export function closeEvent(eventId, config) {
  const event = getEvent(eventId);
  if (!event || event.status !== 'active') return null;
  db.prepare("UPDATE events SET status = 'closed', closed_at = CURRENT_TIMESTAMP WHERE id = ?").run(eventId);
  return event;
}

/** Cancela un evento (solo líderes). El evento deja de aparecer en activos. */
export function cancelEvent(eventId, guildId) {
  const event = getEvent(eventId);
  if (!event || event.guild_id !== guildId || event.status !== 'active') return false;
  db.prepare("UPDATE events SET status = 'cancelled', closed_at = CURRENT_TIMESTAMP WHERE id = ?").run(eventId);
  return true;
}

export function confirmEventParticipants(eventId, attendedUserIds, totalProfit = 0, leaderId = null) {
  const event = getEvent(eventId);
  if (!event || event.status !== 'closed') return null;
  const participants = getEventParticipants(eventId);
  const affectsAccounting = event.affects_accounting !== 0;
  const config = getGuildConfig(event.guild_id);
  const activityPoints = getDefaultActivityPoints(event.guild_id);
  const basePoints = event.base_points || activityPoints[event.activity_type] || 5;

  for (const p of participants) {
    const attended = attendedUserIds.includes(p.user_id);
    db.prepare('UPDATE event_participants SET attended = ? WHERE event_id = ? AND user_id = ?')
      .run(attended ? 1 : 0, eventId, p.user_id);

    if (affectsAccounting) {
      if (attended) {
        const points = Math.floor(basePoints * (p.is_leader ? (config.leader_multiplier || 1.5) : 1));
        addPoints(event.guild_id, p.user_id, points, `Evento #${eventId} - ${event.activity_type}`, eventId);
      } else if (config.no_show_penalty > 0) {
        subtractPoints(event.guild_id, p.user_id, config.no_show_penalty, `Falta al evento #${eventId}`);
      }
    }
  }

  if (affectsAccounting && totalProfit > 0 && attendedUserIds.length > 0) {
    db.prepare('UPDATE events SET is_profitable = 1 WHERE id = ?').run(eventId);
    const guildPct = event.fund_percentage ?? getDefaultFundPercentage();
    const guildCut = totalProfit * guildPct;
    const toDistribute = totalProfit - guildCut;
    const sharePerUser = toDistribute / attendedUserIds.length;
    for (const uid of attendedUserIds) {
      addToBalance(event.guild_id, uid, sharePerUser, 'loot', `Evento #${eventId} - ${event.activity_type}`, eventId, null);
    }
    if (guildCut > 0) {
      addFundTransaction(event.guild_id, guildCut, 'ingreso', `Evento #${eventId} - parte del loot`, eventId);
    }
    db.prepare('UPDATE events SET total_profit = ? WHERE id = ?').run(totalProfit, eventId);
  }

  return participants;
}

// ============ BENEFITS ============
export function createBenefit(guildId, data) {
  const result = db.prepare(`
    INSERT INTO benefits (guild_id, name, description, cost, requires_manual, role_id)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(guildId, data.name, data.description, data.cost, data.requiresManual ? 1 : 0, data.roleId || null);
  return result.lastInsertRowid;
}

export function getBenefits(guildId) {
  return db.prepare('SELECT * FROM benefits WHERE guild_id = ? AND active = 1 ORDER BY cost ASC').all(guildId);
}

export function getBenefit(benefitId) {
  return db.prepare('SELECT * FROM benefits WHERE id = ?').get(benefitId);
}

export function redeemBenefit(guildId, userId, benefitId) {
  const benefit = getBenefit(benefitId);
  if (!benefit || benefit.guild_id !== guildId) return { success: false, error: 'Beneficio no encontrado' };
  const user = getOrCreateUser(guildId, userId);
  if (user.total_points < benefit.cost) return { success: false, error: 'Puntos insuficientes' };

  subtractPoints(guildId, userId, benefit.cost, `Canje: ${benefit.name}`);
  db.prepare(`
    INSERT INTO benefit_redemptions (guild_id, user_id, benefit_id, status) VALUES (?, ?, ?, ?)
  `).run(guildId, userId, benefitId, benefit.requires_manual ? 'pending' : 'auto');
  return { success: true, requiresManual: !!benefit.requires_manual, benefit };
}

export function getPendingRedemptions(guildId) {
  return db.prepare(`
    SELECT br.*, b.name, b.description, b.requires_manual FROM benefit_redemptions br
    JOIN benefits b ON br.benefit_id = b.id
    WHERE br.guild_id = ? AND br.status = 'pending'
    ORDER BY br.created_at ASC
  `).all(guildId);
}

// ============ FUND ============
export function getFundBalance(guildId) {
  let fund = db.prepare('SELECT * FROM guild_fund WHERE guild_id = ?').get(guildId);
  if (!fund) {
    db.prepare('INSERT INTO guild_fund (guild_id) VALUES (?)').run(guildId);
    fund = db.prepare('SELECT * FROM guild_fund WHERE guild_id = ?').get(guildId);
  }
  return fund.balance;
}

export function addFundTransaction(guildId, amount, category, description, eventId = null, userId = null) {
  db.prepare(`
    INSERT INTO fund_transactions (guild_id, amount, category, description, event_id, user_id) VALUES (?, ?, ?, ?, ?, ?)
  `).run(guildId, amount, category, description, eventId, userId);
  const sign = category === 'ingreso' ? 1 : -1;
  db.prepare(`
    INSERT INTO guild_fund (guild_id, balance, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(guild_id) DO UPDATE SET balance = balance + ?, updated_at = CURRENT_TIMESTAMP
  `).run(guildId, sign * amount, sign * amount);
  return getFundBalance(guildId);
}

export function getFundHistory(guildId, limit = 20) {
  return db.prepare(`
    SELECT * FROM fund_transactions WHERE guild_id = ? ORDER BY created_at DESC LIMIT ?
  `).all(guildId, limit);
}

// ============ RANKS ============
export function recalculateRanks(guildId) {
  const config = getGuildConfig(guildId);
  const users = db.prepare('SELECT * FROM users WHERE guild_id = ?').all(guildId);
  for (const u of users) {
    let rank = 'recluta';
    if (u.weekly_points >= (config.rank_veterano_points || 150)) rank = 'veterano';
    else if (u.weekly_points >= (config.rank_activo_points || 50)) rank = 'miembro_activo';
    else if (u.weekly_points >= (config.rank_miembro_points || 10)) rank = 'miembro';
    db.prepare('UPDATE users SET rank = ? WHERE guild_id = ? AND user_id = ?').run(rank, guildId, u.user_id);
  }
}

// ============ STATS ============
export function getStats(guildId) {
  const eventsThisWeek = db.prepare(`
    SELECT COUNT(*) as c FROM events WHERE guild_id = ? AND created_at >= datetime('now', '-7 days')
  `).get(guildId).c;
  const totalMembers = db.prepare('SELECT COUNT(*) as c FROM users WHERE guild_id = ?').get(guildId).c;
  const inactiveUsers = db.prepare(`
    SELECT * FROM users WHERE guild_id = ? AND (last_activity IS NULL OR last_activity < datetime('now', ?))
  `).all(guildId, `-${getGuildConfig(guildId).inactive_days || 14} days`);
  const topActive = getWeeklyRanking(guildId, 10);
  return { eventsThisWeek, totalMembers, inactiveUsers, topActive };
}
