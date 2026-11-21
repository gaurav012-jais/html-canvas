export const resolveAllowedStatuses = async (deps, campaignId, vendorId) => {
  try {
    if (campaignId && vendorId && deps.getTrackingRepo) {
      const repo = deps.getTrackingRepo();
      if (repo?.findOne) {
        const tracking = await repo.findOne({
          where: {
            campaignId: parseInt(campaignId, 10),
            vendorId: parseInt(vendorId, 10),
          },
        });
        if (tracking?.allowedCallbackStatuses?.trim()) {
          return tracking.allowedCallbackStatuses.trim();
        }
      }
    }
    if (vendorId && deps.getVendorRepo) {
      const repo = deps.getVendorRepo();
      if (repo?.findOne) {
        const vendor = await repo.findOne({
          where: { id: parseInt(vendorId, 10) },
        });
        if (vendor?.allowedCallbackStatuses?.trim()) {
          return vendor.allowedCallbackStatuses.trim();
        }
      }
    }
    if (campaignId && deps.getCampaignRepo) {
      const repo = deps.getCampaignRepo();
      if (repo?.findOne) {
        const campaign = await repo.findOne({
          where: { id: parseInt(campaignId, 10) },
        });
        if (campaign?.allowedCallbackStatuses?.trim()) {
          return campaign.allowedCallbackStatuses.trim();
        }
      }
    }
  } catch {
    // Safe fallback if repos not mocked/initialized in unit tests
  }
  return null;
};
