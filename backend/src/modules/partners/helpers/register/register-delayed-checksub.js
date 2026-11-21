import { getRepository } from '../../../../database/index.js';

export const maybeScheduleDelayedChecksub = async (row) => {
  if (!row?.id || !row?.msisdn || !row?.campaignId) return;
  try {
    const { scheduleDelayedChecksub } =
      await import('../../../flow/delayed-checksub.worker.js');
    const { ApiConfig } =
      await import('../../../../database/entities/api-config.entity.js');
    const { Campaign } =
      await import('../../../../database/entities/campaign.entity.js');

    const apiConfig = await getRepository(ApiConfig).findOne({
      where: { campaignId: parseInt(row.campaignId, 10) },
    });
    const campaign = await getRepository(Campaign).findOne({
      where: { id: parseInt(row.campaignId, 10) },
      select: ['id', 'verificationMode'],
    });

    const isOrangeBf =
      String(campaign?.verificationMode || '').toUpperCase() === 'ORANGE_BF';
    const hasChecksubUrl = isOrangeBf || Boolean(apiConfig?.subscriptionApi);

    // Universal 30-min audit checksub for all conversions where checksub is available
    if (hasChecksubUrl) {
      await scheduleDelayedChecksub({
        postbackId: row.id,
        msisdn: row.msisdn,
        campaignId: row.campaignId,
        delayMinutes: 30,
      });
    }
  } catch (err) {
    console.warn(
      '[PostbackRegister] Failed to schedule delayed checksub:',
      err.message,
    );
  }
};
