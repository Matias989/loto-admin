import { EmbedBuilder } from 'discord.js';

const COLORS = {
  primary: 0x2d7d46,
  success: 0x57f287,
  warning: 0xfee75c,
  error: 0xed4245,
  info: 0x5865f2
};

export function mainPanelEmbed(userData, guildFund, events, topWeekly, guildName, showFund = false) {
  const embed = new EmbedBuilder()
    .setColor(COLORS.primary)
    .setTitle('🏰 Panel del Gremio - ' + (guildName || 'Albion'))
    .setDescription('Sistema de gestión y organización. Usa los botones para explorar.')
    .setTimestamp();

  const isGeneric = !userData;
  const points = userData?.total_points ?? 0;
  const balance = userData?.balance ?? 0;
  const rank = userData?.rank ?? 'recluta';
  const rankLabel = { recluta: '🥉 Recluta', miembro: '🥈 Miembro', miembro_activo: '⭐ Miembro Activo', veterano: '🌟 Veterano', oficial: '👑 Oficial' }[rank] || rank;

  const fields = [
    { name: isGeneric ? '📊 Puntos' : '📊 Tus puntos', value: isGeneric ? 'Clic para ver' : `${points} pts`, inline: true },
    { name: isGeneric ? '🎖️ Rango' : '🎖️ Tu rango', value: isGeneric ? 'Clic para ver' : rankLabel, inline: true },
    { name: isGeneric ? '💳 Cuenta' : '💳 Cuenta corriente', value: isGeneric ? 'Clic para ver' : `${Number(balance).toLocaleString()} silver`, inline: true }
  ];
  if (showFund) {
    fields.push({ name: '💰 Fondo gremio', value: `${(guildFund ?? 0).toLocaleString()} silver`, inline: true });
  }
  embed.addFields(...fields);

  if (events?.length > 0) {
    const list = events.slice(0, 3).map(e => `• **${e.activity_type}** - <t:${Math.floor(new Date(e.scheduled_at).getTime() / 1000)}:f>`).join('\n');
    embed.addFields({ name: '📅 Próximos eventos', value: list || 'Ninguno', inline: false });
  }

  if (topWeekly?.length > 0) {
    const list = topWeekly.slice(0, 5).map((u, i) => `${['🥇', '🥈', '🥉', '4️⃣', '5️⃣'][i]} <@${u.user_id}> - ${u.weekly_points} pts`).join('\n');
    embed.addFields({ name: '🏆 Top semanal', value: list, inline: false });
  }

  return embed;
}

export function eventsListEmbed(events) {
  const embed = new EmbedBuilder()
    .setColor(COLORS.info)
    .setTitle('📅 Eventos Activos')
    .setDescription(events.length ? 'Selecciona un evento para unirte:' : 'No hay eventos activos en este momento.')
    .setTimestamp();
  return embed;
}

export function eventDetailEmbed(event, participants, participantCount) {
  const date = Math.floor(new Date(event.scheduled_at).getTime() / 1000);
  const embed = new EmbedBuilder()
    .setColor(COLORS.primary)
    .setTitle(`📅 ${event.activity_type}${event.name && event.name !== event.activity_type ? ': ' + event.name : ''}`)
    .setDescription(`<t:${date}:F>`)
    .addFields(
      { name: 'Cupos', value: `${participantCount}/${event.max_participants}`, inline: true },
      { name: 'Puntos base', value: `${event.base_points}`, inline: true },
      { name: 'Rentable', value: event.is_profitable ? 'Sí' : 'No', inline: true },
      { name: 'Participantes', value: participants.map(p => `<@${p.user_id}>`).join(', ') || 'Ninguno', inline: false }
    )
    .setFooter({ text: `Evento #${event.id}` })
    .setTimestamp();
  return embed;
}

