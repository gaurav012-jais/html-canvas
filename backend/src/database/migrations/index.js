import { InitialSchema1730000000000 } from './1730000000000-InitialSchema.js';
import { AddOtpRequests1760000000001 } from './1760000000001-AddOtpRequests.js';
import { AddOtpConfigAndColumns1760000000002 } from './1760000000002-AddOtpConfigAndColumns.js';
import { AddPartnersFlowAndAttribution1770000000000 } from './1770000000000-AddPartnersFlowAndAttribution.js';
import { CampaignMultipleVendors1780000000000 } from './1780000000000-CampaignMultipleVendors.js';
import { CampaignTrackings1780000000001 } from './1780000000001-CampaignTrackings.js';
import { MarketsCountryOperator1790000000000 } from './1790000000000-MarketsCountryOperator.js';
import { CampaignTrackingActive1800000000000 } from './1800000000000-CampaignTrackingActive.js';
import { SchemaCleanup1810000000000 } from './1810000000000-SchemaCleanup.js';
import { AddPostbacksAndHe1820000000000 } from './1820000000000-AddPostbacksAndHe.js';
import { AddRcidAndApiCallLogs1830000000000 } from './1830000000000-AddRcidAndApiCallLogs.js';
import { AddSuccessRedirectUrl1840000000000 } from './1840000000000-AddSuccessRedirectUrl.js';
import { AddUserStatus1850000000000 } from './1850000000000-AddUserStatus.js';
import { TrackingCampidAndVendorCampid1860000000000 } from './1860000000000-TrackingCampidAndVendorCampid.js';
import { UniqueMsisdnOnPostbacks1870000000000 } from './1870000000000-UniqueMsisdnOnPostbacks.js';
import { AddSuccessRedirectMode1880000000000 } from './1880000000000-AddSuccessRedirectMode.js';
import { AddPostbackRegisterAt1890000000000 } from './1890000000000-AddPostbackRegisterAt.js';
import { AddChecksubConfigJson1900000000000 } from './1900000000000-AddChecksubConfigJson.js';
import { AddFunnelLayout1910000000000 } from './1910000000000-AddFunnelLayout.js';
import { NullableMsisdnOnPostbacks1920000000000 } from './1920000000000-NullableMsisdnOnPostbacks.js';
import { AddDailyStats1930000000000 } from './1930000000000-AddDailyStats.js';
import { AddDcbConfigJson1940000000000 } from './1940000000000-AddDcbConfigJson.js';
import { AddTrackingPayoutPercent1950000000000 } from './1950000000000-AddTrackingPayoutPercent.js';
import { AddOperatorStatusOnPostbacks1960000000000 } from './1960000000000-AddOperatorStatusOnPostbacks.js';
import { AddOperatorStatusJsonOnDailyStats1970000000000 } from './1970000000000-AddOperatorStatusJsonOnDailyStats.js';
import { AddCampaignCapping1980000000000 } from './1980000000000-AddCampaignCapping.js';
import { AddDelayedChecksubColumns1990000000000 } from './1990000000000-AddDelayedChecksubColumns.js';
import { AddVendorCapping1990000000001 } from './1990000000001-AddVendorCapping.js';
import { AddVisitsChecksubColumns1990000000002 } from './1990000000002-AddVisitsChecksubColumns.js';

export const migrations = [
  InitialSchema1730000000000,
  AddOtpRequests1760000000001,
  AddOtpConfigAndColumns1760000000002,
  AddPartnersFlowAndAttribution1770000000000,
  CampaignMultipleVendors1780000000000,
  CampaignTrackings1780000000001,
  MarketsCountryOperator1790000000000,
  CampaignTrackingActive1800000000000,
  SchemaCleanup1810000000000,
  AddPostbacksAndHe1820000000000,
  AddRcidAndApiCallLogs1830000000000,
  AddSuccessRedirectUrl1840000000000,
  AddUserStatus1850000000000,
  TrackingCampidAndVendorCampid1860000000000,
  UniqueMsisdnOnPostbacks1870000000000,
  AddSuccessRedirectMode1880000000000,
  AddPostbackRegisterAt1890000000000,
  AddChecksubConfigJson1900000000000,
  AddFunnelLayout1910000000000,
  NullableMsisdnOnPostbacks1920000000000,
  AddDailyStats1930000000000,
  AddDcbConfigJson1940000000000,
  AddTrackingPayoutPercent1950000000000,
  AddOperatorStatusOnPostbacks1960000000000,
  AddOperatorStatusJsonOnDailyStats1970000000000,
  AddCampaignCapping1980000000000,
  AddDelayedChecksubColumns1990000000000,
  AddVendorCapping1990000000001,
  AddVisitsChecksubColumns1990000000002,
];
