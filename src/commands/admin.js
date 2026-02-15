import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} from 'discord.js';
import {
  getGuildConfig,
  updateGuildConfig,
  getActiveEvents,
  getEvent,
  closeEvent,
  confirmEventParticipants,
  getEventParticipants,
  joinEvent,
  createBenefit,
  addFundTransaction,
  adjustPointsManual,
  getOrCreateUser,
  getStats,
  recalculateRanks,
  deductFromBalance,
  getUserBalance,
  getDefaultFundPercentage
} from '../database/services.js';
import { PREFIX } from '../utils/components.js';

export const data = new SlashCommandBuilder()
  .setName('gremio')
  .setDescription('Comandos de administración del gremio')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addSubcommand(sc =>
    sc.setName('config').setDescription('Configurar el bot')
      .addStringOption(o => o.setName('panel_channel').setDescription('ID del canal del panel').setRequired(false))
      .addStringOption(o => o.setName('leader_roles').setDescription('IDs de roles de líder (separados por coma)').setRequired(false))
      .addNumberOption(o => o.setName('fund_pct').setDescription('% al fondo (0-1)').setRequired(false))
      .addIntegerOption(o => o.setName('no_show_penalty').setDescription('Penalización por no asistir').setRequired(false))
      .addNumberOption(o => o.setName('leader_mult').setDescription('Multiplicador por liderar').setRequired(false))
  )
  .addSubcommand(sc =>
    sc.setName('cerrar_evento').setDescription('Cerrar un evento y asignar puntos + loot')
      .addIntegerOption(o => o.setName('evento_id').setDescription('ID del evento').setRequired(true))
      .addStringOption(o => o.setName('asistieron').setDescription('IDs de usuarios que asistieron (ej: @user1 @user2)').setRequired(false))
      .addNumberOption(o => o.setName('loot').setDescription('Loot total en silver (decimales). Se reparte entre asistentes.').setRequired(false))
  )
  .addSubcommand(sc =>
    sc.setName('beneficio').setDescription('Crear un beneficio')
      .addStringOption(o => o.setName('nombre').setDescription('Nombre').setRequired(true))
      .addIntegerOption(o => o.setName('costo').setDescription('Costo en puntos').setRequired(true))
      .addStringOption(o => o.setName('descripcion').setDescription('Descripción').setRequired(false))
      .addBooleanOption(o => o.setName('manual').setDescription('Requiere aprobación manual').setRequired(false))
  )
  .addSubcommand(sc =>
    sc.setName('fondos').setDescription('Registrar movimiento de fondos')
      .addStringOption(o => o.setName('tipo').setDescription('ingreso o egreso').setRequired(true).addChoices(
        { name: 'Ingreso', value: 'ingreso' },
        { name: 'Egreso', value: 'egreso' }
      ))
      .addIntegerOption(o => o.setName('monto').setDescription('Monto en silver').setRequired(true))
      .addStringOption(o => o.setName('descripcion').setDescription('Descripción').setRequired(false))
      .addStringOption(o => o.setName('categoria').setDescription('reposicion, premio, gestion, otro').setRequired(false))
  )
  .addSubcommand(sc =>
    sc.setName('puntos').setDescription('Ajustar puntos de un usuario')
      .addUserOption(o => o.setName('usuario').setDescription('Usuario').setRequired(true))
      .addIntegerOption(o => o.setName('puntos').setDescription('Puntos (+ o -)').setRequired(true))
      .addStringOption(o => o.setName('razon').setDescription('Razón').setRequired(false))
  )
  .addSubcommand(sc =>
    sc.setName('estadisticas').setDescription('Ver estadísticas del gremio')
  )
  .addSubcommand(sc =>
    sc.setName('descontar').setDescription('Descontar de la cuenta corriente (al dar su parte en silver)')
      .addUserOption(o => o.setName('usuario').setDescription('Usuario al que diste silver').setRequired(true))
      .addNumberOption(o => o.setName('monto').setDescription('Monto descontado (silver)').setRequired(true))
      .addStringOption(o => o.setName('razon').setDescription('Ej: Evento #5, Mazmorra 15/02').setRequired(false))
  )
  .addSubcommand(sc =>
    sc.setName('agregar_participante').setDescription('Agregar una persona a un evento particular')
      .addIntegerOption(o => o.setName('evento_id').setDescription('ID del evento').setRequired(true))
      .addUserOption(o => o.setName('usuario').setDescription('Usuario a agregar al evento').setRequired(true))
  );