export function rankingEmbed(ranking, type = 'semanal') {
  const embed = new EmbedBuilder()
    .setColor(COLORS.primary)
    .setTitle(`🏆 Ranking ${type}`)
    .setDescription(ranking.length ? 'Top participantes por actividad' : 'Aún no hay datos.')
    .setTimestamp();
  if (ranking.length > 0) {
    const list = ranking.map((u, i) => {
      const points = type === 'semanal' ? u.weekly_points : (u.month_points ?? u.total_points);
      return `${['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'][i] || (i + 1) + '.'} <@${u.user_id}> - **${points}** pts`;
    }).join('\n');
    embed.addFields({ name: '\u200b', value: list, inline: false });
  }
  return embed;
}

export function benefitsEmbed(benefits, userPoints) {
  const embed = new EmbedBuilder()
    .setColor(COLORS.success)
    .setTitle('🎁 Beneficios Disponibles')
    .setDescription(`Tus puntos: **${userPoints}**\n\nCanjea beneficios con tus puntos de actividad:`)
    .setTimestamp();
  if (benefits.length > 0) {
    embed.addFields(
      benefits.map(b => ({
        name: `${b.name} - ${b.cost} pts`,
        value: (b.description || 'Sin descripción') + (b.requires_manual ? '\n_Requiere aprobación de oficiales_' : ''),
        inline: false
      }))
    );
  } else {
    embed.addFields({ name: '\u200b', value: 'No hay beneficios configurados.', inline: false });
  }
  return embed;
}

export function userStatsEmbed(user, history, balanceHistory = []) {
  const embed = new EmbedBuilder()
    .setColor(COLORS.info)
    .setTitle(`📊 Estadísticas de <@${user.user_id}>`)
    .addFields(
      { name: 'Puntos totales', value: `${user.total_points}`, inline: true },
      { name: 'Puntos semanales', value: `${user.weekly_points}`, inline: true },
      { name: 'Rango', value: user.rank, inline: true },
      { name: '💳 Cuenta corriente', value: `${Number(user.balance ?? 0).toLocaleString()} silver`, inline: true }
    )
    .setTimestamp();
  if (history?.length > 0) {
    const list = history.slice(0, 10).map(h => `${h.points >= 0 ? '+' : ''}${h.points} - ${h.reason}`).join('\n');
    embed.addFields({ name: 'Últimas actividades (puntos)', value: list || 'Ninguna', inline: false });
  }
  if (balanceHistory?.length > 0) {
    const list = balanceHistory.slice(0, 8).map(h => {
      const s = h.amount >= 0 ? `+${Number(h.amount).toLocaleString()}` : Number(h.amount).toLocaleString();
      return `${s} - ${h.reason || h.type}`;
    }).join('\n');
    embed.addFields({ name: 'Movimientos cuenta corriente', value: list, inline: false });
  }
  return embed;
}

export function lootDistributionEmbed(event, lootTotal, sharePerPerson, fundCut, attendedIds) {
  const embed = new EmbedBuilder()
    .setColor(COLORS.success)
    .setTitle(`📦 Repartición de loot - Evento #${event.id} - ${event.activity_type}`)
    .setTimestamp();
  embed.addFields(
    { name: '💰 Loot total', value: `${Number(lootTotal).toLocaleString()} silver`, inline: true },
    { name: '👥 Participantes', value: `${attendedIds.length}`, inline: true },
    { name: '➗ Por persona', value: `${Number(sharePerPerson).toLocaleString()} silver`, inline: true }
  );
  if (fundCut > 0) {
    embed.addFields({ name: '🏛️ Al fondo del gremio', value: `${Number(fundCut).toLocaleString()} silver`, inline: false });
  }
  const participantsList = attendedIds.map(id => `<@${id}>`).join(', ');
  embed.addFields({ name: 'Participantes que recibieron loot', value: participantsList || '—', inline: false });
  return embed;
}

export function balancesEmbed(accounts) {
  const embed = new EmbedBuilder()
    .setColor(COLORS.info)
    .setTitle('💳 Cuentas corrientes')
    .setDescription('Saldo de todos los miembros, ordenado de mayor a menor.')
    .setTimestamp();
  if (!accounts?.length) {
    embed.addFields(
      { name: '\u200b', value: 'No hay cuentas con saldo.', inline: false },
      { name: 'Total en cuentas corrientes', value: '**0** silver', inline: false }
    );
    return embed;
  }
  const lines = accounts.map((a, i) => `${i + 1}. <@${a.user_id}> — **${Number(a.balance).toLocaleString()}** silver`);
  const maxFieldValue = 1024;
  let chunk = '';
  const chunks = [];
  for (const line of lines) {
    if (chunk.length + line.length + 1 > maxFieldValue && chunk) {
      chunks.push(chunk);
      chunk = '';
    }
    chunk += (chunk ? '\n' : '') + line;
  }
  if (chunk) chunks.push(chunk);
  for (let i = 0; i < chunks.length && i < 5; i++) {
    embed.addFields({ name: i === 0 ? 'Ranking' : '\u200b', value: chunks[i], inline: false });
  }
  const totalSum = accounts.reduce((sum, a) => sum + Number(a.balance), 0);
  embed.addFields({ name: 'Total en cuentas corrientes', value: `**${totalSum.toLocaleString()}** silver`, inline: false });
  embed.setFooter({ text: `${accounts.length} cuentas` });
  return embed;
}

export function fundEmbed(balance, history) {
  const embed = new EmbedBuilder()
    .setColor(COLORS.primary)
    .setTitle('💰 Fondo del Gremio')
    .addFields({ name: 'Balance actual', value: `${balance.toLocaleString()} silver`, inline: false })
    .setTimestamp();
  if (history?.length > 0) {
    const list = history.slice(0, 10).map(h => {
      const sign = h.category === 'ingreso' ? '+' : '-';
      return `${sign}${Math.abs(h.amount).toLocaleString()} - ${h.description || h.category}`;
    }).join('\n');
    embed.addFields({ name: 'Últimos movimientos', value: list, inline: false });
  }
  return embed;
}

export function rulesEmbed() {
  return new EmbedBuilder()
    .setColor(COLORS.info)
    .setTitle('📜 Reglas del Sistema')
    .setDescription(`
**Sistema de puntos**
• Ganas puntos participando en eventos del gremio.
• Los eventos rentables aportan un % al fondo del gremio.
• Liderar eventos da multiplicador de puntos.

**Rangos automáticos**
• Se asignan según tu actividad semanal.
• Recluta → Miembro → Miembro Activo → Veterano

**Beneficios**
• Canjea puntos por beneficios internos.
• Algunos requieren aprobación de oficiales.

**Transparencia**
• Todo el sistema es visible y auditable.
• El fondo del gremio muestra ingresos y gastos.

_El sistema incentiva la participación, no la controla._
    `)
    .setTimestamp();
}

export function leadershipPanelEmbed(config) {
  return new EmbedBuilder()
    .setColor(COLORS.warning)
    .setTitle('⚙️ Panel de Liderazgo')
    .setDescription('Solo visible para líderes y oficiales.')
    .addFields(
      { name: 'Ajustar puntos', value: 'Modificar puntos de un usuario manualmente', inline: true },
      { name: 'Configurar actividades', value: 'Definir puntos por tipo de evento', inline: true },
      { name: 'Gestionar beneficios', value: 'Crear, editar o eliminar beneficios', inline: true },
      { name: 'Fondo', value: 'Configurar porcentajes y ver detalle', inline: true },
      { name: 'Reiniciar ciclo', value: 'Reiniciar ranking semanal', inline: true },
      { name: 'Exportar stats', value: 'Obtener estadísticas del gremio', inline: true }
    )
    .setTimestamp();
}