export async function execute(interaction) {
  const guildId = interaction.guildId;
  if (!guildId) return interaction.reply({ content: 'Solo en servidor.', ephemeral: true });

  const sub = interaction.options.getSubcommand();

  if (sub === 'config') {
    const updates = {};
    const pc = interaction.options.getString('panel_channel');
    const lr = interaction.options.getString('leader_roles');
    const fp = interaction.options.getNumber('fund_pct');
    const nsp = interaction.options.getInteger('no_show_penalty');
    const lm = interaction.options.getNumber('leader_mult');
    if (pc) updates.panel_channel_id = pc;
    if (lr) updates.leader_role_ids = lr;
    if (fp != null) updates.fund_percentage = fp;
    if (nsp != null) updates.no_show_penalty = nsp;
    if (lm != null) updates.leader_multiplier = lm;
    updateGuildConfig(guildId, updates);
    return interaction.reply({
      embeds: [new EmbedBuilder().setColor(0x57f287).setTitle('Configuración actualizada').setTimestamp()],
      ephemeral: true
    });
  }

  if (sub === 'cerrar_evento') {
    const eventId = interaction.options.getInteger('evento_id');
    const asistenStr = interaction.options.getString('asistieron') || '';
    const asistenIds = asistenStr.replace(/[<@>]/g, '').split(/\s+/).filter(Boolean);
    const loot = interaction.options.getNumber('loot') ?? 0;

    const event = getEvent(eventId);
    if (!event || event.guild_id !== guildId) {
      return interaction.reply({ content: 'Evento no encontrado.', ephemeral: true });
    }
    if (event.status !== 'active') {
      return interaction.reply({ content: 'El evento ya está cerrado.', ephemeral: true });
    }

    closeEvent(eventId, getGuildConfig(guildId));
    const participants = getEventParticipants(eventId);
    const attendedIds = asistenIds.length > 0 ? asistenIds : participants.map(p => p.user_id);
    const lootTotal = loot > 0 ? loot : 0;
    confirmEventParticipants(eventId, attendedIds, lootTotal);
    const affectsAccounting = event.affects_accounting !== 0;
    if (affectsAccounting) recalculateRanks(guildId);

    let desc = affectsAccounting
      ? `Puntos asignados a ${attendedIds.length} participantes.`
      : 'Evento cerrado (sin afectar cuentas ni puntos).';
    if (affectsAccounting && lootTotal > 0 && attendedIds.length > 0) {
      const share = (lootTotal * (1 - (event.fund_percentage ?? getDefaultFundPercentage()))) / attendedIds.length;
      desc += ` Loot repartido: ${share.toFixed(0)} silver por persona.`;
    }
    return interaction.reply({
      embeds: [new EmbedBuilder().setColor(0x57f287).setTitle('Evento cerrado').setDescription(desc).setTimestamp()],
      ephemeral: true
    });
  }

  if (sub === 'beneficio') {
    const nombre = interaction.options.getString('nombre');
    const desc = interaction.options.getString('descripcion') || '';
    const costo = interaction.options.getInteger('costo');
    const manual = interaction.options.getBoolean('manual') ?? false;
    const id = createBenefit(guildId, { name: nombre, description: desc, cost: costo, requiresManual: manual });
    return interaction.reply({
      embeds: [new EmbedBuilder().setColor(0x57f287).setTitle('Beneficio creado').setDescription(`${nombre} - ${costo} pts (ID: ${id})`).setTimestamp()],
      ephemeral: true
    });
  }

  if (sub === 'fondos') {
    const tipo = interaction.options.getString('tipo');
    const monto = interaction.options.getInteger('monto');
    const cat = interaction.options.getString('categoria') || 'otro';
    const desc = interaction.options.getString('descripcion') || `Movimiento manual - ${cat}`;
    addFundTransaction(guildId, monto, tipo === 'ingreso' ? 'ingreso' : 'egreso', desc, null, interaction.user.id);
    return interaction.reply({
      embeds: [new EmbedBuilder().setColor(0x57f287).setTitle('Fondos actualizados').setDescription(`${tipo}: ${monto} silver`).setTimestamp()],
      ephemeral: true
    });
  }

  if (sub === 'puntos') {
    const usuario = interaction.options.getUser('usuario');
    const puntos = interaction.options.getInteger('puntos');
    const razon = interaction.options.getString('razon') || 'Ajuste manual';
    adjustPointsManual(guildId, usuario.id, puntos, razon);
    const user = getOrCreateUser(guildId, usuario.id);
    return interaction.reply({
      embeds: [new EmbedBuilder().setColor(0x57f287).setTitle('Puntos ajustados').setDescription(`<@${usuario.id}> ahora tiene ${user.total_points} puntos.`).setTimestamp()],
      ephemeral: true
    });
  }

  if (sub === 'descontar') {
    const usuario = interaction.options.getUser('usuario');
    const monto = interaction.options.getNumber('monto');
    const razon = interaction.options.getString('razon') || 'Entrega de parte';
    const result = deductFromBalance(guildId, usuario.id, monto, razon, interaction.user.id);
    return interaction.reply({
      embeds: [new EmbedBuilder()
        .setColor(0x57f287)
        .setTitle('Cuenta corriente actualizada')
        .setDescription(`Se descontaron **${result.deducted.toLocaleString()}** silver de <@${usuario.id}>.\nNuevo balance: **${result.newBalance.toLocaleString()}** silver.`)
        .setTimestamp()
      ],
      ephemeral: true
    });
  }

  if (sub === 'agregar_participante') {
    const eventId = interaction.options.getInteger('evento_id');
    const usuario = interaction.options.getUser('usuario');
    const event = getEvent(eventId);
    if (!event || event.guild_id !== guildId) {
      return interaction.reply({ content: 'Evento no encontrado.', ephemeral: true });
    }
    if (event.status !== 'active') {
      return interaction.reply({ content: 'El evento ya está cerrado.', ephemeral: true });
    }
    getOrCreateUser(guildId, usuario.id);
    const result = joinEvent(eventId, usuario.id, guildId);
    if (result.ok) {
      const { updateEventAnnouncementMessage } = await import('../utils/eventAnnouncement.js');
      updateEventAnnouncementMessage(interaction.client, eventId).catch(() => {});
      return interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(0x57f287)
          .setTitle('Participante agregado')
          .setDescription(`<@${usuario.id}> fue agregado al evento #${eventId} (${event.name || event.activity_type}).`)
          .setTimestamp()
        ],
        ephemeral: true
      });
    }
    return interaction.reply({
      content: result.reason || 'No se pudo agregar al participante.',
      ephemeral: true
    });
  }

  if (sub === 'estadisticas') {
    const stats = getStats(guildId);
    const embed = new EmbedBuilder()
      .setColor(0x2d7d46)
      .setTitle('Estadísticas del gremio')
      .addFields(
        { name: 'Eventos esta semana', value: `${stats.eventsThisWeek}`, inline: true },
        { name: 'Miembros', value: `${stats.totalMembers}`, inline: true },
        { name: 'Inactivos', value: `${stats.inactiveUsers.length}`, inline: true }
      )
      .setTimestamp();
    if (stats.topActive.length > 0) {
      const list = stats.topActive.map((u, i) => `${i + 1}. <@${u.user_id}> - ${u.weekly_points} pts`).join('\n');
      embed.addFields({ name: 'Top activos', value: list, inline: false });
    }
    return interaction.reply({ embeds: [embed], ephemeral: true });
  }
}