export function statsEmbed(stats) {
  const embed = new EmbedBuilder()
    .setColor(COLORS.primary)
    .setTitle('📈 Estadísticas del Gremio')
    .addFields(
      { name: 'Eventos esta semana', value: `${stats.eventsThisWeek}`, inline: true },
      { name: 'Miembros registrados', value: `${stats.totalMembers}`, inline: true },
      { name: 'Usuarios inactivos', value: `${stats.inactiveUsers.length}`, inline: true }
    )
    .setTimestamp();
  if (stats.topActive.length > 0) {
    const list = stats.topActive.map((u, i) => `${i + 1}. <@${u.user_id}> - ${u.weekly_points} pts`).join('\n');
    embed.addFields({ name: 'Top 10 activos', value: list, inline: false });
  }
  if (stats.inactiveUsers.length > 0) {
    const list = stats.inactiveUsers.slice(0, 5).map(u => `<@${u.user_id}>`).join(', ');
    embed.addFields({ name: 'Inactivos recientes', value: list, inline: false });
  }
  return embed;
}

export function closeEventSelectEmbed(events) {
  return new EmbedBuilder()
    .setColor(COLORS.info)
    .setTitle('✅ Cerrar evento')
    .setDescription(events.length ? 'Selecciona el evento a cerrar:' : 'No hay eventos activos para cerrar.')
    .setTimestamp();
}

export function closeEventAttendeesEmbed(event, participants) {
  const list = participants.map(p => `<@${p.user_id}>`).join(', ') || 'Ninguno';
  return new EmbedBuilder()
    .setColor(COLORS.primary)
    .setTitle(`Evento #${event.id} - ${event.activity_type}`)
    .setDescription('Selecciona quiénes asistieron o "Todos asistieron" para confirmar participantes.')
    .addFields({ name: 'Inscritos', value: list, inline: false })
    .setTimestamp();
}

export function removeFromEventSelectEmbed(events) {
  return new EmbedBuilder()
    .setColor(COLORS.warning)
    .setTitle('➖ Quitar de evento')
    .setDescription(events.length ? 'Selecciona el evento del que quitar participantes:' : 'No hay eventos activos.')
    .setTimestamp();
}

export function replicateEventSelectEmbed(events) {
  return new EmbedBuilder()
    .setColor(COLORS.success)
    .setTitle('📋 Replicar evento')
    .setDescription(events.length
      ? 'Selecciona el evento a replicar (mismos participantes, cupos y puntos; solo cambia la fecha):'
      : 'No hay eventos recientes para replicar (activos o cerrados en los últimos 14 días).')
    .setTimestamp();
}

export function removeFromEventParticipantsEmbed(event, participants) {
  const list = participants.map(p => `<@${p.user_id}>`).join(', ') || 'Ninguno';
  return new EmbedBuilder()
    .setColor(COLORS.warning)
    .setTitle(`Evento #${event.id} - Quitar participantes`)
    .setDescription('Selecciona a quiénes quitar del evento.')
    .addFields({ name: 'Inscritos', value: list, inline: false })
    .setTimestamp();
}

export function deductSelectEmbed() {
  return new EmbedBuilder()
    .setColor(COLORS.info)
    .setTitle('💸 Descontar de cuenta corriente')
    .setDescription('Selecciona el usuario al que entregaste silver en juego.')
    .setTimestamp();
}

export function adjustPointsSelectEmbed() {
  return new EmbedBuilder()
    .setColor(COLORS.info)
    .setTitle('📊 Ajustar puntos')
    .setDescription('Selecciona el usuario al que deseas modificar puntos.')
    .setTimestamp();
}

export function fundTypeEmbed(balance = null) {
  const embed = new EmbedBuilder()
    .setColor(COLORS.info)
    .setTitle('💰 Movimiento de fondos')
    .setDescription('Registrar ingreso o egreso del fondo del gremio.')
    .setTimestamp();
  if (balance != null) {
    embed.addFields({ name: 'Balance actual', value: `${Number(balance).toLocaleString()} silver`, inline: false });
  }
  return embed;
}

export function successEmbed(title, description) {
  return new EmbedBuilder().setColor(COLORS.success).setTitle(title).setDescription(description).setTimestamp();
}

export function errorEmbed(title, description) {
  return new EmbedBuilder().setColor(COLORS.error).setTitle(title).setDescription(description).setTimestamp();
}
